import React, { useState, useEffect } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Select, MenuItem, Popover, List, ListItem, ListItemText, ListItemButton } from '@mui/material';
import axios from 'axios';
import '../styles/ManagerSchedule.css';
import api from '../utils/api';
import { useCallback } from 'react';

interface ScheduleData {
  [day: string]: {
    [shift: string]: number | null;
  };
}

interface Schedule {
  data: ScheduleData;
  optionNumber: number;
  isSelected: boolean;
}


interface EmployeeAvailability {
  [day: string]: {
    [shift: string]: Array<{
      id: number;
      name: string;
      status: number;
    }>;
  };
}


const ManagerSchedule: React.FC = () => {
  const [scheduleOptions, setScheduleOptions] = useState<Schedule[]>([]);
  const [customSchedule, setCustomSchedule] = useState<Schedule>({
    data: {},
    optionNumber: 0,
    isSelected: false
  });
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  // const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [employeeAvailability, setEmployeeAvailability] = useState<EmployeeAvailability>({});
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editMode, setEditMode] = useState(false);


  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openPopoverDay, setOpenPopoverDay] = useState<string | null>(null);
  const [openPopoverShift, setOpenPopoverShift] = useState<string | null>(null);

 
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  

  const shifts = ['07:00-16:00', '10:00-19:00', '13:00-22:00'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Initialize scheduleOptions and customSchedule
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/schedules/manager-options', {
          params: { 
            week: currentWeek.toISOString(),
          },
        });
        setScheduleOptions(response.data.scheduleOptions);
        setEmployeeAvailability(response.data.employeeAvailability);
        console.log('Employee Availability:', response.data.employeeAvailability);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, [currentWeek]);


  
  

  const fetchManagerOptions = useCallback(async () => {
    try {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(currentWeek.getDate() - currentWeek.getDay() + (currentWeek.getDay() === 0 ? -6 : 1));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      console.log('Fetching manager options for week:', weekStart.toISOString(), 'to', weekEnd.toISOString());
      const response = await api.get('/schedules/manager-options', {
        params: { 
          week: weekStart.toISOString(),
          endWeek: weekEnd.toISOString()
        },
      });
      console.log('Received response:', response.data);

      // Ensuring the received scheduleOptions have the correct structure
      const formattedScheduleOptions = response.data.scheduleOptions.map((option: any, index: number) => ({
        data: option,
        optionNumber: index + 1,
        isSelected: option.isSelected || false
      }));

      setScheduleOptions(formattedScheduleOptions);
      console.log('Received employee availability:', response.data.employeeAvailability);
      setEmployeeAvailability(response.data.employeeAvailability || {});

      const selectedIndex = formattedScheduleOptions.findIndex((option: Schedule) => option.isSelected);
      setSelectedOptionIndex(selectedIndex !== -1 ? selectedIndex : null);
    } catch (error) {
      console.error('Failed to fetch manager options:', error);
    }
  }, [currentWeek]);



useEffect(() => {
  fetchManagerOptions();
}, [fetchManagerOptions, currentWeek]);



const getEmployeeName = (employeeId: number | null) => {
  if (employeeId === null) return '';
  for (const day in employeeAvailability) {
    for (const shift in employeeAvailability[day]) {
      const employee = employeeAvailability[day]?.[shift]?.find(e => e.id === employeeId);
      if (employee) return employee.name;  // Make sure this is a string
    }
  }
  return 'Unknown';  // Return a string
};


const getEmployeeStatus = (day: string, shift: string, employeeId: number | null) => {
  if (employeeId === null) return '';
  const employee = employeeAvailability[day]?.[shift]?.find(e => e.id === employeeId);
  return employee ? getStatusText(employee.status) : '';  // Ensure it's a string or valid JSX
};


const shuffleSchedule = async (optionIndex: number) => {
  try {
    const response = await api.post('/schedules/shuffle', {
      week: currentWeek.toISOString(),
    });
    const newScheduleOptions = [...scheduleOptions];
    newScheduleOptions[optionIndex] = {
      data: response.data.schedule,
      optionNumber: optionIndex + 1,
      isSelected: optionIndex === selectedOptionIndex
    };
    setScheduleOptions(newScheduleOptions);
  } catch (error) {
    console.error('Failed to shuffle schedule:', error);
  }
};



const selectSchedule = (schedule: Schedule) => {
  setSelectedOptionIndex(scheduleOptions.findIndex(option => option.optionNumber === schedule.optionNumber));
  setCustomSchedule(schedule);
};


    const saveSchedule = async () => {
      try {
        await api.post('/schedules/select', { 
          schedules: scheduleOptions,
          week: currentWeek.toISOString(),
          selectedOptionIndex
        });
        alert('Schedule saved and sent to employees!');
        setEditMode(false);
      } catch (error) {
        console.error('Failed to save schedule:', error);
      }
    };

    const handleOptionSelect = (index: number) => {
      setSelectedOptionIndex(index);
      setCustomSchedule(scheduleOptions[index]);
    };
  
  
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Can't work";
      case 1: return 'Available';
      case 2: return 'Preferred';
      default: return 'Unknown';
    }
  };


  const getAvailableEmployees = (day: string, shift: string) => {
    const dayIndex = days.indexOf(day) + 1;
    const availableEmployees = employeeAvailability[dayIndex]?.[shift]?.filter(employee => 
      employee.status === 1 || employee.status === 2
    ) || [];
    console.log('Available employees for', day, shift, ':', availableEmployees);
    return availableEmployees;
  };

  const handleCellClick = (event: React.MouseEvent<HTMLElement>, day: string, shift: string) => {
    if (editMode) {
      setAnchorEl(event.currentTarget);
      setSelectedDay(day);
      setSelectedShift(shift);
    }
  };


  //for the dropdown menu for the manager to select the employee
  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, day: string, shift: string) => {
    event.stopPropagation();
    if (editMode) {
      setAnchorEl(event.currentTarget);
      setOpenPopoverDay(day);
      setOpenPopoverShift(shift);
      console.log('Popover opened for', day, shift);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setOpenPopoverDay(null);
    setOpenPopoverShift(null);
  };

  const handleEmployeeSelect = (employeeId: number | null) => {
    console.log('Employee selected:', employeeId, 'for', openPopoverDay, openPopoverShift);
    if (openPopoverDay && openPopoverShift) {
      handleCustomScheduleChange(openPopoverDay, openPopoverShift, employeeId);
    }
    handlePopoverClose();
  };

    

  // Update the handleCustomScheduleChange function
  const handleCustomScheduleChange = (day: string, shift: string, value: number | null) => {
    if (value !== null) {
      const availableEmployees = getAvailableEmployees(day, shift);
      if (!availableEmployees.some(e => e.id === value)) {
        alert(`Warning: Employee with ID ${value} is not available for this shift!`);
      }
    }
    setCustomSchedule(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [day]: {
          ...prev.data[day],
          [shift]: value
        }
      }
    }));
  };

  const renderSafely = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

    
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
          <div key={index} className={`schedule-option ${selectedOptionIndex === index ? 'selected' : ''}`} onClick={() => handleOptionSelect(index)}>
            <h3>Option {renderSafely(option.optionNumber)}</h3>
            <Button onClick={(e) => { e.stopPropagation(); shuffleSchedule(index); }}>Shuffle</Button>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    {shifts.map((shift) => (
                      <TableCell key={shift}>{renderSafely(shift)}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {days.map((day) => (
                    <TableRow key={renderSafely(day)}>
                      <TableCell>{renderSafely(day)}</TableCell>
                      {shifts.map((shift) => (
                        <TableCell key={`${renderSafely(day)}-${renderSafely(shift)}`}>
                          {option.data && option.data[day] && option.data[day][shift] !== undefined ? (
                            <>
                              {renderSafely(getEmployeeName(option.data[day][shift]))}
                              <div className="employee-status">
                                {renderSafely(getEmployeeStatus(day, shift, option.data[day][shift]))}
                              </div>
                            </>
                          ) : '-'}
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
                  <TableCell 
                    key={`${day}-${shift}`}
                    onClick={(e) => editMode && handlePopoverOpen(e, day, shift)}
                    style={{ cursor: editMode ? 'pointer' : 'default' }}
                  >
                    {getEmployeeName(customSchedule.data && customSchedule.data[day] ? customSchedule.data[day][shift] : null)}
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
          <Button variant="contained" color="primary" onClick={saveSchedule}>
            Save Custom Schedule
          </Button>
        )}
      </div>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleEmployeeSelect(null)}>
              <ListItemText primary="Clear" />
            </ListItemButton>
          </ListItem>
          {openPopoverDay && openPopoverShift && getAvailableEmployees(openPopoverDay, openPopoverShift).map((employee) => (
            <ListItem key={employee.id} disablePadding>
              <ListItemButton onClick={() => handleEmployeeSelect(employee.id)}>
                <ListItemText 
                  primary={employee.name} 
                  secondary={getStatusText(employee.status)} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Popover>
      <div className="employee-availability">
  <h2>Employee Availability</h2>
  {Array.isArray(days) && days.map((day) => (
    <div key={day}>
      <h3>{typeof day === 'string' || typeof day === 'number' ? day : 'Invalid day'}</h3>
      {Array.isArray(shifts) && shifts.map((shift) => (
        <div key={`${day}-${shift}`}>
          <h4>{typeof shift === 'string' || typeof shift === 'number' ? shift : 'Invalid shift'}</h4>
          <p>Preferred: {Array.isArray(employeeAvailability[day]?.[shift]) ? employeeAvailability[day][shift].filter((e: any) => e.status === 2).map((e: any) => e.name).join(', ') : 'None'}</p>
          <p>Available: {Array.isArray(employeeAvailability[day]?.[shift]) ? employeeAvailability[day][shift].filter((e: any) => e.status === 1).map((e: any) => e.name).join(', ') : 'None'}</p>
          <p>Can't work: {Array.isArray(employeeAvailability[day]?.[shift]) ? employeeAvailability[day][shift].filter((e: any) => e.status === 0).map((e: any) => e.name).join(', ') : 'None'}</p>
        </div>
      ))}
    </div>
  ))}
</div>
    </div>
  );
}  



  
export default ManagerSchedule;