import axios, { AxiosInstance } from 'axios';
import { AsanaProject, AsanaTask, AsanaUser, AsanaWorkspace } from '@asanabridge/shared';
import { logger } from '../config/logger';

export class AsanaClient {
  private http: AxiosInstance;

  constructor(accessToken: string) {
    this.http = axios.create({
      baseURL: 'https://app.asana.com/api/1.0',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.http.interceptors.response.use(
      (r) => r,
      (err) => {
        logger.error('Asana API error', {
          module: 'ASANA',
          status: err.response?.status,
          url: err.config?.url,
          error: err.response?.data?.errors ?? err.message,
        });
        return Promise.reject(err);
      }
    );
  }

  async getCurrentUser(): Promise<AsanaUser> {
    const res = await this.http.get<{ data: AsanaUser }>('/users/me');
    return res.data.data;
  }

  async getWorkspaces(): Promise<AsanaWorkspace[]> {
    const res = await this.http.get<{ data: AsanaWorkspace[] }>('/workspaces');
    return res.data.data ?? [];
  }

  async getProjects(workspaceGid?: string): Promise<AsanaProject[]> {
    const url = workspaceGid
      ? `/workspaces/${workspaceGid}/projects`
      : '/projects';
    const res = await this.http.get<{ data: AsanaProject[] }>(url, {
      params: { archived: false, limit: 100 },
    });
    return res.data.data ?? [];
  }

  async getProject(projectGid: string): Promise<AsanaProject> {
    const res = await this.http.get<{ data: AsanaProject }>(`/projects/${projectGid}`);
    return res.data.data;
  }

  async getProjectTasks(projectGid: string): Promise<AsanaTask[]> {
    const res = await this.http.get<{ data: AsanaTask[] }>(
      `/projects/${projectGid}/tasks`,
      {
        params: {
          opt_fields: 'gid,name,notes,completed,completed_at,due_on,created_at,modified_at,projects,tags',
          limit: 100,
        },
      }
    );
    return res.data.data ?? [];
  }

  async getTask(taskGid: string): Promise<AsanaTask> {
    const res = await this.http.get<{ data: AsanaTask }>(`/tasks/${taskGid}`, {
      params: {
        opt_fields: 'gid,name,notes,completed,completed_at,due_on,created_at,modified_at,projects,tags',
      },
    });
    return res.data.data;
  }

  async createTask(data: {
    name: string;
    notes?: string;
    projectGid: string;
    dueOn?: string;
    completed?: boolean;
  }): Promise<AsanaTask> {
    const res = await this.http.post<{ data: AsanaTask }>('/tasks', {
      data: {
        name: data.name,
        notes: data.notes,
        projects: [data.projectGid],
        due_on: data.dueOn ?? null,
        completed: data.completed ?? false,
      },
    });
    return res.data.data;
  }

  async updateTask(
    taskGid: string,
    updates: {
      name?: string;
      notes?: string;
      completed?: boolean;
      dueOn?: string | null;
    }
  ): Promise<AsanaTask> {
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.notes !== undefined) body.notes = updates.notes;
    if (updates.completed !== undefined) body.completed = updates.completed;
    if ('dueOn' in updates) body.due_on = updates.dueOn;

    const res = await this.http.put<{ data: AsanaTask }>(`/tasks/${taskGid}`, {
      data: body,
    });
    return res.data.data;
  }

  async deleteTask(taskGid: string): Promise<void> {
    await this.http.delete(`/tasks/${taskGid}`);
  }
}
