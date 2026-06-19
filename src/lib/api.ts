import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.request.use(config => {
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData) && !(config.data instanceof URLSearchParams)) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

export default api;