import api from './api.js';

export async function getBuyingGuides() {
  const response = await api.get('/admin/buying-guides');
  return response.data.data;
}

export async function getBuyingGuideById(id) {
  const response = await api.get(`/admin/buying-guides/${id}`);
  return response.data.data;
}

export async function createBuyingGuide(payload) {
  const response = await api.post('/admin/buying-guides', payload);
  return response.data.data;
}

export async function updateBuyingGuide(id, payload) {
  const response = await api.put(`/admin/buying-guides/${id}`, payload);
  return response.data.data;
}

export async function deleteBuyingGuide(id) {
  await api.delete(`/admin/buying-guides/${id}`);
}
