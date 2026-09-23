import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Middleware to authenticate agent
const authenticateAgent = async (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const stationId = req.headers['x-station-id'];

  if (!token || !stationId) {
    return res.status(401).json({ error: 'Missing credentials' });
  }

  try {
    const { data, error } = await db
      .from('stations')
      .select('*')
      .eq('station_id', stationId)
      .eq('station_secret', token)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.station = data;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth failed' });
  }
};

router.use(authenticateAgent);

// 1. Heartbeat
router.post('/heartbeat', async (req: any, res: any) => {
  try {
    const { agentVersion, printerStatus, storageHealthy, printerOnline } = req.body;
    const station = req.station;
    const ip = req.ip || req.connection.remoteAddress;

    await db.from('stations').update({
      last_seen_at: new Date().toISOString(),
      is_active: true
    }).eq('station_id', station.station_id);

    // Upsert or just insert into agent_sessions. For simplicity, just insert a heartbeat record or update existing
    const { data: existingSession } = await db.from('agent_sessions').select('id').eq('station_id', station.station_id).single();

    if (existingSession) {
      await db.from('agent_sessions').update({
        last_heartbeat: new Date().toISOString(),
        ip_address: ip,
        version: agentVersion,
        printer_online: printerOnline,
        storage_healthy: storageHealthy
      }).eq('id', existingSession.id);
    } else {
      await db.from('agent_sessions').insert({
        station_id: station.station_id,
        ip_address: ip,
        version: agentVersion,
        printer_online: printerOnline,
        storage_healthy: storageHealthy
      });
    }

    res.json({ status: 'OK' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// 2. Poll for jobs
router.get('/jobs', async (req: any, res: any) => {
  try {
    const station = req.station;
    // Call the RPC we created in schema.sql
    const { data, error } = await db.rpc('claim_next_print_job', { p_station_id: station.station_id });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const job = data[0];
      
      await db.from('job_events').insert({
        job_id: job.id,
        event: 'CLAIMED',
        message: 'Job claimed by agent'
      });

      // Get download url for the file from storage
      const { data: storageData, error: storageError } = await db.storage
        .from('print_jobs')
        .createSignedUrl(job.storage_path, 3600); // 1 hour valid

      if (storageError) throw storageError;

      res.json({
        jobs: [{
          id: job.public_job_id,
          filename: job.original_filename,
          downloadUrl: storageData.signedUrl,
          copies: job.copies,
          color: job.color,
          doubleSided: job.double_sided
        }]
      });
    } else {
      res.json({ jobs: [] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to poll jobs' });
  }
});

// 3. Update job status
router.post('/jobs/:id/status', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, error: errorMessage } = req.body;
    const station = req.station;

    const { data: jobData, error: findError } = await db.from('print_jobs').select('id, status').eq('public_job_id', id).single();
    
    if (findError || !jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const { error: updateError } = await db.from('print_jobs').update({
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString()
    }).eq('id', jobData.id);

    if (updateError) throw updateError;

    await db.from('job_events').insert({
      job_id: jobData.id,
      event: status,
      message: errorMessage || `Job status updated to ${status}`
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

export default router;
