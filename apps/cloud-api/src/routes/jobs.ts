import { Router } from 'express';
import { db } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

// 1. Generate Upload URL
router.post('/uploads', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const publicJobId = `PS-${randomUUID().substring(0, 6).toUpperCase()}`;
    const storageKey = `${publicJobId}/${filename}`;

    // Note: We use Supabase storage createSignedUploadUrl
    const { data, error } = await db.storage
      .from('print_jobs')
      .createSignedUploadUrl(storageKey);

    if (error) throw error;

    res.json({
      uploadUrl: data.signedUrl,
      storageKey,
      jobId: publicJobId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate upload url' });
  }
});

// 2. Create Job
router.post('/', async (req, res) => {
  try {
    const { stationId, filename, storageKey, copies, color, doubleSided, jobId } = req.body;
    
    // Default size to 0 if not provided here, can be updated later by agent or object storage trigger
    const { data, error } = await db.from('print_jobs').insert({
      public_job_id: jobId,
      station_id: stationId,
      original_filename: filename,
      storage_path: storageKey,
      copies: copies || 1,
      color: color || false,
      double_sided: doubleSided || false,
      status: 'QUEUED'
    }).select().single();

    if (error) throw error;

    await db.from('job_events').insert({
      job_id: data.id,
      event: 'QUEUED',
      message: 'Job submitted to cloud queue'
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// 3. Get Job Status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await db
      .from('print_jobs')
      .select('*, stations(name)')
      .eq('public_job_id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: data.public_job_id,
      status: data.status,
      station: data.stations?.name,
      filename: data.original_filename,
      updatedAt: data.updated_at
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

export default router;
