import axios from 'axios';

// const api = axios.create({
//   baseURL: 'http://localhost:5003/api',
// });

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5003/api',
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default api;
