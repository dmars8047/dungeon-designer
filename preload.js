const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI',{
  saveProject: (callback) => ipcRenderer.on('save-project', callback),
  openFile: () => ipcRenderer.invoke('dialog:openFile')
})