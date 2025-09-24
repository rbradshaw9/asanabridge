"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsanaBridgeAgent = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_cron_1 = __importDefault(require("node-cron"));
const omnifocus_client_1 = require("./omnifocus-client");
const api_client_1 = require("./api-client");
// Load environment
dotenv_1.default.config();
const config = (0, api_client_1.loadAgentConfig)();
class AsanaBridgeAgent {
    constructor() {
        this.isRunning = false;
        this.syncInProgress = false;
        this.omnifocus = new omnifocus_client_1.OmniFocusClient();
        this.api = new api_client_1.AsanaBridgeAPI(config);
    }
    async start() {
        console.log('🚀 Starting AsanaBridge OmniFocus Agent...');
        try {
            // Test OmniFocus connection
            const ofVersion = this.omnifocus.getVersion();
            console.log(`✅ OmniFocus ${ofVersion} detected`);
            // Register with web service
            await this.api.registerAgent(ofVersion);
            console.log('✅ Registered with AsanaBridge web service');
            // Start local HTTP server for health checks
            this.startLocalServer();
            // Schedule periodic sync
            this.scheduleSync();
            this.isRunning = true;
            console.log(`✅ Agent running - sync every ${config.SYNC_INTERVAL_MINUTES} minutes`);
            // Initial sync
            await this.performSync();
        }
        catch (error) {
            console.error('❌ Failed to start agent:', error);
            process.exit(1);
        }
    }
    startLocalServer() {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.get('/health', (_req, res) => {
            res.json({
                status: 'ok',
                running: this.isRunning,
                syncInProgress: this.syncInProgress,
                omnifocusVersion: this.omnifocus.getVersion(),
                lastSync: new Date().toISOString()
            });
        });
        app.post('/sync/trigger', async (_req, res) => {
            if (this.syncInProgress) {
                return res.status(409).json({ error: 'Sync already in progress' });
            }
            try {
                await this.performSync();
                res.json({ message: 'Sync completed successfully' });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        const port = 7842; // AsanaBridge agent port
        app.listen(port, 'localhost', () => {
            console.log(`🔧 Agent API listening on http://localhost:${port}`);
        });
    }
    scheduleSync() {
        const cronPattern = `*/${config.SYNC_INTERVAL_MINUTES} * * * *`;
        node_cron_1.default.schedule(cronPattern, async () => {
            if (!this.syncInProgress) {
                await this.performSync();
            }
        });
    }
    async performSync() {
        if (this.syncInProgress)
            return;
        this.syncInProgress = true;
        console.log('🔄 Starting sync cycle...');
        try {
            // Check web service health
            const webServiceHealthy = await this.api.healthCheck();
            if (!webServiceHealthy) {
                throw new Error('Web service is not accessible');
            }
            // Get active sync mappings
            const mappings = await this.api.getSyncMappings();
            console.log(`📋 Found ${mappings.length} active sync mappings`);
            // Process each mapping
            for (const mapping of mappings) {
                await this.syncMapping(mapping);
            }
            // Process any pending commands from web service
            await this.processPendingCommands();
            console.log('✅ Sync cycle completed');
        }
        catch (error) {
            console.error('❌ Sync failed:', error.message);
        }
        finally {
            this.syncInProgress = false;
        }
    }
    async syncMapping(mapping) {
        try {
            console.log(`🔄 Syncing: ${mapping.asanaProjectName} ↔ ${mapping.ofProjectName}`);
            // Get OmniFocus project data
            const ofTasks = await this.omnifocus.getProjectTasks(mapping.ofProjectName);
            // Send to web service for comparison with Asana
            await this.api.sendTaskData(mapping.id, ofTasks);
            // Report successful sync
            await this.api.reportSyncStatus(mapping.id, 'success', {
                tasksFound: ofTasks.length,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error(`❌ Failed to sync mapping ${mapping.id}:`, error.message);
            await this.api.reportSyncStatus(mapping.id, 'error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    async processPendingCommands() {
        try {
            const commands = await this.api.getPendingSyncCommands();
            for (const command of commands) {
                await this.executeCommand(command);
            }
        }
        catch (error) {
            console.error('❌ Failed to process pending commands:', error.message);
        }
    }
    async executeCommand(command) {
        try {
            switch (command.action) {
                case 'create_task':
                    await this.omnifocus.createTask(command.data.projectName, command.data.taskName, command.data.options);
                    break;
                case 'update_task':
                    await this.omnifocus.updateTask(command.data.taskId, command.data.updates);
                    break;
                case 'delete_task':
                    await this.omnifocus.deleteTask(command.data.taskId);
                    break;
                default:
                    throw new Error(`Unknown command action: ${command.action}`);
            }
            await this.api.acknowledgeCommand(command.id, true);
            console.log(`✅ Executed command: ${command.action}`);
        }
        catch (error) {
            await this.api.acknowledgeCommand(command.id, false, error.message);
            console.error(`❌ Failed to execute command ${command.action}:`, error.message);
        }
    }
    async stop() {
        console.log('🛑 Stopping AsanaBridge Agent...');
        this.isRunning = false;
        process.exit(0);
    }
}
exports.AsanaBridgeAgent = AsanaBridgeAgent;
// Main execution
async function main() {
    const agent = new AsanaBridgeAgent();
    // Graceful shutdown handlers
    process.on('SIGTERM', () => agent.stop());
    process.on('SIGINT', () => agent.stop());
    // Start the agent
    await agent.start();
}
// Only run if this file is executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Agent crashed:', error);
        process.exit(1);
    });
}
