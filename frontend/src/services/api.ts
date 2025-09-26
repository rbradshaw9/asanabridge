import axios from 'axios';

const API_BASE_URL = '/api';

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

export interface AsanaStatusResponse {
  connected: boolean;
  user?: {
    name: string;
    email: string;
    gid: string;
  };
}

export interface AgentKeyResponse {
  agentKey: string;
  message: string;
}

export interface AgentStatusResponse {
  hasKey: boolean;
  keyCreatedAt?: string;
  lastHeartbeat?: string;
  isOnline: boolean;
}

export interface PlanInfoResponse {
  plan: string;
  currentProjects: number;
  maxProjects: number;
  isUnlimited: boolean;
  canAddMore: boolean;
  memberSince: string;
  features: {
    unlimitedProjects: boolean;
    prioritySupport: boolean;
    advancedSync: boolean;
  };
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
  
  getAsanaStatus: () =>
    api.get<AsanaStatusResponse>('/oauth/asana/status'),
  
  getAsanaWorkspaces: () =>
    api.get<{ workspaces: any[] }>('/oauth/asana/workspaces'),

  getAsanaProjects: (workspaceGid?: string) =>
    api.get<{ projects: any[] }>(`/oauth/asana/projects${workspaceGid ? `?workspace=${workspaceGid}` : ''}`),
  
  generateAgentKey: () =>
    api.post<AgentKeyResponse>('/agent/generate-key'),
  
  getAgentStatus: () =>
    api.get<AgentStatusResponse>('/agent/status'),
  
  getPlanInfo: () =>
    api.get<PlanInfoResponse>('/sync/plan'),
  
  createSyncMapping: (asanaProjectId: string, asanaProjectName: string, omnifocusProjectName: string) =>
    api.post('/sync/mappings', { asanaProjectId, asanaProjectName, omnifocusProjectName }),
  
  getSyncMappings: () =>
    api.get<{ mappings: any[] }>('/sync/mappings'),

  deleteSyncMapping: (mappingId: string) =>
    api.delete(`/sync/mappings/${mappingId}`),

  updateProfile: (name: string) =>
    api.patch('/auth/profile', { name }),

  updatePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/password', { currentPassword, newPassword }),
  
  health: () =>
    api.get('/health'),

  // Support methods
  createSupportTicket: (ticketData: {
    name: string;
    email: string;
    subject: string;
    category: string;
    message: string;
    priority: string;
  }) =>
    api.post('/support/ticket', ticketData),

  getSupportTickets: () =>
    api.get<{ tickets: any[] }>('/support/tickets'),

  getSupportTicket: (ticketId: string) =>
    api.get<{ ticket: any }>(`/support/tickets/${ticketId}`),

  addSupportResponse: (ticketId: string, message: string) =>
    api.post(`/support/tickets/${ticketId}/response`, { message }),
};

export default api;