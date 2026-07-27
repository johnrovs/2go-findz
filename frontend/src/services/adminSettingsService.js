import api from './api.js';

export async function getSettings() {
  const response = await api.get('/admin/settings');
  return response.data.data;
}

export async function updateSettings(payload) {
  const response = await api.put('/admin/settings', payload);
  return response.data.data;
}
