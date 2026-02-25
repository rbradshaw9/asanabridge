import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  SyncMapping,
  SyncLog,
  AsanaProject,
  AsanaTask,
  AsanaWorkspace,
  SupportTicket,
  AgentStatus,
  PlanInfo,
} from '@asanabridge/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Axios Instance ───────────────────────────────────────────────────────────

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach token from localStorage on every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear stored token so the app routes to /login
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      // The AuthContext listener will handle the redirect
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    http.post<{ token: string; user: User }>('/api/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    http.post<{ token: string; user: User }>('/api/auth/login', { email, password }),

  me: () =>
    http.get<{ user: User }>('/api/auth/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    http.patch<{ user: User }>('/api/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.patch('/api/auth/password', { currentPassword, newPassword }),

  versionCheck: (version: string) =>
    http.get<{ supported: boolean; latest: string; changelog: string[] }>(
      `/api/auth/app/version-check?version=${version}`
    ),
};

// ─── OAuth ────────────────────────────────────────────────────────────────────

export const oauthApi = {
  getAuthorizeUrl: () =>
    http.get<{ url: string }>('/api/oauth/asana/authorize'),

  getStatus: () =>
    http.get<{ connected: boolean; asanaUserId?: string; asanaUserName?: string }>(
      '/api/oauth/asana/status'
    ),

  disconnect: () =>
    http.delete('/api/oauth/asana/disconnect'),

  getWorkspaces: () =>
    http.get<{ workspaces: AsanaWorkspace[] }>('/api/oauth/asana/workspaces'),

  getProjects: (workspaceId?: string) =>
    http.get<{ projects: AsanaProject[] }>(
      '/api/oauth/asana/projects' + (workspaceId ? `?workspaceId=${workspaceId}` : '')
    ),

  getProjectTasks: (projectId: string) =>
    http.get<{ tasks: AsanaTask[] }>(`/api/oauth/asana/projects/${projectId}/tasks`),
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const syncApi = {
  createMapping: (data: {
    asanaProjectId: string;
    asanaProjectName: string;
    ofProjectName: string;
    syncDirection?: string;
  }) => http.post<{ mapping: SyncMapping }>('/api/sync/mappings', data),

  getMappings: () =>
    http.get<{ mappings: SyncMapping[] }>('/api/sync/mappings'),

  updateMapping: (id: string, data: Partial<SyncMapping>) =>
    http.put<{ mapping: SyncMapping }>(`/api/sync/mappings/${id}`, data),

  deleteMapping: (id: string) =>
    http.delete(`/api/sync/mappings/${id}`),

  triggerSync: (id: string) =>
    http.post(`/api/sync/mappings/${id}/sync`),

  getMappingHistory: (id: string) =>
    http.get<{ logs: SyncLog[] }>(`/api/sync/mappings/${id}/history`),

  getStats: () =>
    http.get<{ totalMappings: number; totalSyncs: number; lastSyncAt: string | null }>(
      '/api/sync/stats'
    ),

  getPlan: () =>
    http.get<PlanInfo>('/api/sync/plan'),
};

// ─── Agent ────────────────────────────────────────────────────────────────────

export const agentApi = {
  getStatus: () =>
    http.get<AgentStatus>('/api/agent/status'),

  generateKey: () =>
    http.post<{ agentKey: string }>('/api/agent/generate-key'),

  disconnect: () =>
    http.post('/api/agent/disconnect'),

  getRecentSyncs: () =>
    http.get<{ logs: SyncLog[] }>('/api/agent/recent-syncs'),
};

// ─── Support ─────────────────────────────────────────────────────────────────

export const supportApi = {
  createTicket: (data: {
    subject: string;
    body: string;
    category: string;
    priority?: string;
  }) => http.post<{ ticket: SupportTicket }>('/api/support', data),

  getTickets: () =>
    http.get<{ tickets: SupportTicket[] }>('/api/support'),

  getTicket: (id: string) =>
    http.get<{ ticket: SupportTicket }>(`/api/support/${id}`),

  reply: (id: string, body: string) =>
    http.post(`/api/support/${id}/reply`, { body }),

  close: (id: string) =>
    http.patch(`/api/support/${id}/close`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () =>
    http.get<{
      users: { total: number; pro: number; enterprise: number; free: number };
      sync: { activeMappings: number; today: number; last7Days: number };
      support: { openTickets: number };
    }>('/api/admin/stats'),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    http.get('/api/admin/users', { params }),

  getUser: (id: string) =>
    http.get(`/api/admin/users/${id}`),

  updatePlan: (id: string, plan: string) =>
    http.patch(`/api/admin/users/${id}/plan`, { plan }),

  toggleAdmin: (id: string, isAdmin: boolean) =>
    http.patch(`/api/admin/users/${id}/admin`, { isAdmin }),

  deleteUser: (id: string) =>
    http.delete(`/api/admin/users/${id}`),

  getSupportTickets: (params?: { status?: string; page?: number; limit?: number }) =>
    http.get('/api/admin/support', { params }),

  updateTicketStatus: (id: string, status: string) =>
    http.patch(`/api/admin/support/${id}/status`, { status }),

  respondToTicket: (id: string, body: string) =>
    http.post(`/api/admin/support/${id}/respond`, { body }),
};
