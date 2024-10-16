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
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return firstDayOfWeek;
  });

  const numberToDay: Record<number, string> = {
    1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
  };

  const dayToNumber: Record<string, number> = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
  };

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // useEffect(() => {
  //   const fetchAvailability = async () => {
  //     try {
  //       const weekString = formatDateToString(currentWeek);
  //       const response = await api.get('/schedules/availability', {
  //         params: { week: weekString },
  //       });
  //       if (response.data.length) {
  //         const formattedAvailability = formatAvailability(response.data);
  //         dispatch(setAvailability(formattedAvailability));
  //       } else {
  //         dispatch(setAvailability({})); // If no data, reset availability
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch availability:', error);
  //     }
  //   };
  
  //   fetchAvailability();
  // }, [currentWeek]);
  

  useEffect(() => {
    fetchAvailability();
  }, [currentWeek]);
  
  const fetchAvailability = async () => {
    try {
      const weekString = formatDateToString(currentWeek);
      console.log('Fetching availability for week:', weekString);
      const response = await api.get('/schedules/availability', {
        params: { week: weekString },
      });
      console.log('Fetched availability (raw):', response.data);
      const formattedAvailability = formatAvailability(response.data);
      console.log('Formatted availability:', formattedAvailability);
      dispatch(setAvailability(formattedAvailability));
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  };
  
  
  const formatAvailability = (data: any[]) => {
    const formattedAvailability: { [key: string]: { [key: string]: number } } = {};
    data.forEach(item => {
      const dayOfWeek = item.day_of_week.toString();
      if (!formattedAvailability[dayOfWeek]) {
        formattedAvailability[dayOfWeek] = {};
      }
      const startTime = item.start_time.slice(0, 5);
      const endTime = item.end_time.slice(0, 5);
      const shiftKey = `${item.start_time.slice(0, 5)}-${item.end_time.slice(0, 5)}`;
      formattedAvailability[dayOfWeek][shiftKey] = item.status;
      console.log(`Formatting: Day ${dayOfWeek}, Shift ${shiftKey}, Status ${item.status}`);
    });
    return formattedAvailability;
  };
  

  const handleAvailabilityChange = (day: string, shift: string) => {
    const dayNumber = dayToNumber[day];
    const newAvailability = JSON.parse(JSON.stringify(availability));
    if (!newAvailability[dayNumber]) {
      newAvailability[dayNumber] = {};
    }
    if (newAvailability[dayNumber][shift] === undefined) {
      newAvailability[dayNumber][shift] = 0;
    }
    newAvailability[dayNumber][shift] = (newAvailability[dayNumber][shift] + 1) % 3;
    dispatch(setAvailability(newAvailability));
    setUnsavedChanges(true);
  };

  const saveAvailability = async () => {
    try {
      const weekString = formatDateToString(currentWeek);
      const response = await api.post('/schedules/availability', 
        { availability, week: weekString }
      );
      console.log('Save response:', response.data);
      alert('Availability saved successfully!');
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save availability:', error);
      if ((error as any).response) {
        console.error('Error response:', (error as any).response.data);
      }
      alert('Failed to save availability. Please try again.');
    }
  };
  
  
  const changeWeek = (direction: 'prev' | 'next') => {
    if (unsavedChanges) {
      const confirmChange = window.confirm('You have unsaved changes. Are you sure you want to change weeks without saving?');
      if (!confirmChange) {
        return;
      }
    }
    setCurrentWeek(prevWeek => {
      const newWeek = new Date(prevWeek);
      newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
      return newWeek;
    });
  };

  const formatDateToString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };


  const getAvailabilityStatus = (status: number) => {
    switch (status) {
      // case 0: return 'Neutral';
      case 1: return 'Can\'t Work';
      case 2: return 'Want to Work';
      default: return 'Neutral';
    }
  };

  const shifts = ['07:00-16:00', '10:00-19:00', '13:00-22:00'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getAvailabilityColor = (status: number) => {
    switch (status) {
      case 0: return 'white';
      case 1: return '#ffcccb'; 
      case 2: return '#90ee90'; 
      default: return 'white';
    }
  };

  const renderAvailabilityCell = (day: string, shift: string): React.ReactNode => {
    const dayNumber = dayToNumber[day];
    console.log(`Rendering cell for day ${day} (${dayNumber}), shift ${shift}`);
    console.log('Current availability state:', availability);

    const status = availability[dayNumber]?.[shift] ?? 0;
    console.log(`Cell status: ${status}`);
    
    const backgroundColor = getAvailabilityColor(status);
    const statusText = getAvailabilityStatus(status);

    return (
      <div style={{ backgroundColor, padding: '8px', cursor: 'pointer' }}>
        {statusText}
      </div>
    );
  };


  return (
    <div className="employee-schedule">
      <h1>Employee Schedule</h1>
      <div className="week-navigation">
        <Button onClick={() => changeWeek('prev')}>Previous Week</Button>
        <span>{currentWeek.toDateString()}</span>
        <Button onClick={() => changeWeek('next')}>Next Week</Button>
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
            {days.map((day: string) => (
              <TableRow key={day}>
                <TableCell>{day}</TableCell>
                {shifts.map((shift: string) => (
                  <TableCell key={shift} onClick={() => handleAvailabilityChange(day, shift)}>
                    {renderAvailabilityCell(day, shift)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="contained" color="primary" onClick={() => saveAvailability()} className="save-button">
        Save Availability
      </Button>
    </div>
  );
};

export default EmployeeSchedule;



