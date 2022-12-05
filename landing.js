let newProjectButton = document.getElementById('new-project-button');
let loadProjectButton = document.getElementById('load-project-button');
let quitButton = document.getElementById('quit-button');
let landingMenu = document.getElementById('landing-menu');
let newProjectMenu = document.getElementById('new-project-menu');
let cancelNewProjectButton = document.getElementById('cancel-create-project-button');
let createNewProjectButton = document.getElementById('create-project-button');
let projectNameInput = document.getElementById('project-name-input');
let tileSizeSelect = document.getElementById('tile-size-select');
let layerElementContainer = document.getElementById('layer-element-container');
let pushLayerButton = document.getElementById('push-layer-button');
let popLayerButton = document.getElementById('pop-layer-button');
let tilesetFileInput = document.getElementById('tileset-file-input');
let importTilesetButton = document.getElementById('import-tileset-button');
let errorMessageContainer = document.getElementById('error-message-container');
let errorMessage = document.getElementById('error-message');
let mapDimensionsWidthInput = document.getElementById('map-dimensions-width-input');
let mapDimensionsHeightInput = document.getElementById('map-dimensions-height-input');
let layerNameInput = document.getElementById("layer-1-name-input");

importTilesetButton.addEventListener('click', async () => {
    let pathToTilset = await window.electronAPI.openFile();
    if (pathToTilset) {
        tilesetFileInput.value = pathToTilset;
        tilesetFileInput.style.backgroundColor = '#fff';
    }
});

newProjectButton.addEventListener('click', async () => {
    landingMenu.style.display = 'none';
    newProjectMenu.style.display = 'grid';
    window.electronAPI.expandWindowForProjectCreation();
});

cancelNewProjectButton.addEventListener('click', async () => {
    newProjectMenu.style.display = 'none';
    errorMessageContainer.style.display = 'none';
    landingMenu.style.display = 'flex';
    window.electronAPI.goBackFromProjectCreation();
});

// Handles when the user clicks the create button in the create project 'form'.
createNewProjectButton.addEventListener('click', async () => {
    if (projectCreateFormIsValid()) {

        var creationRequest = {
            name: projectNameInput.value,
            tileSize: parseInt(tileSizeSelect.value),
            layerName: layerNameInput.value,
            tilesetImagePath: tilesetFileInput.value,
            mapWidth: mapDimensionsWidthInput.value,
            mapHeight: mapDimensionsHeightInput.value
        };

        await window.electronAPI.createNewProject(creationRequest);
    }
});

projectNameInput.addEventListener('keyup', async () => {
    if (projectNameInput.value) {
        projectNameInput.style.backgroundColor = '#fff';
    }
    else {
        projectNameInput.style.backgroundColor = '#ffc8c4';
    }
});

loadProjectButton.addEventListener('click', async () => {
    await window.electronAPI.openProject();
});

quitButton.addEventListener('click', async () => {
    await window.electronAPI.quitApp();
});

function projectCreateFormIsValid() {
    let isValid = true;
    let errorMessageText = '';

    if (!projectNameInput.value) {
        projectNameInput.style.backgroundColor = '#ffc8c4';
        errorMessageText = 'A project name is required. The name of the project must be under 255 characters.'
        isValid = false;
    }
    else {
        projectNameInput.style.backgroundColor = '#fff';
    }

    if (!mapDimensionsWidthInput.value ||
        mapDimensionsWidthInput.value < 1 ||
        !mapDimensionsHeightInput.value ||
        mapDimensionsHeightInput.value < 1) {

        mapDimensionsHeightInput.style.backgroundColor = '#ffc8c4';
        mapDimensionsWidthInput.style.backgroundColor = '#ffc8c4';

        if (!errorMessageText) {
            errorMessageText = 'You must provide a width and height for first map. The values must be positive numbers.';
        }
    }
    else {
        mapDimensionsHeightInput.style.backgroundColor = '#fff';
        mapDimensionsWidthInput.style.backgroundColor = '#fff';
    }

    if (!tilesetFileInput.value) {
        tilesetFileInput.style.backgroundColor = '#ffc8c4';

        if (!errorMessageText) {
            errorMessageText = 'You must provide an initial tileset PNG file.'
        }

        isValid = false;
    }
    else {
        tilesetFileInput.style.backgroundColor = '#fff';
    }

    if (!layerNameInput.value) {
        if (!errorMessageText) {
            errorMessageText = 'Each tileset layer must have a unique name.';
        }

        layerNameInput.style.backgroundColor = '#ffc8c4';
        isValid = false;
    }
    else {
        layerNameInput.style.backgroundColor = '#fff';
    }

    if (!isValid) {
        errorMessageContainer.style.display = 'inline';
        errorMessage.float
        errorMessage.innerHTML = '<strong>Error:</strong>&nbsp;' + errorMessageText;
        setTimeout(function () { fadeOutEffect(); }, 2500);
    }

    return isValid;
}

function fadeOutEffect() {
    var fadeEffect = setInterval(function () {
        if (!errorMessageContainer.style.opacity) {
            errorMessageContainer.style.opacity = 1;
        }
        if (errorMessageContainer.style.opacity > 0) {
            errorMessageContainer.style.opacity -= 0.1;
        } else {
            errorMessageContainer.style.display = 'none';
            errorMessageContainer.style.opacity = 1;
            clearInterval(fadeEffect);
        }
    }, 50);
}