import { AsanaTask, AsanaProject } from './asana';

// OmniFocus types (duplicated here to avoid cross-module dependencies)
export interface OFTask {
  id: string;
  name: string;
  note?: string;
  completed: boolean;
  completionDate?: Date;
  dueDate?: Date;
  creationDate: Date;
  modificationDate: Date;
  projectId?: string;
  projectName?: string;
}

export interface OFProject {
  id: string;
  name: string;
  note?: string;
  status: 'active' | 'on-hold' | 'completed' | 'dropped';
  creationDate: Date;
  modificationDate: Date;
}

// Data mapping interfaces
export interface SyncItem {
  id: string;
  name: string;
  note?: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
  modifiedAt: Date;
  source: 'asana' | 'omnifocus';
  sourceId: string;
}

export interface SyncProject {
  id: string;
  name: string;
  note?: string;
  createdAt: Date;
  modifiedAt: Date;
  source: 'asana' | 'omnifocus';
  sourceId: string;
}

export interface SyncConflict {
  type: 'task' | 'project';
  field: string;
  asanaValue: any;
  omnifocusValue: any;
  lastSyncValue?: any;
  resolution: 'asana_wins' | 'omnifocus_wins' | 'merge' | 'manual';
}

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  conflicts: SyncConflict[];
  errors: string[];
}

export class DataMapper {
  // Convert Asana task to sync format
  static asanaTaskToSync(task: AsanaTask): SyncItem {
    return {
      id: `asana-${task.gid}`,
      name: task.name,
      note: task.notes,
      completed: task.completed,
      dueDate: task.due_on ? new Date(task.due_on) : undefined,
      createdAt: new Date(task.created_at),
      modifiedAt: new Date(task.modified_at),
      source: 'asana',
      sourceId: task.gid
    };
  }

  // Convert OmniFocus task to sync format
  static omnifocusTaskToSync(task: OFTask): SyncItem {
    return {
      id: `of-${task.id}`,
      name: task.name,
      note: task.note,
      completed: task.completed,
      dueDate: task.dueDate,
      createdAt: task.creationDate,
      modifiedAt: task.modificationDate,
      source: 'omnifocus',
      sourceId: task.id
    };
  }

  // Convert sync item back to Asana format
  static syncToAsanaTask(syncItem: SyncItem): Partial<AsanaTask> {
    return {
      name: syncItem.name,
      notes: syncItem.note,
      completed: syncItem.completed,
      due_on: syncItem.dueDate?.toISOString().split('T')[0] // YYYY-MM-DD format
    };
  }

  // Convert sync item back to OmniFocus format
  static syncToOmniFocusTask(syncItem: SyncItem): Partial<OFTask> {
    return {
      name: syncItem.name,
      note: syncItem.note,
      completed: syncItem.completed,
      dueDate: syncItem.dueDate
    };
  }

  // Convert Asana project to sync format
  static asanaProjectToSync(project: AsanaProject): SyncProject {
    return {
      id: `asana-${project.gid}`,
      name: project.name,
      note: project.notes,
      createdAt: new Date(project.created_at),
      modifiedAt: new Date(project.modified_at),
      source: 'asana',
      sourceId: project.gid
    };
  }

  // Convert OmniFocus project to sync format
  static omnifocusProjectToSync(project: OFProject): SyncProject {
    return {
      id: `of-${project.id}`,
      name: project.name,
      note: project.note,
      createdAt: project.creationDate,
      modifiedAt: project.modificationDate,
      source: 'omnifocus',
      sourceId: project.id
    };
  }
}