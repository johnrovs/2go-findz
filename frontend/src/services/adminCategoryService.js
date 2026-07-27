import api from './api.js';

export async function getCategories({ sortBy, direction } = {}) {
  const response = await api.get('/admin/categories', { params: { sortBy, direction } });
  return response.data.data;
}

export async function createCategory(payload) {
  const response = await api.post('/admin/categories', payload);
  return response.data.data;
}

export async function updateCategory(id, payload) {
  const response = await api.put(`/admin/categories/${id}`, payload);
  return response.data.data;
}

export async function deleteCategory(id) {
  await api.delete(`/admin/categories/${id}`);
}
