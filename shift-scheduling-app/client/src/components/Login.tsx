import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, TextField, Typography, Container } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import axios from 'axios';
import '../styles/Login.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003';


const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for token in URL (for Google OAuth callback)
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const role = params.get('role');
    if (token && role) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      navigateBasedOnRole(role);
    }
  }, [location]);

  const navigateBasedOnRole = (role: string) => {
    if (role === 'employee') {
      navigate('/employee-schedule');
    } else {
      navigate('/manager-schedule');
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password }, { withCredentials: true });
      console.log('Login response:', response.data);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      navigateBasedOnRole(response.data.role);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Login failed:', error.response?.data || error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  };
  
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;

  };

  return (
    <Container maxWidth="xs" className="login-container">
      <Typography variant="h4" className="login-title">Login</Typography>
      <form onSubmit={handleLogin} className="login-form">
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="contained" color="primary" fullWidth className="login-button">
          Login
        </Button>
      </form>
      <Button
        variant="contained"
        color="secondary"
        fullWidth
        startIcon={<GoogleIcon />}
        onClick={handleGoogleLogin}
        className="google-button"
      >
        Login with Google
      </Button>
    </Container>
  );
};

export default Login;
