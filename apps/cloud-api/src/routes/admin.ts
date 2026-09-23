import { Router } from 'express';
import { db } from '../db';
import crypto from 'crypto';

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';

const requireAdminAuth = (req: any, res: any, next: any) => {
  const token = req.cookies?.admin_session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const expectedToken = crypto.createHash('sha256').update(ADMIN_SECRET).digest('hex');
  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.get('/auth/status', (req: any, res: any) => {
  const token = req.cookies?.admin_session;
  const expectedToken = crypto.createHash('sha256').update(ADMIN_SECRET).digest('hex');
  
  if (token === expectedToken) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false, needsSetup: false });
});

router.post('/auth/login', (req: any, res: any) => {
  const { pin } = req.body;
  if (pin === ADMIN_PASSWORD) {
    const token = crypto.createHash('sha256').update(ADMIN_SECRET).digest('hex');
    res.cookie('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid PIN' });
});

router.post('/auth/logout', (req: any, res: any) => {
  res.clearCookie('admin_session');
  res.json({ success: true });
});

router.use(requireAdminAuth);

router.get('/jobs', async (req, res) => {
  try {
    const { data, error } = await db.from('print_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/jobs/:id/document-url', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: job, error } = await db.from('print_jobs').select('storage_path').eq('id', id).single();
    if (error || !job) return res.status(404).json({ error: 'Job not found' });
    
    const { data: urlData, error: urlError } = await db.storage.from('print_jobs').createSignedUrl(job.storage_path, 3600);
    if (urlError || !urlData) throw urlError || new Error("Failed to generate URL");
    
    res.json({ url: urlData.signedUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get document URL' });
  }
});

router.get('/stations', async (req, res) => {
  try {
    const { data, error } = await db.from('stations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

router.get('/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db.from('stations').select('*').eq('station_id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

router.post('/jobs/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: job, error: fetchError } = await db.from('print_jobs').select('*').eq('public_job_id', id).single();
    if (fetchError || !job) throw fetchError || new Error("Job not found");

    const { error: updateError } = await db.from('print_jobs').update({ status: 'QUEUED', error_message: null }).eq('id', job.id);
    if (updateError) throw updateError;
    
    await db.from('job_events').insert({
      job_id: job.id,
      event: 'QUEUED',
      message: 'Job retried by admin'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

export default router;
