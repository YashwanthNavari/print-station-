import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Get all stations (for Admin)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await db.from('stations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Get single station (for Customer App or Admin)
router.get('/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { data, error } = await db.from('stations').select('*').eq('station_id', stationId).single();
    if (error || !data) {
      return res.status(404).json({ error: 'Station not found' });
    }
    // Don't leak station_secret to the public
    const { station_secret, ...safeData } = data;
    res.json(safeData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

export default router;
