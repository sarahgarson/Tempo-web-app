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
      const response = await axios.post('http://localhost:5003/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      if (response.data.role === 'employee') {
        navigate('/employee-schedule');
      } else {
        navigate('/manager-schedule');
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Handle error (e.g., show error message to user)
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5003/api/auth/google';
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