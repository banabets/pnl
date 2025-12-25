import axios from 'axios';

// Auto-detect API URL based on environment
const getApiUrl = () => {
  // Use environment variable if available (for production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If we're on the same origin (served by the backend), use relative path
  if (window.location.port === '3001' || window.location.port === '') {
    return '/api';
  }
  
  // Development: use localhost:3001
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // Production fallback: try to use same origin (won't work if backend is separate)
  return '/api';
};

const API_URL = getApiUrl();

console.log('🔌 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout (increased for trades/start endpoint)
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.config?.url, error.message);
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.error('💡 Network Error - Verifica que el servidor esté corriendo en el puerto 3001');
    }
    return Promise.reject(error);
  }
);

export default api;

