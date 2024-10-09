import express, { Response, NextFunction, Request } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

router.get('/availability', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { userId } = authenticatedReq.user;
  const { week } = req.query;

  try {
    const result = await pool.query('SELECT * FROM availability WHERE user_id = $1 AND week = $2', [userId, week]);
    res.json(result.rows[0]?.availability || {});
  } catch (error) {
    console.error('Fetch availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/availability', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { userId } = authenticatedReq.user;
  const { availability, week } = req.body;

  try {
    await pool.query(
      'INSERT INTO availability (user_id, week, availability) VALUES ($1, $2, $3) ON CONFLICT (user_id, week) DO UPDATE SET availability = $3',
      [userId, week, availability]
    );
    res.json({ message: 'Availability saved successfully' });
  } catch (error) {
    console.error('Save availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

