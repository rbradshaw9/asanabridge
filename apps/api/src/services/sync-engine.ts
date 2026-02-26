import { SyncItem, SyncResult } from '@asanabridge/shared';
import { AsanaClient } from './asana';
import { AsanaOAuth } from './asana-oauth';
import {
  asanaTaskToSyncItem,
  agentTaskToSyncItem,
  syncItemToAsanaCreate,
  matchTasks,
  detectConflicts,
  resolveConflict,
  ConflictStrategy,
  AgentTask,
} from './data-mapper';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { syncLogger } from '../config/logger';

export interface SyncContext {
  userId: string;
  mappingId: string;
  asanaProjectId: string;
  omnifocusProjectName: string;
  lastSyncAt?: Date;
  strategy?: ConflictStrategy;
}

export class SyncEngine {
  /**
   * Full bidirectional sync for a mapping.
   * ofTasks are the current OmniFocus tasks provided by the agent.
   */
  static async performSync(
    context: SyncContext,
    ofTasks: AgentTask[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      created: [],
      updated: [],
      deleted: [],
      conflicts: [],
      errors: [],
    };

    try {
      const accessToken = await AsanaOAuth.getValidToken(context.userId);
      const asanaClient = new AsanaClient(accessToken);

      // Fetch current Asana tasks
      const rawAsanaTasks = await asanaClient.getProjectTasks(context.asanaProjectId);
      const asanaSyncItems = rawAsanaTasks.map(asanaTaskToSyncItem);
      const ofSyncItems = ofTasks.map(agentTaskToSyncItem);

      const { matched, asanaOnly, ofOnly } = matchTasks(asanaSyncItems, ofSyncItems);
      const strategy = context.strategy ?? 'newest_wins';

      // ── Handle matched tasks (conflict resolution) ─────────────────────────
      for (const { asana, of: ofItem } of matched) {
        const conflicts = detectConflicts(asana, ofItem);

        if (conflicts.length === 0) continue; // In sync — nothing to do

        const winner = resolveConflict(asana, ofItem, strategy);

        if (winner === 'asana') {
          // Asana is authoritative — queue OmniFocus update
          await SyncEngine.queueAgentCommand(context.userId, 'UPDATE_TASK', {
            name: asana.name,
            note: asana.note,
            completed: asana.completed,
            dueDate: asana.dueDate?.toISOString(),
            projectName: context.omnifocusProjectName,
            omnifocusId: ofItem.externalId,
          });
          result.updated.push(asana);
        } else {
          // OmniFocus is authoritative — update Asana
          if (asana.externalId) {
            await asanaClient.updateTask(asana.externalId, {
              name: ofItem.name,
              notes: ofItem.note,
              completed: ofItem.completed,
              dueOn: ofItem.dueDate
                ? ofItem.dueDate.toISOString().split('T')[0]
                : null,
            });
            result.updated.push(ofItem);
          }
        }
      }

      // ── Asana-only → create in OmniFocus ──────────────────────────────────
      for (const asanaTask of asanaOnly) {
        await SyncEngine.queueAgentCommand(context.userId, 'CREATE_TASK', {
          name: asanaTask.name,
          note: asanaTask.note,
          completed: asanaTask.completed,
          dueDate: asanaTask.dueDate?.toISOString(),
          projectName: context.omnifocusProjectName,
          asanaId: asanaTask.externalId,
        });
        result.created.push(asanaTask);
      }

      // ── OmniFocus-only → create in Asana ─────────────────────────────────
      for (const ofTask of ofOnly) {
        const created = await asanaClient.createTask(
          syncItemToAsanaCreate(ofTask, context.asanaProjectId)
        );
        result.created.push({ ...ofTask, externalId: created.gid });
      }

      // Update lastSyncAt on the mapping
      await prisma.syncMapping.update({
        where: { id: context.mappingId },
        data: { lastSyncAt: new Date() },
      });

      syncLogger.info('Sync completed', {
        mappingId: context.mappingId,
        created: result.created.length,
        updated: result.updated.length,
      });
    } catch (err) {
      const message = (err as Error).message;
      result.errors.push(message);
      syncLogger.error('Sync failed', { mappingId: context.mappingId, error: message });
    }

    return result;
  }

  /**
   * Write a command to the AgentCommand table.
   * The macOS agent polls GET /api/agent/commands and processes these.
   */
  static async queueAgentCommand(
    userId: string,
    type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'COMPLETE_TASK',
    payload: Record<string, unknown>
  ): Promise<void> {
    const setup = await prisma.omniFocusSetup.findUnique({ where: { userId } });
    if (!setup) {
      syncLogger.warn('Cannot queue command — agent not registered', { userId });
      return;
    }

    await prisma.agentCommand.create({
      data: {
        setupId: setup.id,
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    syncLogger.debug('Agent command queued', { userId, type });
  }
}
