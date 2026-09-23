import fs from 'fs';
import path from 'path';
import { getDB } from './db';

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

  console.log(`[Agent] Started cleanup agent for station ${STATION_ID}...`);
}

// Function to automatically clean up old COMPLETED jobs
export async function cleanupLocalJobs() {
  const db = getDB();
  const settings = await db.get('SELECT auto_delete_minutes FROM settings WHERE station_id = ?', [STATION_ID]);
  const deleteMinutes = settings?.auto_delete_minutes || 60;
  
  const jobsToClean = await db.all(
    `SELECT id, local_path FROM print_jobs 
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
