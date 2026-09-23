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
  
  // Start heartbeat
  setInterval(() => sendHeartbeat('READY'), 15000);
  sendHeartbeat('READY');
  
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
        await updateJobStatus(job.id, 'DOWNLOADING');
        
        const localPath = path.join(DOWNLOAD_DIR, 'jobs', job.id, job.filename);
        const downloaded = await downloadFile(job.downloadUrl, localPath);
        
        if (downloaded) {
          console.log(`[Agent] Downloaded job ${job.id} successfully.`);
          await updateJobStatus(job.id, 'LOCAL');
          
          const db = getDB();
          await db.run(
            `INSERT INTO print_jobs (id, cloud_job_id, filename, local_path, status, copies, color_mode, page_range)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [job.id, job.public_job_id || job.id, job.original_filename || job.filename, localPath, 'READY_TO_PRINT', job.copies, job.color ? 1 : 0, job.doubleSided ? 'double' : 'single']
          );
          
          await updateJobStatus(job.id, 'READY_TO_PRINT');
        } else {
          console.error(`[Agent] Failed to download job ${job.id}.`);
          await updateJobStatus(job.id, 'PRINT_FAILED', 'Failed to download PDF');
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
    `SELECT id, public_job_id, local_path FROM print_jobs 
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
