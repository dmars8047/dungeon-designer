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
let eraserToolButton = document.getElementById("eraser-tool-btn");
let selectToolButton = document.getElementById('select-tool-btn');
let brushToolButton = document.getElementById('brush-tool-btn');
let collisionToolButton = document.getElementById('collision-tool-btn');
let fillToolButton = document.getElementById('fill-tool-btn');
let saveButton = document.getElementById('save-btn');
let exportToolButton = document.getElementById('export-btn');
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
let selectedTileSize = [1, 1]; // Width and height of selection in tile units
let stashedTile = null; // Stashed selection for restoring after eraser/collision/select
let stashedTileSize = null;

// Tileset selector (single canvas approach to avoid GPU memory exhaustion)
let tilesetSelectorCanvas;  // Single canvas for tileset display
let tilesetSelectorCtx;     // Its 2D context
let tilesetHoverOverlay;    // CSS overlay div for hover cursor
let tilesetSelectionOverlay; // CSS overlay div for selection cursor

const MapModes = {
    Brush: 0,
    Eraser: 1,
    Select: 2,
    Suspend: 3,
    Collision: 4,
    Fill: 5,
    Paste: 6
}

let mapMode = MapModes.Brush;

let mapCursorPosition = [-1, -1];
let mapCursorOverlay;  // CSS overlay div for map cursor
let lastSetTilePosition = [-1, -1];
let selectedRect = { startX: 0, startY: 0, width: 0, height: 0, cells: [] };
let clipboardValue = { width: 0, height: 0, values: [] };
let pastePreviewPosition = { x: -1, y: -1 };
let previousModeBeforePaste = MapModes.Brush;
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
const cursorPasteModeColor = "#00ffaa";
const defaultMapBackgroundColor = "#f4f8f9";

function projectSlug() {
    return project.name.toLowerCase().replace(/\s+/g, '-');
}
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
            // Ctrl+V / Cmd+V for paste
            if (event.key === 'v' || event.key === 'V') {
                event.preventDefault();
                enterPasteMode();
                return;
            }
            // Ctrl+1/2/3 or Cmd+1/2/3 for layer switching
            if (['1', '2', '3', '4', '5'].includes(event.key)) {
                event.preventDefault();
                const layerIndex = parseInt(event.key) - 1;
                if (layerIndex < project.graphicalTileLayers.length) {
                    graphicalLayerSelect.value = layerIndex;
                    setGraphicalTileLayer(layerIndex);
                }
                return;
            }
            // Ctrl+S / Cmd+S for save
            if (event.key === 's' || event.key === 'S') {
                event.preventDefault();
                callProjectSave();
                return;
            }
        }

        if (mapMode !== MapModes.Suspend && mapMode !== MapModes.Paste) {
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
            }
        }
        else if (mapMode === MapModes.Paste) {
            if (event.key === 'Escape') {
                exitPasteMode(true);
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

exportButton.onclick = async () => {
    const jsonRadioBtn = document.getElementById('json-radio-btn');
    const customGameFormatRadioBtn = document.getElementById('custom-game-format-radio-btn');

    try {
        if (jsonRadioBtn.checked) {
            await exportProject("JSON");
        } else if (customGameFormatRadioBtn.checked) {
            await exportProject("Custom Game Format");
        }
    } catch (err) {
        DisplayMessage(`Export failed: ${err.message}`, 4000, MessageType.Error);
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

exportToolButton.onclick = () => {
    toggleExportModal(true);
}

async function callProjectSave() {
    const data = JSON.stringify(project);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectSlug()}.ddes`;
    a.click();
    URL.revokeObjectURL(url);
    DisplayMessage('Project saved.', 2000, MessageType.Information);
}

// Menu bar wiring
document.getElementById('menu-open').addEventListener('click', () => {
    document.getElementById('open-project-input').click();
    closeMenus();
});

document.getElementById('menu-save').addEventListener('click', async () => {
    await callProjectSave();
    closeMenus();
});

document.getElementById('menu-export').addEventListener('click', () => {
    toggleExportModal(true);
    closeMenus();
});

document.getElementById('menu-undo').addEventListener('click', () => {
    performUndo();
    closeMenus();
});

document.getElementById('menu-redo').addEventListener('click', () => {
    performRedo();
    closeMenus();
});

document.querySelectorAll('.menu-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.menu-item');
        const isOpen = item.classList.contains('open');
        closeMenus();
        if (!isOpen) item.classList.add('open');
        e.stopPropagation();
    });
});

function closeMenus() {
    document.querySelectorAll('.menu-item.open').forEach(el => el.classList.remove('open'));
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

        // Clear paste preview when mouse leaves canvas
        if (mapMode === MapModes.Paste) {
            clearPastePreview();
            pastePreviewPosition = { x: -1, y: -1 };
        }
    }
});

mapCanvas.addEventListener("mousedown", (event) => {
    if (mapMode !== MapModes.Suspend) {
        if (event.button === 0) {
            isLeftMouseDown = true;
            let mouseCoords = getMouseCoordinatesOnMap(event);

            // Handle paste mode click
            if (mapMode === MapModes.Paste) {
                executePaste(mouseCoords[0], mouseCoords[1]);
                exitPasteMode(false);
                return;
            }

            if (mapMode === MapModes.Select) {
                mapCursorColor = cursorSelectModeColor;
            }
            else if (mapMode === MapModes.Fill) {
                let targetTile = project.graphicalTileLayers[currentGraphicalTileLayer].values.find(val => val.X === mouseCoords[0] && val.Y === mouseCoords[1]);
                if (targetTile) {
                    targetTile = { X: targetTile.TilesheetX, Y: targetTile.TilesheetY };
                    // Make sure the user is not targeting the same tile they have selected (single-tile only).
                    if (selectedTileSize[0] === 1 && selectedTileSize[1] === 1 &&
                        targetTile.X === selectedTile[0] && targetTile.Y === selectedTile[1]) {
                        return;
                    }
                }

                // Capture layer state before fill for undo
                const beforeFill = project.graphicalTileLayers[currentGraphicalTileLayer].values.map(tile => ({ ...tile }));

                FillFlood(mouseCoords[0], mouseCoords[1], project.graphicalTileLayers[currentGraphicalTileLayer].values, project.tileSize, selectedTile, selectedTileSize, mapCanvas.width, mapCanvas.height, targetTile);

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

        // Handle paste mode preview
        if (mapMode === MapModes.Paste) {
            drawPastePreview(mouseCoords[0], mouseCoords[1]);
            return;
        }

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
            let tile = project.graphicalTileLayers[currentGraphicalTileLayer].values.find(val => val.X === selectedRect.cells[i].x && val.Y === selectedRect.cells[i].y);

            if (tile) {
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
    mapCursorOverlay.style.display = "none";
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
    if (!mapCursorOverlay) initMapCursorOverlay();
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

    // Stash multi-tile selection when leaving drawing modes, restore when returning
    const drawingModes = [MapModes.Brush, MapModes.Fill];
    const enteringDrawingMode = drawingModes.includes(desiredMode);
    const leavingDrawingMode = drawingModes.includes(mapMode);

    if (!enteringDrawingMode && leavingDrawingMode) {
        stashedTile = [...selectedTile];
        stashedTileSize = [...selectedTileSize];
        selectedTileSize = [1, 1];
    }
    if (enteringDrawingMode && !leavingDrawingMode && stashedTile) {
        selectedTile = stashedTile;
        selectedTileSize = stashedTileSize;
        stashedTile = null;
        stashedTileSize = null;
        selectTile(selectedTile[0], selectedTile[1], selectedTileSize[0], selectedTileSize[1]);
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
        case MapModes.Paste:
            mapMode = MapModes.Paste;
            mapCursorColor = cursorPasteModeColor;
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
// Project Load
//

function loadProject(value) {
    project = value;
    clearHistory();
    clipboardValue = { width: 0, height: 0, values: [] };
    graphicalLayerSelect.innerHTML = '';
    applyMapDimensions();
    applyMapBackgroundColor();
    updateGraphicalTileLayers();
    setProjectSettingsForm();
    tileSetSourceImage.src = project.tilesetImageData;
}

// On page load, read project from sessionStorage (set by landing page)
const pendingProject = sessionStorage.getItem('pendingProject');
if (pendingProject) {
    sessionStorage.removeItem('pendingProject');
    loadProject(JSON.parse(pendingProject));
}

// Open an existing .ddes project file from within the editor
document.getElementById('open-project-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    loadProject(JSON.parse(text));
    e.target.value = '';
});

//
// Export
//

async function exportProject(format) {
    if (format === "JSON") {
        const tileMap = new Map();
        const getOrCreateTile = (x, y) => {
            const key = `${x},${y}`;
            if (!tileMap.has(key)) {
                tileMap.set(key, { x, y, graphical_data: Array(project.graphicalTileLayers.length).fill(null), collidable: false });
            }
            return tileMap.get(key);
        };

        for (let layerIndex = 0; layerIndex < project.graphicalTileLayers.length; layerIndex++) {
            for (const tile of project.graphicalTileLayers[layerIndex].values) {
                const entry = getOrCreateTile(tile.X, tile.Y);
                entry.graphical_data[layerIndex] = { TilesheetX: tile.TilesheetX, TilesheetY: tile.TilesheetY };
            }
        }

        for (const tile of project.collisionTiles) {
            const entry = getOrCreateTile(tile.X, tile.Y);
            entry.collidable = true;
        }

        const exportData = {
            projectName: project.name,
            tileSize: project.tileSize,
            mapWidth: project.mapWidth,
            mapHeight: project.mapHeight,
            layerOrder: project.graphicalTileLayers.map(l => l.name),
            tiles: Array.from(tileMap.values()).sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
        };

        const zip = new JSZip();
        zip.file(`${projectSlug()}-map-data.json`, JSON.stringify(exportData, null, 2));
        zip.file('tileset.png', project.tilesetImageData.split(',')[1], { base64: true });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectSlug()}-export.zip`;
        a.click();
        URL.revokeObjectURL(url);

    } else if (format === "Custom Game Format") {
        const zip = new JSZip();

        for (const layer of project.graphicalTileLayers) {
            const slug = layer.name.toLowerCase().replace(/\s+/g, '-');
            let content = `# DUNGEON_DESIGNER_PROJECT_NAME: ${project.name}, CUSTOM_GAME_FORMAT: ${layer.name.toUpperCase()}_TILES\n`;
            content += "# FORMAT: X, Y, TILESHEET_X, TILESHEET_Y\n";
            for (const tile of layer.values) {
                content += `${tile.X}, ${tile.Y}, ${tile.TilesheetX}, ${tile.TilesheetY}\n`;
            }
            zip.file(`${slug}-tiles.ddtf`, content);
        }

        let collisionContent = `# DUNGEON_DESIGNER_PROJECT_NAME: ${project.name}, CUSTOM_GAME_FORMAT: COLLISION_TILES\n`;
        collisionContent += "# FORMAT: X, Y\n";
        for (const tile of project.collisionTiles) {
            collisionContent += `${tile.X}, ${tile.Y}\n`;
        }

        zip.file("collision-tiles.ddtf", collisionContent);
        zip.file('tileset.png', project.tilesetImageData.split(',')[1], { base64: true });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectSlug()}-export.zip`;
        a.click();
        URL.revokeObjectURL(url);
    }

    toggleExportModal(false);
    DisplayMessage('Export complete.', 2000, MessageType.Information);
}

function setProjectSettingsForm() {
    let projectNameInput = document.getElementById('project-name-input');
    let projectWidthInput = document.getElementById('map-dimensions-width-input');
    let projectHeightInput = document.getElementById('map-dimensions-height-input');
    let mapBackgroundColorInput = document.getElementById('map-background-color-input');

    projectNameInput.value = project.name;
    projectWidthInput.value = project.mapWidth;
    projectWidthInput.step = project.tileSize;
    projectHeightInput.value = project.mapHeight;
    projectHeightInput.step = project.tileSize;
    mapBackgroundColorInput.value = project.backgroundColor;
}

projectSettingsApplyButton.onclick = async () => {
    let projectNameInput = document.getElementById('project-name-input');
    let projectWidthInput = document.getElementById('map-dimensions-width-input');
    let projectHeightInput = document.getElementById('map-dimensions-height-input');
    let mapBackgroundColorInput = document.getElementById('map-background-color-input');

    const newWidth = parseInt(projectWidthInput.value);
    const newHeight = parseInt(projectHeightInput.value);

    if (!newWidth || !newHeight || newWidth < 1 || newHeight < 1) {
        DisplayMessage('Map dimensions must be positive numbers.', 2000, MessageType.Warning);
        return;
    }

    if (newWidth % project.tileSize !== 0 || newHeight % project.tileSize !== 0) {
        DisplayMessage(`Map dimensions must be multiples of the tile size (${project.tileSize}px).`, 2500, MessageType.Warning);
        return;
    }

    project.name = projectNameInput.value;
    project.mapWidth = newWidth;
    project.mapHeight = newHeight;
    project.backgroundColor = mapBackgroundColorInput.value;
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

// Initialize the map cursor overlay div
function initMapCursorOverlay() {
    mapCursorOverlay = document.createElement("div");
    mapCursorOverlay.style.position = "absolute";
    mapCursorOverlay.style.border = "2px dashed " + mapCursorColor;
    mapCursorOverlay.style.pointerEvents = "none";
    mapCursorOverlay.style.display = "none";
    mapCursorOverlay.style.boxSizing = "border-box";
    mapWrapper.style.position = "relative";
    mapWrapper.appendChild(mapCursorOverlay);
}

function clearMapCursor() {
    mapCursorOverlay.style.display = "none";
}

function drawSelectModeCursor(x, y, w, h) {
    mapCursorOverlay.style.left = (x + mapCanvas.offsetLeft) + "px";
    mapCursorOverlay.style.top = (y + mapCanvas.offsetTop) + "px";
    mapCursorOverlay.style.width = w + "px";
    mapCursorOverlay.style.height = h + "px";
    mapCursorOverlay.style.borderColor = mapCursorColor;
    mapCursorOverlay.style.display = "block";
}

function drawMapCursor(x, y) {
    mapCursorPosition[0] = x;
    mapCursorPosition[1] = y;
    mapCursorOverlay.style.left = (x + mapCanvas.offsetLeft) + "px";
    mapCursorOverlay.style.top = (y + mapCanvas.offsetTop) + "px";
    mapCursorOverlay.style.width = (project.tileSize * selectedTileSize[0]) + "px";
    mapCursorOverlay.style.height = (project.tileSize * selectedTileSize[1]) + "px";
    mapCursorOverlay.style.borderColor = mapCursorColor;
    mapCursorOverlay.style.display = "block";
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

// Sets the selected tileset tile(s)
function selectTile(x, y, widthTiles = 1, heightTiles = 1) {
    selectedTile = [x, y];
    selectedTileSize = [widthTiles, heightTiles];
    if (tilesetSelectionOverlay && tilesetSelectorCanvas) {
        const rect = tilesetSelectorCanvas.getBoundingClientRect();
        const displayW = rect.width * project.tileSize / tilesetSelectorCanvas.width;
        const displayH = rect.height * project.tileSize / tilesetSelectorCanvas.height;
        const tileX = x / project.tileSize;
        const tileY = y / project.tileSize;
        tilesetSelectionOverlay.style.left = (tileX * displayW) + "px";
        tilesetSelectionOverlay.style.top = (tileY * displayH) + "px";
        tilesetSelectionOverlay.style.width = (displayW * widthTiles) + "px";
        tilesetSelectionOverlay.style.height = (displayH * heightTiles) + "px";
        tilesetSelectionOverlay.style.display = "block";
    }
}

// Selects a rectangular region between two tile coordinates (normalizes drag direction)
function selectTileRegion(startX, startY, endX, endY) {
    const minX = Math.min(startX, endX);
    const minY = Math.min(startY, endY);
    const maxX = Math.max(startX, endX);
    const maxY = Math.max(startY, endY);
    const widthTiles = (maxX - minX) / project.tileSize + 1;
    const heightTiles = (maxY - minY) / project.tileSize + 1;
    selectTile(minX, minY, widthTiles, heightTiles);
}

// Handler for placing new tiles on the map
function setTile(mouseX, mouseY) {
    if (mapMode === MapModes.Brush || mapMode === MapModes.Eraser) {
        // Start batch if not already batching
        const actionType = mapMode === MapModes.Brush ? ActionTypes.TILE_PAINT : ActionTypes.TILE_ERASE;
        if (!isBatchingActive()) {
            startBatch(actionType, currentGraphicalTileLayer);
        }

        for (let dy = 0; dy < selectedTileSize[1]; dy++) {
            for (let dx = 0; dx < selectedTileSize[0]; dx++) {
                const mapX = mouseX + dx * project.tileSize;
                const mapY = mouseY + dy * project.tileSize;

                // Skip tiles outside map bounds
                if (mapX < 0 || mapY < 0 || mapX >= project.mapWidth || mapY >= project.mapHeight) continue;

                // Find and capture existing tile before removal
                const existingTile = project.graphicalTileLayers[currentGraphicalTileLayer].values.find(
                    val => val.X === mapX && val.Y === mapY
                );

                // Remove existing tile
                project.graphicalTileLayers[currentGraphicalTileLayer].values = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(val => val.X !== mapX || val.Y !== mapY);

                let newTile = null;
                if (mapMode === MapModes.Brush) {
                    newTile = {
                        X: mapX,
                        Y: mapY,
                        TilesheetX: selectedTile[0] + dx * project.tileSize,
                        TilesheetY: selectedTile[1] + dy * project.tileSize
                    };
                    project.graphicalTileLayers[currentGraphicalTileLayer].values.push(newTile);
                }

                // Track the change for undo
                addToBatch(existingTile || null, newTile);
                drawCell(mapX, mapY);
            }
        }
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

    // Collision mode still needs single-cell redraw (brush/eraser draw inside their loop)
    if (mapMode === MapModes.Collision) {
        drawCell(mouseX, mouseY);
    }
    drawMapCursor(mouseX, mouseY);
}

function removeCollisionTile(mouseX, mouseY) {
    project.collisionTiles = project.collisionTiles.filter(val => val.X !== mouseX || val.Y !== mouseY);
}

// Utility for getting coordinates of mouse click
function getMouseCoordinatesOnMap(event) {
    // Guard against invalid tileSize
    if (project.tileSize <= 0) {
        console.warn("Invalid tileSize:", project.tileSize);
        return [0, 0];
    }

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
        let cell = project.graphicalTileLayers[i].values.find(val => val.X == x && val.Y == y);

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
        let cell = project.collisionTiles.find(val => val.X == x && val.Y == y);

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

// Enter paste mode to place clipboard contents
function enterPasteMode() {
    if (!clipboardValue || !clipboardValue.values || clipboardValue.values.length === 0) {
        DisplayMessage('Clipboard is empty', 1500, MessageType.Warning);
        return;
    }

    previousModeBeforePaste = mapMode;
    changeMapMode(MapModes.Paste);
    DisplayMessage('Click to place tiles (Esc to cancel)', 2000, MessageType.Information);
}

// Exit paste mode
function exitPasteMode(cancelled) {
    clearPastePreview();
    pastePreviewPosition = { x: -1, y: -1 };

    if (cancelled) {
        changeMapMode(previousModeBeforePaste);
        DisplayMessage('Paste cancelled', 1000, MessageType.Information);
    } else {
        changeMapMode(MapModes.Select);
    }
}

// Draw a semi-transparent preview of clipboard contents at cursor position
function drawPastePreview(x, y) {
    // Skip if position hasn't changed
    if (pastePreviewPosition.x === x && pastePreviewPosition.y === y) {
        return;
    }

    // Clear previous preview
    clearPastePreview();

    pastePreviewPosition = { x, y };

    let ctx = mapCanvas.getContext("2d");

    // Save context state
    ctx.save();
    ctx.globalAlpha = 0.5;

    // Draw each tile from clipboard at offset position
    for (let i = 0; i < clipboardValue.values.length; i++) {
        const tile = clipboardValue.values[i];
        const destX = x + tile.X;
        const destY = y + tile.Y;

        // Skip tiles outside map bounds
        if (destX < 0 || destY < 0 || destX >= project.mapWidth || destY >= project.mapHeight) {
            continue;
        }

        ctx.drawImage(
            tileSetSourceImage,
            tile.TilesheetX,
            tile.TilesheetY,
            project.tileSize,
            project.tileSize,
            destX,
            destY,
            project.tileSize,
            project.tileSize
        );
    }

    // Restore context state
    ctx.restore();

    // Draw dashed rectangle outline around paste area (clipped to map bounds)
    ctx.save();
    ctx.strokeStyle = cursorPasteModeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Clip rectangle coordinates to map bounds
    const outlineX = Math.max(0, x);
    const outlineY = Math.max(0, y);
    const outlineWidth = Math.min(project.mapWidth - x, clipboardValue.width);
    const outlineHeight = Math.min(project.mapHeight - y, clipboardValue.height);

    if (outlineWidth > 0 && outlineHeight > 0) {
        ctx.strokeRect(outlineX, outlineY, outlineWidth, outlineHeight);
    }

    ctx.restore();
}

// Clear the paste preview by redrawing affected cells
function clearPastePreview() {
    if (pastePreviewPosition.x === -1 && pastePreviewPosition.y === -1) {
        return;
    }

    // Redraw cells with a buffer around the paste area to clear outline strokes
    const startX = pastePreviewPosition.x - project.tileSize;
    const startY = pastePreviewPosition.y - project.tileSize;
    const endX = pastePreviewPosition.x + clipboardValue.width + project.tileSize;
    const endY = pastePreviewPosition.y + clipboardValue.height + project.tileSize;

    for (let y = startY; y <= endY; y += project.tileSize) {
        for (let x = startX; x <= endX; x += project.tileSize) {
            drawCell(x, y);
        }
    }
}

// Execute the paste operation at the given position
function executePaste(x, y) {
    const removed = [];
    const added = [];

    for (let i = 0; i < clipboardValue.values.length; i++) {
        const tile = clipboardValue.values[i];
        const destX = x + tile.X;
        const destY = y + tile.Y;

        // Skip tiles outside map bounds
        if (destX < 0 || destY < 0 || destX >= project.mapWidth || destY >= project.mapHeight) {
            continue;
        }

        // Find existing tile at destination (for undo tracking)
        const existingTile = project.graphicalTileLayers[currentGraphicalTileLayer].values.find(
            val => val.X === destX && val.Y === destY
        );

        if (existingTile) {
            removed.push({ ...existingTile });
        }

        // Remove existing tile at destination
        project.graphicalTileLayers[currentGraphicalTileLayer].values = project.graphicalTileLayers[currentGraphicalTileLayer].values.filter(
            val => val.X !== destX || val.Y !== destY
        );

        // Add new tile from clipboard
        const newTile = {
            X: destX,
            Y: destY,
            TilesheetX: tile.TilesheetX,
            TilesheetY: tile.TilesheetY
        };
        project.graphicalTileLayers[currentGraphicalTileLayer].values.push(newTile);
        added.push({ ...newTile });
    }

    // Track for undo if any tiles were added
    if (added.length > 0) {
        pushAction({
            type: ActionTypes.SELECTION_PASTE,
            layerIndex: currentGraphicalTileLayer,
            removed: removed,
            added: added,
            timestamp: Date.now()
        });

        DisplayMessage(`Pasted ${added.length} tile(s)`, 1500, MessageType.Information);
    }

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

    // Create a wrapper div for positioning overlays relative to the canvas
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.width = "100%";

    // Create hover overlay div
    tilesetHoverOverlay = document.createElement("div");
    tilesetHoverOverlay.style.position = "absolute";
    tilesetHoverOverlay.style.border = "2px solid rgba(255, 255, 255, 0.5)";
    tilesetHoverOverlay.style.pointerEvents = "none";
    tilesetHoverOverlay.style.display = "none";
    tilesetHoverOverlay.style.boxSizing = "border-box";

    // Create selection overlay div
    tilesetSelectionOverlay = document.createElement("div");
    tilesetSelectionOverlay.style.position = "absolute";
    tilesetSelectionOverlay.style.border = "3px solid #fad644";
    tilesetSelectionOverlay.style.pointerEvents = "none";
    tilesetSelectionOverlay.style.display = "none";
    tilesetSelectionOverlay.style.boxSizing = "border-box";

    // Draw tileset (once, no hover/selection borders on canvas)
    drawTilesetSelector();

    // Helper to get displayed tile size
    function getDisplayedTileSize() {
        const rect = tilesetSelectorCanvas.getBoundingClientRect();
        return {
            w: rect.width * project.tileSize / tilesetSelectorCanvas.width,
            h: rect.height * project.tileSize / tilesetSelectorCanvas.height,
            scaleX: tilesetSelectorCanvas.width / rect.width,
            scaleY: tilesetSelectorCanvas.height / rect.height,
            rect: rect
        };
    }

    // Drag-to-select: track drag start tile
    let tilesetDragStart = null;

    function getTileCoordFromEvent(e) {
        const { scaleX, scaleY, rect } = getDisplayedTileSize();
        const x = Math.floor((e.clientX - rect.left) * scaleX / project.tileSize) * project.tileSize;
        const y = Math.floor((e.clientY - rect.top) * scaleY / project.tileSize) * project.tileSize;
        return { x, y };
    }

    // Mousedown: start drag, select single tile immediately
    tilesetSelectorCanvas.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || project.tileSize <= 0) return;
        const tile = getTileCoordFromEvent(e);
        tilesetDragStart = tile;
        stashedTile = null;
        stashedTileSize = null;
        selectTile(tile.x, tile.y);
        changeMapMode(MapModes.Brush);
    });

    // Mousemove: update selection region while dragging, and show hover overlay
    tilesetSelectorCanvas.onmousemove = (e) => {
        if (project.tileSize <= 0) return;

        // Hover overlay
        const { w, h } = getDisplayedTileSize();
        const tile = getTileCoordFromEvent(e);
        const tileX = tile.x / project.tileSize;
        const tileY = tile.y / project.tileSize;
        tilesetHoverOverlay.style.left = (tileX * w) + "px";
        tilesetHoverOverlay.style.top = (tileY * h) + "px";
        tilesetHoverOverlay.style.width = w + "px";
        tilesetHoverOverlay.style.height = h + "px";
        tilesetHoverOverlay.style.display = "block";

        // Drag selection
        if (tilesetDragStart) {
            selectTileRegion(tilesetDragStart.x, tilesetDragStart.y, tile.x, tile.y);
        }
    };

    // Mouseup: end drag (on window to catch releases outside the canvas)
    window.addEventListener("mouseup", () => {
        tilesetDragStart = null;
    });

    tilesetSelectorCanvas.onmouseleave = () => {
        tilesetHoverOverlay.style.display = "none";
    };

    wrapper.appendChild(tilesetSelectorCanvas);
    wrapper.appendChild(tilesetHoverOverlay);
    wrapper.appendChild(tilesetSelectionOverlay);
    tilesetContainer.appendChild(wrapper);
}

// Renders the tileset image on the canvas (drawn once, overlays handle hover/selection)
function drawTilesetSelector() {
    tilesetSelectorCtx.clearRect(0, 0, tilesetSelectorCanvas.width, tilesetSelectorCanvas.height);
    tilesetSelectorCtx.drawImage(tileSetSourceImage, 0, 0);
}