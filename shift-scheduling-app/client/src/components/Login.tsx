import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Typography, Container } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import axios from 'axios';
import '../styles/Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      navigate('/employee-schedule');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <Container maxWidth="xs" className="login-container">
      <Typography variant="h3" className="login-title">Shift Scheduling App</Typography>
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
        <Button type="submit" variant="contained" color="secondary" fullWidth className="login-button">
          Login
        </Button>
      </form>
      <Button
        variant="contained"
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
