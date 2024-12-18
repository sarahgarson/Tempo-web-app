import express, { Response, NextFunction, Request } from 'express';
import passport from '../config/passport';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
router.use(passport.authenticate('jwt', { session: false }));



//fetching our employees from the database
router.get('/employees', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT id, name FROM users WHERE role = $1', ['employee']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Error fetching employees', error: (error as Error).message });
  }
});



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
    const availabilityList = await getEmployeeAvailabilityList(week as string, endWeek as string);
    
    const formattedResponse = {
      scheduleOptions: scheduleOptions,
      employeeAvailability: formatEmployeeAvailability(employeeAvailability),
      availabilityList: availabilityList
    };
    
    console.log('Sending response:', JSON.stringify(formattedResponse, null, 2));
    res.json(formattedResponse);
  } catch (error) {
    console.error('Error fetching manager options:', error);
    res.status(500).json({ message: 'Error fetching manager options', error: (error as Error).message });
  }
});


// Update the route handler to see if I can save my custom schedule table to the database
router.post('/select', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schedules, week, selectedOptionIndex } = req.body;
    console.log('Received data:', { schedules, week, selectedOptionIndex });

    // Validate incoming data
    if (!Array.isArray(schedules) || schedules.length === 0 || !week || selectedOptionIndex === undefined) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    await saveManagerSchedule(schedules, week, selectedOptionIndex);
    res.json({ message: 'Schedules saved successfully' });
  } catch (error) {
    console.error('Error saving schedules:', error);
    res.status(500).json({ message: 'Error saving schedules', error: (error as Error).message });
  }
});



async function getScheduleOptions(weekStart: string, weekEnd: string) {
  console.log('Getting schedule options from', weekStart, 'to', weekEnd);
  const employeeAvailability = await getDetailedEmployeeAvailability(weekStart, weekEnd);
  console.log('Employee availability:', JSON.stringify(employeeAvailability, null, 2));

  const existingOptions = await pool.query(
    'SELECT schedule_data, option_number, is_selected FROM manager_schedules WHERE week = $1 ORDER BY option_number',
    [weekStart]
  );

  if (existingOptions.rows.length > 0) {
    // Always generate two options, using existing data for the selected one
    const selectedOption = existingOptions.rows.find(row => row.is_selected);
    const newOption = generateScheduleOption(employeeAvailability);
    
    return [
      {
        ...selectedOption.schedule_data,
        optionNumber: 1,
        isSelected: true
      },
      {
        ...newOption,
        optionNumber: 2,
        isSelected: false
      }
    ];
  }

  // Generate two new options if none exist
  const options = [
    generateScheduleOption(employeeAvailability),
    generateScheduleOption(employeeAvailability)
  ];

  return options.map((option, index) => ({
    ...option,
    optionNumber: index + 1,
    isSelected: false
  }));
}



async function getDetailedEmployeeAvailability(weekStart: string, weekEnd: string) {
  console.log('Getting detailed employee availability from', weekStart, 'to', weekEnd);
  const result = await pool.query(
    `SELECT DISTINCT ON (a.user_id, a.day_of_week, a.start_time, a.end_time) 
     a.user_id, u.name, a.day_of_week, a.start_time, a.end_time, a.status 
     FROM availability a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.week = $1 
     AND u.role = 'employee'
     ORDER BY a.user_id, a.day_of_week, a.start_time, a.end_time, a.week DESC`, 
    [weekStart]
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
    const assignedEmployees = new Set();

    shifts.forEach(shift => {
      const [start, end] = shift.split('-');
      // Only include employees with status 1 or 2 (explicitly filter out status 0)
      const availableEmployees = employeeAvailability[index + 1]?.[`${start}:00-${end}:00`]?.filter((employee: any) => {
        return (employee.status === 1 || employee.status === 2) && !assignedEmployees.has(employee.id);
      }) || [];

      if (availableEmployees.length > 0) {
        // Prioritize want to work employees (status 2)
        const preferredEmployees = availableEmployees.filter((emp: any) => emp.status === 2);
        const selectedEmployee = preferredEmployees.length > 0 
          ? preferredEmployees[Math.floor(Math.random() * preferredEmployees.length)]
          : availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
        
        schedule[day][shift] = selectedEmployee.id;
        assignedEmployees.add(selectedEmployee.id);
      } else {
        schedule[day][shift] = null;
      }
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
  const weekEnd = week; 
  const employeeAvailability = await getDetailedEmployeeAvailability(week, weekEnd);
  return generateScheduleOption(employeeAvailability);
}


//changed the fucntion since the second time I was trying to save the schedule I woul get an error
async function saveManagerSchedule(schedules: any[], week: string, selectedOptionIndex: number) {
  const date = new Date(week);
  const year = date.getFullYear();
  const isoWeek = getISOWeek(date);

  await pool.query('BEGIN');

  try {
    // Instead of deleting all schedules, update existing ones
    const existingSchedules = await pool.query(
      `SELECT * FROM manager_schedules WHERE week = $1`,
      [week]
    );

    // If no existing schedules, insert both options
    if (existingSchedules.rows.length === 0) {
      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        await pool.query(
          `INSERT INTO manager_schedules (week, year, iso_week, schedule_data, option_number, is_selected)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [week, year, isoWeek, JSON.stringify(schedule.data), i + 1, i === selectedOptionIndex]
        );
      }
    } else {
      // Update existing schedules while preserving both options
      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        await pool.query(
          `UPDATE manager_schedules 
           SET schedule_data = $1, is_selected = $2
           WHERE week = $3 AND option_number = $4`,
          [JSON.stringify(schedule.data), i === selectedOptionIndex, week, i + 1]
        );
      }
    }

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error in saveManagerSchedule:', error);
    throw error;
  }
}


//new function for the list availability of the employees in the manager part
async function getEmployeeAvailabilityList(weekStart: string, weekEnd: string) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shifts = ['07:00-16:00', '10:00-19:00', '13:00-22:00'];
  
  const result = await pool.query(
    `SELECT 
      a.user_id, 
      u.name, 
      a.day_of_week, 
      a.start_time, 
      a.end_time, 
      a.status 
    FROM availability a 
    JOIN users u ON a.user_id = u.id 
    WHERE a.week = $1 
    AND u.role = 'employee'
    ORDER BY u.name`,
    [weekStart]
  );

  const availabilityList: any = {};

  // Initialize structure
  daysOfWeek.forEach(day => {
    availabilityList[day] = {};
    shifts.forEach(shift => {
      availabilityList[day][shift] = {
        preferred: [],
        available: [],
        cantWork: []
      };
    });
  });

  // Populate data
  result.rows.forEach(row => {
    const day = daysOfWeek[row.day_of_week - 1];
    const shift = `${row.start_time.slice(0, 5)}-${row.end_time.slice(0, 5)}`;
    
    const employee = {
      id: row.user_id,
      name: row.name
    };

    // Ensure proper categorization based on status
    switch (Number(row.status)) {
      case 2:
        availabilityList[day][shift].preferred.push(employee);
        break;
      case 1:
        availabilityList[day][shift].available.push(employee);
        break;
      case 0:
        availabilityList[day][shift].cantWork.push(employee);
        break;
    }
  });

  return availabilityList;
}


// Helper function to get ISO week number
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}


// Adding this new route handler for the table ready schedule
router.get('/ready-schedule', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { week } = req.query;
    const result = await pool.query(
      `SELECT schedule_data 
       FROM manager_schedules 
       WHERE week = $1 
       AND is_selected = true`,
      [week]
    );

    const schedule = result.rows[0]?.schedule_data || null;
    res.json({ schedule_data: schedule });
  } catch (error) {
    console.log('Error fetching ready schedule:', error);
    res.status(500).json({ message: 'Error fetching ready schedule' });
  }
});

router.post('/publish', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { week, scheduleData } = req.body;
    
    await pool.query(
      `INSERT INTO published_schedules (week, schedule_data)
       VALUES ($1, $2)
       ON CONFLICT (week) 
       DO UPDATE SET schedule_data = $2, updated_at = CURRENT_TIMESTAMP`,
      [week, scheduleData]
    );

    res.json({ message: 'Schedule published successfully' });
  } catch (error) {
    console.error('Error publishing schedule:', error);
    res.status(500).json({ message: 'Error publishing schedule' });
  }
});






export default router;

