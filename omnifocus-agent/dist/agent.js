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
const setup_wizard_1 = require("./setup-wizard");
const child_process_1 = require("child_process");
// Load environment - try various locations
dotenv_1.default.config();
// Check if setup is needed
async function initializeAgent() {
    const setupNeeded = await setup_wizard_1.SetupWizard.checkAndRunSetup();
    if (setupNeeded) {
        console.log('✅ Setup completed. Starting agent...\n');
    }
    // Load configuration after setup
    const config = (0, api_client_1.loadAgentConfig)();
    const agent = new AsanaBridgeAgent(config);
    // Graceful shutdown handlers
    process.on('SIGTERM', () => agent.stop());
    process.on('SIGINT', () => agent.stop());
    await agent.start();
}
// Only run if this file is executed directly
if (require.main === module) {
    // Start the initialization process
    initializeAgent().catch(error => {
        console.error('❌ Failed to initialize agent:', error);
        process.exit(1);
    });
}
class AsanaBridgeAgent {
    constructor(config) {
        this.isRunning = false;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.connectionStatus = 'disconnected';
        this.config = config;
        this.omnifocus = new omnifocus_client_1.OmniFocusClient();
        this.api = new api_client_1.AsanaBridgeAPI(config);
    }
    showNotification(title, message) {
        try {
            // Use macOS osascript to show notification
            const script = `display notification "${message}" with title "${title}"`;
            (0, child_process_1.execSync)(`osascript -e '${script}'`, { stdio: 'ignore' });
        }
        catch (error) {
            // Fallback to console if notification fails
            console.log(`📱 ${title}: ${message}`);
        }
    }
    showStartupProgress() {
        try {
            // Show a temporary dialog to indicate the app is starting
            const script = `
        set progress total steps to 3
        set progress completed steps to 0
        set progress description to "AsanaBridge is starting..."
        set progress additional description to "Connecting to OmniFocus and AsanaBridge service"
        
        delay 1
        set progress completed steps to 1
        set progress additional description to "Checking OmniFocus connection..."
        
        delay 1
        set progress completed steps to 2
        set progress additional description to "Registering with AsanaBridge service..."
        
        delay 1
        set progress completed steps to 3
        set progress additional description to "Ready! Check your menu bar for the AsanaBridge icon."
      `;
            // Run this in the background so it doesn't block startup
            setTimeout(() => {
                try {
                    (0, child_process_1.execSync)(`osascript -e '${script}'`, { stdio: 'ignore' });
                }
                catch (error) {
                    // Progress dialog failed, just show a simple notification
                    this.showNotification('AsanaBridge', 'Agent is starting up...');
                }
            }, 100);
        }
        catch (error) {
            console.log('Failed to show startup progress');
        }
    }
    showSuccessDialog(syncInterval, plan) {
        try {
            const script = `
        display dialog "🎉 AsanaBridge is now running successfully!

✅ Connected to OmniFocus
✅ Connected to AsanaBridge service
⏰ Syncing every ${syncInterval} minutes
📊 Plan: ${plan}

The AsanaBridge icon will appear in your menu bar. Click it anytime to:
• Check sync status
• Trigger manual sync
• View connection details
• Open your dashboard

You can now close this dialog and continue using OmniFocus normally." \\
        with title "AsanaBridge Ready" \\
        buttons {"Open Dashboard", "Close"} \\
        default button "Close" \\
        with icon note
      `;
            // Run in background and handle button clicks
            setTimeout(() => {
                try {
                    const result = (0, child_process_1.execSync)(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
                    if (result.includes('Open Dashboard')) {
                        (0, child_process_1.execSync)('open https://asanabridge.com/dashboard');
                    }
                }
                catch (error) {
                    // User closed dialog or error occurred
                    console.log('Success dialog completed or cancelled');
                }
            }, 1000);
        }
        catch (error) {
            console.log('Failed to show success dialog');
        }
    }
    launchMenuBarApp() {
        try {
            const path = require('path');
            const statusAppPath = path.join(__dirname, '..', 'AsanaBridgeStatus.app');
            // Check if the status app exists
            if (require('fs').existsSync(statusAppPath)) {
                console.log('🖥️  Launching AsanaBridge Status app...');
                const { spawn } = require('child_process');
                // Launch the status app using 'open' command
                const statusProcess = spawn('open', [statusAppPath], {
                    detached: true,
                    stdio: 'ignore'
                });
                statusProcess.unref(); // Don't keep the main process alive for this
                console.log('✅ AsanaBridge Status app launched');
            }
            else {
                console.log('⚠️  Status app not found, building it...');
                this.buildStatusApp();
            }
        }
        catch (error) {
            console.log('Failed to launch status app:', error);
            // Not critical, continue without status app
        }
    }
    buildStatusApp() {
        try {
            const path = require('path');
            const buildScript = path.join(__dirname, '..', 'build-status-app.sh');
            if (require('fs').existsSync(buildScript)) {
                console.log('🔨 Building status app...');
                (0, child_process_1.execSync)(`cd "${path.dirname(buildScript)}" && ./build-status-app.sh`, { stdio: 'pipe' });
                console.log('✅ Status app built successfully');
                // Try to launch it now
                setTimeout(() => this.launchMenuBarApp(), 1000);
            }
        }
        catch (error) {
            console.log('Failed to build status app:', error);
        }
    }
    updateMenuBarStatus(status, message) {
        try {
            this.connectionStatus = status === 'syncing' ? this.connectionStatus : status;
            // Create a simple status display using osascript
            const statusIcon = this.getStatusIcon(status);
            const statusMessage = message || this.getStatusMessage(status);
            // For now, we'll just show notifications for status changes
            // In a full implementation, this would update a proper menu bar app
            if (message) {
                console.log(`🔔 Status: ${statusIcon} ${statusMessage}`);
            }
        }
        catch (error) {
            console.log(`📊 Status update failed: ${error}`);
        }
    }
    getStatusIcon(status) {
        switch (status) {
            case 'connected': return '✅';
            case 'disconnected': return '❌';
            case 'syncing': return '🔄';
            case 'error': return '⚠️';
            default: return '❓';
        }
    }
    getStatusMessage(status) {
        switch (status) {
            case 'connected':
                const lastSync = this.lastSyncTime ? `Last sync: ${this.lastSyncTime.toLocaleTimeString()}` : 'Ready to sync';
                return `AsanaBridge Connected - ${lastSync}`;
            case 'disconnected': return 'AsanaBridge - Not connected';
            case 'syncing': return 'AsanaBridge - Syncing tasks...';
            case 'error': return 'AsanaBridge - Connection error';
            default: return 'AsanaBridge - Unknown status';
        }
    }
    createMenuBarPopup() {
        try {
            const statusMessage = this.getStatusMessage(this.connectionStatus);
            const lastSyncText = this.lastSyncTime ?
                `Last sync: ${this.lastSyncTime.toLocaleString()}` :
                'No sync performed yet';
            // Create a simple dialog showing current status
            const script = `
        display dialog "${statusMessage}
        
${lastSyncText}
        
Status: ${this.isRunning ? 'Running' : 'Stopped'}
Sync in progress: ${this.syncInProgress ? 'Yes' : 'No'}" \\
        with title "AsanaBridge Status" \\
        buttons {"Close", "Sync Now", "Open Dashboard"} \\
        default button "Close"
      `;
            const result = (0, child_process_1.execSync)(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
            if (result.includes('Sync Now')) {
                this.performSync();
            }
            else if (result.includes('Open Dashboard')) {
                (0, child_process_1.execSync)('open https://asanabridge.com/dashboard');
            }
        }
        catch (error) {
            // User cancelled or error occurred
            console.log('Status popup cancelled or failed');
        }
    }
    async start() {
        console.log('🚀 Starting AsanaBridge OmniFocus Agent...');
        // Show prominent startup notification
        this.showNotification('AsanaBridge Started', '🚀 AsanaBridge agent is launching and will appear in your menu bar when ready.');
        this.updateMenuBarStatus('disconnected', 'Starting agent...');
        // Create a temporary visible indicator that the app is running
        this.showStartupProgress();
        try {
            // Test OmniFocus connection
            const ofVersion = this.omnifocus.getVersion();
            console.log(`✅ OmniFocus ${ofVersion} detected`);
            // Register with web service
            await this.api.registerAgent(ofVersion);
            console.log('✅ Registered with AsanaBridge web service');
            this.updateMenuBarStatus('connected', 'Registered with web service');
            // Get plan-based configuration
            const serverConfig = await this.api.getAgentConfig();
            console.log(`📋 Plan: ${serverConfig.plan} - Min sync: ${serverConfig.minSyncIntervalMinutes}min`);
            // Validate and adjust sync interval based on plan
            let syncInterval = parseInt(this.config.SYNC_INTERVAL_MINUTES);
            if (syncInterval < serverConfig.minSyncIntervalMinutes) {
                syncInterval = serverConfig.minSyncIntervalMinutes;
                console.log(`⚠️  Sync interval adjusted to ${syncInterval} minutes (plan minimum)`);
            }
            this.config.SYNC_INTERVAL_MINUTES = syncInterval.toString();
            // Start local HTTP server for health checks
            this.startLocalServer();
            // Schedule periodic sync with plan-adjusted interval
            this.scheduleSync();
            this.isRunning = true;
            console.log(`✅ Agent running - sync every ${syncInterval} minutes (${serverConfig.plan} plan)`);
            // Show success notification with clear instructions
            this.showNotification('AsanaBridge Ready!', `✅ Agent is now running and syncing every ${syncInterval} minutes. Look for the AsanaBridge icon in your menu bar.`);
            this.updateMenuBarStatus('connected', `Ready - syncing every ${syncInterval} minutes`);
            // Create a prominent success dialog
            this.showSuccessDialog(syncInterval, serverConfig.plan);
            // Set up status popup handler (simulates menu bar click)
            this.setupStatusHandler();
            // Launch menu bar status app
            this.launchMenuBarApp();
            // Initial sync
            await this.performSync();
        }
        catch (error) {
            console.error('❌ Failed to start agent:', error);
            this.updateMenuBarStatus('error', 'Failed to start agent');
            process.exit(1);
        }
    }
    setupStatusHandler() {
        // Set up a simple way to show status popup
        // In practice, this would be handled by the actual menu bar app
        process.on('SIGUSR1', () => {
            console.log('📊 Showing status popup...');
            this.createMenuBarPopup();
        });
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
        app.get('/status/popup', (_req, res) => {
            try {
                this.createMenuBarPopup();
                res.json({ message: 'Status popup shown' });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.get('/status', (_req, res) => {
            res.json({
                status: this.connectionStatus,
                running: this.isRunning,
                syncInProgress: this.syncInProgress,
                lastSync: this.lastSyncTime?.toISOString() || null,
                message: this.getStatusMessage(this.connectionStatus)
            });
        });
        const port = 7842; // AsanaBridge agent port
        app.listen(port, 'localhost', () => {
            console.log(`🔧 Agent API listening on http://localhost:${port}`);
        });
    }
    scheduleSync() {
        const cronPattern = `*/${this.config.SYNC_INTERVAL_MINUTES} * * * *`;
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
        this.updateMenuBarStatus('syncing', 'Syncing tasks...');
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
            this.lastSyncTime = new Date();
            console.log('✅ Sync cycle completed');
            this.updateMenuBarStatus('connected', 'Sync completed successfully');
        }
        catch (error) {
            console.error('❌ Sync failed:', error.message);
            this.updateMenuBarStatus('error', `Sync failed: ${error.message}`);
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
