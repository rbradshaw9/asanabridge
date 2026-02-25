import { AsanaTask, SyncItem } from '@asanabridge/shared';

// ─── Asana → SyncItem ─────────────────────────────────────────────────────────

export function asanaTaskToSyncItem(task: AsanaTask): SyncItem {
  return {
    externalId: task.gid,
    name: task.name,
    note: task.notes ?? undefined,
    completed: task.completed,
    dueDate: task.due_on ? new Date(task.due_on) : undefined,
    projectName: task.projects?.[0]?.name,
    source: 'asana',
    modifiedAt: task.modified_at ? new Date(task.modified_at) : undefined,
  };
}

// ─── Agent Payload → SyncItem ─────────────────────────────────────────────────

export interface AgentTask {
  id?: string;
  name: string;
  note?: string;
  completed: boolean;
  dueDate?: string;
  projectName?: string;
  modifiedAt?: string;
}

export function agentTaskToSyncItem(task: AgentTask): SyncItem {
  return {
    externalId: task.id,
    name: task.name,
    note: task.note,
    completed: task.completed,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    projectName: task.projectName,
    source: 'omnifocus',
    modifiedAt: task.modifiedAt ? new Date(task.modifiedAt) : undefined,
  };
}

// ─── SyncItem → Asana Create Payload ─────────────────────────────────────────

export function syncItemToAsanaCreate(
  item: SyncItem,
  projectGid: string
): { name: string; notes?: string; projectGid: string; dueOn?: string; completed: boolean } {
  return {
    name: item.name,
    notes: item.note,
    projectGid,
    dueOn: item.dueDate
      ? item.dueDate.toISOString().split('T')[0]
      : undefined,
    completed: item.completed,
  };
}

// ─── Conflict Detection ───────────────────────────────────────────────────────

export interface SyncConflictField {
  field: string;
  asanaValue: unknown;
  omnifocusValue: unknown;
  lastSyncValue?: unknown;
}

export function detectConflicts(
  asanaItem: SyncItem,
  ofItem: SyncItem,
  lastSync?: Partial<SyncItem>
): SyncConflictField[] {
  const conflicts: SyncConflictField[] = [];

  if (asanaItem.name !== ofItem.name) {
    conflicts.push({ field: 'name', asanaValue: asanaItem.name, omnifocusValue: ofItem.name, lastSyncValue: lastSync?.name });
  }

  if (asanaItem.note !== ofItem.note) {
    conflicts.push({ field: 'note', asanaValue: asanaItem.note, omnifocusValue: ofItem.note, lastSyncValue: lastSync?.note });
  }

  if (asanaItem.completed !== ofItem.completed) {
    conflicts.push({ field: 'completed', asanaValue: asanaItem.completed, omnifocusValue: ofItem.completed, lastSyncValue: lastSync?.completed });
  }

  const asanaDue = asanaItem.dueDate?.getTime();
  const ofDue = ofItem.dueDate?.getTime();
  if (asanaDue !== ofDue) {
    conflicts.push({ field: 'dueDate', asanaValue: asanaItem.dueDate, omnifocusValue: ofItem.dueDate, lastSyncValue: lastSync?.dueDate });
  }

  return conflicts;
}

// ─── Conflict Resolution ──────────────────────────────────────────────────────

export type ConflictStrategy = 'asana_wins' | 'omnifocus_wins' | 'newest_wins';

export function resolveConflict(
  asanaItem: SyncItem,
  ofItem: SyncItem,
  strategy: ConflictStrategy = 'newest_wins'
): 'asana' | 'omnifocus' {
  if (strategy === 'asana_wins') return 'asana';
  if (strategy === 'omnifocus_wins') return 'omnifocus';

  // newest_wins: compare modifiedAt timestamps
  const asanaTime = asanaItem.modifiedAt?.getTime() ?? 0;
  const ofTime = ofItem.modifiedAt?.getTime() ?? 0;
  return asanaTime >= ofTime ? 'asana' : 'omnifocus';
}

// ─── Task Matching ────────────────────────────────────────────────────────────

/**
 * Match tasks by name (case-insensitive).
 * Returns pairs of [asanaItem, ofItem] and unmatched items from each side.
 */
export function matchTasks(
  asanaTasks: SyncItem[],
  ofTasks: SyncItem[]
): {
  matched: Array<{ asana: SyncItem; of: SyncItem }>;
  asanaOnly: SyncItem[];
  ofOnly: SyncItem[];
} {
  const matched: Array<{ asana: SyncItem; of: SyncItem }> = [];
  const asanaOnly: SyncItem[] = [];
  const usedOfIndices = new Set<number>();

  for (const asanaTask of asanaTasks) {
    const matchIdx = ofTasks.findIndex(
      (o, i) =>
        !usedOfIndices.has(i) &&
        o.name.toLowerCase() === asanaTask.name.toLowerCase()
    );

    if (matchIdx >= 0) {
      matched.push({ asana: asanaTask, of: ofTasks[matchIdx] });
      usedOfIndices.add(matchIdx);
    } else {
      asanaOnly.push(asanaTask);
    }
  }

  const ofOnly = ofTasks.filter((_, i) => !usedOfIndices.has(i));
  return { matched, asanaOnly, ofOnly };
}
