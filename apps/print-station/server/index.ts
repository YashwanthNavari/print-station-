import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { initDB, getDB } from './db';
import { initAgent } from './agent';
import { PrinterService } from './printerService';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const app = express();

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'http://192.168.0.108:3000',
  'http://192.168.0.108:3001',
  'http://192.168.0.108:5173',
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const STATION_ID = process.env.STATION_ID || 'PS-HYD-001';

// --- AUTHENTICATION ROUTES ---

// Check if setup is needed or if user is logged in
app.get('/api/auth/status', async (req, res) => {
  const db = getDB();
  const settings = await db.get('SELECT pin_hash FROM settings WHERE station_id = ?', [STATION_ID]);
  
  if (!settings || !settings.pin_hash) {
    return res.json({ setupRequired: true, loggedIn: false });
  }

  const token = req.cookies.session_token;
  if (token) {
    const session = await db.get('SELECT * FROM sessions WHERE token = ?', [token]);
    if (session) {
      return res.json({ setupRequired: false, loggedIn: true });
    }
  }

  return res.json({ setupRequired: false, loggedIn: false });
});

// Setup PIN for the first time
app.post('/api/auth/setup', async (req, res) => {
  const db = getDB();
  const settings = await db.get('SELECT pin_hash FROM settings WHERE station_id = ?', [STATION_ID]);
  
  if (settings && settings.pin_hash) {
    return res.status(400).json({ error: 'Setup already complete' });
  }

  const { pin } = req.body;
  if (!pin || pin.length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }

  const saltRounds = 12;
  const hash = await bcrypt.hash(pin, saltRounds);

  await db.run('UPDATE settings SET pin_hash = ? WHERE station_id = ?', [hash, STATION_ID]);

  res.json({ success: true });
});

// Login and create session
app.post('/api/auth/login', async (req, res) => {
  const db = getDB();
  const settings = await db.get('SELECT pin_hash FROM settings WHERE station_id = ?', [STATION_ID]);
  
  if (!settings || !settings.pin_hash) {
    return res.status(400).json({ error: 'Setup required' });
  }

  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN required' });
  }

  const match = await bcrypt.compare(pin, settings.pin_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const token = uuidv4();
  await db.run('INSERT INTO sessions (token) VALUES (?)', [token]);

  res.cookie('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  res.json({ success: true });
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies.session_token;
  if (token) {
    const db = getDB();
    await db.run('DELETE FROM sessions WHERE token = ?', [token]);
  }
  res.clearCookie('session_token');
  res.json({ success: true });
});

// --- PROTECTED ROUTES MIDDLEWARE ---

app.use('/api', async (req, res, next) => {
  // Skip auth routes and public endpoints like upload/health/job status
  if (
    req.path.startsWith('/auth/') || 
    req.path.startsWith('/upload') || 
    req.path.startsWith('/health') ||
    (req.path.startsWith('/jobs/') && req.path.endsWith('/status'))
  ) {
    return next();
  }

  const token = req.cookies.session_token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const db = getDB();
  const session = await db.get('SELECT * FROM sessions WHERE token = ?', [token]);
  
  if (!session) {
    res.clearCookie('session_token');
    return res.status(401).json({ error: 'Unauthorized. Invalid session.' });
  }

  next();
});

// --- PUBLIC API ROUTES ---

app.get('/api/health', async (req, res) => {
  let dbHealthy = false;
  try {
    const db = getDB();
    if (db) dbHealthy = true;
  } catch (e) {}

  let storageHealthy = false;
  try {
    const jobsPath = path.join(__dirname, '..', 'downloads', 'jobs');
    if (!fs.existsSync(jobsPath)) {
      fs.mkdirSync(jobsPath, { recursive: true });
    }
    storageHealthy = true;
  } catch(e) {}

  res.json({ 
    status: dbHealthy && storageHealthy ? 'ok' : 'error', 
    services: {
      api: 'online',
      database: dbHealthy ? 'healthy' : 'error',
      storage: storageHealthy ? 'healthy' : 'error',
      agent: 'running',
      printer: 'unknown' // Dashboard relies on /api/printers for actual state
    }
  });
});

app.get('/api/jobs/:id/status', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const job = await db.get('SELECT id, status, filename as original_filename, copies, color_mode as color, created_at, updated_at FROM print_jobs WHERE id = ?', [id]);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Map db values to expected frontend structure
    job.color = job.color === 1;
    
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    // Validate PDF signature
    if (file.buffer.length < 5 || file.buffer.toString('utf8', 0, 5) !== '%PDF-') {
      return res.status(400).json({ error: 'Invalid file type. Only PDF is allowed.' });
    }

    const { stationId, copies, color, doubleSided } = req.body;
    
    // Hash
    const hash = crypto.createHash("sha256");
    hash.update(file.buffer);
    const fileHash = hash.digest("hex");

    const jobId = `PS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const jobDir = path.join(__dirname, '..', 'downloads', 'jobs', jobId);
    
    fs.mkdirSync(jobDir, { recursive: true });
    
    const pdfPath = path.join(jobDir, 'document.pdf');
    fs.writeFileSync(pdfPath, file.buffer);

    let parsedCopies = parseInt(copies || '1');
    if (isNaN(parsedCopies) || parsedCopies < 1 || parsedCopies > 100) parsedCopies = 1;

    const metadata = {
      jobId,
      originalFilename: file.originalname,
      storedFilename: 'document.pdf',
      mimeType: 'application/pdf',
      size: file.size,
      stationId,
      copies: parsedCopies,
      color: color === 'true',
      doubleSided: doubleSided === 'true',
      status: 'READY_TO_PRINT',
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(path.join(jobDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    const db = getDB();
    await db.run(
      `INSERT INTO print_jobs (id, cloud_job_id, filename, local_path, status, file_size, file_hash, copies, color_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        jobId, // Since we don't have a cloud_job_id, we just use the jobId
        file.originalname,
        pdfPath,
        'READY_TO_PRINT',
        file.size,
        fileHash,
        metadata.copies,
        metadata.color ? 1 : 0
      ]
    );

    res.status(201).json({ success: true, jobId, job: metadata });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- ADMIN API ROUTES ---

app.get('/api/jobs', async (req, res) => {
  try {
    const db = getDB();
    const jobs = await db.all(`SELECT * FROM print_jobs ORDER BY created_at DESC`);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Serve the stored document file for inline viewing (PDF, images, etc.)
app.get('/api/jobs/:id/document', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const job = await db.get('SELECT local_path, filename FROM print_jobs WHERE id = ?', [id]);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Try the stored local_path first, then fall back to canonical location
    const candidates = [
      job.local_path,
      path.join(__dirname, '..', 'downloads', 'jobs', id, 'document.pdf'),
    ].filter(Boolean);

    let filePath: string | null = null;
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: 'Document file not found on disk' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf':  'application/pdf',
      '.png':  'image/png',
      '.jpg':  'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif':  'image/gif',
      '.webp': 'image/webp',
      '.bmp':  'image/bmp',
      '.tiff': 'image/tiff',
      '.tif':  'image/tiff',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    // inline = display in browser; attachment = force download
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(job.filename || 'document')}"`);
    res.setHeader('Cache-Control', 'no-store');

    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/print', async (req, res) => {
  try {
    const { id } = req.params;
    await PrinterService.printJob(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    await PrinterService.retryPrint(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Browser-print flow: mark the job as PRINTING when the admin opens the print dialog
app.post('/api/jobs/:id/print-dialog', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const job = await db.get('SELECT id, status FROM print_jobs WHERE id = ?', [id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    await db.run(
      `UPDATE print_jobs SET status = 'PRINTING', updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Browser-print flow: admin confirms the physical document came out of the printer
app.post('/api/jobs/:id/mark-printed', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const job = await db.get('SELECT id FROM print_jobs WHERE id = ?', [id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    await db.run(
      `UPDATE print_jobs SET status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Browser-print flow: mark failed if something went wrong at the print dialog
app.post('/api/jobs/:id/mark-failed', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = getDB();
    await db.run(
      `UPDATE print_jobs SET status = 'PRINT_FAILED', error_message = ?, updated_at = datetime('now') WHERE id = ?`,
      [reason || 'Print cancelled or failed', id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/printers', async (req, res) => {
  try {
    const printers = await PrinterService.getPrinters();
    res.json(printers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the React Admin Dashboard built files
const clientPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await initDB();
  await initAgent();

  app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`[Server] Admin dashboard running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
