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

//added so we can get the employee data for the drop down
interface Employee {
  id: number;
  name: string;
}

//this is for the list at the bottom of the page so we can see the availability of the employees
interface AvailabilityList {
  [day: string]: {
    [shift: string]: {
      preferred: Array<{ id: number; name: string }>;
      available: Array<{ id: number; name: string }>;
      cantWork: Array<{ id: number; name: string }>;
    }
  }
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
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return firstDayOfWeek;
  });
  const [editMode, setEditMode] = useState(false);

  const [availabilityList, setAvailabilityList] = useState<AvailabilityList>({}); //added this one to see if it works

  const [managerName, setManagerName] = useState<string>('');  // Add state for manager's name


  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openPopoverDay, setOpenPopoverDay] = useState<string | null>(null);
  const [openPopoverShift, setOpenPopoverShift] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);

 
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  // Add these new state variables at the beginning of your component
const [expandedDay, setExpandedDay] = useState<string | null>(null);
const [expandedShifts, setExpandedShifts] = useState<{[key: string]: boolean}>({});

  
//these are the arrays that make the organized days and hours, if we chnage the order then they will show in different order in the schedule in the web page as well
  const shifts = ['07:00-16:00', '10:00-19:00', '13:00-22:00'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Adding these helper functions for the drop down list of availability in the manager schedule
const toggleDay = (day: string) => {
  setExpandedDay(expandedDay === day ? null : day);
};

const toggleShift = (dayShift: string) => {
  setExpandedShifts(prev => ({
    ...prev,
    [dayShift]: !prev[dayShift]
  }));
};


//using this one to see if the list of emmployees works
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/schedules/manager-options', {
          params: { 
            week: currentWeek.toISOString(),
            endWeek: new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
          },
        });
        setScheduleOptions(response.data.scheduleOptions);
        setEmployeeAvailability(response.data.employeeAvailability);
        setAvailabilityList(response.data.availabilityList);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, [currentWeek]);

  //adding this one to fetch the manager's name for the welcome message page
  useEffect(() => {
    // Fetch manager's name from the API or context
    const fetchManagerDetails = async () => {
      try {
        const response = await api.get('/auth/manager-details'); // Replace with your actual endpoint
        setManagerName(response.data.name); // Assuming the name is in the 'name' field
      } catch (error) {
        console.error('Failed to fetch manager details:', error);
      }
    };

    fetchManagerDetails();
  }, []);

//adding this one to see if the dropdown employee in the csustom table works 
useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const response = await api.get('/schedules/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  fetchEmployees();
}, []);



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

  const checkForDuplicateAssignments = (schedule: ScheduleData) => {
    const dailyAssignments: { [day: string]: Set<number> } = {};

    for (const day in schedule) {
      dailyAssignments[day] = new Set();
      for (const shift in schedule[day]) {
        const employeeId = schedule[day][shift];
        if (employeeId !== null) {
          if (dailyAssignments[day].has(employeeId)) {
            return true; // Found a duplicate assignment
          }
          dailyAssignments[day].add(employeeId);
        }
      }
    }
    return false; // No duplicate assignments found
  };



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
    // Prepare the schedule data
    const scheduleToSave = editMode ? [customSchedule] : scheduleOptions;
    
    const response = await api.post('/schedules/select', { 
      schedules: scheduleToSave.map((schedule, index) => ({
        data: schedule.data,
        optionNumber: index + 1,
        isSelected: index === selectedOptionIndex
      })),
      week: currentWeek.toISOString(),
      selectedOptionIndex: editMode ? 0 : selectedOptionIndex
    });

    console.log('Server response:', response.data);
    alert('Schedule saved and sent to employees!');
    setEditMode(false);
  } catch (error) {
    console.error('Failed to save schedule:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    alert('Failed to save schedule. Please check the console for more details.');
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
    const dayIndex = days.indexOf(day);
    return employeeAvailability[dayIndex + 1]?.[shift]?.filter(employee => 
      employee.status === 1 || employee.status === 2
    ) || [];
  };

  const handleCellClick = (event: React.MouseEvent<HTMLElement>, day: string, shift: string) => {
    if (editMode) {
      setAnchorEl(event.currentTarget);
      setSelectedDay(day);
      setSelectedShift(shift);
    }
  };


  //for the dropdown menu for the manager to select the employee
  const handlePopoverClose = () => {
    setAnchorEl(null);
    setOpenPopoverDay(null);
    setOpenPopoverShift(null);
  };

  const handleEmployeeSelect = (employeeId: number) => {
    if (selectedDay && selectedShift) {
      handleCustomScheduleChange(selectedDay, selectedShift, employeeId);
    }
    handlePopoverClose();
  };

    

  // Updated the handleCustomScheduleChange function
  const handleCustomScheduleChange = (day: string, shift: string, value: number | null) => {
    if (value !== null) {
      const availableEmployees = getAvailableEmployees(day, shift);
      const selectedEmployee = availableEmployees.find(e => e.id === value);
      if (selectedEmployee && selectedEmployee.status === 0) {
        alert(`Warning: Employee with ID ${value} can't work this shift!`);
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

  // Replace the existing employee availability section with this new version
const renderEmployeeAvailability = () => (
  <div className="employee-availability">
    <h2>Employee Availability</h2>
    {days.map((day) => (
      <div key={day} className="day-dropdown">
        <div 
          className="day-header"
          onClick={() => toggleDay(day)}
        >
          <span>{day}</span>
          <span>{expandedDay === day ? '▼' : '▶'}</span>
        </div>
        
        {expandedDay === day && shifts.map((shift) => (
          <div key={`${day}-${shift}`} className="shift-dropdown">
            <div 
              className="shift-header"
              onClick={() => toggleShift(`${day}-${shift}`)}
            >
              <span>{shift}</span>
              <span>{expandedShifts[`${day}-${shift}`] ? '▼' : '▶'}</span>
            </div>
            
            {expandedShifts[`${day}-${shift}`] && (
              <div className="shift-content">
                <div className="availability-group">
                  <h5>Preferred</h5>
                  <div className="availability-list">
                    {availabilityList[day]?.[shift]?.preferred.map(e => e.name).join(', ') || 'None'}
                  </div>
                </div>
                <div className="availability-group">
                  <h5>Available</h5>
                  <div className="availability-list">
                    {availabilityList[day]?.[shift]?.available.map(e => e.name).join(', ') || 'None'}
                  </div>
                </div>
                <div className="availability-group">
                  <h5>Can't Work</h5>
                  <div className="availability-list">
                    {availabilityList[day]?.[shift]?.cantWork.map(e => e.name).join(', ') || 'None'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    ))}
  </div>
);

    
  return (
    <div className="manager-schedule">
      <h1>
        Welcome {managerName} to your management page
      </h1>
      <div className="week-navigation">
  <Button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}>
    Previous Week
  </Button>
  <span>{currentWeek.toDateString()}</span>
  <Button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}>
    Next Week
  </Button>
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
                   onClick={(e) => handleCellClick(e, day, shift)}
                   style={{ cursor: editMode ? 'pointer' : 'default' }}
                 >
                   {getEmployeeName(customSchedule.data[day]?.[shift])}
                 </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
        <Button onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Cancel Edit' : 'Edit Schedule'}
        </Button>
        {editMode && (
          <Button onClick={saveSchedule}>
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
          <ListItemButton onClick={() => handleEmployeeSelect(0)}>
            <ListItemText primary="Clear" />
          </ListItemButton>
        </ListItem>
        {employees.map((employee) => (
          <ListItem key={employee.id} disablePadding>
            <ListItemButton onClick={() => handleEmployeeSelect(employee.id)}>
              <ListItemText primary={employee.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      </Popover>

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
            {checkForDuplicateAssignments(option.data) && (
              <div className="warning">Warning: Unexpected duplicate assignments detected</div>
            )}
          </div>
      ))}
    </div>

      <div className="employee-availability">
  {renderEmployeeAvailability()}
</div>
    </div>
  );
}  



  
export default ManagerSchedule;