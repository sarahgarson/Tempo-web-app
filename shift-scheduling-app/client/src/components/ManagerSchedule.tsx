import React, { useState, useEffect } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import axios from 'axios';
import '../styles/ManagerSchedule.css';

interface Schedule {
  [day: string]: {
    [shift: string]: string;
  };
}

const ManagerSchedule: React.FC = () => {
  const [scheduleOptions, setScheduleOptions] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    fetchScheduleOptions();
  }, [currentWeek]);

  const fetchScheduleOptions = async () => {
    try {
      const response = await axios.get<Schedule[]>('http://localhost:5000/api/schedules/options', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { week: currentWeek.toISOString() },
      });
      setScheduleOptions(response.data);
    } catch (error) {
      console.error('Failed to fetch schedule options:', error);
    }
  };

  const selectSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
  };

  const saveSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      await axios.post('http://localhost:5000/api/schedules/select', 
        { schedule: selectedSchedule, week: currentWeek.toISOString() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Schedule saved and sent to employees!');
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
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
      {selectedSchedule && (
        <div className="selected-schedule">
          <h2>Selected Schedule</h2>
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
                        {selectedSchedule[day]?.[shift] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button variant="contained" color="primary" onClick={saveSchedule} className="save-button">
            Save and Send Schedule
          </Button>
        </div>
      )}
    </div>
  );
};

export default ManagerSchedule;

