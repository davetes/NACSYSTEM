import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  headers: {
    'X-API-KEY': 'admin_api_key'
  }
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // no-op
  }
  return config;
});

// Optional: handle 401 globally
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err?.response?.status === 401) {
      // If unauthorized, drop token and redirect to login
      try { localStorage.removeItem('auth_token'); } catch (e) {}
      // soft redirect without hard reload to keep SPA state minimal
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;


