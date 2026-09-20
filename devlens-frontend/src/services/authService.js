import api from './api.js';

export async function fetchProfile() {
  const { data } = await api.get('/me');
  return data;
}

export async function logout(refreshToken) {
  const { data } = await api.post('/auth/logout', { refreshToken });
  return data;
}
