import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { db } from './db';
import jobsRouter from './routes/jobs';
import stationsRouter from './routes/stations';
import agentsRouter from './routes/agents';
import healthRouter from './routes/health';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/stations', stationsRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/admin', adminRouter);

if (process.env.NODE_ENV !== 'production' || require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cloud API is running on port ${PORT}`);
  });
}

export default app;
