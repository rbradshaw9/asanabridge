import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ─── Sync ──────────────────────────────────────────────────────────────────────

export const createSyncMappingSchema = z.object({
  asanaProjectId: z.string().min(1, 'Asana project ID is required'),
  asanaProjectName: z.string().min(1, 'Asana project name is required'),
  omnifocusProjectName: z.string().min(1, 'OmniFocus project name is required'),
});

export const updateSyncMappingSchema = z.object({
  ofProjectName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

// ─── Support ───────────────────────────────────────────────────────────────────

export const createSupportTicketSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  category: z.enum(['GENERAL', 'TECHNICAL', 'BILLING', 'FEATURE', 'BUG']).default('GENERAL'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

export const addTicketResponseSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
});

// ─── Admin ─────────────────────────────────────────────────────────────────────

export const updateUserPlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'CLOSED']),
});

export const adminRespondSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
});

// ─── Agent ─────────────────────────────────────────────────────────────────────

export const agentRegisterSchema = z.object({
  version: z.string().min(1),
  platform: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const agentSyncSchema = z.object({
  mappingId: z.string().min(1),
  tasks: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      note: z.string().optional(),
      completed: z.boolean(),
      dueDate: z.string().optional(),
      projectName: z.string().optional(),
      modifiedAt: z.string().optional(),
    })
  ),
});

export const agentSyncStatusSchema = z.object({
  mappingId: z.string().min(1),
  status: z.enum(['SUCCESS', 'ERROR']),
  itemsSynced: z.number().int().min(0).default(0),
  direction: z.enum(['ASANA_TO_OF', 'OF_TO_ASANA', 'BIDIRECTIONAL']).default('BIDIRECTIONAL'),
  errorMessage: z.string().optional(),
});

// ─── Inferred Types ────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateSyncMappingInput = z.infer<typeof createSyncMappingSchema>;
export type UpdateSyncMappingInput = z.infer<typeof updateSyncMappingSchema>;
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type AgentRegisterInput = z.infer<typeof agentRegisterSchema>;
export type AgentSyncInput = z.infer<typeof agentSyncSchema>;
export type AgentSyncStatusInput = z.infer<typeof agentSyncStatusSchema>;
