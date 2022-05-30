const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveProject: (callback) => ipcRenderer.on('save-project', callback),
  loadProject: (callback) => ipcRenderer.on('load-project', callback),
  createProject: (value) => ipcRenderer.send('project:newProject', value),
  openProject: () => ipcRenderer.invoke('project:openProject'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  expandWindowForProjectCreation: () => ipcRenderer.invoke('project:projectCreationWindowEntered'),
  goBackFromProjectCreation: () => ipcRenderer.invoke('project:projectCreationWindowExited'),
  quitApp: () => ipcRenderer.invoke('app:quit')
});