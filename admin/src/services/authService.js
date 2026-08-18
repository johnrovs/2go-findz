import api from './api.js';

export async function loginRequest(username, password) {
  const response = await api.post('/auth/login', { username, password });
  return response.data.data;
}
