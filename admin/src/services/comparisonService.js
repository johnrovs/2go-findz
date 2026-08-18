import api from './api.js';

export async function getComparisons() {
  const response = await api.get('/public/comparisons');
  return response.data.data;
}

export async function getComparisonBySlug(slug) {
  const response = await api.get(`/public/comparisons/${slug}`);
  return response.data.data;
}
