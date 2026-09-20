import axios from 'axios';
import { ROUTES } from '../constants/index.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/devlens',
  headers: { 'Content-Type': 'application/json' },
});

let _token = null;

export function setAuthToken(token) {
  _token = token;
}

export function clearAuthToken() {
  _token = null;
}

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      window.location.href = ROUTES.LOGIN;
    }
    return Promise.reject(error);
  }
);

export default api;
