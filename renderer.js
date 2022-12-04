import * as tileSelector from './modules/tile-selector.js';
import * as map from './modules/map-canvas.js';

//
// Project Data
//
var project;

//
// HTML Elements
//
// const mainContent = document.getElementById("main-content");
const clearCanvasButton = document.getElementById("clear-canvas-button");
const importTilesetButton = document.getElementById("open-file-button");
const layerSelect = document.getElementById("layer-select");
const tileSettingsButton = document.getElementById("btn-tile-settings");
const mapSettingsButton = document.getElementById("btn-map-settings");
const tileSettingsModal = document.getElementById("tile-settings-modal");
const mapSettingsModal = document.getElementById("map-settings-modal");
const closeTileSettingsCornerButton = document.getElementById("close-tile-settings-corner-button");
const closeMapSettingsCornerButton = document.getElementById("close-map-settings-corner-button");
const eraserToolButton = document.getElementById("eraser-tool-btn");

//
// Function Variables
//

let isMouseDown = false;
let eraserMode = false;

//
// IPC Event Functions
//

// Sends all information about the project so it can be saved
window.electronAPI.saveProject((event, value) => {
    console.log("Saving project...");

    var saveData = {
        projectName: project.name,
        tileSize: project.tileSize,
        mapWidth: map.getDimensions()[0],
        mapHeight: map.getDimensions()[1],
        tilesSourceImage: tileSelector.sourceImage.src,
        layers: map.getLayers()
    };

    event.sender.send('project:saveToFile', saveData);
});

// Event handler for when a request to load a project from a file is recieved.
window.electronAPI.loadProjectFromFile((event, value) => {
    project = {
        name: value.projectName,
        tileSize: value.tileSize
    };
    map.setDimensions(value.mapWidth, value.mapHeight);
    tileSelector.sourceImage.src = value.tilesSourceImage;
    map.init(value.mapWidth, value.mapHeight, value.tileSize, value.layers);
});

// Event handler for when a new project is created.
window.electronAPI.loadNewProject((event, value) => {
    console.log("Setting up new project...");

    console.table(value);

    project = {
        name: value.projectName,
        tileSize: value.tileSize
    };

    let layers = [{ name: value.layerName, index: 0, values: [] }];
    map.init(value.mapWidth, value.mapHeight, value.tileSize, layers);
    tileSelector.sourceImage.src = value.tilesSourceImage;
    updateLayerSelection(layers);
});

//
// Event Functions
//

// Page/Menu loaded
document.onload = () => {
    if (project) {
        map.drawMainCanvas();
    }
};

window.onkeydown = (event) => {
    console.log(event);

    switch (event.key) {
        case 'e':
            toggleEraserMode();
            map.drawCursor(isMouseDown, null, true);
            break;
        case 't':
            toggleMapSettingsModal(false);
            toggleTileSettingsModal(true);
            break;
        case 'm':
            toggleTileSettingsModal(false);
            toggleMapSettingsModal(true);
            break;
        case 'Escape':
            toggleTileSettingsModal(false);
            toggleMapSettingsModal(false);
            break;
    }
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
    if (event.target == tileSettingsModal) {
        toggleTileSettingsModal(false);
    }
    else if (event.target == mapSettingsModal) {
        toggleMapSettingsModal(false);
    }
}

// Import Tilset button click event
importTilesetButton.addEventListener('click', async () => {
    const filePath = await window.electronAPI.openFile();

    if (filePath) {
        map.clearMainCanvas();
        tileSelector.clear();
        tileSelector.sourceImage.src = filePath;
    }
});

// Layer dropdown selection event.
layerSelect.onchange = (event) => {
    setLayer(layerSelect.value);
};

//Bind mouse events for painting (or removing) tiles on click/drag
map.mapCanvas.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
        isMouseDown = false;
    }
});

map.mapCanvas.addEventListener("mouseleave", () => {
    isMouseDown = false;
    map.clearCursor(project.tileSize);
});

map.mapCanvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
        isMouseDown = true;
        map.drawTile(event, eraserMode, tileSelector.selectedTile);
        map.drawCursor(isMouseDown, event);
    }
});

map.mapCanvas.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        map.drawTile(event, eraserMode, tileSelector.selectedTile);
    }

    map.drawCursor(isMouseDown, event);
});

// Clear Canvas button click event
clearCanvasButton.onclick = () => {
    map.clear();
}

// Tileset source image loaded event
tileSelector.sourceImage.onload = () => {
    console.log("Image loaded");
    tileSelector.create(project.tileSize);
}

eraserToolButton.onclick = () => {
    toggleEraserMode();
};

function toggleEraserMode() {
    eraserMode = !eraserMode;

    if (eraserMode) {
        eraserToolButton.style.background = "#f39646";
        map.canvasCursorColor = "#f44336";
    }
    else {
        eraserToolButton.style.background = "#f9d339";
        map.canvasCursorColor = "#30ff5d";
    }
}

// Tile Settings Modal
tileSettingsButton.onclick = () => {
    toggleTileSettingsModal(true);
};

closeTileSettingsCornerButton.onclick = () => {
    toggleTileSettingsModal(false);
};

function toggleTileSettingsModal(toggleMode) {
    if (toggleMode)
        tileSettingsModal.style.display = "block";
    else
        tileSettingsModal.style.display = "none";
}

// Map Settings Modal
mapSettingsButton.onclick = () => {
    toggleMapSettingsModal(true);
};

closeMapSettingsCornerButton.onclick = () => {
    toggleMapSettingsModal(false);
};

function toggleMapSettingsModal(toggleMode) {
    if (toggleMode)
        mapSettingsModal.style.display = "block";
    else
        mapSettingsModal.style.display = "none";
}

//
// Logic Functions
//

// Updates the set layer dropdown
function updateLayerSelection(layers) {

    for (var i = 0; i < layers.length; i++) {
        var opt = document.createElement('option');
        opt.value = layers[i].index;
        opt.innerHTML = layers[i].name;
        layerSelect.appendChild(opt);
    }
}

// Sets the current layer
function setLayer(newLayer) {
    map.currentLayer = newLayer;
}