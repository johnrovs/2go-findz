import api from './api.js';

export async function getSummary({ from, to } = {}) {
  const response = await api.get('/admin/dashboard/summary', { params: { from, to } });
  return response.data.data;
}

export async function getAnalytics({ from, to } = {}) {
  const response = await api.get('/admin/dashboard/analytics', { params: { from, to } });
  return response.data.data;
}
