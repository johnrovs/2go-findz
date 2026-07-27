import api from './api.js';

export async function getHeroBanners() {
  const response = await api.get('/public/hero-banners');
  return response.data.data;
}
