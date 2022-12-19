const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  callProjectSave: () => ipcRenderer.invoke('project:save'),
  saveProject: (callback) => ipcRenderer.on('save-project', callback),
  loadProjectFromFile: (callback) => ipcRenderer.on('load-project-from-file', callback),
  exportComplete: (callback) => ipcRenderer.on('export-complete', callback),
  loadNewProject: (callback) => ipcRenderer.on('load-new-project', callback),
  onSaveCompleted: (callback) =>  ipcRenderer.on('save-project-completed', callback),
  onExportDirectorySelected: (callback) => ipcRenderer.on('export-directory-selected', callback), 
  createNewProject: (value) => ipcRenderer.send('project:newProject', value),
  updateProjectName: (value) => ipcRenderer.send('project:updateName', value),
  exportProject: (value) => ipcRenderer.send('project:export', value),
  setExportDirectory: () => ipcRenderer.send('export:setDirectory'),
  openProject: () => ipcRenderer.invoke('project:openProject'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  expandWindowForProjectCreation: () => ipcRenderer.invoke('project:projectCreationWindowEntered'),
  goBackFromProjectCreation: () => ipcRenderer.invoke('project:projectCreationWindowExited'),
  quitApp: () => ipcRenderer.invoke('app:quit')
});