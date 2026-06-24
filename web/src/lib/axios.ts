import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Response interceptor for consistent error mapping
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract server message or fallback to Axios default
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    
    // Construct a unified error object
    const normalizedError = {
      message,
      status: error.response?.status || 500,
      data: error.response?.data || null,
      originalError: error,
    };
    
    return Promise.reject(normalizedError);
  }
);

export default apiClient;
