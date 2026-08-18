import api from './api.js';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/images', formData);
  return response.data.data;
}
