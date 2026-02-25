// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserPlan = 'FREE' | 'PRO' | 'ENTERPRISE';

export type SyncDirection = 'ASANA_TO_OF' | 'OF_TO_ASANA' | 'BIDIRECTIONAL';
export type SyncStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';

export type SupportCategory = 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'FEATURE' | 'BUG';
export type SupportPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';

export type AppSessionStatus = 'PENDING' | 'AUTHORIZED' | 'EXPIRED';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  plan: UserPlan;
  isAdmin: boolean;
}

// ─── Asana ────────────────────────────────────────────────────────────────────

export interface AsanaProject {
  gid: string;
  name: string;
  notes?: string;
  archived: boolean;
  public: boolean;
  created_at: string;
  modified_at: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  due_on?: string;
  created_at: string;
  modified_at: string;
  projects: Array<{ gid: string; name: string }>;
  tags: Array<{ gid: string; name: string }>;
}

export interface AsanaUser {
  gid: string;
  name: string;
  email: string;
}

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncMapping {
  id: string;
  userId: string;
  asanaProjectId: string;
  asanaProjectName: string;
  ofProjectName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  userId: string;
  syncMappingId: string;
  direction: SyncDirection;
  status: SyncStatus;
  itemsSynced: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface SyncItem {
  id?: string;
  externalId?: string;
  name: string;
  note?: string;
  completed: boolean;
  dueDate?: Date;
  projectName?: string;
  source: 'asana' | 'omnifocus';
  modifiedAt?: Date;
}

export interface SyncConflict {
  type: 'task';
  field: string;
  asanaValue: any;
  omnifocusValue: any;
  lastSyncValue?: any;
  resolution: 'asana_wins' | 'omnifocus_wins' | 'manual';
}

export interface SyncResult {
  created: SyncItem[];
  updated: SyncItem[];
  deleted: SyncItem[];
  conflicts: SyncConflict[];
  errors: string[];
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export interface AgentConfig {
  syncIntervalMinutes: number;
  features: {
    realTimeSync: boolean;
    advancedFiltering: boolean;
    prioritySync: boolean;
    batchSize: number;
  };
  plan: UserPlan;
}

export interface AgentStatus {
  registered: boolean;
  isOnline: boolean;
  lastHeartbeat: string | null;
  version: string | null;
  agentKey?: string;
}

// ─── Support ──────────────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  userId: string;
  name: string;
  email: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  responses?: SupportTicketResponse[];
}

export interface SupportTicketResponse {
  id: string;
  ticketId: string;
  message: string;
  isFromUser: boolean;
  createdAt: string;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface PlanInfo {
  plan: UserPlan;
  limits: {
    maxProjects: number;
    syncIntervalMinutes: number;
  };
  usage: {
    activeProjects: number;
    canAddMore: boolean;
  };
  features: {
    realTimeSync: boolean;
    advancedFiltering: boolean;
    prioritySupport: boolean;
  };
}

// ─── API Responses ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
