import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import EmployeeSchedule from './components/EmployeeSchedule';
import ManagerSchedule from './components/ManagerSchedule';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/employee-schedule" element={<EmployeeSchedule />} />
      <Route path="/manager-schedule" element={<ManagerSchedule />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

