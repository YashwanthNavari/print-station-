import fs from 'fs';
import path from 'path';
import { getDB } from './db';
import { sendHeartbeat, pollJobs, updateJobStatus, downloadFile } from './cloudClient';

const STATION_ID = process.env.STATION_ID || 'PS-HYD-001';

const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');
const TMP_DIR = path.join(DOWNLOAD_DIR, '.tmp');

export async function initAgent() {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  } else {
    // Clean up any stale .tmp files from previous crashed runs
    const tmpFiles = fs.readdirSync(TMP_DIR);
    for (const file of tmpFiles) {
      if (file.endsWith('.tmp')) {
        fs.unlinkSync(path.join(TMP_DIR, file));
        console.log(`[Agent] Cleaned up stale temporary file: ${file}`);
      }
    }
  }

  console.log(`[Agent] Started cloud-connected agent for station ${STATION_ID}...`);
  
  const checkHeartbeat = async () => {
    let storageHealthy = true;
    try {
      fs.accessSync(DOWNLOAD_DIR, fs.constants.W_OK);
    } catch {
      storageHealthy = false;
    }
    
    // In a real app we would check ptp.getPrinters() but it can be slow.
    // For now we assume true if printerService is imported and valid.
    const printerOnline = true; 
    
    await sendHeartbeat('READY', storageHealthy, printerOnline);
  };

  // Start heartbeat
  setInterval(checkHeartbeat, 15000);
  checkHeartbeat();
  
  // Start job polling
  setInterval(pollAndProcessJobs, 5000);
  pollAndProcessJobs();
}

async function pollAndProcessJobs() {
  try {
    const jobs = await pollJobs();
    if (jobs && jobs.length > 0) {
      for (const job of jobs) {
        console.log(`[Agent] Received job ${job.id} from cloud.`);
        const db = getDB();
        
        // 1. Duplicate protection check
        const publicJobId = job.public_job_id || job.id;
        const existingJob = await db.get(`SELECT status, error_message FROM print_jobs WHERE cloud_job_id = ?`, [publicJobId]);
        
        if (existingJob) {
          console.log(`[Agent] Job ${job.id} already exists locally with status ${existingJob.status}. Skipping download.`);
          // If the cloud state is out of sync (e.g. cloud thinks it's still printing or downloading), push our local state up
          if (['COMPLETED', 'PRINT_FAILED', 'DOWNLOAD_FAILED', 'READY_TO_PRINT'].includes(existingJob.status)) {
             await updateJobStatus(job.id, existingJob.status, existingJob.error_message);
          }
          continue;
        }

        // 2. State transition to DOWNLOADING
        await updateJobStatus(job.id, 'DOWNLOADING');
        
        const localPath = path.join(DOWNLOAD_DIR, 'jobs', job.id, job.filename);
        
        // Retry logic for download
        let downloaded = false;
        let attempts = 0;
        const MAX_DOWNLOAD_ATTEMPTS = 3;
        
        while (!downloaded && attempts < MAX_DOWNLOAD_ATTEMPTS) {
          attempts++;
          try {
             downloaded = await downloadFile(job.downloadUrl, localPath);
          } catch(e) {
             console.error(`[Agent] Download attempt ${attempts} failed:`, e);
          }
          if (!downloaded && attempts < MAX_DOWNLOAD_ATTEMPTS) {
             await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
          }
        }
        
        if (downloaded) {
          console.log(`[Agent] Downloaded job ${job.id} successfully.`);
          await updateJobStatus(job.id, 'DOWNLOADED');
          
          await db.run(
            `INSERT INTO print_jobs (id, cloud_job_id, filename, local_path, status, copies, color_mode, page_range)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [job.id, publicJobId, job.original_filename || job.filename, localPath, 'READY_TO_PRINT', job.copies, job.color ? 1 : 0, job.doubleSided ? 'double' : 'single']
          );
          
          await updateJobStatus(job.id, 'READY_TO_PRINT');
        } else {
          console.error(`[Agent] Failed to download job ${job.id} after ${attempts} attempts.`);
          await db.run(
            `INSERT INTO print_jobs (id, cloud_job_id, filename, status, error_message)
             VALUES (?, ?, ?, ?, ?)`,
            [job.id, publicJobId, job.original_filename || job.filename, 'DOWNLOAD_FAILED', 'Failed to download PDF after 3 attempts']
          );
          await updateJobStatus(job.id, 'DOWNLOAD_FAILED', 'Failed to download PDF after 3 attempts');
        }
      }
    }
  } catch (err) {
    console.error(`[Agent] Job polling error:`, err);
  }
}

// Function to automatically clean up old COMPLETED jobs
export async function cleanupLocalJobs() {
  const db = getDB();
  const settings = await db.get('SELECT auto_delete_minutes FROM settings WHERE station_id = ?', [STATION_ID]);
  const deleteMinutes = settings?.auto_delete_minutes || 60;
  
  const jobsToClean = await db.all(
    `SELECT id, cloud_job_id, local_path FROM print_jobs 
     WHERE status = 'COMPLETED' 
     AND updated_at <= datetime('now', '-' || ? || ' minutes')`,
    [deleteMinutes]
  );
  
  for (const job of jobsToClean) {
    try {
      if (job.local_path && fs.existsSync(job.local_path)) {
        fs.unlinkSync(job.local_path);
      }
      await db.run(`DELETE FROM print_jobs WHERE id = ?`, [job.id]);
      console.log(`[Agent] Cleaned up completed job ${job.id} after ${deleteMinutes} minutes.`);
    } catch (e) {
      console.error(`[Agent] Failed to cleanup job ${job.id}:`, e);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupLocalJobs, 5 * 60 * 1000);
