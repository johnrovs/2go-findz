import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

export function normalizeError(error) {
  const data = error.response?.data;
  if (data?.errors) {
    return { message: data.message ?? 'Validation failed.', fieldErrors: data.errors };
  }
  if (data?.message) {
    return { message: data.message, fieldErrors: null };
  }
  return { message: 'Network error. Please try again.', fieldErrors: null };
}

export default api;
