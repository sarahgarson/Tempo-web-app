import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { setAvailability } from '../redux/actions';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import axios from 'axios';
import '../styles/EmployeeSchedule.css';
import api from '../utils/api';

const EmployeeSchedule: React.FC = () => {
  const dispatch = useDispatch();
  const availability = useSelector((state: RootState) => state.availability);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const numberToDay: Record<number, string> = {
    1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
  };

  const dayToNumber: Record<string, number> = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
  };

  const formatAvailability = (data: any[]) => {
    const formatted: Record<number, Record<string, number>> = {};
    data.forEach(item => {
      if (!formatted[item.day_of_week]) formatted[item.day_of_week] = {};
      formatted[item.day_of_week][`${item.start_time}-${item.end_time}`] = item.status;
    });
    return formatted;
  };

  useEffect(() => {
    localStorage.setItem('currentWeek', currentWeek.toISOString());
  }, [currentWeek]);

  useEffect(() => {
    const storedWeek = localStorage.getItem('currentWeek');
    if (storedWeek) {
      setCurrentWeek(new Date(storedWeek));
    }

    const storedAvailability = localStorage.getItem('availability');
    if (storedAvailability) {
      dispatch(setAvailability(JSON.parse(storedAvailability)));
    } else {
      fetchAvailability();
    }
  }, []);

  const fetchAvailability = async () => {
    try {
      const weekString = currentWeek.toISOString().split('T')[0];
      const response = await api.get('/schedules/availability', {
        params: { week: weekString },
      });
      const formattedAvailability = formatAvailability(response.data);
      dispatch(setAvailability(formattedAvailability));
      localStorage.setItem('availability', JSON.stringify(formattedAvailability));
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  };

  const handleAvailabilityChange = (day: string, shift: string) => {
    const dayNumber = dayToNumber[day];
    const newAvailability = JSON.parse(JSON.stringify(availability));
    if (!newAvailability[dayNumber]) {
      newAvailability[dayNumber] = {};
    }
    if (!newAvailability[dayNumber][shift]) {
      newAvailability[dayNumber][shift] = 0;
    }
    newAvailability[dayNumber][shift] = (newAvailability[dayNumber][shift] + 1) % 3;
    dispatch(setAvailability(newAvailability));
    localStorage.setItem('availability', JSON.stringify(newAvailability));
  };

  const saveAvailability = async () => {
    try {
      const weekString = currentWeek.toISOString().split('T')[0];
      const response = await api.post('/schedules/availability', 
        { availability, week: weekString }
      );
      console.log('Save availability response:', response.data);
      alert('Availability saved successfully!');
    } catch (error) {
      console.error('Failed to save availability:', error);
    }
  };

  const getAvailabilityStatus = (status: number) => {
    switch (status) {
      case 0: return 'Neutral';
      case 1: return 'Can\'t Work';
      case 2: return 'Want to Work';
      default: return 'Neutral';
    }
  };

  const shifts = ['7:00-16:00', '10:00-19:00', '13:00-22:00'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getAvailabilityColor = (status: number) => {
    switch (status) {
      case 0: return 'white';
      case 1: return '#ffcccb'; 
      case 2: return '#90ee90'; 
      default: return 'white';
    }
  };

  return (
    <div className="employee-schedule">
      <h1>Employee Schedule</h1>
      <div className="week-navigation">
        <Button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}>
          Previous Week
        </Button>
        <span>{currentWeek.toDateString()}</span>
        <Button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}>
          Next Week
        </Button>
      </div>
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
                {shifts.map((shift) => {
                  const dayNumber = dayToNumber[day];
                  return (
                    <TableCell 
                      key={`${day}-${shift}`} 
                      onClick={() => handleAvailabilityChange(day, shift)}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: getAvailabilityColor(availability[dayNumber]?.[shift] || 0)
                      }}
                    >
                      {getAvailabilityStatus(availability[dayNumber]?.[shift] || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="contained" color="primary" onClick={saveAvailability} className="save-button">
        Save Availability
      </Button>
    </div>
  );
};

export default EmployeeSchedule;



