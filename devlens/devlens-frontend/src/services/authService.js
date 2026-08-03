import api from './api.js';

export async function fetchProfile() {
  const { data } = await api.get('/me');
  return data;
}
