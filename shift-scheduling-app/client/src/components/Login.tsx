import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Typography, Container } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import axios from 'axios';
import '../styles/Login.css';
import api from '../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, role } = response.data;
      console.log('Received role:', role); // Debug log
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);

      if (role === 'manager') {
        console.log('Redirecting to manager dashboard');
        navigate('/manager-schedule');
      } else if (role === 'employee') {
        console.log('Redirecting to employee dashboard');
        navigate('/employee-schedule');
      } else {
        console.log('Unknown role:', role);
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials and try again.');
    }
};



  const handleGoogleLogin = () => {
    console.log('Current hostname:', window.location.hostname);
    
    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5003/api'
      : 'https://tempo-web-app.onrender.com/api';
        
    console.log('Using API URL:', apiUrl);
    const googleAuthUrl = `${apiUrl}/auth/google`;
    console.log('Redirecting to:', googleAuthUrl);
    
    window.location.href = googleAuthUrl;
  };
  
  
  
  
  return (
    <Container maxWidth="xs" className="login-container">
      <Typography variant="h4" className="login-title">Tempo Web Application</Typography>
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

