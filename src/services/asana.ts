import axios from 'axios';
import { logger } from '../config/logger';

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

export class AsanaClient {
  private accessToken: string;
  private baseURL = 'https://app.asana.com/api/1.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(endpoint: string, options: any = {}): Promise<T> {
    try {
      const response = await axios({
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        ...options
      });
      
      return response.data.data;
    } catch (error: any) {
      logger.error('Asana API error', {
        endpoint,
        status: error.response?.status,
        message: error.response?.data?.errors?.[0]?.message || error.message
      });
      throw new Error(`Asana API error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  async getCurrentUser(): Promise<AsanaUser> {
    return this.makeRequest<AsanaUser>('/users/me');
  }

  async getProjects(): Promise<AsanaProject[]> {
    return this.makeRequest<AsanaProject[]>('/projects?limit=100&archived=false');
  }

  async getProject(projectGid: string): Promise<AsanaProject> {
    return this.makeRequest<AsanaProject>(`/projects/${projectGid}`);
  }

  async getProjectTasks(projectGid: string): Promise<AsanaTask[]> {
    return this.makeRequest<AsanaTask[]>(`/projects/${projectGid}/tasks?limit=100&opt_fields=gid,name,notes,completed,completed_at,due_on,created_at,modified_at,projects,tags`);
  }

  async getTask(taskGid: string): Promise<AsanaTask> {
    return this.makeRequest<AsanaTask>(`/tasks/${taskGid}?opt_fields=gid,name,notes,completed,completed_at,due_on,created_at,modified_at,projects,tags`);
  }

  async createTask(projectGid: string, taskData: {
    name: string;
    notes?: string;
    due_on?: string;
  }): Promise<AsanaTask> {
    return this.makeRequest<AsanaTask>('/tasks', {
      method: 'POST',
      data: {
        data: {
          name: taskData.name,
          notes: taskData.notes,
          due_on: taskData.due_on,
          projects: [projectGid]
        }
      }
    });
  }

  async updateTask(taskGid: string, updates: {
    name?: string;
    notes?: string;
    completed?: boolean;
    due_on?: string;
  }): Promise<AsanaTask> {
    return this.makeRequest<AsanaTask>(`/tasks/${taskGid}`, {
      method: 'PUT',
      data: { data: updates }
    });
  }

  async deleteTask(taskGid: string): Promise<void> {
    await this.makeRequest(`/tasks/${taskGid}`, {
      method: 'DELETE'
    });
  }

  // Webhook management
  async createWebhook(resource: string, target: string): Promise<any> {
    return this.makeRequest('/webhooks', {
      method: 'POST',
      data: {
        data: {
          resource,
          target
        }
      }
    });
  }

  async getWebhooks(): Promise<any[]> {
    return this.makeRequest('/webhooks');
  }

  async deleteWebhook(webhookGid: string): Promise<void> {
    await this.makeRequest(`/webhooks/${webhookGid}`, {
      method: 'DELETE'
    });
  }
}