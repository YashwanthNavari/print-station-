
import fs from 'fs';
import path from 'path';

const CLOUD_API_URL = process.env.CLOUD_API_URL || 'http://localhost:8000';
const STATION_ID = process.env.STATION_ID || 'PS-TEST-001';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'secret';
const AGENT_VERSION = '1.0.0';

export async function sendHeartbeat(printerStatus: string = 'READY') {
  try {
    const res = await fetch(`${CLOUD_API_URL}/api/v1/agents/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_TOKEN}`,
        'x-station-id': STATION_ID
      },
      body: JSON.stringify({ agentVersion: AGENT_VERSION, printerStatus })
    });
    if (!res.ok) throw new Error(`Heartbeat failed: ${res.statusText}`);
  } catch (err) {
    console.error(`[CloudClient] Heartbeat error:`, err);
  }
}

export async function pollJobs(): Promise<any[]> {
  try {
    const res = await fetch(`${CLOUD_API_URL}/api/v1/agents/jobs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AGENT_TOKEN}`,
        'x-station-id': STATION_ID
      }
    });
    if (!res.ok) throw new Error(`Poll failed: ${res.statusText}`);
    const data = await res.json();
    return data.jobs || [];
  } catch (err) {
    console.error(`[CloudClient] Poll error:`, err);
    return [];
  }
}

export async function updateJobStatus(jobId: string, status: string, error?: string) {
  try {
    const res = await fetch(`${CLOUD_API_URL}/api/v1/agents/jobs/${jobId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_TOKEN}`,
        'x-station-id': STATION_ID
      },
      body: JSON.stringify({ status, error })
    });
    if (!res.ok) throw new Error(`Update status failed: ${res.statusText}`);
  } catch (err) {
    console.error(`[CloudClient] Update status error:`, err);
  }
}

export async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
    
    // Ensure directory exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const fileStream = fs.createWriteStream(destPath);
    return new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on('error', reject);
      fileStream.on('finish', () => resolve(true));
    });
  } catch (err) {
    console.error(`[CloudClient] Download error:`, err);
    return false;
  }
}
