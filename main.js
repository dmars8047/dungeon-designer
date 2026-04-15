// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain, dialog, screen } = require('electron')
const path = require('path')

const isMac = process.platform === 'darwin'
let landingWindow;
let mainWindow;
let projectFilePath = '';
let projectName = '';
let projectInitialized = false;

const landingPageDimensions = {
  width: 512,
  height: 292
}

const projectCreationPageDimensions = {
  width: 800,
  height: 800
}

function createLandingWindow() {
  landingWindow = new BrowserWindow({
    width: landingPageDimensions.width,
    height: landingPageDimensions.height,
    show: true,
    icon: path.join(__dirname, 'Assets', 'dungeondesignericon.png'),
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

  // landingWindow.webContents.openDevTools();
}

function createMainWindow() {

  const primaryDisplay = screen.getPrimaryDisplay()

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'Assets', 'dungeondesignericon.png'),
    title: 'Dungeon Designer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const topMenuBarTemplate = [
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

  const menu = Menu.buildFromTemplate(topMenuBarTemplate);
  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  mainWindow.loadFile('main.html')

  mainWindow.on('resize', function (e) {
    e.preventDefault();
    var size = mainWindow.getSize();
    mainWindow.webContents.send('window:resize', { windowHeight: size[1], windowWidth: size[0] });
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle('project:save', () => { handleSaveProject(mainWindow) });
  ipcMain.handle('dialog:openFile', handleFileOpen);
  ipcMain.handle('project:openProject', handleOpenProjectFromLanding);
  ipcMain.handle('app:quit', handleAppQuit);
  ipcMain.handle('project:projectCreationWindowEntered', handleNewProjectCreationScreenEntered);
  ipcMain.handle('project:projectCreationWindowExited', handleNewProjectCreationScreenExited);
  ipcMain.on('project:newProject', (_event, value) => { handleNewProject(value); });
  ipcMain.on('export:setDirectory', (_event, _) => { handleSetExportDirectoryRequest(); });
  ipcMain.on('project:updateName', (_event, value) => { handleNewProjectName(value) });
  ipcMain.on('project:export', (_event, value) => { handleExportProject(value); });
  ipcMain.on('project:saveToFile', (_event, value) => { saveProjectFile(value); });

  createLandingWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createLandingWindow();
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

async function handleExportProject(payload) {
  const fs = require('fs/promises');

  if (payload.format === "JSON") {
    try {
      // Build a map of all unique positions
      const tileMap = new Map();

      // Helper to get or create tile entry
      const getOrCreateTile = (x, y) => {
        const key = `${x},${y}`;
        if (!tileMap.has(key)) {
          tileMap.set(key, {
            x,
            y,
            graphical_data: [null, null, null],
            collidable: false
          });
        }
        return tileMap.get(key);
      };

      // Process each graphical layer (0=background, 1=middle, 2=foreground)
      for (let layerIndex = 0; layerIndex < 3; layerIndex++) {
        for (const tile of payload.projectData.graphicalTileLayers[layerIndex].values) {
          const entry = getOrCreateTile(tile.X, tile.Y);
          entry.graphical_data[layerIndex] = {
            TilesheetX: tile.TilesheetX,
            TilesheetY: tile.TilesheetY
          };
        }
      }

      // Process collision tiles
      for (const tile of payload.projectData.collisionTiles) {
        const entry = getOrCreateTile(tile.X, tile.Y);
        entry.collidable = true;
      }

      // Build final export object
      const exportData = {
        projectName: payload.projectData.name,
        tileSize: payload.projectData.tileSize,
        mapWidth: payload.projectData.mapWidth,
        mapHeight: payload.projectData.mapHeight,
        layerOrder: ["background", "middle", "foreground"],
        tiles: Array.from(tileMap.values())
      };

      const filename = `${payload.projectData.name}-map-data.json`;
      const filepath = path.join(payload.exportDirectory, filename);
      await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

    } catch (err) {
      console.error(err);
    }

    mainWindow.webContents.send('export-complete', payload.exportDirectory);
  }
  else if (payload.format === "Custom Game Format") {
    try {
      let backgroundTileContent = `# DUNGEON_DESIGNER_PROJECT_NAME: ${payload.projectData.name}, CUSTOM_GAME_FORMAT: BACKGROUND_TILES\n`;
      backgroundTileContent += "# FORMAT: X, Y, TILESHEET_X, TILESHEET_Y\n";

      for (let i = 0; i < payload.projectData.graphicalTileLayers[0].values.length; i++) {
        let tile = payload.projectData.graphicalTileLayers[0].values[i];
        backgroundTileContent += `${tile.X}, ${tile.Y}, ${tile.TilesheetX}, ${tile.TilesheetY}\n`;
      }

      const backgroundFilepath = path.join(payload.exportDirectory, "background-tiles.ddtf");
      await fs.writeFile(backgroundFilepath, backgroundTileContent);

      let middleTileContent = `# DUNGEON_DESIGNER_PROJECT_NAME: ${payload.projectData.name}, CUSTOM_GAME_FORMAT: MIDDLE_TILES\n`;
      middleTileContent += "# FORMAT: X, Y, TILESHEET_X, TILESHEET_Y\n";

      for (let i = 0; i < payload.projectData.graphicalTileLayers[1].values.length; i++) {
        let tile = payload.projectData.graphicalTileLayers[1].values[i];
        middleTileContent += `${tile.X}, ${tile.Y}, ${tile.TilesheetX}, ${tile.TilesheetY}\n`;
      }

      const middleFilepath = path.join(payload.exportDirectory, "middle-tiles.ddtf");
      await fs.writeFile(middleFilepath, middleTileContent);

      let foregroundTileContent = `# DUNGEON_DESIGNER_PROJECT_NAME: ${payload.projectData.name}, CUSTOM_GAME_FORMAT: FOREGROUND_TILES\n`;
      foregroundTileContent += "# FORMAT: X, Y, TILESHEET_X, TILESHEET_Y\n";

      for (let i = 0; i < payload.projectData.graphicalTileLayers[2].values.length; i++) {
        let tile = payload.projectData.graphicalTileLayers[2].values[i];
        foregroundTileContent += `${tile.X}, ${tile.Y}, ${tile.TilesheetX}, ${tile.TilesheetY}\n`;
      }

      const foregroundFilepath = path.join(payload.exportDirectory, "foreground-tiles.ddtf");
      await fs.writeFile(foregroundFilepath, foregroundTileContent);

      let collisionTileContent = `# DUNGEON_DESIGNER_PROJECT_NAME: ${payload.projectData.name}, CUSTOM_GAME_FORMAT: COLLISION_TILES\n`;
      collisionTileContent += "# FORMAT: X, Y\n";

      for (let i = 0; i < payload.projectData.collisionTiles.length; i++) {
        let tile = payload.projectData.collisionTiles[i];
        collisionTileContent += `${tile.X}, ${tile.Y}\n`;
      }

      const collisionFilepath = path.join(payload.exportDirectory, "collision-tiles.ddtf");
      await fs.writeFile(collisionFilepath, collisionTileContent);

      mainWindow.webContents.send('export-complete', payload.exportDirectory);

    } catch (err) {
      console.error(err);
    }
  }
}

async function handleNewProject(newProjectData) {
  // Initialize the main window
  createMainWindow();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  })

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('load-new-project', newProjectData);
  });

  projectName = newProjectData.name.replace(" ", "_");
  projectInitialized = true;
  landingWindow.close();
};

async function handleSetExportDirectoryRequest() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (canceled) {
    mainWindow.setEnabled(true);
    mainWindow.focus();
  } else {
    mainWindow.webContents.send('export-directory-selected', filePaths[0]);
  }
}

async function handleNewProjectCreationScreenEntered() {
  landingWindow.setSize(projectCreationPageDimensions.width, projectCreationPageDimensions.height);
  landingWindow.center();
}

async function handleNewProjectCreationScreenExited() {
  landingWindow.setResizable(true);
  landingWindow.setSize(landingPageDimensions.width, landingPageDimensions.height);
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

        createMainWindow();

        mainWindow.once('ready-to-show', () => {
          mainWindow.show();
          mainWindow.maximize();
        })

        mainWindow.webContents.on('did-finish-load', () => {
          mainWindow.webContents.send('load-project-from-file', JSON.parse(projectDataString));
        });

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

async function handleSaveProject(mainWindow) {
  if (!projectFilePath) {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: projectName + ".ddes",
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
  }

  mainWindow.webContents.send('save-project', projectFilePath);
}

async function saveProjectFile(payload) {
  const fs = require('fs');

  fs.writeFile(projectFilePath, JSON.stringify(payload), err => {
    if (err) {
      console.error(err);
      mainWindow.webContents.send('save-project-completed', { message: "An error occurred when saving project. Error: " + err, success: false });
    }
  });

  mainWindow.webContents.send('save-project-completed', { message: "Project file saved successfully. Project file path: " + projectFilePath, success: true });
}

async function handleNewProjectName(val) {
  projectName = val.replace(" ", "_");
}