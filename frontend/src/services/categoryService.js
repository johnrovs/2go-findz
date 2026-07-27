import api from './api.js';

export async function getCategories() {
  const response = await api.get('/public/categories');
  return response.data.data;
}
