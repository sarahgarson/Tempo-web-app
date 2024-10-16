import React, { useState, useEffect } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Select, MenuItem } from '@mui/material';
import axios from 'axios';
import '../styles/ManagerSchedule.css';
import api from '../utils/api';

interface Schedule {
  [day: string]: {
    [shift: string]: string;
  };
}

interface EmployeeAvailability {
  [day: string]: {
    [shift: string]: Array<{
      name: string;
      username: string;
      status: 'Want to work' | 'Neutral' | "Can't work";
    }>;
  };
}


const ManagerSchedule: React.FC = () => {
  const [scheduleOptions, setScheduleOptions] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [customSchedule, setCustomSchedule] = useState<Schedule>({});
  const [employeeAvailability, setEmployeeAvailability] = useState<EmployeeAvailability>({});
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editMode, setEditMode] = useState(false);

    // New function to get available employees for a shift
    const getAvailableEmployees = (day: string, shift: string) => {
      return employeeAvailability[day]?.[shift]?.filter(employee => 
        employee.status === 'Want to work' || employee.status === 'Neutral'
      ) || [];
    };

  const shuffleSchedule = async (optionIndex: number) => {
    try {
      const response = await api.post('/schedules/shuffle', {
        week: currentWeek.toISOString(),
      });
      const newScheduleOptions = [...scheduleOptions];
      newScheduleOptions[optionIndex] = response.data.schedule;
      setScheduleOptions(newScheduleOptions);
    } catch (error) {
      console.error('Failed to shuffle schedule:', error);
    }
  };

  useEffect(() => {
    const fetchScheduleOptions = async () => {
      try {
        const response = await api.get<{ scheduleOptions: Schedule[], employeeAvailability: EmployeeAvailability }>('/schedules/manager-options', {
          params: { week: currentWeek.toISOString() },
        });
        setScheduleOptions(response.data.scheduleOptions);
        setEmployeeAvailability(response.data.employeeAvailability);
      } catch (error) {
        console.error('Failed to fetch schedule options:', error);
      }
    };

    fetchScheduleOptions();
  }, [currentWeek]);

  const selectSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setCustomSchedule(schedule);
  };

  const saveSchedule = async () => {
    try {
      await api.post('/schedules/select', 
        { schedule: customSchedule, week: currentWeek.toISOString() }
      );
      alert('Schedule saved and sent to employees!');
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  };

  // Updated handleCustomScheduleChange function
  const handleCustomScheduleChange = (day: string, shift: string, value: string) => {
    const availableEmployees = getAvailableEmployees(day, shift);
    if (!availableEmployees.some(e => e.username === value)) {
      alert(`Warning: ${value} is not available for this shift!`);
    }
    setCustomSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [shift]: value
      }
    }));
  };
  

  const shifts = ['07:00-16:00', '10:00-19:00', '13:00-22:00'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="manager-schedule">
      <h1>Manager Schedule</h1>
      <div className="week-navigation">
        <Button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}>
          Previous Week
        </Button>
        <span>{currentWeek.toDateString()}</span>
        <Button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}>
          Next Week
        </Button>
      </div>
      <div className="schedule-options">
        {scheduleOptions.map((option, index) => (
          <div key={index} className="schedule-option" onClick={() => selectSchedule(option)}>
            <h3>Option {index + 1}</h3>
            <Button onClick={(e) => { e.stopPropagation(); shuffleSchedule(index); }}>Shuffle</Button>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    {shifts.map((shift) => (
                      <TableCell key={shift}>{shift}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {days.map((day) => (
                    <TableRow key={day}>
                      <TableCell>{day}</TableCell>
                      {shifts.map((shift) => (
                        <TableCell key={`${day}-${shift}`}>
                          {option[day]?.[shift] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        ))}
      </div>
      <div className="custom-schedule">
        <h2>Custom Schedule</h2>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                {shifts.map((shift) => (
                  <TableCell key={shift}>{shift}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {days.map((day) => (
                <TableRow key={day}>
                  <TableCell>{day}</TableCell>
                  {shifts.map((shift) => (
                    <TableCell key={`${day}-${shift}`}>
                      {editMode ? (
                        <Select
                        value={customSchedule[day]?.[shift] || ''}
                        onChange={(e) => handleCustomScheduleChange(day, shift, e.target.value as string)}
                      >
                        <MenuItem value="">-</MenuItem>
                        {getAvailableEmployees(day, shift).map((employee) => (
                          <MenuItem key={employee.username} value={employee.username}>
                            {employee.name}
                          </MenuItem>
                        ))}
                      </Select>
                      ) : (
                        customSchedule[day]?.[shift] || '-'
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Button variant="contained" color="primary" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Cancel Edit' : 'Edit Schedule'}
        </Button>
        {editMode && (
          <Button variant="contained" color="secondary" onClick={saveSchedule}>
            Save Custom Schedule
          </Button>
        )}
      </div>
      <div className="employee-availability">
        <h2>Employee Availability</h2>
        {days.map((day) => (
          <div key={day}>
            <h3>{day}</h3>
            {shifts.map((shift) => (
              <div key={`${day}-${shift}`}>
              <h4>{shift}</h4>
              <p>Want to work: {employeeAvailability[day]?.[shift]?.filter(e => e.status === 'Want to work').map(e => e.name).join(', ') || 'None'}</p>
              <p>Neutral: {employeeAvailability[day]?.[shift]?.filter(e => e.status === 'Neutral').map(e => e.name).join(', ') || 'None'}</p>
              <p>Can't work: {employeeAvailability[day]?.[shift]?.filter(e => e.status === "Can't work").map(e => e.name).join(', ') || 'None'}</p>
            </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerSchedule;


