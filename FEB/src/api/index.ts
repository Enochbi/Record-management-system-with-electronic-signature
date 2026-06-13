import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://197.159.195.207:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 secondes de timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fgm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('fgm_token');
      localStorage.removeItem('fgm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;