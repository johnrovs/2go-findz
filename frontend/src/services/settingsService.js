import api from './api.js';

export async function getSettings() {
  const response = await api.get('/public/settings');
  return response.data.data;
}
