import express, { Response, NextFunction, Request } from 'express';
import passport from '../config/passport';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
router.use(passport.authenticate('jwt', { session: false }));

router.get('/availability', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { userId } = authenticatedReq.user;
  const { week } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM availability WHERE user_id = $1 AND week = $2',
      [userId, week]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch availability error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

router.post('/availability', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { userId } = authenticatedReq.user;
  const { availability, week } = req.body;

  try {
    // Deleting existing entries for the user and week
    await pool.query('DELETE FROM availability WHERE user_id = $1 AND week = $2', [userId, week]);

    // And here inserting new entries
    for (const day in availability) {
      for (const shift in availability[day]) {
        const [startTime, endTime] = shift.split('-');
        await pool.query(
          'INSERT INTO availability (user_id, week, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5)',
          [userId, week, day, startTime, endTime]
        );
      }
    }

    res.json({ message: 'Availability saved successfully' });
  } catch (error) {
    console.error('Save availability error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;

