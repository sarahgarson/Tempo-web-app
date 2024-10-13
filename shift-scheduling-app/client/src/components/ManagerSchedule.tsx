import React, { useState, useEffect } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField } from '@mui/material';
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
    [shift: string]: string[];
  };
}

const ManagerSchedule: React.FC = () => {
  const [scheduleOptions, setScheduleOptions] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [customSchedule, setCustomSchedule] = useState<Schedule>({});
  const [employeeAvailability, setEmployeeAvailability] = useState<EmployeeAvailability>({});
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editMode, setEditMode] = useState(false);

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

  const handleCustomScheduleChange = (day: string, shift: string, value: string) => {
    if (!employeeAvailability[day][shift].includes(value)) {
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

  const shifts = ['7:00-16:00', '10:00-19:00', '13:00-22:00'];
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
                        <TextField
                          value={customSchedule[day]?.[shift] || ''}
                          onChange={(e) => handleCustomScheduleChange(day, shift, e.target.value)}
                        />
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
              <p key={`${day}-${shift}`}>
                {shift}: {employeeAvailability[day]?.[shift]?.join(', ') || 'No employees available'}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerSchedule;


