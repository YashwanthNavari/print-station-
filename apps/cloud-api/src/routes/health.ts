import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await db.from('stations').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'OK', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', database: 'disconnected', error: String(err) });
  }
});

export default router;
