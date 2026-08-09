import api from './api.js';

export async function getBuyingGuides() {
  const response = await api.get('/public/buying-guides');
  return response.data.data;
}

export async function getBuyingGuideBySlug(slug) {
  const response = await api.get(`/public/buying-guides/${slug}`);
  return response.data.data;
}
