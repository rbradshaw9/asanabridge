"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsanaClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../config/logger");
class AsanaClient {
    constructor(accessToken) {
        this.baseURL = 'https://app.asana.com/api/1.0';
        this.accessToken = accessToken;
    }
    async makeRequest(endpoint, options = {}) {
        try {
            const response = await (0, axios_1.default)({
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                ...options
            });
            // Log the full response for debugging
            logger_1.logger.info('Asana API response', {
                endpoint,
                status: response.status,
                dataKeys: Object.keys(response.data || {})
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Asana API error', {
                endpoint,
                status: error.response?.status,
                message: error.response?.data?.errors || error.message,
                responseData: error.response?.data
            });
            throw error;
        }
    }
    async getCurrentUser() {
        const response = await this.makeRequest('/users/me');
        return response.data;
    }
    async getWorkspaces() {
        const response = await this.makeRequest('/workspaces');
        return response.data || [];
    }
    async getProjects(workspaceGid) {
        let endpoint = '/projects?limit=100&archived=false&opt_fields=gid,name,notes,archived,public,created_at,modified_at,workspace';
        if (workspaceGid) {
            endpoint += `&workspace=${workspaceGid}`;
        }
        const response = await this.makeRequest(endpoint);
        return response.data || [];
    }
    async getProject(projectGid) {
        return this.makeRequest(`/projects/${projectGid}`);
    }
    async getProjectTasks(projectGid) {
        return this.makeRequest(`/projects/${projectGid}/tasks?limit=100&opt_fields=gid,name,notes,completed,completed_at,due_on,created_at,modified_at,projects,tags`);
    }
    async getTask(taskGid) {
        return this.makeRequest(`/tasks/${taskGid}?opt_fields=gid,name,notes,completed,completed_at,due_on,created_at,modified_at,projects,tags`);
    }
    async createTask(projectGid, taskData) {
        return this.makeRequest('/tasks', {
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
    async updateTask(taskGid, updates) {
        return this.makeRequest(`/tasks/${taskGid}`, {
            method: 'PUT',
            data: { data: updates }
        });
    }
    async deleteTask(taskGid) {
        await this.makeRequest(`/tasks/${taskGid}`, {
            method: 'DELETE'
        });
    }
    // Webhook management
    async createWebhook(resource, target) {
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
    async getWebhooks() {
        return this.makeRequest('/webhooks');
    }
    async deleteWebhook(webhookGid) {
        await this.makeRequest(`/webhooks/${webhookGid}`, {
            method: 'DELETE'
        });
    }
}
exports.AsanaClient = AsanaClient;
