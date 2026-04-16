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
let tilesetFilePicker = document.getElementById('tileset-file-picker');
let openProjectFilePicker = document.getElementById('open-project-file-picker');
let importTilesetButton = document.getElementById('import-tileset-button');
let mapDimensionsWidthInput = document.getElementById('map-dimensions-width-input');
let mapDimensionsHeightInput = document.getElementById('map-dimensions-height-input');
let layerCountSelect = document.getElementById('layer-count-select');
let layerNameInputs = [
    document.getElementById('layer-1-name-input'),
    document.getElementById('layer-2-name-input'),
    document.getElementById('layer-3-name-input'),
    document.getElementById('layer-4-name-input'),
    document.getElementById('layer-5-name-input'),
];
let layerNameRows = document.querySelectorAll('.layer-name-row');

let tilesetImageData = null; // base64 data URI of the selected tileset PNG

function setDefaultDimensions() {
    const tileSize = parseInt(tileSizeSelect.value);
    mapDimensionsWidthInput.value = tileSize * 10;
    mapDimensionsHeightInput.value = tileSize * 10;
    mapDimensionsWidthInput.step = tileSize;
    mapDimensionsHeightInput.step = tileSize;
}

function updateLayerRows() {
    const count = parseInt(layerCountSelect.value);
    layerNameRows.forEach((row, i) => {
        row.style.display = i < count ? 'contents' : 'none';
    });
}

setDefaultDimensions();
updateLayerRows();
tileSizeSelect.addEventListener('change', setDefaultDimensions);
layerCountSelect.addEventListener('change', updateLayerRows);

importTilesetButton.addEventListener('click', () => {
    tilesetFilePicker.click();
});

tilesetFilePicker.addEventListener('change', async () => {
    const file = tilesetFilePicker.files[0];
    if (!file) return;

    tilesetImageData = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
    });

    tilesetFileInput.value = file.name;
    tilesetFileInput.style.backgroundColor = '#fff';
});

newProjectButton.addEventListener('click', () => {
    landingMenuCard.style.display = 'none';
    newProjectCard.style.display = 'block';
});

cancelNewProjectButton.addEventListener('click', () => {
    newProjectCard.style.display = 'none';
    landingMenuCard.style.display = 'block';
});

createNewProjectButton.addEventListener('click', async () => {
    if (projectCreateFormIsValid()) {
        const layerCount = parseInt(layerCountSelect.value);
        const project = {
            name: projectNameInput.value,
            tileSize: parseInt(tileSizeSelect.value),
            mapWidth: parseInt(mapDimensionsWidthInput.value),
            mapHeight: parseInt(mapDimensionsHeightInput.value),
            graphicalTileLayers: Array.from({ length: layerCount }, (_, i) => ({
                name: layerNameInputs[i].value,
                index: i,
                values: []
            })),
            collisionTiles: [],
            tilesetImageData: tilesetImageData,
            backgroundColor: '#f4f8f9'
        };

        sessionStorage.setItem('pendingProject', JSON.stringify(project));
        window.location.href = 'main.html';
    }
});

projectNameInput.addEventListener('keyup', () => {
    if (projectNameInput.value) {
        projectNameInput.style.backgroundColor = '#fff';
    } else {
        projectNameInput.style.backgroundColor = '#ffc8c4';
    }
});

loadProjectButton.addEventListener('click', () => {
    openProjectFilePicker.click();
});

openProjectFilePicker.addEventListener('change', async () => {
    const file = openProjectFilePicker.files[0];
    if (!file) return;

    const text = await file.text();
    sessionStorage.setItem('pendingProject', text);
    window.location.href = 'main.html';
});

quitButton.addEventListener('click', () => {
    window.close();
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

    const width = parseInt(mapDimensionsWidthInput.value);
    const height = parseInt(mapDimensionsHeightInput.value);

    if (!mapDimensionsWidthInput.value ||
        isNaN(width) ||
        width < 1 ||
        width > 10000 ||
        !mapDimensionsHeightInput.value ||
        isNaN(height) ||
        height < 1 ||
        height > 10000) {

        mapDimensionsHeightInput.style.backgroundColor = '#ffc8c4';
        mapDimensionsWidthInput.style.backgroundColor = '#ffc8c4';

        if (!errorMessageText) {
            errorMessageText = 'Map dimensions must be between 1x1 and 10000x10000.';
        }

        isValid = false;
    }
    else {
        mapDimensionsHeightInput.style.backgroundColor = '#fff';
        mapDimensionsWidthInput.style.backgroundColor = '#fff';
    }

    if (isValid) {
        const tileSize = parseInt(tileSizeSelect.value);
        if (width % tileSize !== 0 || height % tileSize !== 0) {
            mapDimensionsWidthInput.style.backgroundColor = width % tileSize !== 0 ? '#ffc8c4' : '#fff';
            mapDimensionsHeightInput.style.backgroundColor = height % tileSize !== 0 ? '#ffc8c4' : '#fff';
            if (!errorMessageText) {
                errorMessageText = `Map dimensions must be multiples of the tile size (${tileSize}px).`;
            }
            isValid = false;
        }
    }

    if (!tilesetImageData) {
        tilesetFileInput.style.backgroundColor = '#ffc8c4';

        if (!errorMessageText) {
            errorMessageText = 'You must provide an initial tileset PNG file.'
        }

        isValid = false;
    }
    else {
        tilesetFileInput.style.backgroundColor = '#fff';
    }

    const layerCount = parseInt(layerCountSelect.value);
    for (let i = 0; i < layerCount; i++) {
        if (!layerNameInputs[i].value) {
            if (!errorMessageText) {
                errorMessageText = `A name is required for layer ${i + 1}.`;
            }
            layerNameInputs[i].style.backgroundColor = '#ffc8c4';
            isValid = false;
        } else {
            layerNameInputs[i].style.backgroundColor = '#fff';
        }
    }

    if (!isValid) {
        DisplayMessage(errorMessageText, 2500, MessageType.Error);
    }

    return isValid;
}
