import api from './api.js';

export async function getHeroBanners() {
  const response = await api.get('/admin/hero-banners');
  return response.data.data;
}

export async function createHeroBanner(payload) {
  const response = await api.post('/admin/hero-banners', payload);
  return response.data.data;
}

export async function updateHeroBanner(id, payload) {
  const response = await api.put(`/admin/hero-banners/${id}`, payload);
  return response.data.data;
}

export async function deleteHeroBanner(id) {
  await api.delete(`/admin/hero-banners/${id}`);
}
