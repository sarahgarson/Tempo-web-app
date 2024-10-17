const generateScheduleOptions = (employeeAvailability) => {
  const scheduleOptions = [];
  const daysOfWeek = Object.keys(employeeAvailability);
  
  // Generate two schedule options
  for (let i = 0; i < 2; i++) {
    const option = {};
    
    daysOfWeek.forEach(day => {
      option[day] = {};
      const shifts = employeeAvailability[day];
      
      Object.keys(shifts).forEach(shift => {
        const availableEmployees = shifts[shift].filter(emp => emp.status === 1);
        if (availableEmployees.length > 0) {
          // Randomly select an employee for this shift
          const randomIndex = Math.floor(Math.random() * availableEmployees.length);
          option[day][shift] = availableEmployees[randomIndex];
        } else {
          option[day][shift] = null;
        }
      });
    });
    
    scheduleOptions.push(option);
  }
  
  return scheduleOptions;
};
