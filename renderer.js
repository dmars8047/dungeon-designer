import { DisplayMessage, MessageType } from './modules/messaging.js';
import { FillFlood } from './modules/fillflood.js'
import { PresentContext, SelectionModeOptions } from './modules/selectioncontext.js';

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
let tilesetContainer = document.getElementById("tileset-container");
let graphicalLayerSelect = document.getElementById("layer-select");
let projectSettingsButton = document.getElementById("btn-map-settings");
let exportButton = document.getElementById("export-button");
let projectSettingsModal = document.getElementById("project-settings-modal");
let exportModal = document.getElementById("export-modal");
let selectExportDirectoryButton = document.getElementById('select-export-directory-button');
let eraserToolButton = document.getElementById("eraser-tool-btn");
let selectToolButton = document.getElementById('select-tool-btn');
let brushToolButton = document.getElementById('brush-tool-btn');
let collisionToolButton = document.getElementById('collision-tool-btn');
let fillToolButton = document.getElementById('fill-tool-btn');
let saveButton = document.getElementById('save-btn');
let projectSettingsApplyButton = document.getElementById('project-settings-apply-button');


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
let selectedRect = { startX: 0, startY: 0, width: 0, height: 0, cells: [] };
let prefabValue = { width: 0, height: 0, values: [] };
let allowDrawMapCursor = true;
let allowSetTile = true;

const collisionTileSize = 64;
const toolButtonPressedColor = "#f39646";
const toolButtonNormalColor = "#f9d339";
const maxSelectSize = 256;
const cursorSelectModeTooLargeColor = "#ff1100";
const cursorSelectModeColor = "#f202fa";
const cursorDrawModeColor = "#30ff5d";
const cursorCollisionModeColor = "#00ffff";
const cursorEraserModeColor = "#ff8400";
const cursorFillModeColor = "#6176ff";
const defaultMapBackgroundColor = "#f4f8f9";
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
        if (mapMode !== MapModes.Suspend) {
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
                case 'p':
                    toggleProjectSettingsModal(true);
                    break;
                case 'o':
                    toggleExportModal(true);
                    break;
                case 'q':
                    changeMapMode(MapModes.Select);
                    break;
                case 's':
                    if (event.ctrlKey)
                        callProjectSave();
                    break;
            }
        }
        else {
            switch (event.key) {
                case 'Escape':
                    toggleExportModal(false);
                    toggleProjectSettingsModal(false);
                    break;
            }
        }

    }
}

selectExportDirectoryButton.onclick = async () => {
    await window.electronAPI.setExportDirectory();
}

exportButton.onclick = async () => {
    const jsonRadioBtn = document.getElementById('json-radio-btn');
    const customGameFormatRadioBtn = document.getElementById('custom-game-format-radio-btn');
    const exportDirectoryInput = document.getElementById('export-directory-file-input');

    if (!exportDirectoryInput.value) {
        DisplayMessage("An export directory must be specified", 1500, MessageType.Warning);
    }

    if (jsonRadioBtn.checked) {
        await window.electronAPI.exportProject({ format: "JSON", exportDirectory: exportDirectoryInput.value, projectData: project });
    }
    else if (customGameFormatRadioBtn.checked) {
        await window.electronAPI.exportProject({ format: "Custom Game Format", exportDirectory: exportDirectoryInput.value, projectData: project });
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
    if (event.target == projectSettingsModal) {
        toggleProjectSettingsModal(false);
    }
}

// Layer dropdown selection event.
graphicalLayerSelect.onchange = (_) => {
    setGraphicalTileLayer(graphicalLayerSelect.value);
};

graphicalLayerSelect.onkeydown = (event) => {
    event.preventDefault();
}

//Bind mouse events for painting (or removing) tiles on click/drag
mapCanvas.addEventListener("mouseup", (event) => {
    if (mapMode !== MapModes.Suspend) {
        if (event.button === 0) {
            isLeftMouseDown = false;
            if (mapMode === MapModes.Select) {
                mapMode = MapModes.Suspend;
                PresentContext(event.clientX, event.clientY, mapCursorColor === cursorSelectModeTooLargeColor);
            }
        }
        else if (event.button === 1) {
            mapCanvas.style.cursor = "none";
            isMiddleMouseDown = false;
        }
    }
});

mapCanvas.addEventListener("mouseleave", () => {
    if (mapMode !== MapModes.Suspend) {
        isLeftMouseDown = false;
        isMiddleMouseDown = false;
        allowDrawMapCursor = true;
        allowSetTile = true;
        lastSetTilePosition = [-1, -1];
        clearMapCursor();
        mapCanvas.style.cursor = 'none';
    }
});

mapCanvas.addEventListener("mousedown", (event) => {
    if (mapMode !== MapModes.Suspend) {
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
                    // Make sure the user is not targeting the same tile they have selected.
                    if (targetTile.X === selectedTile[0] && targetTile.Y === selectedTile[1]) {
                        return;
                    }
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
    }
});

mapCanvas.addEventListener("mousemove", (event) => {
    if (mapMode !== MapModes.Suspend) {
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
    }
});

mapCanvas.addEventListener('select-mode-option-selected', function (event) {

    switch (event.detail) {
        case SelectionModeOptions.Copy:
            console.log("Copy");
            copySelectionToPrefab();
            changeMapMode(MapModes.Select);
            break;
        case SelectionModeOptions.Cut:
            console.log("Cut");
            copySelectionToPrefab()
            removedSelectedTilesFromMap();
            changeMapMode(MapModes.Select);
            break;
        case SelectionModeOptions.Delete:
            console.log("Delete");
            removedSelectedTilesFromMap();
            changeMapMode(MapModes.Select);
            break;
        case SelectionModeOptions.Cancel:
            console.log("Cancel");
            changeMapMode(MapModes.Select);
            break;
    }

    if (mapMode === MapModes.Select) {
        clearSelectModeCursor();
        let mouseCoords = getMouseCoordinatesOnMap(event);
        drawMapCursor(mouseCoords[0], mouseCoords[1]);
    }
});

function removedSelectedTilesFromMap() {
    for (let i = 0; i < selectedRect.cells.length; i++) {
        project.graphicalTileLayers[currentGraphicalTileLayer].values = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(val => val.X !== selectedRect.cells[i].x || val.Y !== selectedRect.cells[i].y);
        drawCell(selectedRect.cells[i].x, selectedRect.cells[i].y);
    }
}

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

    selectedRect = { startX: rectStartX, startY: rectStartY, width: rectWidth, height: rectHeight, cells: [] };

    for (let j = rectStartY; j <= maxY; j += project.tileSize) {
        for (let i = rectStartX; i <= maxX; i += project.tileSize) {
            selectedRect.cells.push({ x: i, y: j });
        }
    }
}

function copySelectionToPrefab() {
    if (selectedRect && selectedRect.cells && selectedRect.cells.length > 0) {

        const prefabContainer = document.getElementById('prefab-container');

        const prefabCanvas = document.createElement("canvas");
        prefabCanvas.width = selectedRect.width;
        prefabCanvas.height = selectedRect.height;
        prefabCanvas.classList.add('tile-canvas');
        prefabCanvas.id = "prefab-canvas";
        // newCanvas.onclick = () => { selectTile(x, y); changeMapMode(MapModes.Brush); };
        let ctx = prefabCanvas.getContext("2d");

        let cells = [];

        for (let i = 0; i < selectedRect.cells.length; i++) {
            if (project.graphicalTileLayers[currentGraphicalTileLayer].values.some(val => val.X === selectedRect.cells[i].x && val.Y === selectedRect.cells[i].y)) {

                let tile = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(val => val.X === selectedRect.cells[i].x && val.Y === selectedRect.cells[i].y)[0];

                let cell = { TilesheetX: tile.TilesheetX, TilesheetY: tile.TilesheetY, X: tile.X - selectedRect.startX, Y: tile.Y - selectedRect.startY };

                ctx.drawImage(tileSetSourceImage, cell.TilesheetX, cell.TilesheetY, project.tileSize, project.tileSize, cell.X, cell.Y, project.tileSize, project.tileSize);

                cells.push(cell);
            }
        }

        if (cells.length > 0) {
            prefabValue = { height: selectedRect.height, width: selectedRect.width, values: cells };

            while (prefabContainer.firstChild) {
                prefabContainer.removeChild(prefabContainer.firstChild);
            }

            prefabContainer.append(prefabCanvas);
        }
    }
}

function clearSelectModeCursor() {
    if (selectedRect && selectedRect.cells && selectedRect.cells.length > 0) {
        const cleanupHeight = selectedRect.startY + selectedRect.height + project.tileSize;
        const cleanupWidth = selectedRect.startX + selectedRect.width + project.tileSize;
        const cleanupY = selectedRect.startY - project.tileSize;
        const cleanupX = selectedRect.startX - project.tileSize;

        for (let y = cleanupY; y <= cleanupHeight; y += project.tileSize) {
            for (let x = cleanupX; x <= cleanupWidth; x += project.tileSize) {
                drawCell(x, y);
            }
        }
    }
}

eraserToolButton.onclick = () => {
    changeMapMode(MapModes.Eraser);
};

selectToolButton.onclick = () => {
    changeMapMode(MapModes.Select);
};

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


function changeMapMode(desiredMode, toggleBehavior = false) {

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
            mapMode = MapModes.Suspend;
            break;
    }

    clearSelectModeCursor();
    selectedRect = { startX: 0, startY: 0, width: 0, height: 0, cells: [] };
    lastSetTilePosition = [-1, -1];
    allowSetTile = true;
    drawMapCursor(mapCursorPosition[0], mapCursorPosition[1]);
}

// Project Settings Modal
projectSettingsButton.onclick = () => {
    toggleProjectSettingsModal(true);
};

function toggleProjectSettingsModal(on) {
    if (on) {
        projectSettingsModal.style.display = "block";
        changeMapMode(MapModes.Suspend);
    }
    else {
        projectSettingsModal.style.display = "none";
        changeMapMode(MapModes.Brush);
    }
}

function toggleExportModal(on) {
    if (on) {
        exportModal.style.display = "block";
        changeMapMode(MapModes.Suspend);
    }
    else {
        exportModal.style.display = "none";
        changeMapMode(MapModes.Brush);
    }
}

//
// IPC Event Functions
//

window.electronAPI.onExportDirectorySelected((_, path) => {
    const input = document.getElementById('export-directory-file-input');
    input.value = path;
});

// Sends all information about the project so it can be saved
window.electronAPI.saveProject((event, _) => {
    event.sender.send('project:saveToFile', project);
});

// Handles a successful save message from the back end.
window.electronAPI.onSaveCompleted((_, value) => {
    const messageType = value.success ? MessageType.Information : MessageType.Error;
    DisplayMessage(value.message, 2000, messageType);
});

// Event handler for when a request to load a project from a file is recieved.
window.electronAPI.loadProjectFromFile((_, value) => {
    project = value;
    applyMapDimensions();
    applyMapBackgroundColor();
    updateGraphicalTileLayers();
    setProjectSettingsForm();
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
        tilesetImagePath: value.tilesetImagePath,
        backgroundColor: defaultMapBackgroundColor
    };

    applyMapDimensions();
    applyMapBackgroundColor();
    updateGraphicalTileLayers();
    setProjectSettingsForm();
    tileSetSourceImage.src = project.tilesetImagePath;
});

window.electronAPI.exportComplete((_, value) => {
    DisplayMessage(`Export to [${value}] Complete.`)
});

function setProjectSettingsForm() {
    let projectNameInput = document.getElementById('project-name-input');
    let projectWidthInput = document.getElementById('map-dimensions-width-input');
    let projectHeightInput = document.getElementById('map-dimensions-height-input');
    let mapBackgroundColorInput = document.getElementById('map-background-color-input');

    projectNameInput.value = project.name;
    projectWidthInput.value = project.mapWidth;
    projectHeightInput.value = project.mapHeight;
    mapBackgroundColorInput.value = project.backgroundColor;
}

projectSettingsApplyButton.onclick = async () => {
    let projectNameInput = document.getElementById('project-name-input');
    let projectWidthInput = document.getElementById('map-dimensions-width-input');
    let projectHeightInput = document.getElementById('map-dimensions-height-input');
    let mapBackgroundColorInput = document.getElementById('map-background-color-input');

    project.name = projectNameInput.value;
    project.mapWidth = projectWidthInput.value;
    project.mapHeight = projectHeightInput.value;
    project.backgroundColor = mapBackgroundColorInput.value;
    await window.electronAPI.updateProjectName(project.name);
    applyMapDimensions();
    applyMapBackgroundColor();
    setTimeout(() => {
        drawMap();
        toggleProjectSettingsModal(false);
    }, 50);
}

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
function applyMapDimensions() {
    if (project.graphicalTileLayers) {
        for (let i = 0; i < project.graphicalTileLayers.length; i++) {
            project.graphicalTileLayers[i].values = project.graphicalTileLayers[i].values.filter(val => val.X < project.mapWidth && val.Y < project.mapHeight);
        }
    }

    mapCanvas.width = project.mapWidth;
    mapCanvas.height = project.mapHeight;
}

function applyMapBackgroundColor() {
    mapCanvas.style.background = project.backgroundColor;
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
    else if (mapMode === MapModes.Collision) {
        removeCollisionTile(mouseX, mouseY);
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
function getMouseCoordinatesOnMap(event) {
    const { x, y } = event.target.getBoundingClientRect();
    const mouseX = Math.floor((event.clientX - x) / project.tileSize) * project.tileSize;
    const mouseY = Math.floor((event.clientY - y) / project.tileSize) * project.tileSize;

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
                collisionTileSize,
                collisionTileSize,
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

// Initializes the tileset selection container with selectable canvases which represent individual tiles
function initTileSelector() {
    for (let y = 0; y < tileSetSourceImage.height; y += project.tileSize) {
        for (let x = 0; x < tileSetSourceImage.width; x += project.tileSize) {
            const newCanvas = document.createElement("canvas");
            newCanvas.width = project.tileSize;
            newCanvas.height = project.tileSize;
            newCanvas.classList.add('tile-canvas');
            newCanvas.id = "tile-selection-canvas-" + x + "-" + y;
            newCanvas.onclick = () => { selectTile(x, y); changeMapMode(MapModes.Brush); };
            let ctx = newCanvas.getContext("2d");
            ctx.drawImage(tileSetSourceImage, x, y, project.tileSize, project.tileSize, 0, 0, project.tileSize, project.tileSize);
            tilesetContainer.append(newCanvas);
        }
    }
}