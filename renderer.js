import { DisplayMessage, MessageType } from './modules/messaging.js';
import { FillFlood } from './modules/fillflood.js'
import { PresentContext, SelectionModeOptions } from './modules/selectioncontext.js';
import {
    ActionTypes,
    startBatch,
    addToBatch,
    finalizeBatch,
    isBatchingActive,
    pushAction,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getActionDescription
} from './modules/undoredo.js';

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

// Tileset selector (single canvas approach to avoid GPU memory exhaustion)
let tilesetSelectorCanvas;  // Single canvas for tileset display
let tilesetSelectorCtx;     // Its 2D context
let hoveredTile = null;     // Track hovered tile for visual feedback

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
let clipboardValue = { width: 0, height: 0, values: [] };
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

// Platform detection for keyboard shortcuts
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

//
// Event Functions
//

window.onload = (_) => {
    brushToolButton.style.background = toolButtonPressedColor;
    collisionTileImage.src = './Assets/collision_tile.png';
}

window.onkeydown = (event) => {
    if (!event.repeat) {
        // Handle undo/redo shortcuts (work in all modes except Suspend)
        const modifierKey = isMac ? event.metaKey : event.ctrlKey;

        if (modifierKey && mapMode !== MapModes.Suspend) {
            if (event.key === 'z' || event.key === 'Z') {
                if (event.shiftKey) {
                    // Redo: Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Win)
                    event.preventDefault();
                    performRedo();
                    return;
                } else {
                    // Undo: Cmd+Z (Mac) or Ctrl+Z (Win)
                    event.preventDefault();
                    performUndo();
                    return;
                }
            }
            // Redo: Ctrl+Y (Windows/Linux only)
            if (!isMac && event.key === 'y') {
                event.preventDefault();
                performRedo();
                return;
            }
        }

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
            // Finalize any active batch when mouse is released
            finalizeBatch();
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
        // Finalize any active batch when mouse leaves canvas
        finalizeBatch();
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

                // Capture layer state before fill for undo
                const beforeFill = project.graphicalTileLayers[currentGraphicalTileLayer].values.map(tile => ({ ...tile }));

                FillFlood(mouseCoords[0], mouseCoords[1], project.graphicalTileLayers[currentGraphicalTileLayer].values, project.tileSize, selectedTile[0], selectedTile[1], mapCanvas.width, mapCanvas.height, targetTile);

                // Capture layer state after fill
                const afterFill = project.graphicalTileLayers[currentGraphicalTileLayer].values.map(tile => ({ ...tile }));

                // Calculate what changed
                const beforeMap = new Map(beforeFill.map(t => [`${t.X},${t.Y}`, t]));
                const afterMap = new Map(afterFill.map(t => [`${t.X},${t.Y}`, t]));

                const removed = [];
                const added = [];

                // Find removed or changed tiles
                for (const [key, tile] of beforeMap) {
                    const afterTile = afterMap.get(key);
                    if (!afterTile || afterTile.TilesheetX !== tile.TilesheetX || afterTile.TilesheetY !== tile.TilesheetY) {
                        removed.push(tile);
                    }
                }

                // Find added or changed tiles
                for (const [key, tile] of afterMap) {
                    const beforeTile = beforeMap.get(key);
                    if (!beforeTile || beforeTile.TilesheetX !== tile.TilesheetX || beforeTile.TilesheetY !== tile.TilesheetY) {
                        added.push(tile);
                    }
                }

                // Only push action if there were changes
                if (removed.length > 0 || added.length > 0) {
                    pushAction({
                        type: ActionTypes.FILL_FLOOD,
                        layerIndex: currentGraphicalTileLayer,
                        removed: removed,
                        added: added,
                        timestamp: Date.now()
                    });
                }

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

                // Capture collision tile before removal for undo
                const existingCollision = project.collisionTiles.find(
                    val => val.X === mouseCoords[0] && val.Y === mouseCoords[1]
                );

                if (existingCollision) {
                    pushAction({
                        type: ActionTypes.COLLISION_REMOVE,
                        layerIndex: -1, // -1 indicates collision layer
                        removed: [{ ...existingCollision }],
                        added: [],
                        timestamp: Date.now()
                    });
                }

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
            copySelectionToClipboard();
            changeMapMode(MapModes.Select);
            break;
        case SelectionModeOptions.Cut:
            copySelectionToClipboard()
            removedSelectedTilesFromMap(ActionTypes.SELECTION_CUT);
            changeMapMode(MapModes.Select);
            break;
        case SelectionModeOptions.Delete:
            removedSelectedTilesFromMap(ActionTypes.SELECTION_DELETE);
            changeMapMode(MapModes.Select);
            break;
        case SelectionModeOptions.Cancel:
            changeMapMode(MapModes.Select);
            break;
    }

    if (mapMode === MapModes.Select) {
        clearSelectModeCursor();
        let mouseCoords = getMouseCoordinatesOnMap(event);
        drawMapCursor(mouseCoords[0], mouseCoords[1]);
    }
});

function removedSelectedTilesFromMap(actionType) {
    const removedTiles = [];

    for (let i = 0; i < selectedRect.cells.length; i++) {
        // Find and capture the tile before removing it
        const existingTile = project.graphicalTileLayers[currentGraphicalTileLayer].values.find(
            val => val.X === selectedRect.cells[i].x && val.Y === selectedRect.cells[i].y
        );

        if (existingTile) {
            removedTiles.push({ ...existingTile });
        }

        project.graphicalTileLayers[currentGraphicalTileLayer].values = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(val => val.X !== selectedRect.cells[i].x || val.Y !== selectedRect.cells[i].y);
        drawCell(selectedRect.cells[i].x, selectedRect.cells[i].y);
    }

    // Track for undo if any tiles were removed
    if (removedTiles.length > 0) {
        pushAction({
            type: actionType,
            layerIndex: currentGraphicalTileLayer,
            removed: removedTiles,
            added: [],
            timestamp: Date.now()
        });
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

function copySelectionToClipboard() {
    if (selectedRect && selectedRect.cells && selectedRect.cells.length > 0) {

        const clipboardContainer = document.getElementById('clipboard-container');

        const clipboardCanvas = document.createElement("canvas");
        clipboardCanvas.width = selectedRect.width;
        clipboardCanvas.height = selectedRect.height;
        clipboardCanvas.classList.add('tile-canvas');
        clipboardCanvas.id = "clipboard-canvas";
        // newCanvas.onclick = () => { selectTile(x, y); changeMapMode(MapModes.Brush); };
        let ctx = clipboardCanvas.getContext("2d");

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
            clipboardValue = { height: selectedRect.height, width: selectedRect.width, values: cells };

            while (clipboardContainer.firstChild) {
                clipboardContainer.removeChild(clipboardContainer.firstChild);
            }

            clipboardContainer.append(clipboardCanvas);
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
    clearHistory(); // Clear undo/redo history for new project
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
        graphicalTileLayers: [{ name: value.layerNames[0], index: 0, values: [] }, { name: value.layerNames[1], index: 1, values: [] }, { name: value.layerNames[2], index: 2, values: [] }],
        collisionTiles: [],
        tilesetImagePath: value.tilesetImagePath,
        backgroundColor: defaultMapBackgroundColor
    };

    clearHistory(); // Clear undo/redo history for new project
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
    selectedTile = [x, y];
    drawTilesetSelector();
}

// Handler for placing new tiles on the map
function setTile(mouseX, mouseY) {
    if (mapMode === MapModes.Brush || mapMode === MapModes.Eraser) {
        // Find and capture existing tile before removal
        const existingTile = project.graphicalTileLayers[currentGraphicalTileLayer].values.find(
            val => val.X === mouseX && val.Y === mouseY
        );

        // Start batch if not already batching
        const actionType = mapMode === MapModes.Brush ? ActionTypes.TILE_PAINT : ActionTypes.TILE_ERASE;
        if (!isBatchingActive()) {
            startBatch(actionType, currentGraphicalTileLayer);
        }

        // Remove existing tile
        project.graphicalTileLayers[currentGraphicalTileLayer].values = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(val => val.X !== mouseX || val.Y !== mouseY);

        let newTile = null;
        if (mapMode === MapModes.Brush) {
            newTile = { X: mouseX, Y: mouseY, TilesheetX: selectedTile[0], TilesheetY: selectedTile[1] };
            project.graphicalTileLayers[currentGraphicalTileLayer].values.push(newTile);
        }

        // Track the change for undo
        addToBatch(existingTile || null, newTile);
    }
    else if (mapMode === MapModes.Collision) {
        // Find existing collision tile
        const existingCollision = project.collisionTiles.find(
            val => val.X === mouseX && val.Y === mouseY
        );

        // Start batch if not already batching
        if (!isBatchingActive()) {
            startBatch(ActionTypes.COLLISION_ADD, -1); // -1 indicates collision layer
        }

        removeCollisionTile(mouseX, mouseY);
        const newCollision = { X: mouseX, Y: mouseY };
        project.collisionTiles.push(newCollision);

        // Track the change for undo
        addToBatch(existingCollision || null, newCollision);
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
    else if (mouseX < 0 || mouseY < 0) {
        allowSetTile = false;
    }
    else if (mouseX >= project.mapWidth || mouseY >= project.mapHeight) {
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
    // Capture all tiles before clearing for undo
    const removedTiles = project.graphicalTileLayers[currentGraphicalTileLayer].values.map(tile => ({ ...tile }));

    if (removedTiles.length > 0) {
        pushAction({
            type: ActionTypes.CLEAR_LAYER,
            layerIndex: currentGraphicalTileLayer,
            removed: removedTiles,
            added: [],
            timestamp: Date.now()
        });
    }

    project.graphicalTileLayers[currentGraphicalTileLayer].values = [];
    drawMap();
}

// Perform undo operation
function performUndo() {
    // Finalize any active batch first
    finalizeBatch();

    if (!canUndo()) {
        DisplayMessage('Nothing to undo', 1000, MessageType.Information);
        return;
    }

    const action = undo();
    if (!action) return;

    applyUndoAction(action);

    const description = getActionDescription(action.type);
    DisplayMessage(`Undo: ${description}`, 1000, MessageType.Information);
}

// Perform redo operation
function performRedo() {
    if (!canRedo()) {
        DisplayMessage('Nothing to redo', 1000, MessageType.Information);
        return;
    }

    const action = redo();
    if (!action) return;

    applyRedoAction(action);

    const description = getActionDescription(action.type);
    DisplayMessage(`Redo: ${description}`, 1000, MessageType.Information);
}

// Apply an undo action (reverse the changes)
function applyUndoAction(action) {
    if (action.layerIndex === -1) {
        // Collision layer
        // Remove added tiles
        for (const tile of action.added) {
            project.collisionTiles = project.collisionTiles.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
        }
        // Restore removed tiles
        for (const tile of action.removed) {
            // Remove any existing at this position first (shouldn't exist, but be safe)
            project.collisionTiles = project.collisionTiles.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
            project.collisionTiles.push({ ...tile });
        }

        // Redraw affected cells if in collision mode
        if (mapMode === MapModes.Collision) {
            drawMap();
            drawCollisionTiles();
        }
    } else {
        // Graphical layer
        const layer = project.graphicalTileLayers[action.layerIndex];

        // Remove added tiles
        for (const tile of action.added) {
            layer.values = layer.values.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
        }

        // Restore removed tiles
        for (const tile of action.removed) {
            // Remove any existing at this position first
            layer.values = layer.values.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
            layer.values.push({ ...tile });
        }

        drawMap();
        if (mapMode === MapModes.Collision) {
            drawCollisionTiles();
        }
    }
}

// Apply a redo action (reapply the changes)
function applyRedoAction(action) {
    if (action.layerIndex === -1) {
        // Collision layer
        // Remove the tiles that were originally removed
        for (const tile of action.removed) {
            project.collisionTiles = project.collisionTiles.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
        }
        // Add the tiles that were originally added
        for (const tile of action.added) {
            // Remove any existing at this position first
            project.collisionTiles = project.collisionTiles.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
            project.collisionTiles.push({ ...tile });
        }

        // Redraw affected cells if in collision mode
        if (mapMode === MapModes.Collision) {
            drawMap();
            drawCollisionTiles();
        }
    } else {
        // Graphical layer
        const layer = project.graphicalTileLayers[action.layerIndex];

        // Remove the tiles that were originally removed
        for (const tile of action.removed) {
            layer.values = layer.values.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
        }

        // Add the tiles that were originally added
        for (const tile of action.added) {
            // Remove any existing at this position first
            layer.values = layer.values.filter(
                t => t.X !== tile.X || t.Y !== tile.Y
            );
            layer.values.push({ ...tile });
        }

        drawMap();
        if (mapMode === MapModes.Collision) {
            drawCollisionTiles();
        }
    }
}

// Initializes the tileset selection container with a single canvas to avoid GPU memory exhaustion
function initTileSelector() {
    // Clear existing content
    tilesetContainer.innerHTML = '';

    // Create single canvas
    tilesetSelectorCanvas = document.createElement("canvas");
    tilesetSelectorCanvas.id = "tileset-selector-canvas";
    tilesetSelectorCanvas.width = tileSetSourceImage.width;
    tilesetSelectorCanvas.height = tileSetSourceImage.height;
    tilesetSelectorCtx = tilesetSelectorCanvas.getContext("2d");

    // Draw tileset and initial selection
    drawTilesetSelector();

    // Click handler - calculate tile from coordinates
    tilesetSelectorCanvas.onclick = (e) => {
        const rect = tilesetSelectorCanvas.getBoundingClientRect();
        const scaleX = tilesetSelectorCanvas.width / rect.width;
        const scaleY = tilesetSelectorCanvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX / project.tileSize) * project.tileSize;
        const y = Math.floor((e.clientY - rect.top) * scaleY / project.tileSize) * project.tileSize;
        selectTile(x, y);
        changeMapMode(MapModes.Brush);
    };

    // Hover handler for visual feedback
    tilesetSelectorCanvas.onmousemove = (e) => {
        const rect = tilesetSelectorCanvas.getBoundingClientRect();
        const scaleX = tilesetSelectorCanvas.width / rect.width;
        const scaleY = tilesetSelectorCanvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX / project.tileSize) * project.tileSize;
        const y = Math.floor((e.clientY - rect.top) * scaleY / project.tileSize) * project.tileSize;
        if (hoveredTile === null || hoveredTile[0] !== x || hoveredTile[1] !== y) {
            hoveredTile = [x, y];
            drawTilesetSelector();
        }
    };

    tilesetSelectorCanvas.onmouseleave = () => {
        hoveredTile = null;
        drawTilesetSelector();
    };

    tilesetContainer.appendChild(tilesetSelectorCanvas);
}

// Renders the tileset image with selection and hover highlights
function drawTilesetSelector() {
    // Clear canvas to remove previous highlights
    tilesetSelectorCtx.clearRect(0, 0, tilesetSelectorCanvas.width, tilesetSelectorCanvas.height);

    // Draw base tileset image
    tilesetSelectorCtx.drawImage(tileSetSourceImage, 0, 0);

    // Draw hover highlight (subtle)
    if (hoveredTile !== null) {
        tilesetSelectorCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        tilesetSelectorCtx.lineWidth = 2;
        tilesetSelectorCtx.strokeRect(
            hoveredTile[0] + 1, hoveredTile[1] + 1,
            project.tileSize - 2, project.tileSize - 2
        );
    }

    // Draw selection highlight (yellow border matching .selected-tile)
    if (selectedTile[0] >= 0 && selectedTile[1] >= 0) {
        tilesetSelectorCtx.strokeStyle = '#fad644';
        tilesetSelectorCtx.lineWidth = 3;
        tilesetSelectorCtx.strokeRect(
            selectedTile[0], selectedTile[1],
            project.tileSize, project.tileSize
        );
    }
}