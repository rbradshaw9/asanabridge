"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsanaBridgeAPI = void 0;
exports.loadAgentConfig = loadAgentConfig;
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const configSchema = zod_1.z.object({
    AGENT_KEY: zod_1.z.string().min(32),
    API_BASE_URL: zod_1.z.string().url(),
    SYNC_INTERVAL_MINUTES: zod_1.z.string().transform(Number).default('5'),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info')
});
class AsanaBridgeAPI {
    constructor(config) {
        this.config = config;
        this.axios = axios_1.default.create({
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
    async registerAgent(omnifocusVersion) {
        await this.axios.post('/api/agent/register', {
            version: omnifocusVersion,
            capabilities: ['projects', 'tasks', 'real-time-sync'],
            platform: process.platform,
            nodeVersion: process.version
        });
    }
    // Get sync mappings for this user
    async getSyncMappings() {
        const response = await this.axios.get('/api/agent/mappings');
        return response.data.mappings;
    }
    // Report sync status
    async reportSyncStatus(mappingId, status, details) {
        await this.axios.post('/api/agent/sync-status', {
            mappingId,
            status,
            details,
            timestamp: new Date().toISOString()
        });
    }
    // Get pending sync commands
    async getPendingSyncCommands() {
        const response = await this.axios.get('/api/agent/commands');
        return response.data.commands;
    }
    // Acknowledge command completion
    async acknowledgeCommand(commandId, success, error) {
        await this.axios.post('/api/agent/commands/ack', {
            commandId,
            success,
            error,
            timestamp: new Date().toISOString()
        });
    }
    // Send OmniFocus project data to web service
    async sendProjectData(mappingId, projectData) {
        await this.axios.post('/api/agent/project-data', {
            mappingId,
            projectData,
            timestamp: new Date().toISOString()
        });
    }
    // Send OmniFocus task data to web service
    async sendTaskData(mappingId, tasks) {
        await this.axios.post('/api/agent/task-data', {
            mappingId,
            tasks,
            timestamp: new Date().toISOString()
        });
    }
    // Health check with web service
    async healthCheck() {
        try {
            await this.axios.get('/api/agent/health');
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.AsanaBridgeAPI = AsanaBridgeAPI;
function loadAgentConfig() {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid agent configuration:', result.error.format());
        process.exit(1);
    }
    return result.data;
}
