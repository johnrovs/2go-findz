import api from './api.js';

export async function getBuyingGuides() {
  const response = await api.get('/public/buying-guides');
  return response.data.data;
}

export async function getBuyingGuideById(id) {
  const response = await api.get(`/public/buying-guides/${id}`);
  return response.data.data;
}
