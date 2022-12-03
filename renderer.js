//
// Project Data
//
var project;
var layers = [];
var currentLayer = 0;

//
// HTML Elements
//
var mainContent = document.getElementById("main-content");
var mainCanvas = document.getElementById("main-canvas");
var clearCanvasButton = document.getElementById("clear-canvas-button");
var selectedTile = [0, 0]; //Which tile we will paint from the menu
var importTilesetButton = document.getElementById("open-file-button");
var tilesetContainer = document.getElementById("tileset-container");
var layerSelect = document.getElementById("layer-select");
var tileSettingsButton = document.getElementById("btn-tile-settings");
var mapSettingsButton = document.getElementById("btn-map-settings");
var tileSettingsModal = document.getElementById("tile-settings-modal");
var mapSettingsModal = document.getElementById("map-settings-modal");
var closeTileSettingsCornerButton = document.getElementById("close-tile-settings-corner-button");
var closeMapSettingsCornerButton = document.getElementById("close-map-settings-corner-button");
var eraserToolButton = document.getElementById("eraser-tool-btn");

//
// Function Variables
//
var tileSetSourceImage = new Image();
var isMouseDown = false;
var canvasCursor = [0, 0];
var eraserMode = false;
var canvasCursorColor = "#30ff5d";
var cursorPosition = [0, 0];

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
    var saveData = {
        projectName: projectName,
        tileSize: tileSize,
        sections: []
    };

    saveData.sections.push({
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        tileset: tileSetSourceImage.src,
        mapData: layers
    });

    event.sender.send('project:saveToFile', saveData);
});

window.electronAPI.resize((event, value) => {
    let canvasSection = document.getElementById("canvas-section");
    let tilesetSection = document.getElementById("tileset-section");
    let canvasWrapper = document.getElementById("canvas-wrapper");
    let tilesetContainer = document.getElementById("tileset-container");

    let mainContentHeight = value.windowHeight * .89;
    let tilesetHeaderRect = document.getElementById('tileset-header').getBoundingClientRect();

    mainContent.style.height = mainContentHeight + 'px';

    let sectionHeights = mainContentHeight - tilesetHeaderRect.top - 10;

    canvasSection.style.height = sectionHeights + 'px';
    tilesetSection.style.height = sectionHeights + 'px';

    let wrapperHeights = mainContentHeight - tilesetHeaderRect.bottom;

    canvasWrapper.style.height = wrapperHeights + 'px';
    tilesetContainer.style.height = wrapperHeights + 'px';
});

// Event handler for when a request to load a project from a file is recieved.
window.electronAPI.loadProjectFromFile((event, value) => {
    project = value;
    project.tileSize = 32;
    layers = value.sections[0].mapData;
    tileSetSourceImage.src = value.sections[0].tileset;
});

window.electronAPI.loadNewProject((event, value) => {
    project = {};
    project.tileSize = value.tileSize;
    mainCanvas.width = value.canvasWidth;
    mainCanvas.height = value.canvasHeight;
    layers = [{ src: value.tilesetSrc, name: value.layerName, index: 0, values: [] }];
    project.name = value.projectName;
    tileSetSourceImage.src = value.tilesetSrc;
    updateLayers();
});


tileSetSourceImage.onload = () => {
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

    for (var i = 0; i < layers.length; i++) {
        var opt = document.createElement('option');
        opt.value = layers[i].index;
        opt.innerHTML = layers[i].name;
        layerSelect.appendChild(opt);
    }
}

// Sets the dimensions of the main canvas
function setMainCanvasDimensions() {
    mainCanvas.width = project.canvasWidth;
    mainCanvas.height = project.canvasHeight;
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

    layers[currentLayer].values = layers[currentLayer].values.filter(val => val.X !== mouseX || val.Y !== mouseY);

    if (!eraserMode) {
        layers[currentLayer].values.push({ X: mouseX, Y: mouseY, TilesheetX: selectedTile[0], TilesheetY: selectedTile[1] });
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

    layers.sort(l => l.index).forEach((layer) => {
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

    layers.sort(l => l.index).forEach((layer) => {
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
    layers.forEach(l => l.values = []);
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