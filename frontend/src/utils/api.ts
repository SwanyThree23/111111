import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const msg = error.response.data?.error || 'An error occurred';
      if (error.response.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
      else if (error.response.status >= 500) toast.error('Server error. Please try again.');
      else toast.error(msg);
    } else { toast.error('Network error. Check your connection.'); }
    return Promise.reject(error);
  }
);

export default api;
