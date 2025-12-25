import axios from 'axios';

// Auto-detect API URL based on current hostname (works for localhost and local network)
const getApiUrl = () => {
  // If we're on the same origin (served by the backend), use relative path
  if (window.location.port === '3001' || window.location.port === '') {
    return '/api';
  }
  // Otherwise, use the same hostname but port 3001
  return `${window.location.protocol}//${window.location.hostname}:3001/api`;
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

