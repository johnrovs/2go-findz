import api from './api.js';

export async function recordView() {
  const response = await api.post('/public/views');
  return response.data.data;
}

export async function recordClick(productId, sessionId) {
  await api.post(`/public/products/${productId}/click`, sessionId ? { sessionId } : undefined);
}
