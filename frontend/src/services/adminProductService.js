import api from './api.js';

export async function searchProducts(params) {
  const response = await api.get('/admin/products', { params });
  return response.data.data;
}

export async function getProductById(id) {
  const response = await api.get(`/admin/products/${id}`);
  return response.data.data;
}

export async function createProduct(payload) {
  const response = await api.post('/admin/products', payload);
  return response.data.data;
}

export async function updateProduct(id, payload) {
  const response = await api.put(`/admin/products/${id}`, payload);
  return response.data.data;
}

export async function deleteProduct(id) {
  await api.delete(`/admin/products/${id}`);
}

export async function getDistinctBrands() {
  const response = await api.get('/admin/products/brands');
  return response.data.data;
}
