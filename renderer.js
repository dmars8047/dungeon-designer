import { DisplayMessage, MessageType } from './modules/messaging.js';
import { FillFlood } from './modules/fillflood.js'

//
// Project Data
//
let project;
let currentGraphicalTileLayer = 0;

//
// HTML Elements
//
let mapCanvas = document.getElementById("map-canvas");
let mapWrapper = document.getElementById("canvas-wrapper");
let clearLayerButton = document.getElementById("clear-layer-btn");
let importTilesetButton = document.getElementById("open-file-button");
let tilesetContainer = document.getElementById("tileset-container");
let graphicalLayerSelect = document.getElementById("layer-select");
let tileSettingsButton = document.getElementById("btn-tile-settings");
let mapSettingsButton = document.getElementById("btn-map-settings");
let tileSettingsModal = document.getElementById("tile-settings-modal");
let mapSettingsModal = document.getElementById("map-settings-modal");
let eraserToolButton = document.getElementById("eraser-tool-btn");
let selectToolButton = document.getElementById('select-tool-btn');
let brushToolButton = document.getElementById('brush-tool-btn');
let collisionToolButton = document.getElementById('collision-tool-btn');
let fillToolButton = document.getElementById('fill-tool-btn');
let saveButton = document.getElementById('save-btn');

//
// Function Variables
//
let tileSetSourceImage = new Image();
let collisionTileImage = new Image();
let isLeftMouseDown = false;
let isMiddleMouseDown = false;
let grabPosition = {}; // helps with dragging
let selectedTile = [0, 0]; //Which tile we will paint from the menu

const MapModes = {
    Brush: 0,
    Eraser: 1,
    Select: 2,
    Suspend: 3,
    Collision: 4,
    Fill: 5
}

let mapMode = MapModes.Brush;

let mapCursorPosition = [-1, -1];
let lastSetTilePosition = [-1, -1];
let selectCells = [];
let allowDrawMapCursor = true;
let allowSetTile = true;

const toolButtonPressedColor = "#f39646";
const toolButtonNormalColor = "#f9d339";
const maxSelectSize = 256;
const cursorSelectModeTooLargeColor = "#ff1100";
const cursorSelectModeColor = "#f202fa";
const cursorDrawModeColor = "#30ff5d";
const cursorCollisionModeColor = "#00ffff";
const cursorEraserModeColor = "#ff8400";
const cursorFillModeColor = "#6176ff";
let mapCursorColor = cursorDrawModeColor;

//
// Event Functions
//

window.onload = (_) => {
    brushToolButton.style.background = toolButtonPressedColor;
    collisionTileImage.src = './Assets/collision_tile.png';
}

window.onkeydown = (event) => {
    if (!event.repeat) {
        switch (event.key) {
            case 'g':
                changeMapMode(MapModes.Fill);
                break;
            case 'c':
                changeMapMode(MapModes.Collision);
                break;
            case 'b':
                changeMapMode(MapModes.Brush);
                break;
            case 'e':
                changeMapMode(MapModes.Eraser);
                break;
            case 't':
                toggleMapSettingsModal(false);
                toggleTileSettingsModal(true);
                break;
            case 'm':
                toggleTileSettingsModal(false);
                toggleMapSettingsModal(true);
                break;
            case 'q':
                changeMapMode(MapModes.Select);
                break;
            case 's':
                if (event.ctrlKey)
                    callProjectSave();
                break;
            case 'Escape':
                toggleTileSettingsModal(false);
                toggleMapSettingsModal(false);
                break;
        }
    }
}

brushToolButton.onclick = () => {
    changeMapMode(MapModes.Brush);
}

collisionToolButton.onclick = () => {
    changeMapMode(MapModes.Collision);
}

saveButton.onclick = async () => {
    await callProjectSave();
}

async function callProjectSave() {
    await window.electronAPI.callProjectSave();
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
        clearMapLayer();
        clearTileSet();
        tileSetSourceImage.src = filePath;
    }
});

// Layer dropdown selection event.
graphicalLayerSelect.onchange = (event) => {
    console.log(graphicalLayerSelect.value);
    setGraphicalTileLayer(graphicalLayerSelect.value);
};

//Bind mouse events for painting (or removing) tiles on click/drag
mapCanvas.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
        isLeftMouseDown = false;
        if (mapMode === MapModes.Select) {
            clearSelectModeCursor();
            let mouseCoords = getMouseCoordinatesOnMap(event);
            drawMapCursor(mouseCoords[0], mouseCoords[1]);
        }
    }
    else if (event.button === 1) {
        mapCanvas.style.cursor = "auto";
        isMiddleMouseDown = false;
    }
});

mapCanvas.addEventListener("mouseleave", () => {
    isLeftMouseDown = false;
    isMiddleMouseDown = false;
    allowDrawMapCursor = true;
    allowSetTile = true;
    lastSetTilePosition = [-1, -1];
    clearMapCursor();
    mapCanvas.style.cursor = 'auto';
});

mapCanvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
        isLeftMouseDown = true;
        let mouseCoords = getMouseCoordinatesOnMap(event);
        if (mapMode === MapModes.Select) {
            mapCursorColor = cursorSelectModeColor;
        }
        else if (mapMode === MapModes.Fill) {
            let targetTile = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(val => val.X === mouseCoords[0] && val.Y === mouseCoords[1])[0];
            if (targetTile) {
                targetTile = { X: targetTile.TilesheetX, Y: targetTile.TilesheetY };
            }
            FillFlood(mouseCoords[0], mouseCoords[1], project.graphicalTileLayers[currentGraphicalTileLayer].values, project.tileSize, selectedTile[0], selectedTile[1], mapCanvas.width, mapCanvas.height, targetTile);
            drawMap();
        }
        else if (allowSetTile) {
            setTile(mouseCoords[0], mouseCoords[1]);
        }
    }
    else if (event.button === 1) {
        isMiddleMouseDown = true;
        mapCanvas.style.cursor = "grabbing";
        grabPosition = {
            left: mapWrapper.scrollLeft,
            top: mapWrapper.scrollTop,
            x: event.clientX,
            y: event.clientY,
        };
    }
    else if (event.button === 2) {
        if (mapMode === MapModes.Collision) {
            let mouseCoords = getMouseCoordinatesOnMap(event);
            removeCollisionTile(mouseCoords[0], mouseCoords[1]);
            drawCell(mouseCoords[0], mouseCoords[1]);
            drawMapCursor(mouseCoords[0], mouseCoords[1]);
            allowSetTile = true;
            lastSetTilePosition = [-1, -1];
        }
    }
});

mapCanvas.addEventListener("mousemove", (event) => {
    let mouseCoords = getMouseCoordinatesOnMap(event);

    if (mapMode === MapModes.Select && isLeftMouseDown) {
        if (allowDrawMapCursor) {
            drawSelectionArea(mouseCoords);
        }
    }
    else if (isLeftMouseDown && allowSetTile && mapMode !== MapModes.Fill) {
        setTile(mouseCoords[0], mouseCoords[1]);
    }
    else if (isMiddleMouseDown) {
        // How far the mouse has been moved
        const dx = event.clientX - grabPosition.x;
        const dy = event.clientY - grabPosition.y;
        // Scroll the element
        mapWrapper.scrollTop = grabPosition.top - dy;
        mapWrapper.scrollLeft = grabPosition.left - dx;
    }
    else {
        if (allowDrawMapCursor) {
            drawMapCursor(mouseCoords[0], mouseCoords[1]);
        }
    }
});

function drawSelectionArea(mouseCoords) {
    const startX = mapCursorPosition[0];
    const startY = mapCursorPosition[1];
    const mouseX = mouseCoords[0];
    const mouseY = mouseCoords[1];

    let rectStartX = Math.min(startX, mouseX);
    let rectStartY = Math.min(startY, mouseY);
    let maxX = Math.max(startX, mouseX);
    let maxY = Math.max(startY, mouseY);
    let rectWidth = maxX - rectStartX + project.tileSize;
    let rectHeight = maxY - rectStartY + project.tileSize;

    if (rectWidth > maxSelectSize || rectHeight > maxSelectSize) {
        mapCursorColor = cursorSelectModeTooLargeColor;
    }
    else {
        mapCursorColor = cursorSelectModeColor;
    }

    clearSelectModeCursor();
    drawSelectModeCursor(rectStartX, rectStartY, rectWidth, rectHeight);

    selectCells = [];

    const cleanupHeight = rectStartY + rectHeight + project.tileSize;
    const cleanupWidth = rectStartX + rectWidth + project.tileSize;
    const cleanupY = rectStartY - project.tileSize;
    const cleanupX = rectStartX - project.tileSize;

    for (let j = cleanupY; j <= cleanupHeight; j += project.tileSize) {
        for (let i = cleanupX; i <= cleanupWidth; i += project.tileSize) {
            selectCells.push({ x: i, y: j });
        }
    }
}

function clearSelectModeCursor() {
    for (let i = 0; i < selectCells.length; i++) {
        drawCell(selectCells[i].x, selectCells[i].y);
    }
}

// Clear Canvas button click event
clearLayerButton.onclick = () => {
    clearMapLayer();
}

// Tileset source image loaded event
tileSetSourceImage.onload = () => {
    initTileSelector();
    // This timeout is for a load timing issue.
    setTimeout(() => {
        drawMap();
        selectTile(0, 0);
    }, 100);
};

eraserToolButton.onclick = () => {
    changeMapMode(MapModes.Eraser);
};

selectToolButton.onclick = () => {
    changeMapMode(MapModes.Select);
};

function changeMapMode(desiredMode, toggleBehavior = true) {

    if (desiredMode === mapMode) {
        if (toggleBehavior)
            desiredMode = MapModes.Brush;
        else
            return;
    }

    collisionToolButton.style.background = toolButtonNormalColor;
    eraserToolButton.style.background = toolButtonNormalColor;
    selectToolButton.style.background = toolButtonNormalColor;
    brushToolButton.style.background = toolButtonNormalColor;
    fillToolButton.style.background = toolButtonNormalColor;

    if (mapMode === MapModes.Collision) {
        // Removes collision tiles from the map.
        drawMap();
    }

    switch (desiredMode) {
        case MapModes.Fill:
            mapMode = MapModes.Fill;
            fillToolButton.style.background = toolButtonPressedColor;
            mapCursorColor = cursorFillModeColor;
            break;
        case MapModes.Collision:
            drawCollisionTiles();
            mapMode = MapModes.Collision;
            collisionToolButton.style.background = toolButtonPressedColor;
            mapCursorColor = cursorCollisionModeColor;
            break;
        case MapModes.Brush:
            mapMode = MapModes.Brush;
            brushToolButton.style.background = toolButtonPressedColor;
            mapCursorColor = cursorDrawModeColor;
            break;
        case MapModes.Eraser:
            mapMode = MapModes.Eraser;
            eraserToolButton.style.background = toolButtonPressedColor;
            mapCursorColor = cursorEraserModeColor;
            break;
        case MapModes.Select:
            mapMode = MapModes.Select;
            selectToolButton.style.background = toolButtonPressedColor;
            mapCursorColor = cursorSelectModeColor;
            break;
        case MapModes.Suspend:
            break;
    }

    clearSelectModeCursor();
    selectCells = [];
    lastSetTilePosition = [-1, -1];
    allowSetTile = true;
    drawMapCursor(mapCursorPosition[0], mapCursorPosition[1]);
}

// Tile Settings Modal
tileSettingsButton.onclick = () => {
    toggleTileSettingsModal(true);
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

function toggleMapSettingsModal(toggleMode) {
    if (toggleMode)
        mapSettingsModal.style.display = "block";
    else
        mapSettingsModal.style.display = "none";
}

//
// IPC Event Functions
//

// Sends all information about the project so it can be saved
window.electronAPI.saveProject((event, _) => {
    event.sender.send('project:saveToFile', project);
});

// Handles a successful save message from the back end.
window.electronAPI.onSaveCompleted((_, value) => {
    let messageType = value.success ? MessageType.Information : MessageType.Error;
    DisplayMessage(value.message, 2500, messageType);
});

// Event handler for when a request to load a project from a file is recieved.
window.electronAPI.loadProjectFromFile((_, value) => {
    project = value;
    setMapDimensions();
    updateGraphicalTileLayers();
    tileSetSourceImage.src = project.tilesetImagePath;
});

window.electronAPI.loadNewProject((_, value) => {
    project = {
        name: value.name,
        tileSize: value.tileSize,
        mapWidth: value.mapWidth,
        mapHeight: value.mapHeight,
        graphicalTileLayers: [{ name: value.layerNames[0], index: 0, values: [] }, { name: value.layerNames[1], index: 1, values: [] }],
        collisionTiles: [],
        tilesetImagePath: value.tilesetImagePath
    };

    setMapDimensions();
    updateGraphicalTileLayers();
    tileSetSourceImage.src = project.tilesetImagePath;
});

//
// Logic Functions
//

function clearMapCursor() {
    drawCell(mapCursorPosition[0], mapCursorPosition[1]);
    drawCell(mapCursorPosition[0] + project.tileSize, mapCursorPosition[1]);
    drawCell(mapCursorPosition[0] - project.tileSize, mapCursorPosition[1]);
    drawCell(mapCursorPosition[0], mapCursorPosition[1] + project.tileSize);
    drawCell(mapCursorPosition[0], mapCursorPosition[1] - project.tileSize);
    drawCell(mapCursorPosition[0] - project.tileSize, mapCursorPosition[1] - project.tileSize);
    drawCell(mapCursorPosition[0] + project.tileSize, mapCursorPosition[1] - project.tileSize);
    drawCell(mapCursorPosition[0] - project.tileSize, mapCursorPosition[1] + project.tileSize);
    drawCell(mapCursorPosition[0] + project.tileSize, mapCursorPosition[1] + project.tileSize);
}

function drawSelectModeCursor(x, y, w, h) {
    let ctx = mapCanvas.getContext("2d");
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.strokeStyle = mapCursorColor;
    ctx.rect(x, y, w, h);
    ctx.stroke();
}

function drawMapCursor(x, y) {
    clearMapCursor();
    mapCursorPosition[0] = x;
    mapCursorPosition[1] = y;
    let ctx = mapCanvas.getContext("2d");
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.strokeStyle = mapCursorColor;
    ctx.rect(x, y, project.tileSize, project.tileSize);
    ctx.stroke();
}

// Updates the set layer dropdown
function updateGraphicalTileLayers() {
    for (let i = 0; i < project.graphicalTileLayers.length; i++) {
        let opt = document.createElement('option');
        opt.value = project.graphicalTileLayers[i].index;
        opt.innerHTML = project.graphicalTileLayers[i].name;
        graphicalLayerSelect.appendChild(opt);
    }
}

// Sets the dimensions of the main canvas
function setMapDimensions() {
    mapCanvas.width = project.mapWidth;
    mapCanvas.height = project.mapHeight;
}

// Sets the selected tileset
function selectTile(x, y) {
    let oldCanvas = document.getElementById("tile-selection-canvas-" + selectedTile[0] + "-" + selectedTile[1]);
    let newCanvas = document.getElementById("tile-selection-canvas-" + x + "-" + y);

    if (oldCanvas != null && oldCanvas.classList != null) {
        if (oldCanvas.classList.contains("selected-tile")) {
            oldCanvas.classList.remove("selected-tile");
        }
    }

    selectedTile = [x, y];
    selectTile.classList = [];
    newCanvas.classList.add("selected-tile");
}

// Handler for placing new tiles on the map
function setTile(mouseX, mouseY) {
    if (mapMode === MapModes.Brush || mapMode === MapModes.Eraser) {
        project.graphicalTileLayers[currentGraphicalTileLayer].values = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(val => val.X !== mouseX || val.Y !== mouseY);

        if (mapMode === MapModes.Brush) {
            project.graphicalTileLayers[currentGraphicalTileLayer].values.push({ X: mouseX, Y: mouseY, TilesheetX: selectedTile[0], TilesheetY: selectedTile[1] });
        }
    }

    if (mapMode === MapModes.Collision) {
        removeCollisionTile(mouseX, mouseY);
        console.log("setting collision tile");
        project.collisionTiles.push({ X: mouseX, Y: mouseY });
    }

    lastSetTilePosition = [mouseX, mouseY];

    drawCell(mouseX, mouseY);
    drawMapCursor(mouseX, mouseY);
}

function removeCollisionTile(mouseX, mouseY) {
    project.collisionTiles = project.collisionTiles.filter(val => val.X !== mouseX || val.Y !== mouseY);
}

// Utility for getting coordinates of mouse click
function getMouseCoordinatesOnMap(e) {
    const { x, y } = e.target.getBoundingClientRect();
    const mouseX = Math.floor((e.clientX - x) / project.tileSize) * project.tileSize;
    const mouseY = Math.floor((e.clientY - y) / project.tileSize) * project.tileSize;

    if (mouseX === mapCursorPosition[0] && mouseY === mapCursorPosition[1]) {
        allowDrawMapCursor = false;
    }
    else {
        allowDrawMapCursor = true;
    }

    if (mouseX === lastSetTilePosition[0] && mouseY === lastSetTilePosition[1]) {
        allowSetTile = false;
    }
    else {
        allowSetTile = true;
    }

    return [mouseX, mouseY];
}

// Sets the current graphical tile layer
function setGraphicalTileLayer(newLayer) {
    currentGraphicalTileLayer = newLayer;
}

// Draws a cell on the map using the layer data for that position
function drawCell(x, y) {
    let ctx = mapCanvas.getContext("2d");
    ctx.clearRect(x, y, project.tileSize, project.tileSize);

    for (let i = 0; i < project.graphicalTileLayers.length; i++) {
        let cell = project.graphicalTileLayers[i].values.filter(val => val.X == x && val.Y == y)[0];

        if (cell) {
            ctx.drawImage(
                tileSetSourceImage,
                cell.TilesheetX,
                cell.TilesheetY,
                project.tileSize,
                project.tileSize,
                cell.X,
                cell.Y,
                project.tileSize,
                project.tileSize
            );
        }
    }

    if (mapMode == MapModes.Collision) {
        let cell = project.collisionTiles.filter(val => val.X == x && val.Y == y)[0];

        if (cell) {
            ctx.drawImage(
                collisionTileImage,
                0,
                0,
                64,
                64,
                cell.X,
                cell.Y,
                project.tileSize,
                project.tileSize
            );
        }
    }
}

// Draws the main canvas given the layers of the current section
function drawMap() {
    let ctx = mapCanvas.getContext("2d");
    ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    for (let i = 0; i < project.graphicalTileLayers.length; i++) {
        for (let j = 0; j < project.graphicalTileLayers[i].values.length; j++) {
            let cell = project.graphicalTileLayers[i].values[j];

            ctx.drawImage(
                tileSetSourceImage,
                cell.TilesheetX,
                cell.TilesheetY,
                project.tileSize,
                project.tileSize,
                cell.X,
                cell.Y,
                project.tileSize,
                project.tileSize
            );
        }
    }
}

function drawCollisionTiles() {
    let ctx = mapCanvas.getContext("2d");

    for (let i = 0; i < project.collisionTiles.length; i++) {
        let cell = project.collisionTiles[i];

        if (cell) {
            ctx.drawImage(
                collisionTileImage,
                0,
                0,
                64,
                64,
                cell.X,
                cell.Y,
                project.tileSize,
                project.tileSize
            );
        }
    }
}

// Reset state to empty
function clearMapLayer() {
    project.graphicalTileLayers[currentGraphicalTileLayer].values = [];
    drawMap();
}

// Removes all child canvases from the tileset selection container
function clearTileSet() {
    while (tilesetContainer.firstChild) {
        tilesetContainer.removeChild(tilesetContainer.firstChild);
    }
}

// Initializes the tileset selection container with selectable canvases which represent individual tiles
function initTileSelector() {
    for (let y = 0; y < tileSetSourceImage.height; y += project.tileSize) {
        for (let x = 0; x < tileSetSourceImage.width; x += project.tileSize) {
            const newCanvas = document.createElement("canvas");
            newCanvas.width = project.tileSize;
            newCanvas.height = project.tileSize;
            newCanvas.classList.add('tile-canvas');
            newCanvas.id = "tile-selection-canvas-" + x + "-" + y;
            newCanvas.onclick = () => { selectTile(x, y); };
            let ctx = newCanvas.getContext("2d");
            ctx.drawImage(tileSetSourceImage, x, y, project.tileSize, project.tileSize, 0, 0, project.tileSize, project.tileSize);
            tilesetContainer.append(newCanvas);
        }
    }
}