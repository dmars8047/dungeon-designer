//
// Project Data
//
var project;
var layers = [];
var currentLayer = 0;

//
// HTML Elements
//
var mainCanvas = document.getElementById("main-canvas");
var clearCanvasButton = document.getElementById("clear-canvas-button");
var selectedTile = [0, 0]; //Which tile we will paint from the menu
var importTilesetButton = document.getElementById("open-file-button");
var tilesetContainer = document.getElementById("tileset-container");
var layerSelect = document.getElementById("layer-select");

//
// Function Variables
//
var tileSetSourceImage = new Image();
var isMouseDown = false;
var canvasCursor = [0, 0];

//
// Event Functions
//

// Page/Menu loaded
document.onload = () => {
    if (project) {
        drawMainCanvas();
    }
};

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
mainCanvas.addEventListener("mousedown", () => {
    isMouseDown = true;
});

mainCanvas.addEventListener("mouseup", () => {
    isMouseDown = false;
});

mainCanvas.addEventListener("mouseleave", () => {
    isMouseDown = false;
    clearPreviousCanvasCursor();
});

mainCanvas.addEventListener("mousedown", (event) => {
    addTile(event);
    drawCanvasCursor(event);
});

mainCanvas.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        addTile(event);
    }

    drawCanvasCursor(event);
});

// Clear Canvas button click event
clearCanvasButton.onclick = () => {
    clearMainCanvas();
}

// Tileset source image loaded event
tileSetSourceImage.onload = () => {
    initTileSelector();
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
    let mainContent = document.getElementById("main-content");
    let canvasSection = document.getElementById("canvas-section");
    let tilesetSection = document.getElementById("tileset-section");
    let canvasWrapper = document.getElementById("canvas-wrapper");
    let tilesetContainer = document.getElementById("tileset-container");

    let mainContentHeight = value.windowHeight * .92;
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

function drawCanvasCursor(event) {
    var coords = getCoords(event);

    if (canvasCursor[0] !== coords[0] || canvasCursor[1] !== coords[1] || isMouseDown) {

        clearPreviousCanvasCursor();

        canvasCursor[0] = coords[0];
        canvasCursor[1] = coords[1];

        var ctx = mainCanvas.getContext("2d");
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.strokeStyle = "#02fad9"
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
    var clicked = getCoords(mouseEvent);
    var mouseX = clicked[0];
    var mouseY = clicked[1];

    layers[currentLayer].values = layers[currentLayer].values.filter(val => val.X !== mouseX || val.Y !== mouseY);

    if (!mouseEvent.shiftKey) {
        layers[currentLayer].values.push({ X: mouseX, Y: mouseY, TilesheetX: selectedTile[0], TilesheetY: selectedTile[1] });
    }

    redrawCell(mouseX, mouseY);
}

// Utility for getting coordinates of mouse click
function getCoords(e) {
    const { x, y } = e.target.getBoundingClientRect();
    const mouseX = e.clientX - x;
    const mouseY = e.clientY - y;
    return [Math.floor(mouseX / 32) * 32, Math.floor(mouseY / 32) * 32];
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