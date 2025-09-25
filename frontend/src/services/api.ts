import axios from 'axios';

const API_BASE_URL = 'https://asanabridge.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface AsanaAuthResponse {
  authUrl: string;
  message: string;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, name }),
  
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  getProfile: () =>
    api.get<{ user: User }>('/auth/profile'),
  
  getAsanaAuthUrl: () =>
    api.get<AsanaAuthResponse>('/oauth/asana/authorize'),
  
  health: () =>
    api.get('/health'),
};

export default api;