#!/usr/bin/env osascript -l JavaScript

// OmniFocus JavaScript for Automation (JXA) utilities
// More reliable than AppleScript for complex data structures

function run(argv) {
    const OmniFocus = Application('OmniFocus 3');
    OmniFocus.includeStandardAdditions = true;
    
    const action = argv[0];
    
    try {
        switch (action) {
            case 'getProjects':
                return JSON.stringify(getProjects(OmniFocus));
            case 'getProjectTasks':
                return JSON.stringify(getProjectTasks(OmniFocus, argv[1]));
            case 'createTask':
                return JSON.stringify(createTask(OmniFocus, argv[1], argv[2], argv[3]));
            case 'updateTask':
                return JSON.stringify(updateTask(OmniFocus, argv[1], JSON.parse(argv[2])));
            default:
                throw new Error('Unknown action: ' + action);
        }
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

function getProjects(of) {
    const projects = [];
    const flatProjects = of.flattenedProjects();
    
    for (let i = 0; i < flatProjects.length; i++) {
        const project = flatProjects[i];
        projects.push({
            id: project.id(),
            name: project.name(),
            note: project.note() || '',
            status: project.status(),
            creationDate: project.creationDate(),
            modificationDate: project.modificationDate()
        });
    }
    
    return { projects };
}

function getProjectTasks(of, projectName) {
    const tasks = [];
    const projects = of.flattenedProjects.whose({ name: projectName });
    
    if (projects.length === 0) {
        throw new Error('Project not found: ' + projectName);
    }
    
    const project = projects[0];
    const flatTasks = project.flattenedTasks();
    
    for (let i = 0; i < flatTasks.length; i++) {
        const task = flatTasks[i];
        tasks.push({
            id: task.id(),
            name: task.name(),
            note: task.note() || '',
            completed: task.completed(),
            completionDate: task.completionDate(),
            dueDate: task.dueDate(),
            creationDate: task.creationDate(),
            modificationDate: task.modificationDate(),
            projectId: project.id(),
            projectName: project.name()
        });
    }
    
    return { tasks };
}

function createTask(of, projectName, taskName, optionsJson) {
    const options = optionsJson ? JSON.parse(optionsJson) : {};
    const projects = of.flattenedProjects.whose({ name: projectName });
    
    if (projects.length === 0) {
        throw new Error('Project not found: ' + projectName);
    }
    
    const project = projects[0];
    const newTask = of.Task({ name: taskName });
    
    if (options.note) {
        newTask.note = options.note;
    }
    
    if (options.dueDate) {
        newTask.dueDate = new Date(options.dueDate);
    }
    
    project.tasks.push(newTask);
    
    return {
        id: newTask.id(),
        name: newTask.name(),
        note: newTask.note() || '',
        completed: newTask.completed(),
        dueDate: newTask.dueDate(),
        creationDate: newTask.creationDate(),
        modificationDate: newTask.modificationDate(),
        projectId: project.id(),
        projectName: project.name()
    };
}

function updateTask(of, taskId, updates) {
    const tasks = of.flattenedTasks.whose({ id: taskId });
    
    if (tasks.length === 0) {
        throw new Error('Task not found: ' + taskId);
    }
    
    const task = tasks[0];
    
    if (updates.name) task.name = updates.name;
    if (updates.note !== undefined) task.note = updates.note;
    if (updates.completed !== undefined) task.completed = updates.completed;
    if (updates.dueDate !== undefined) {
        task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }
    
    return {
        id: task.id(),
        name: task.name(),
        note: task.note() || '',
        completed: task.completed(),
        completionDate: task.completionDate(),
        dueDate: task.dueDate(),
        modificationDate: task.modificationDate()
    };
}