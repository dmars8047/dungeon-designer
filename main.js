// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain, dialog, screen } = require('electron')
const path = require('path')

const isMac = process.platform === 'darwin'
let landingWindow;
let mainWindow;
let projectFilePath = '';
let projectInitialized = false;

function createLandingWindow() {
  landingWindow = new BrowserWindow({
    width: 500,
    height: 300,
    show: true,
    icon: './Assets/dungeondesignericon.png',
    title: 'Dungeon Designer',
    autoHideMenuBar: true,
    resizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  landingWindow.loadFile('landing.html');

  landingWindow.on('close', function () {
    if (!projectInitialized) {
      app.quit();
    }
  });

  landingWindow.webContents.openDevTools();
}

function createMainWindow() {

  const primaryDisplay = screen.getPrimaryDisplay()

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: primaryDisplay.size.width * .85,
    height: primaryDisplay.size.height * .85,
    resizable: true,
    show: false,
    icon: './Assets/dungeondesignericon.png',
    title: 'Dungeon Designer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Save', click: async () => { handleSaveProject(mainWindow) } },
        { label: 'Load', click: async () => { handleOpenProject(mainWindow) } },
        { label: 'Export' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  mainWindow.loadFile('main.html')

  mainWindow.on('resize', function (e) {
    e.preventDefault();
    var size = mainWindow.getSize();
    console.log(size);
    mainWindow.webContents.send('window:resize', { windowHeight: size[1], windowWidth: size[0] });
  });

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle('dialog:openFile', handleFileOpen);
  ipcMain.handle('project:openProject', handleOpenProjectFromLanding);
  ipcMain.handle('app:quit', handleAppQuit);
  ipcMain.handle('project:projectCreationWindowEntered', handleNewProjectCreationScreenEntered);
  ipcMain.handle('project:projectCreationWindowExited', handleNewProjectCreationScreenExited);
  ipcMain.on('project:newProject', (_event, value) => { handleNewProject(value); });
  ipcMain.on('project:saveToFile', (_event, value) => { saveProjectFile(value); });

  createLandingWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function handleNewProject(newProjectData) {
  // Initialize the main window
  createMainWindow();

  mainWindow.once('ready-to-show', () => {
    var size = mainWindow.getSize();
    console.log(size);
    mainWindow.webContents.send('load-new-project', newProjectData);
    mainWindow.webContents.send('window:resize', { windowHeight: size[1], windowWidth: size[0] });
    mainWindow.show();
  })

  projectInitialized = true;
  landingWindow.close();
}

async function handleNewProjectCreationScreenEntered() {
  landingWindow.setSize(800, 670);
  landingWindow.center();
}

async function handleNewProjectCreationScreenExited() {
  landingWindow.setResizable(true);
  landingWindow.setSize(500, 300);
  landingWindow.setResizable(false);
  landingWindow.center();
}

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{
      name: 'Image File',
      extensions: ['png']
    }]
  });

  if (canceled) {
    return
  } else {
    return filePaths[0];
  }
}

async function handleAppQuit() {
  app.quit();
}

async function handleSaveProject(mainWindow) {
  if (!projectFilePath) {
    const { canceled, filePath } = await dialog.showSaveDialog({
      filters: [{
        name: 'Dungeon Designer Project File',
        extensions: ['ddes']
      }]
    });

    if (canceled) {
      return
    }
    else {
      projectFilePath = filePath;
    }

    mainWindow.webContents.send('save-project', projectFilePath);
  }
}

async function handleOpenProjectFromLanding() {
  landingWindow.blur();
  landingWindow.setEnabled(false);
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{
      name: 'Dungeon Designer Project File',
      extensions: ['ddes']
    }]
  });

  if (canceled) {
    landingWindow.setEnabled(true);
    landingWindow.focus();
    return;
  }
  else {
    projectFilePath = filePaths[0];

    const fs = require('fs');

    fs.readFile(projectFilePath, 'utf-8', function (err, projectDataString) {
      if (err) {
        console.error(err);
      }
      else {
        projectInitialized = true;
        landingWindow.show = false;

        mainWindow.show();
        mainWindow.webContents.send('load-project', JSON.parse(projectDataString));

        landingWindow.close();
        if (landingWindow) {
          landingWindow.destroy();
        }
      }
    });
  }
}

async function handleOpenProject(mainWindow) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{
      name: 'Dungeon Designer Project File',
      extensions: ['ddes']
    }]
  });

  if (canceled) {
    return;
  }
  else {
    projectFilePath = filePaths[0];

    const fs = require('fs');

    fs.readFile(projectFilePath, 'utf-8', function (err, projectDataString) {
      if (err) {
        console.error(err);
      }
      else {
        mainWindow.webContents.send('load-project', JSON.parse(projectDataString));
      }
    });
  }
}

async function saveProjectFile(payload) {
  const fs = require('fs');

  fs.writeFile(projectFilePath, JSON.stringify(payload), err => {
    if (err) {
      console.error(err);
    }
  });
}
