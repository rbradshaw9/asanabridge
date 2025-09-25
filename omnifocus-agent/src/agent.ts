import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { OmniFocusClient } from './omnifocus-client';
import { AsanaBridgeAPI, loadAgentConfig } from './api-client';
import { SetupWizard } from './setup-wizard';

// Load environment - try various locations
dotenv.config();

// Check if setup is needed
async function initializeAgent() {
  const setupNeeded = await SetupWizard.checkAndRunSetup();
  if (setupNeeded) {
    console.log('✅ Setup completed. Starting agent...\n');
  }
  
  // Load configuration after setup
  const config = loadAgentConfig();
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
  private omnifocus: OmniFocusClient;
  private api: AsanaBridgeAPI;
  private config: any;
  private isRunning = false;
  private syncInProgress = false;

  constructor(config: any) {
    this.config = config;
    this.omnifocus = new OmniFocusClient();
    this.api = new AsanaBridgeAPI(config);
  }

  async start(): Promise<void> {
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
      console.log(`✅ Agent running - sync every ${this.config.SYNC_INTERVAL_MINUTES} minutes`);

      // Initial sync
      await this.performSync();

    } catch (error) {
      console.error('❌ Failed to start agent:', error);
      process.exit(1);
    }
  }

  private startLocalServer(): void {
    const app = express();
    app.use(express.json());

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
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    const port = 7842; // AsanaBridge agent port
    app.listen(port, 'localhost', () => {
      console.log(`🔧 Agent API listening on http://localhost:${port}`);
    });
  }

  private scheduleSync(): void {
    const cronPattern = `*/${this.config.SYNC_INTERVAL_MINUTES} * * * *`;
    
    cron.schedule(cronPattern, async () => {
      if (!this.syncInProgress) {
        await this.performSync();
      }
    });
  }

  private async performSync(): Promise<void> {
    if (this.syncInProgress) return;

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

    } catch (error: any) {
      console.error('❌ Sync failed:', error.message);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncMapping(mapping: any): Promise<void> {
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

    } catch (error: any) {
      console.error(`❌ Failed to sync mapping ${mapping.id}:`, error.message);
      await this.api.reportSyncStatus(mapping.id, 'error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async processPendingCommands(): Promise<void> {
    try {
      const commands = await this.api.getPendingSyncCommands();
      
      for (const command of commands) {
        await this.executeCommand(command);
      }
    } catch (error: any) {
      console.error('❌ Failed to process pending commands:', error.message);
    }
  }

  private async executeCommand(command: any): Promise<void> {
    try {
      switch (command.action) {
        case 'create_task':
          await this.omnifocus.createTask(
            command.data.projectName,
            command.data.taskName,
            command.data.options
          );
          break;

        case 'update_task':
          await this.omnifocus.updateTask(
            command.data.taskId,
            command.data.updates
          );
          break;

        case 'delete_task':
          await this.omnifocus.deleteTask(command.data.taskId);
          break;

        default:
          throw new Error(`Unknown command action: ${command.action}`);
      }

      await this.api.acknowledgeCommand(command.id, true);
      console.log(`✅ Executed command: ${command.action}`);

    } catch (error: any) {
      await this.api.acknowledgeCommand(command.id, false, error.message);
      console.error(`❌ Failed to execute command ${command.action}:`, error.message);
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping AsanaBridge Agent...');
    this.isRunning = false;
    process.exit(0);
  }
}

// Export for use as module

export { AsanaBridgeAgent };