import { logger } from '../config/logger';
import { prisma } from '../config/database';
import { AsanaClient } from './asana';
import { AsanaOAuth } from './asana-oauth';
import { DataMapper, SyncItem, SyncConflict, SyncResult } from './data-mapper';

export interface SyncContext {
  userId: string;
  mappingId: string;
  asanaProjectId: string;
  omnifocusProjectName: string;
  lastSyncAt?: Date;
}

export interface SyncState {
  asanaTasks: SyncItem[];
  omnifocusTasks: SyncItem[];
  conflicts: SyncConflict[];
  operations: SyncOperation[];
}

export interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  target: 'asana' | 'omnifocus';
  item: SyncItem;
  originalItem?: SyncItem;
}

export class ConflictResolver {
  // Resolve conflicts using various strategies
  static resolveConflicts(conflicts: SyncConflict[], strategy: 'asana_wins' | 'omnifocus_wins' | 'newest_wins' | 'manual' = 'newest_wins'): SyncConflict[] {
    return conflicts.map(conflict => {
      switch (strategy) {
        case 'asana_wins':
          conflict.resolution = 'asana_wins';
          break;
        case 'omnifocus_wins':
          conflict.resolution = 'omnifocus_wins';
          break;
        case 'newest_wins':
          // Compare modification dates to determine winner
          const asanaDate = conflict.asanaValue?.modifiedAt || new Date(0);
          const ofDate = conflict.omnifocusValue?.modifiedAt || new Date(0);
          conflict.resolution = asanaDate > ofDate ? 'asana_wins' : 'omnifocus_wins';
          break;
        default:
          conflict.resolution = 'manual';
      }
      return conflict;
    });
  }

  // Detect conflicts between Asana and OmniFocus items
  static detectConflicts(asanaItem: SyncItem, ofItem: SyncItem, lastSyncData?: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Name conflict
    if (asanaItem.name !== ofItem.name) {
      conflicts.push({
        type: 'task',
        field: 'name',
        asanaValue: asanaItem.name,
        omnifocusValue: ofItem.name,
        lastSyncValue: lastSyncData?.name,
        resolution: 'manual'
      });
    }

    // Note conflict
    if (asanaItem.note !== ofItem.note) {
      conflicts.push({
        type: 'task',
        field: 'note',
        asanaValue: asanaItem.note,
        omnifocusValue: ofItem.note,
        lastSyncValue: lastSyncData?.note,
        resolution: 'manual'
      });
    }

    // Completion status conflict
    if (asanaItem.completed !== ofItem.completed) {
      conflicts.push({
        type: 'task',
        field: 'completed',
        asanaValue: asanaItem.completed,
        omnifocusValue: ofItem.completed,
        lastSyncValue: lastSyncData?.completed,
        resolution: 'manual'
      });
    }

    // Due date conflict
    const asanaDue = asanaItem.dueDate?.getTime();
    const ofDue = ofItem.dueDate?.getTime();
    if (asanaDue !== ofDue) {
      conflicts.push({
        type: 'task',
        field: 'dueDate',
        asanaValue: asanaItem.dueDate,
        omnifocusValue: ofItem.dueDate,
        lastSyncValue: lastSyncData?.dueDate,
        resolution: 'manual'
      });
    }

    return conflicts;
  }
}

export class SyncEngine {
  private userId: string;
  private asanaClient?: AsanaClient;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Initialize Asana client with user's tokens
  private async initializeAsanaClient(): Promise<void> {
    const accessToken = await AsanaOAuth.getValidTokenForUser(this.userId);
    if (!accessToken) {
      throw new Error('No valid Asana token found for user');
    }
    this.asanaClient = new AsanaClient(accessToken);
  }

  // Main sync orchestration method
  async performSync(context: SyncContext): Promise<SyncResult> {
    logger.info('Starting sync operation', { 
      userId: context.userId, 
      mappingId: context.mappingId 
    });

    const result: SyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      conflicts: [],
      errors: []
    };

    try {
      // Initialize clients
      await this.initializeAsanaClient();

      // Get current state from both systems
      const syncState = await this.gatherSyncState(context);
      result.itemsProcessed = syncState.asanaTasks.length + syncState.omnifocusTasks.length;

      // Detect conflicts
      syncState.conflicts = await this.detectAllConflicts(syncState, context);
      
      // Resolve conflicts
      const resolvedConflicts = ConflictResolver.resolveConflicts(syncState.conflicts, 'newest_wins');
      result.conflicts = resolvedConflicts;

      // Generate sync operations
      const operations = await this.generateSyncOperations(syncState, resolvedConflicts);
      syncState.operations = operations;

      // Execute operations
      const executionResult = await this.executeSyncOperations(operations, context);
      result.itemsCreated = executionResult.created;
      result.itemsUpdated = executionResult.updated;
      result.itemsDeleted = executionResult.deleted;

      // Update sync metadata
      await this.updateSyncMetadata(context);

      result.success = true;
      logger.info('Sync completed successfully', { 
        userId: context.userId,
        mappingId: context.mappingId,
        result 
      });

    } catch (error: any) {
      result.errors.push(error.message);
      logger.error('Sync failed', { 
        userId: context.userId,
        mappingId: context.mappingId,
        error: error.message 
      });
    }

    // Log sync result
    await this.logSyncResult(context, result);

    return result;
  }

  // Gather current state from both Asana and OmniFocus
  private async gatherSyncState(context: SyncContext): Promise<SyncState> {
    const [asanaTasks, omnifocusTasks] = await Promise.all([
      this.getAsanaTasks(context.asanaProjectId),
      this.getOmniFocusTasksFromAgent(context.mappingId)
    ]);

    return {
      asanaTasks,
      omnifocusTasks,
      conflicts: [],
      operations: []
    };
  }

  // Get tasks from Asana
  private async getAsanaTasks(projectId: string): Promise<SyncItem[]> {
    if (!this.asanaClient) throw new Error('Asana client not initialized');
    
    const tasks = await this.asanaClient.getProjectTasks(projectId);
    return tasks.map(task => DataMapper.asanaTaskToSync(task));
  }

  // Get tasks from OmniFocus via agent (placeholder - agent will call our API)
  private async getOmniFocusTasksFromAgent(mappingId: string): Promise<SyncItem[]> {
    // This would be populated by the agent calling our API
    // For now, return empty array as placeholder
    return [];
  }

  // Detect conflicts between all items
  private async detectAllConflicts(syncState: SyncState, context: SyncContext): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];
    
    // Create maps for efficient lookup
    const asanaMap = new Map(syncState.asanaTasks.map(task => [task.name.toLowerCase(), task]));
    const ofMap = new Map(syncState.omnifocusTasks.map(task => [task.name.toLowerCase(), task]));

    // Get last sync data for conflict detection
    const lastSyncData = await this.getLastSyncData(context.mappingId);

    // Check for conflicts in matching items
    for (const [name, asanaTask] of asanaMap) {
      const ofTask = ofMap.get(name);
      if (ofTask) {
        const itemConflicts = ConflictResolver.detectConflicts(
          asanaTask, 
          ofTask, 
          lastSyncData[name]
        );
        conflicts.push(...itemConflicts);
      }
    }

    return conflicts;
  }

  // Generate sync operations based on state and resolved conflicts
  private async generateSyncOperations(syncState: SyncState, resolvedConflicts: SyncConflict[]): Promise<SyncOperation[]> {
    const operations: SyncOperation[] = [];
    
    // Create maps for efficient lookup
    const asanaMap = new Map(syncState.asanaTasks.map(task => [task.name.toLowerCase(), task]));
    const ofMap = new Map(syncState.omnifocusTasks.map(task => [task.name.toLowerCase(), task]));

    // Items only in Asana - create in OmniFocus
    for (const asanaTask of syncState.asanaTasks) {
      const key = asanaTask.name.toLowerCase();
      if (!ofMap.has(key)) {
        operations.push({
          type: 'create',
          target: 'omnifocus',
          item: asanaTask
        });
      }
    }

    // Items only in OmniFocus - create in Asana
    for (const ofTask of syncState.omnifocusTasks) {
      const key = ofTask.name.toLowerCase();
      if (!asanaMap.has(key)) {
        operations.push({
          type: 'create',
          target: 'asana',
          item: ofTask
        });
      }
    }

    // Handle resolved conflicts by updating the losing side
    for (const conflict of resolvedConflicts) {
      if (conflict.resolution === 'asana_wins') {
        const asanaTask = asanaMap.get(String(conflict.asanaValue).toLowerCase());
        if (asanaTask) {
          operations.push({
            type: 'update',
            target: 'omnifocus',
            item: asanaTask
          });
        }
      } else if (conflict.resolution === 'omnifocus_wins') {
        const ofTask = ofMap.get(String(conflict.omnifocusValue).toLowerCase());
        if (ofTask) {
          operations.push({
            type: 'update',
            target: 'asana',
            item: ofTask
          });
        }
      }
    }

    return operations;
  }

  // Execute sync operations
  private async executeSyncOperations(operations: SyncOperation[], context: SyncContext): Promise<{created: number, updated: number, deleted: number}> {
    let created = 0, updated = 0, deleted = 0;

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'create':
            await this.executeCreateOperation(operation, context);
            created++;
            break;
          case 'update':
            await this.executeUpdateOperation(operation, context);
            updated++;
            break;
          case 'delete':
            await this.executeDeleteOperation(operation, context);
            deleted++;
            break;
        }
      } catch (error: any) {
        logger.error('Failed to execute sync operation', {
          operation,
          error: error.message
        });
      }
    }

    return { created, updated, deleted };
  }

  // Execute create operation
  private async executeCreateOperation(operation: SyncOperation, context: SyncContext): Promise<void> {
    if (operation.target === 'asana' && this.asanaClient) {
      const taskData = DataMapper.syncToAsanaTask(operation.item);
      await this.asanaClient.createTask(context.asanaProjectId, {
        name: taskData.name!,
        notes: taskData.notes,
        due_on: taskData.due_on
      });
    } else if (operation.target === 'omnifocus') {
      // Send command to OmniFocus agent
      await this.sendAgentCommand(context.mappingId, {
        action: 'create_task',
        data: {
          projectName: context.omnifocusProjectName,
          taskName: operation.item.name,
          options: DataMapper.syncToOmniFocusTask(operation.item)
        }
      });
    }
  }

  // Execute update operation
  private async executeUpdateOperation(operation: SyncOperation, context: SyncContext): Promise<void> {
    if (operation.target === 'asana' && this.asanaClient) {
      const updates = DataMapper.syncToAsanaTask(operation.item);
      await this.asanaClient.updateTask(operation.item.sourceId, updates);
    } else if (operation.target === 'omnifocus') {
      await this.sendAgentCommand(context.mappingId, {
        action: 'update_task',
        data: {
          taskId: operation.item.sourceId,
          updates: DataMapper.syncToOmniFocusTask(operation.item)
        }
      });
    }
  }

  // Execute delete operation
  private async executeDeleteOperation(operation: SyncOperation, context: SyncContext): Promise<void> {
    if (operation.target === 'asana' && this.asanaClient) {
      await this.asanaClient.deleteTask(operation.item.sourceId);
    } else if (operation.target === 'omnifocus') {
      await this.sendAgentCommand(context.mappingId, {
        action: 'delete_task',
        data: {
          taskId: operation.item.sourceId
        }
      });
    }
  }

  // Send command to OmniFocus agent (placeholder - would use queue system)
  private async sendAgentCommand(mappingId: string, command: any): Promise<void> {
    // This would enqueue commands for the agent to pick up
    logger.info('Command queued for OmniFocus agent', { mappingId, command });
  }

  // Get last sync data for conflict detection
  private async getLastSyncData(mappingId: string): Promise<any> {
    // Retrieve stored sync state from previous sync
    return {};
  }

  // Update sync metadata
  private async updateSyncMetadata(context: SyncContext): Promise<void> {
    await prisma.syncMapping.update({
      where: { id: context.mappingId },
      data: { lastSyncAt: new Date() }
    });
  }

  // Log sync result to database
  private async logSyncResult(context: SyncContext, result: SyncResult): Promise<void> {
    await prisma.syncLog.create({
      data: {
        userId: context.userId,
        syncMappingId: context.mappingId,
        direction: 'BIDIRECTIONAL',
        status: result.success ? 'SUCCESS' : 'ERROR',
        itemsSynced: result.itemsProcessed,
        errorMessage: result.errors.join('; ') || null
      }
    });
  }
}