import axios from 'axios';

// const api = axios.create({
//   baseURL: 'http://localhost:5003/api',
// });

const getBaseUrl = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:5003/api';
  }
  return 'https://tempo-web-app.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
