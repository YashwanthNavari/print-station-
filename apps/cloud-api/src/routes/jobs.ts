import { Router } from 'express';
import { db } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

// 1. Create Job & Generate Signed Upload URL
router.post('/', async (req, res) => {
  try {
    const { stationId, copies, color, doubleSided, filename, fileSize } = req.body;

    if (!stationId) return res.status(400).json({ error: 'Station ID is required' });
    if (!filename) return res.status(400).json({ error: 'Filename is required' });

    // Validation
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') return res.status(400).json({ error: 'Only PDF files are allowed' });
    
    // Check max file size (25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (fileSize && parseInt(fileSize) > MAX_SIZE) {
      return res.status(400).json({ error: 'File size exceeds 25MB limit' });
    }

    // Paths
    const publicJobId = `PS-${randomUUID().substring(0, 6).toUpperCase()}`;
    const storageKey = `jobs/${stationId}/${publicJobId}/document.pdf`;

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await db.storage
      .from('print_jobs')
      .createSignedUploadUrl(storageKey);

    if (uploadError || !uploadData) {
      console.error('[Cloud API] Signed URL Error:', uploadError);
      return res.status(500).json({ error: 'Failed to generate upload URL' });
    }

    // Create DB record in UPLOADED state
    const { data, error } = await db.from('print_jobs').insert({
      public_job_id: publicJobId,
      station_id: stationId,
      original_filename: filename,
      storage_path: storageKey,
      file_size: fileSize || 0,
      copies: parseInt(copies) || 1,
      color: color === 'true' || color === true,
      double_sided: doubleSided === 'true' || doubleSided === true,
      status: 'UPLOADED'
    }).select().single();

    if (error) throw error;

    await db.from('job_events').insert({
      job_id: data.id,
      event: 'UPLOADED',
      message: 'Job created, awaiting file upload'
    });

    res.json({
      jobId: data.public_job_id,
      uploadUrl: uploadData.signedUrl,
      storagePath: storageKey,
      token: uploadData.token
    });
  } catch (err) {
    console.error('[Cloud API] Job Creation Error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// 2. Finalize Upload
router.post('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the job
    const { data: job, error: jobError } = await db.from('print_jobs')
      .select('*')
      .eq('public_job_id', id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'UPLOADED') {
      return res.status(400).json({ error: 'Job has already been finalized' });
    }

    // 1. Verify object exists and check PDF signature & size via Range request
    const { data: signedData, error: signedError } = await db.storage
      .from('print_jobs')
      .createSignedUrl(job.storage_path, 60);
      
    if (signedError || !signedData) {
      console.error('[Cloud API] Finalize Signed URL Error:', signedError);
      return res.status(400).json({ error: 'Failed to access uploaded file' });
    }

    const fileRes = await fetch(signedData.signedUrl, {
      headers: { 'Range': 'bytes=0-4' }
    });

    if (!fileRes.ok) {
      return res.status(400).json({ error: 'File not found in storage' });
    }

    // Parse Content-Range (e.g. bytes 0-4/12345) to get total file size
    const contentRange = fileRes.headers.get('content-range');
    const contentLength = fileRes.headers.get('content-length');
    const totalSizeStr = contentRange ? contentRange.split('/')[1] : contentLength;
    const totalSize = totalSizeStr ? parseInt(totalSizeStr) : 0;

    if (totalSize === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }
    if (totalSize > 25 * 1024 * 1024) {
      // Delete oversized file
      await db.storage.from('print_jobs').remove([job.storage_path]);
      await db.from('print_jobs').update({ status: 'FAILED', error_message: 'File size exceeds 25MB' }).eq('id', job.id);
      return res.status(400).json({ error: 'File size exceeds 25MB limit' });
    }

    const buffer = await fileRes.arrayBuffer();
    const magic = Buffer.from(buffer).toString('utf-8');
    if (magic !== '%PDF-') {
      // Delete malicious/invalid file
      await db.storage.from('print_jobs').remove([job.storage_path]);
      await db.from('print_jobs').update({ status: 'FAILED', error_message: 'Invalid PDF format' }).eq('id', job.id);
      return res.status(400).json({ error: 'Invalid PDF signature' });
    }

    // Update state to QUEUED and save the actual file size
    const { data, error } = await db.from('print_jobs')
      .update({ 
        status: 'QUEUED', 
        file_size: totalSize,
        updated_at: new Date().toISOString() 
      })
      .eq('id', job.id)
      .select()
      .single();

    if (error) throw error;

    await db.from('job_events').insert({
      job_id: job.id,
      event: 'QUEUED',
      message: 'File validated and queued for printing'
    });

    res.json(data);
  } catch (err) {
    console.error('[Cloud API] Job Finalization Error:', err);
    res.status(500).json({ error: 'Failed to finalize job' });
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
