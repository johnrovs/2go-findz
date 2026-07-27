import api from './api.js';

export async function searchProducts(params) {
  const response = await api.get('/public/products', { params });
  return response.data.data;
}

export async function getProductById(id) {
  const response = await api.get(`/public/products/${id}`);
  return response.data.data;
}
