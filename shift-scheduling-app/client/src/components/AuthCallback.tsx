import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const role = params.get('role');

    if (token && role) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      navigate(role === 'employee' ? '/employee-schedule' : '/manager-schedule');
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  return <div>Authenticating...</div>;
};

export default AuthCallback;

