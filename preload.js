const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  callProjectSave: () => ipcRenderer.invoke('project:save'),
  saveProject: (callback) => ipcRenderer.on('save-project', callback),
  loadProjectFromFile: (callback) => ipcRenderer.on('load-project-from-file', callback),
  loadNewProject: (callback) => ipcRenderer.on('load-new-project', callback),
  onSaveCompleted: (callback) =>  ipcRenderer.on('save-project-completed', callback),
  createNewProject: (value) => ipcRenderer.send('project:newProject', value),
  openProject: () => ipcRenderer.invoke('project:openProject'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  expandWindowForProjectCreation: () => ipcRenderer.invoke('project:projectCreationWindowEntered'),
  goBackFromProjectCreation: () => ipcRenderer.invoke('project:projectCreationWindowExited'),
  quitApp: () => ipcRenderer.invoke('app:quit')
});