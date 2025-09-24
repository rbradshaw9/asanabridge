"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataMapper = void 0;
class DataMapper {
    // Convert Asana task to sync format
    static asanaTaskToSync(task) {
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
    static omnifocusTaskToSync(task) {
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
    static syncToAsanaTask(syncItem) {
        return {
            name: syncItem.name,
            notes: syncItem.note,
            completed: syncItem.completed,
            due_on: syncItem.dueDate?.toISOString().split('T')[0] // YYYY-MM-DD format
        };
    }
    // Convert sync item back to OmniFocus format
    static syncToOmniFocusTask(syncItem) {
        return {
            name: syncItem.name,
            note: syncItem.note,
            completed: syncItem.completed,
            dueDate: syncItem.dueDate
        };
    }
    // Convert Asana project to sync format
    static asanaProjectToSync(project) {
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
    static omnifocusProjectToSync(project) {
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
exports.DataMapper = DataMapper;
