import express, { Response, NextFunction, Request } from 'express';
import passport from '../config/passport';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
router.use(passport.authenticate('jwt', { session: false }));

const processEmployeeAvailability = (queryResult: any[]) => {
  const availability: { [key: string]: { [key: string]: any[] } } = {};
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  queryResult.forEach(row => {
    const day = daysOfWeek[row.day_of_week];
    const shift = `${row.start_time.slice(0, 5)}-${row.end_time.slice(0, 5)}`;
    
    if (!availability[day]) {
      availability[day] = {};
    }
    if (!availability[day][shift]) {
      availability[day][shift] = [];
    }
    
    availability[day][shift].push({
      id: row.user_id,
      name: row.name,
      status: row.status
    });
  });
  return availability;
};


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

      // Additional logging to check for 7:00-16:00 shifts
      const sevenToFourShifts = result.rows.filter(row => 
        row.start_time.startsWith('07:00') && row.end_time.startsWith('16:00')
      );
      console.log('07:00-16:00 shifts:', sevenToFourShifts);

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

//mangers part of the schedule.ts file:
// Update the route handler
router.get('/manager-options', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const { week, endWeek } = req.query;
  try {
    console.log('Received request for manager options, week:', week, 'to', endWeek);
    const scheduleOptions = await getScheduleOptions(week as string, endWeek as string);
    const employeeAvailability = await getDetailedEmployeeAvailability(week as string, endWeek as string);
    
    const formattedResponse = {
      scheduleOptions: scheduleOptions,
      employeeAvailability: formatEmployeeAvailability(employeeAvailability)
    };
    
    console.log('Sending response:', JSON.stringify(formattedResponse, null, 2));
    res.json(formattedResponse);
  } catch (error) {
    console.error('Error fetching manager options:', error);
    res.status(500).json({ message: 'Error fetching manager options', error: (error as Error).message });
  }
});



router.post('/select', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schedules, week, selectedOptionIndex } = req.body;
    await saveManagerSchedule(schedules, week, selectedOptionIndex);
    res.json({ message: 'Schedules saved successfully' });
  } catch (error) {
    console.error('Error saving schedules:', error);
    res.status(500).json({ message: 'Error saving schedules', error: (error as Error).message });
  }
});


//adding console log so we can better track the actions being made during the fetching/saving/creating of the schedule
async function getScheduleOptions(weekStart: string, weekEnd: string) {
  console.log('Getting schedule options from', weekStart, 'to', weekEnd);
  const employeeAvailability = await getDetailedEmployeeAvailability(weekStart, weekEnd);
  console.log('Employee availability:', JSON.stringify(employeeAvailability, null, 2));

  // Check if there are existing options in the database
  const existingOptions = await pool.query(
    'SELECT schedule_data, option_number, is_selected FROM manager_schedules WHERE week = $1 ORDER BY option_number',
    [weekStart]
  );

  if (existingOptions.rows.length > 0) {
    console.log('Returning existing schedule options');
    return existingOptions.rows.map(row => ({
      ...row.schedule_data,
      optionNumber: row.option_number,
      isSelected: row.is_selected
    }));
  }

  // If no existing options, generate new ones
  const options = [
    generateScheduleOption(employeeAvailability),
    generateScheduleOption(employeeAvailability)
  ];
  console.log('Generated new schedule options:', options);
  return options.map((option, index) => ({
    ...option,
    optionNumber: index + 1,
    isSelected: false
  }));
}


async function getDetailedEmployeeAvailability(weekStart: string, weekEnd: string) {
  console.log('Getting detailed employee availability from', weekStart, 'to', weekEnd);
  const result = await pool.query(
    'SELECT a.user_id, u.name, a.day_of_week, a.start_time, a.end_time, a.status FROM availability a JOIN users u ON a.user_id = u.id WHERE a.week >= $1 AND a.week <= $2',
    [weekStart, weekEnd]
  );
  console.log('Query result:', result.rows);

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
    employeeAvailability[day_of_week][shift].push({ id: user_id, name, status: Number(status) });
  });

  console.log('Processed employee availability:', employeeAvailability);
  return employeeAvailability;
}

router.post('/shuffle', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { week } = req.body;
    console.log(`Getting detailed employee availability for week: ${week}`);

    const employeeAvailability = await getDetailedEmployeeAvailability(week, week);
    console.log('Processed employee availability:', JSON.stringify(employeeAvailability, null, 2));

    const shuffledSchedule = await generateShuffledSchedule(week);

    res.json({ 
      schedule: shuffledSchedule,
      employeeAvailability: employeeAvailability
    });
  } catch (error) {
    console.error('Error shuffling schedule:', error);
    res.status(500).json({ message: 'Error shuffling schedule', error: (error as Error).message });
  }
});


function generateScheduleOption(employeeAvailability: any) {
  const schedule: any = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shifts = ['07:00-16:00', '10:00-19:00', '13:00-22:00'];

  days.forEach((day, index) => {
    schedule[day] = {};
    shifts.forEach(shift => {
      const [start, end] = shift.split('-');
      const availableEmployees = employeeAvailability[index + 1]?.[`${start}:00-${end}:00`]?.filter((employee: any) => 
        employee.status === 1 || employee.status === 2
      ) || [];
      schedule[day][shift] = availableEmployees.length > 0 
        ? availableEmployees[Math.floor(Math.random() * availableEmployees.length)].id 
        : null;
    });
  });

  return schedule;
}



function formatScheduleOption(option: any) {
  const formattedOption: any = {};
  for (const [day, shifts] of Object.entries(option)) {
    formattedOption[day] = {};
    for (const [shift, employeeId] of Object.entries(shifts as any)) {
      formattedOption[day][shift] = employeeId || '-';
    }
  }
  return formattedOption;
}

function formatEmployeeAvailability(availability: any) {
  const formattedAvailability: any = {};
  for (const [day, shifts] of Object.entries(availability)) {
    formattedAvailability[day] = {};
    for (const [shift, employees] of Object.entries(shifts as any)) {
      formattedAvailability[day][shift] = (employees as any[]).map(emp => ({
        id: emp.id,
        name: emp.name,
        status: emp.status
      }));
    }
  }
  return formattedAvailability;
}



async function generateShuffledSchedule(week: string) {
  const weekEnd = week; // Assuming weekEnd is the same as week for this function
  const employeeAvailability = await getDetailedEmployeeAvailability(week, weekEnd);
  return generateScheduleOption(employeeAvailability);
}

async function saveManagerSchedule(schedules: any[], week: string, selectedOptionIndex: number) {
  const date = new Date(week);
  const year = date.getFullYear();
  const isoWeek = getISOWeek(date);

  await pool.query('BEGIN');

  try {
    // First, unselect all schedules for this week
    await pool.query(
      `UPDATE manager_schedules SET is_selected = false WHERE week = $1`,
      [week]
    );

    // Then, insert or update each schedule option
    for (let i = 0; i < schedules.length; i++) {
      await pool.query(
        `INSERT INTO manager_schedules (week, year, iso_week, schedule_data, option_number, is_selected)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (week, option_number) DO UPDATE 
         SET schedule_data = EXCLUDED.schedule_data,
             is_selected = EXCLUDED.is_selected`,
        [week, year, isoWeek, JSON.stringify(schedules[i]), i + 1, i === selectedOptionIndex]
      );
    }

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
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

