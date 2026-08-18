import api from './api.js';

export async function previewImport(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/products/import/preview', formData);
  return response.data.data;
}

export async function importProducts(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/products/import', formData);
  return response.data.data;
}
