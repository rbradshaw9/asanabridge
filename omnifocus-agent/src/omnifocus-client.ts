import { execSync } from 'child_process';
import { z } from 'zod';

// OmniFocus data structures
export interface OFProject {
  id: string;
  name: string;
  note?: string;
  status: 'active' | 'on-hold' | 'completed' | 'dropped';
  creationDate: Date;
  modificationDate: Date;
}

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

export interface OFContext {
  id: string;
  name: string;
}

// OmniFocus version detection
export type OFVersion = '3' | '4';

export class OmniFocusClient {
  private version: OFVersion;

  constructor() {
    this.version = this.detectVersion();
  }

  private detectVersion(): OFVersion {
    try {
      // Try OmniFocus 4 first
      execSync('osascript -e "tell application \\"OmniFocus 4\\" to get version"', { 
        stdio: 'ignore' 
      });
      return '4';
    } catch {
      try {
        // Fallback to OmniFocus 3
        execSync('osascript -e "tell application \\"OmniFocus 3\\" to get version"', { 
          stdio: 'ignore' 
        });
        return '3';
      } catch {
        throw new Error('Neither OmniFocus 3 nor 4 is installed');
      }
    }
  }

  private getAppName(): string {
    return `OmniFocus ${this.version}`;
  }

  private runAppleScript(script: string): string {
    try {
      const result = execSync(`osascript -e "${script.replace(/"/g, '\\"')}"`, {
        encoding: 'utf8',
        timeout: 30000
      });
      return result.trim();
    } catch (error: any) {
      throw new Error(`AppleScript execution failed: ${error.message}`);
    }
  }

  // Check if OmniFocus is running
  isRunning(): boolean {
    try {
      const script = `tell application "System Events" to get name of every process whose name is "${this.getAppName()}"`;
      const result = this.runAppleScript(script);
      return result.includes(this.getAppName());
    } catch {
      return false;
    }
  }

  // Launch OmniFocus if not running
  launch(): void {
    if (!this.isRunning()) {
      this.runAppleScript(`tell application "${this.getAppName()}" to activate`);
      // Wait for app to launch
      let attempts = 0;
      while (!this.isRunning() && attempts < 10) {
        setTimeout(() => {}, 1000);
        attempts++;
      }
    }
  }

  // Get all projects
  async getProjects(): Promise<OFProject[]> {
    this.launch();
    
    const script = `
      tell application "${this.getAppName()}"
        set projectList to {}
        repeat with proj in flattened projects
          set projectRecord to {id:(id of proj as string), name:(name of proj), note:(note of proj), status:(status of proj as string), creationDate:(creation date of proj), modificationDate:(modification date of proj)}
          set end of projectList to projectRecord
        end repeat
        return projectList
      end tell
    `;

    const result = this.runAppleScript(script);
    return this.parseAppleScriptList(result, 'project');
  }

  // Get tasks for a specific project
  async getProjectTasks(projectName: string): Promise<OFTask[]> {
    this.launch();
    
    const script = `
      tell application "${this.getAppName()}"
        set taskList to {}
        set targetProject to first flattened project whose name is "${projectName}"
        repeat with t in flattened tasks of targetProject
          set taskRecord to {id:(id of t as string), name:(name of t), note:(note of t), completed:(completed of t), completionDate:(completion date of t), dueDate:(due date of t), creationDate:(creation date of t), modificationDate:(modification date of t), projectId:(id of targetProject as string), projectName:"${projectName}"}
          set end of taskList to taskRecord
        end repeat
        return taskList
      end tell
    `;

    const result = this.runAppleScript(script);
    return this.parseAppleScriptList(result, 'task');
  }

  // Create a new project
  async createProject(name: string, note?: string): Promise<OFProject> {
    this.launch();
    
    const noteClause = note ? `set note of newProject to "${note}"` : '';
    const script = `
      tell application "${this.getAppName()}"
        set newProject to make new project with properties {name:"${name}"}
        ${noteClause}
        return {id:(id of newProject as string), name:(name of newProject), note:(note of newProject), status:(status of newProject as string), creationDate:(creation date of newProject), modificationDate:(modification date of newProject)}
      end tell
    `;

    const result = this.runAppleScript(script);
    return this.parseAppleScriptRecord(result, 'project');
  }

  // Create a new task in a project
  async createTask(projectName: string, taskName: string, options: {
    note?: string;
    dueDate?: Date;
  } = {}): Promise<OFTask> {
    this.launch();
    
    const noteClause = options.note ? `set note of newTask to "${options.note}"` : '';
    const dueDateClause = options.dueDate ? `set due date of newTask to date "${options.dueDate.toISOString()}"` : '';
    
    const script = `
      tell application "${this.getAppName()}"
        set targetProject to first flattened project whose name is "${projectName}"
        set newTask to make new task at end of tasks of targetProject with properties {name:"${taskName}"}
        ${noteClause}
        ${dueDateClause}
        return {id:(id of newTask as string), name:(name of newTask), note:(note of newTask), completed:(completed of newTask), completionDate:(completion date of newTask), dueDate:(due date of newTask), creationDate:(creation date of newTask), modificationDate:(modification date of newTask), projectId:(id of targetProject as string), projectName:"${projectName}"}
      end tell
    `;

    const result = this.runAppleScript(script);
    return this.parseAppleScriptRecord(result, 'task');
  }

  // Update a task
  async updateTask(taskId: string, updates: {
    name?: string;
    note?: string;
    completed?: boolean;
    dueDate?: Date | null;
  }): Promise<OFTask> {
    this.launch();
    
    let updateClauses: string[] = [];
    if (updates.name) updateClauses.push(`set name of targetTask to "${updates.name}"`);
    if (updates.note !== undefined) updateClauses.push(`set note of targetTask to "${updates.note}"`);
    if (updates.completed !== undefined) updateClauses.push(`set completed of targetTask to ${updates.completed}`);
    if (updates.dueDate !== undefined) {
      if (updates.dueDate === null) {
        updateClauses.push(`set due date of targetTask to missing value`);
      } else {
        updateClauses.push(`set due date of targetTask to date "${updates.dueDate.toISOString()}"`);
      }
    }

    const script = `
      tell application "${this.getAppName()}"
        set targetTask to first flattened task whose id is "${taskId}"
        ${updateClauses.join('\n        ')}
        set targetProject to first project of targetTask
        return {id:(id of targetTask as string), name:(name of targetTask), note:(note of targetTask), completed:(completed of targetTask), completionDate:(completion date of targetTask), dueDate:(due date of targetTask), creationDate:(creation date of targetTask), modificationDate:(modification date of targetTask), projectId:(id of targetProject as string), projectName:(name of targetProject)}
      end tell
    `;

    const result = this.runAppleScript(script);
    return this.parseAppleScriptRecord(result, 'task');
  }

  // Delete a task
  async deleteTask(taskId: string): Promise<void> {
    this.launch();
    
    const script = `
      tell application "${this.getAppName()}"
        delete (first flattened task whose id is "${taskId}")
      end tell
    `;

    this.runAppleScript(script);
  }

  // Parse AppleScript responses (simplified - would need more robust parsing in production)
  private parseAppleScriptList(result: string, type: 'project' | 'task'): any[] {
    // This is a simplified parser - in production you'd want more robust parsing
    // For now, return empty array as placeholder
    return [];
  }

  private parseAppleScriptRecord(result: string, type: 'project' | 'task'): any {
    // This is a simplified parser - in production you'd want more robust parsing
    // For now, return mock data
    if (type === 'project') {
      return {
        id: 'mock-project-id',
        name: 'Mock Project',
        note: '',
        status: 'active',
        creationDate: new Date(),
        modificationDate: new Date()
      } as OFProject;
    } else {
      return {
        id: 'mock-task-id',
        name: 'Mock Task',
        note: '',
        completed: false,
        creationDate: new Date(),
        modificationDate: new Date(),
        projectId: 'mock-project-id',
        projectName: 'Mock Project'
      } as OFTask;
    }
  }

  getVersion(): OFVersion {
    return this.version;
  }
}