import axios from 'axios';

const backendAxios = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds
});

// Response interceptor to format errors from NestJS consistently
backendAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Backend service error';
    
    const normalizedError = {
      message,
      status: error.response?.status || 500,
      data: error.response?.data || null,
      originalError: error,
    };
    
    return Promise.reject(normalizedError);
  }
);

export default backendAxios;
