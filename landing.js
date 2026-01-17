import { DisplayMessage, MessageType } from './modules/messaging.js';

let newProjectButton = document.getElementById('new-project-button');
let loadProjectButton = document.getElementById('load-project-button');
let quitButton = document.getElementById('quit-button');

let newProjectLabel = document.getElementById('new-project-label');
let loadProjectLabel = document.getElementById('load-project-label');
let quitLabel = document.getElementById('quit-label');

let landingMenuCard = document.getElementById('landing-menu-card');
let newProjectCard = document.getElementById('new-project-card');

let cancelNewProjectButton = document.getElementById('cancel-create-project-button');
let createNewProjectButton = document.getElementById('create-project-button');
let projectNameInput = document.getElementById('project-name-input');
let tileSizeSelect = document.getElementById('tile-size-select');
let tilesetFileInput = document.getElementById('tileset-file-input');
let importTilesetButton = document.getElementById('import-tileset-button');
let mapDimensionsWidthInput = document.getElementById('map-dimensions-width-input');
let mapDimensionsHeightInput = document.getElementById('map-dimensions-height-input');
let layerNameInput = document.getElementById("layer-1-name-input");
let layer2NameInput = document.getElementById("layer-2-name-input");
let layer3NameInput = document.getElementById("layer-3-name-input");

importTilesetButton.addEventListener('click', async () => {
    let pathToTilset = await window.electronAPI.openFile();
    if (pathToTilset) {
        tilesetFileInput.value = pathToTilset;
        tilesetFileInput.style.backgroundColor = '#fff';
    }
});

newProjectButton.addEventListener('click', async () => {
    landingMenuCard.style.display = 'none';
    newProjectCard.style.display = 'block';
    window.electronAPI.expandWindowForProjectCreation();
});

cancelNewProjectButton.addEventListener('click', async () => {
    newProjectCard.style.display = 'none';
    landingMenuCard.style.display = 'block';
    window.electronAPI.goBackFromProjectCreation();
});

// Handles when the user clicks the create button in the create project 'form'.
createNewProjectButton.addEventListener('click', async () => {
    if (projectCreateFormIsValid()) {

        var creationRequest = {
            name: projectNameInput.value,
            tileSize: parseInt(tileSizeSelect.value),
            layerNames: [layerNameInput.value, layer2NameInput.value, layer3NameInput.value],
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

newProjectLabel.addEventListener('click', () => newProjectButton.click());
loadProjectLabel.addEventListener('click', () => loadProjectButton.click());
quitLabel.addEventListener('click', () => quitButton.click());

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
            errorMessageText = 'A name is required for layer 1.';
        }

        layerNameInput.style.backgroundColor = '#ffc8c4';
        isValid = false;
    }
    else {
        layerNameInput.style.backgroundColor = '#fff';
    }

    if (!layer2NameInput.value) {
        if (!errorMessageText) {
            errorMessageText = 'A name is required for layer 2.';
        }

        layer2NameInput.style.backgroundColor = '#ffc8c4';
        isValid = false;
    }
    else {
        layer2NameInput.style.backgroundColor = '#fff';
    }

    if (!layer3NameInput.value) {
        if (!errorMessageText) {
            errorMessageText = 'A name is required for layer 3.';
        }

        layer3NameInput.style.backgroundColor = '#ffc8c4';
        isValid = false;
    }
    else {
        layer3NameInput.style.backgroundColor = '#fff';
    }

    if (!isValid) {
        DisplayMessage(errorMessageText, 2500, MessageType.Error);
    }

    return isValid;
}