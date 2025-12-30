import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback for local development
  if (window.location.port === '3001' || window.location.port === '') {
    return '/api';
  }
  return `${window.location.protocol}//${window.location.hostname}:3001/api`;
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration and rate limiting - only clear token if it's actually invalid/expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 429 (Rate Limit) errors - don't clear token, just show a message
    if (error.response?.status === 429) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Too many requests. Please wait a moment.';
      console.warn('⚠️ Rate limit exceeded:', errorMessage);
      // Don't clear token on rate limit - the user is still authenticated
      // Just reject the promise so the component can handle it gracefully
      return Promise.reject(error);
    }
    
    // Only handle 401 errors that are authentication-related
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.error || '';
      const isAuthError = errorMessage.includes('token') || 
                         errorMessage.includes('Authentication') || 
                         errorMessage.includes('expired') ||
                         errorMessage.includes('Invalid') ||
                         error.config?.url?.includes('/auth/');
      
      // Only clear token if it's a real authentication error, not a network error
      // Network errors don't have error.response, so we ignore those
      if (isAuthError && error.response) {
        // Don't clear token if we're already on the login/profile page
        // This prevents clearing token when checking auth status
        const isAuthPage = window.location.pathname === '/' || 
                          window.location.pathname.includes('profile');
        
        // Only clear and redirect if not on auth page
        if (!isAuthPage) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userId');
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
