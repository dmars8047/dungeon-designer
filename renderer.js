//
// Project Data
//
let project;
let currentLayer = 0;

//
// HTML Elements
//
let mainContent = document.getElementById("main-content");
let mainCanvas = document.getElementById("main-canvas");
let clearCanvasButton = document.getElementById("clear-canvas-button");
let selectedTile = [0, 0]; //Which tile we will paint from the menu
let importTilesetButton = document.getElementById("open-file-button");
let tilesetContainer = document.getElementById("tileset-container");
let layerSelect = document.getElementById("layer-select");
let tileSettingsButton = document.getElementById("btn-tile-settings");
let mapSettingsButton = document.getElementById("btn-map-settings");
let tileSettingsModal = document.getElementById("tile-settings-modal");
let mapSettingsModal = document.getElementById("map-settings-modal");
let closeTileSettingsCornerButton = document.getElementById("close-tile-settings-corner-button");
let closeMapSettingsCornerButton = document.getElementById("close-map-settings-corner-button");
let eraserToolButton = document.getElementById("eraser-tool-btn");

//
// Function Variables
//
let tileSetSourceImage = new Image();
let isMouseDown = false;
let canvasCursor = [0, 0];
let eraserMode = false;
let canvasCursorColor = "#30ff5d";
let cursorPosition = [0, 0];

//
// Event Functions
//

// Page/Menu loaded
document.onload = () => {
    if (project) {
        drawMainCanvas();
    }
};

window.onkeydown = (event) => {
    console.log(event);

    switch (event.key) {
        case 'e':
            toggleEraserMode();
            drawCanvasCursor(cursorPosition, true);
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
        clearMainCanvas();
        clearTileSet();
        tileSetSourceImage.src = filePath;
    }
});

// Layer dropdown selection event.
layerSelect.onchange = (event) => {
    setLayer(layerSelect.value);
};

//Bind mouse events for painting (or removing) tiles on click/drag
mainCanvas.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
        isMouseDown = false;
    }
});

mainCanvas.addEventListener("mouseleave", () => {
    isMouseDown = false;
    clearPreviousCanvasCursor();
});

mainCanvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
        isMouseDown = true;
        addTile(event);
        drawCanvasCursor(getMouseCoordinates(event));
    }
});

mainCanvas.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        addTile(event);
    }

    drawCanvasCursor(getMouseCoordinates(event));
});

// Clear Canvas button click event
clearCanvasButton.onclick = () => {
    clearMainCanvas();
}

// Tileset source image loaded event
tileSetSourceImage.onload = () => {
    initTileSelector();
}

eraserToolButton.onclick = () => {
    toggleEraserMode();
};

function toggleEraserMode() {
    eraserMode = !eraserMode;

    if (eraserMode) {
        eraserToolButton.style.background = "#f39646";
        canvasCursorColor = "#f44336";
    }
    else {
        eraserToolButton.style.background = "#f9d339";
        canvasCursorColor = "#30ff5d";
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
// IPC Event Functions
//

// Sends all information about the project so it can be saved
window.electronAPI.saveProject((event, value) => {
    console.log("Saving project...");
    event.sender.send('project:saveToFile', project);
});

// Event handler for when a request to load a project from a file is recieved.
window.electronAPI.loadProjectFromFile((event, value) => {
    project = value;
    tileSetSourceImage.src = project.tilesetImagePath;
    setMainCanvasDimensions();
    updateLayers();
});

window.electronAPI.loadNewProject((event, value) => {
    console.log("Setting up new project...");

    project = {
        name: value.name,
        tileSize: value.tileSize,
        mapWidth: value.mapWidth,
        mapHeight: value.mapHeight,
        layers: [{ name: value.layerName, index: 0, values: [] }],
        tilesetImagePath: value.tilesetImagePath
    };

    tileSetSourceImage.src = project.tilesetImagePath;
    setMainCanvasDimensions();
    updateLayers();
});


tileSetSourceImage.onload = () => {
    console.log("Tileset image loaded");
    initTileSelector();
    drawMainCanvas();
};

//
// Logic Functions
//

function clearPreviousCanvasCursor() {
    redrawCell(canvasCursor[0], canvasCursor[1]);
    redrawCell(canvasCursor[0] + project.tileSize, canvasCursor[1]);
    redrawCell(canvasCursor[0] - project.tileSize, canvasCursor[1]);
    redrawCell(canvasCursor[0], canvasCursor[1] + project.tileSize);
    redrawCell(canvasCursor[0], canvasCursor[1] - project.tileSize);
    redrawCell(canvasCursor[0] - project.tileSize, canvasCursor[1] - project.tileSize);
    redrawCell(canvasCursor[0] + project.tileSize, canvasCursor[1] - project.tileSize);
    redrawCell(canvasCursor[0] - project.tileSize, canvasCursor[1] + project.tileSize);
    redrawCell(canvasCursor[0] + project.tileSize, canvasCursor[1] + project.tileSize);
}

function drawCanvasCursor(coords, forceUpdate = false) {

    // Dont update if the mouse is in the same position
    // Unless the user is drawing tiles to the canvas so the tile doesnt overwrite the cursor
    // Or the update needs to be forced
    if (canvasCursor[0] !== coords[0] || canvasCursor[1] !== coords[1] || isMouseDown || forceUpdate) {

        clearPreviousCanvasCursor();
        canvasCursor[0] = coords[0];
        canvasCursor[1] = coords[1];
        var ctx = mainCanvas.getContext("2d");
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.strokeStyle = canvasCursorColor;
        ctx.rect(coords[0], coords[1], project.tileSize, project.tileSize);
        ctx.stroke();
    }
}

// Updates the set layer dropdown
function updateLayers() {

    for (var i = 0; i < project.layers.length; i++) {
        var opt = document.createElement('option');
        opt.value = project.layers[i].index;
        opt.innerHTML = project.layers[i].name;
        layerSelect.appendChild(opt);
    }
}

// Sets the dimensions of the main canvas
function setMainCanvasDimensions() {
    mainCanvas.width = project.mapWidth;
    mainCanvas.height = project.mapHeight;
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
function addTile(mouseEvent) {
    var clicked = getMouseCoordinates(mouseEvent);
    var mouseX = clicked[0];
    var mouseY = clicked[1];

    project.layers[currentLayer].values = project.layers[currentLayer].values.filter(val => val.X !== mouseX || val.Y !== mouseY);

    if (!eraserMode) {
        project.layers[currentLayer].values.push({ X: mouseX, Y: mouseY, TilesheetX: selectedTile[0], TilesheetY: selectedTile[1] });
    }

    redrawCell(mouseX, mouseY);
}

// Utility for getting coordinates of mouse click
function getMouseCoordinates(e) {
    const { x, y } = e.target.getBoundingClientRect();
    const mouseX = e.clientX - x;
    const mouseY = e.clientY - y;
    cursorPosition = [Math.floor(mouseX / 32) * 32, Math.floor(mouseY / 32) * 32]
    return cursorPosition;
}

// Sets the current layer
function setLayer(newLayer) {
    currentLayer = newLayer;
}

function redrawCell(x, y) {
    var ctx = mainCanvas.getContext("2d");
    ctx.clearRect(x, y, project.tileSize, project.tileSize);

    project.layers.sort(l => l.index).forEach((layer) => {
        layer.values.sort(function (a, b) {
            if (a.X < b.X) {
                return -1;
            }
            else if (a.X > b.X) {
                return 1;
            }
            else if (a.Y < b.Y) {
                return -1;
            }
            else if (a.Y > b.Y) {
                return 1;
            }
            else {
                return 0;
            }
        }).filter(v => v.X === x && v.Y === y).forEach((val) => {
            ctx.drawImage(
                tileSetSourceImage,
                val.TilesheetX,
                val.TilesheetY,
                project.tileSize,
                project.tileSize,
                val.X,
                val.Y,
                project.tileSize,
                project.tileSize
            );
        });
    });
}

// Draws the main canvas given the layers of the current section
function drawMainCanvas() {
    var ctx = mainCanvas.getContext("2d");
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    project.layers.sort(l => l.index).forEach((layer) => {
        layer.values.sort(function (a, b) {
            if (a.X < b.X) {
                return -1;
            }
            else if (a.X > b.X) {
                return 1;
            }
            else if (a.Y < b.Y) {
                return -1;
            }
            else if (a.Y > b.Y) {
                return 1;
            }
            else {
                return 0;
            }
        }).forEach((val) => {
            ctx.drawImage(
                tileSetSourceImage,
                val.TilesheetX,
                val.TilesheetY,
                project.tileSize,
                project.tileSize,
                val.X,
                val.Y,
                project.tileSize,
                project.tileSize
            );
        });
    });
}

// Reset state to empty
function clearMainCanvas() {
    project.layers.forEach(l => l.values = []);
    drawMainCanvas();
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
            var ctx = newCanvas.getContext("2d");
            ctx.drawImage(tileSetSourceImage, x, y, project.tileSize, project.tileSize, 0, 0, project.tileSize, project.tileSize);
            tilesetContainer.append(newCanvas);
        }
    }
}