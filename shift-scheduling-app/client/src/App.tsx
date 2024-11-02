import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import EmployeeSchedule from './components/EmployeeSchedule';
import ManagerSchedule from './components/ManagerSchedule';
import PrivateRoute from './components/PrivateRoute';
import AuthCallback from './components/AuthCallback';
import { GoogleOAuthProvider } from '@react-oauth/google';

const App: React.FC = () => {
  return (
    
    <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/auth-callback" element={<AuthCallback />} />
    <Route 
      path="/manager-schedule" 
      element={
        <PrivateRoute allowedRoles={['manager']}>
          <ManagerSchedule />
        </PrivateRoute>
      } 
    />
    <Route 
      path="/employee-schedule" 
      element={
        <PrivateRoute allowedRoles={['employee', 'manager']}>
          <EmployeeSchedule />
        </PrivateRoute>
      } 
    />
    <Route path="/" element={<Navigate to="/login" />} />
    <Route path="*" element={<AuthCallback />} /> {/* Catch-all route */}
  </Routes>
  
  );
};

export default App;


