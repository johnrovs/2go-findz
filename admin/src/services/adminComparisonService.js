import api from './api.js';

export async function getComparisons() {
  const response = await api.get('/admin/comparisons');
  return response.data.data;
}

export async function getComparisonById(id) {
  const response = await api.get(`/admin/comparisons/${id}`);
  return response.data.data;
}

export async function createComparison(payload) {
  const response = await api.post('/admin/comparisons', payload);
  return response.data.data;
}

export async function updateComparison(id, payload) {
  const response = await api.put(`/admin/comparisons/${id}`, payload);
  return response.data.data;
}

export async function deleteComparison(id) {
  await api.delete(`/admin/comparisons/${id}`);
}
