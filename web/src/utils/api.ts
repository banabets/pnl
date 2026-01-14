import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    // Ensure VITE_API_URL ends with /api
    const apiUrl = import.meta.env.VITE_API_URL.trim();
    if (apiUrl.endsWith('/api')) {
      return apiUrl;
    } else if (apiUrl.endsWith('/api/')) {
      return apiUrl.slice(0, -1); // Remove trailing slash
    } else {
      // Add /api if not present
      return apiUrl.endsWith('/') ? `${apiUrl}api` : `${apiUrl}/api`;
    }
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
      return Promise.reject(error);
    }

    // For 401 errors, NEVER automatically clear the token or redirect
    // Let the individual components handle this gracefully
    // The token should only be cleared on explicit logout or when the auth check confirms it's invalid
    if (error.response?.status === 401) {
      // Only log if we have a token (indicates token is invalid/expired, not just missing)
      const token = localStorage.getItem('authToken');
      if (token) {
        console.warn('🔒 Authentication required for:', error.config?.url);
      }
      // If no token, this is expected behavior - components should check auth before making requests
    }

    return Promise.reject(error);
  }
);

export default api;
