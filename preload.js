const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveProject: (callback) => ipcRenderer.on('save-project', callback),
  loadProject: (callback) => ipcRenderer.on('load-project', callback),
  openProject: () => ipcRenderer.invoke('project:openProject'),
  newproject: () => ipcRenderer.invoke('project:newProject'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  quitApp: () => ipcRenderer.invoke('app:quit')
});