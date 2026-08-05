import api from './api.js';

export async function getGithubRepos(params = {}) {
  const { data } = await api.get('/repos', { params });
  return data;
}

export async function getConnectedRepos() {
  const { data } = await api.get('/repos/connected');
  return data;
}

export async function connectRepo(repoId, body) {
  const { data } = await api.post(`/repos/${repoId}/connect`, body);
  return data;
}

export async function getRepoDetail(repoId) {
  const { data } = await api.get(`/repos/${repoId}`);
  return data;
}

export async function getRepoStatus(repoId) {
  const { data } = await api.get(`/repos/${repoId}/status`);
  return data;
}
