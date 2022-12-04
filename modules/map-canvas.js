export const mapCanvas = document.getElementById("map-canvas");
export let currentLayer = 0;
export let canvasCursorColor = "#30ff5d";

let mapLayers = [];
let mapTileSize = 32;
let canvasCursor = [0, 0];

export function init(width, height, tileSize, layers = [])
{
    setLayers(layers);
    setTileSize(tileSize);
    setDimensions(width, height);
}

export function getLayers()
{
    return mapLayers;
}

export function setLayers(layers)
{
    mapLayers = layers;
}

// Sets the tile size used by the map
export function setTileSize(tileSize)
{
    mapTileSize = tileSize;
}

// Sets the dimensions of the map
export function setDimensions(width, height) {
    mapCanvas.width = width;
    mapCanvas.height = height;
}

// Gets the dimensions of the map
export function getDimensions()
{
    return [mapCanvas.width, mapCanvas.height];
}

// Draws the main canvas given the layers of the current section
export function drawMainCanvas() {
    var ctx = mapCanvas.getContext("2d");
    ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    mapLayers.sort(l => l.index).forEach((layer) => {
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
                mapTileSize,
                mapTileSize,
                val.X,
                val.Y,
                mapTileSize,
                mapTileSize
            );
        });
    });
}

export function drawCursor(isMouseDown, mouseEvent = null, forceUpdate = false) {

    let coords = [];

    if (mouseEvent)
    {
        coords = getMouseCoordinates(mouseEvent);
    }
    else
    {
        coords = canvasCursor;
    }

    // Dont update if the mouse is in the same position
    // Unless the user is drawing tiles to the canvas so the tile doesnt overwrite the cursor
    // Or the update needs to be forced
    if (canvasCursor[0] !== coords[0] || canvasCursor[1] !== coords[1] || isMouseDown || forceUpdate) {

        clearCursor();
        canvasCursor[0] = coords[0];
        canvasCursor[1] = coords[1];
        var ctx = mapCanvas.getContext("2d");
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.strokeStyle = canvasCursorColor;
        ctx.rect(coords[0], coords[1], mapTileSize, mapTileSize);
        ctx.stroke();
    }
}

// Reset state to empty
export function clearMainCanvas() {
    mapLayers.forEach(l => l.values = []);
    drawMainCanvas();
}

// Handler for placing new tiles on the map
export function drawTile(mouseEvent, eraserMode, tileCoordinates) {
    let clicked = getMouseCoordinates(mouseEvent);
    let mouseX = clicked[0];
    let mouseY = clicked[1];

    mapLayers[currentLayer].values = mapLayers[currentLayer].values.filter(val => val.X !== mouseX || val.Y !== mouseY);

    if (!eraserMode) {
        mapLayers[currentLayer].values.push({ X: mouseX, Y: mouseY, TilesheetX: tileCoordinates[0], TilesheetY: tileCoordinates[1] });
    }

    redrawCell(mouseX, mouseY);
}

export function clearCursor() {
    redrawCell(canvasCursor[0], canvasCursor[1]);
    redrawCell(canvasCursor[0] + mapTileSize, canvasCursor[1]);
    redrawCell(canvasCursor[0] - mapTileSize, canvasCursor[1]);
    redrawCell(canvasCursor[0], canvasCursor[1] + mapTileSize);
    redrawCell(canvasCursor[0], canvasCursor[1] - mapTileSize);
    redrawCell(canvasCursor[0] - mapTileSize, canvasCursor[1] - mapTileSize);
    redrawCell(canvasCursor[0] + mapTileSize, canvasCursor[1] - mapTileSize);
    redrawCell(canvasCursor[0] - mapTileSize, canvasCursor[1] + mapTileSize);
    redrawCell(canvasCursor[0] + mapTileSize, canvasCursor[1] + mapTileSize);
}

function redrawCell(x, y) {
    let ctx = mapCanvas.getContext("2d");
    ctx.clearRect(x, y, mapTileSize, mapTileSize);

    mapLayers.sort(l => l.index).forEach((layer) => {
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
                mapTileSize,
                mapTileSize,
                val.X,
                val.Y,
                mapTileSize,
                mapTileSize
            );
        });
    });
}

// Utility for getting coordinates of mouse click
function getMouseCoordinates(e) {
    const { x, y } = e.target.getBoundingClientRect();
    const mouseX = e.clientX - x;
    const mouseY = e.clientY - y;
    return [Math.floor(mouseX / 32) * 32, Math.floor(mouseY / 32) * 32]
}