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

  console.log('Fetching availability for user:', userId, 'week:', week);


  try {
    const result = await pool.query(
      'SELECT * FROM availability WHERE user_id = $1 AND week = $2',
      [userId, week]
    );
    console.log('Fetched availability from DB:', result.rows);

      // Additional logging to check for 7:00-16:00 shifts (this specific time is not working I want to check something)
      const sevenToFourShifts = result.rows.filter(row => 
        row.start_time.startsWith('07:00') && row.end_time.startsWith('16:00')
      );
      console.log('7:00-16:00 shifts:', sevenToFourShifts);

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

  console.log('Saving availability for user:', userId, 'week:', week);

  try {
    await pool.query('BEGIN');

    for (const day in availability) {
      for (const shift in availability[day]) {
        const [startTime, endTime] = shift.split('-');
        const status = availability[day][shift];
        const date = new Date(week);
        const year = date.getFullYear();
        const isoWeek = getISOWeek(date);
        
        await pool.query(
          `INSERT INTO availability (user_id, week, day_of_week, start_time, end_time, status, year, iso_week)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id, week, day_of_week, start_time, end_time)
           DO UPDATE SET status = EXCLUDED.status, year = EXCLUDED.year, iso_week = EXCLUDED.iso_week`,
          [userId, week, day, startTime, endTime, status, year, isoWeek]
        );
      }
    }

    await pool.query('COMMIT');
    res.json({ message: 'Availability saved successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Save availability error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
  }
});

router.get('/manager-options', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const { week } = req.query;

  try {
    const scheduleOptions = await getScheduleOptions(week as string);
    const employeeAvailability = await getDetailedEmployeeAvailability(week as string);
    res.json({ scheduleOptions, employeeAvailability });
  } catch (error) {
    console.error('Error fetching manager options:', error);
    res.status(500).json({ message: 'Error fetching manager options', error: (error as Error).message });
  }
});

router.post('/shuffle', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { week } = req.body;
    const shuffledSchedule = await generateShuffledSchedule(week);
    res.json({ schedule: shuffledSchedule });
  } catch (error) {
    console.error('Error shuffling schedule:', error);
    res.status(500).json({ message: 'Error shuffling schedule', error: (error as Error).message });
  }
});

router.post('/select', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schedule, week } = req.body;
    await saveManagerSchedule(schedule, week);
    res.json({ message: 'Schedule saved successfully' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ message: 'Error saving schedule', error: (error as Error).message });
  }
});

async function getScheduleOptions(week: string) {
  const employeeAvailability = await getDetailedEmployeeAvailability(week);
  return [
    generateScheduleOption(employeeAvailability),
    generateScheduleOption(employeeAvailability)
  ];
}

async function getDetailedEmployeeAvailability(week: string) {
  const result = await pool.query(
    'SELECT a.user_id, u.name, a.day_of_week, a.start_time, a.end_time, a.status FROM availability a JOIN users u ON a.user_id = u.id WHERE a.week = $1',
    [week]
  );

  const employeeAvailability: any = {};
  result.rows.forEach((row) => {
    const { user_id, name, day_of_week, start_time, end_time, status } = row;
    if (!employeeAvailability[day_of_week]) {
      employeeAvailability[day_of_week] = {};
    }
    const shift = `${start_time}-${end_time}`;
    if (!employeeAvailability[day_of_week][shift]) {
      employeeAvailability[day_of_week][shift] = [];
    }
    employeeAvailability[day_of_week][shift].push({ username: user_id, name, status });
  });

  return employeeAvailability;
}

function generateScheduleOption(employeeAvailability: any) {
  const schedule: any = {};
  for (const day in employeeAvailability) {
    schedule[day] = {};
    for (const shift in employeeAvailability[day]) {
      const availableEmployees = employeeAvailability[day][shift].filter((employee: any) => 
        employee.status === 'Want to work' || employee.status === 'Neutral'
      );
      schedule[day][shift] = availableEmployees.length > 0 
        ? availableEmployees[Math.floor(Math.random() * availableEmployees.length)].username 
        : '-';
    }
  }
  return schedule;
}

async function generateShuffledSchedule(week: string) {
  const employeeAvailability = await getDetailedEmployeeAvailability(week);
  return generateScheduleOption(employeeAvailability);
}

async function saveManagerSchedule(schedule: any, week: string) {
  const date = new Date(week);
  const year = date.getFullYear();
  const isoWeek = getISOWeek(date);

  await pool.query(
    `INSERT INTO manager_schedules (week, year, iso_week, schedule_data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (week) DO UPDATE SET schedule_data = EXCLUDED.schedule_data`,
    [week, year, isoWeek, JSON.stringify(schedule)]
  );
}

// Helper function to get ISO week number
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}




export default router;

