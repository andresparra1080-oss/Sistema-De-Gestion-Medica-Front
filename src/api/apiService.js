import apiClient from './axiosClient';

export const apiService = {
  get: (endpoint, params = {}) => apiClient.get(endpoint, { params }),
  post: (endpoint, data = {}) => apiClient.post(endpoint, data),
  put: (endpoint, data = {}) => apiClient.put(endpoint, data),
  patch: (endpoint, data = {}) => apiClient.patch(endpoint, data),
  del: (endpoint) => apiClient.delete(endpoint),
};

export const authApi = {
  login: (credentials) => apiService.post('/auth/login', credentials),
  logout: () => apiService.post('/auth/logout'),
};

export const patientApi = {
  getAll: () => apiService.get('/patients'),
  getById: (id) => apiService.get(`/patients/${id}`),
  create: (payload) => apiService.post('/patients', payload),
};
