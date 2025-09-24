import axios from 'axios';
import { z } from 'zod';

const configSchema = z.object({
  AGENT_KEY: z.string().min(32),
  API_BASE_URL: z.string().url(),
  SYNC_INTERVAL_MINUTES: z.string().transform(Number).default('5'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type AgentConfig = z.infer<typeof configSchema>;

export interface SyncMapping {
  id: string;
  asanaProjectId: string;
  asanaProjectName: string;
  ofProjectName: string;
  isActive: boolean;
  lastSyncAt?: Date;
}

export interface SyncCommand {
  action: 'sync_project' | 'create_task' | 'update_task' | 'delete_task';
  mappingId: string;
  data?: any;
}

export class AsanaBridgeAPI {
  private config: AgentConfig;
  private axios;

  constructor(config: AgentConfig) {
    this.config = config;
    this.axios = axios.create({
      baseURL: config.API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${config.AGENT_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AsanaBridge-Agent/0.1.0'
      },
      timeout: 30000
    });
  }

  // Register this agent with the web service
  async registerAgent(omnifocusVersion: string): Promise<void> {
    await this.axios.post('/api/agent/register', {
      version: omnifocusVersion,
      capabilities: ['projects', 'tasks', 'real-time-sync'],
      platform: process.platform,
      nodeVersion: process.version
    });
  }

  // Get sync mappings for this user
  async getSyncMappings(): Promise<SyncMapping[]> {
    const response = await this.axios.get('/api/agent/mappings');
    return response.data.mappings;
  }

  // Report sync status
  async reportSyncStatus(mappingId: string, status: 'success' | 'error', details?: any): Promise<void> {
    await this.axios.post('/api/agent/sync-status', {
      mappingId,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Get pending sync commands
  async getPendingSyncCommands(): Promise<SyncCommand[]> {
    const response = await this.axios.get('/api/agent/commands');
    return response.data.commands;
  }

  // Acknowledge command completion
  async acknowledgeCommand(commandId: string, success: boolean, error?: string): Promise<void> {
    await this.axios.post('/api/agent/commands/ack', {
      commandId,
      success,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // Send OmniFocus project data to web service
  async sendProjectData(mappingId: string, projectData: any): Promise<void> {
    await this.axios.post('/api/agent/project-data', {
      mappingId,
      projectData,
      timestamp: new Date().toISOString()
    });
  }

  // Send OmniFocus task data to web service
  async sendTaskData(mappingId: string, tasks: any[]): Promise<void> {
    await this.axios.post('/api/agent/task-data', {
      mappingId,
      tasks,
      timestamp: new Date().toISOString()
    });
  }

  // Health check with web service
  async healthCheck(): Promise<boolean> {
    try {
      await this.axios.get('/api/agent/health');
      return true;
    } catch {
      return false;
    }
  }
}

export function loadAgentConfig(): AgentConfig {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid agent configuration:', result.error.format());
    process.exit(1);
  }
  return result.data;
}