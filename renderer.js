var mainCanvas = document.getElementById("main-canvas");
var tilesetSelection = document.querySelector(".tileset-container_selection");
var tilesetImage = document.querySelector("#tileset-source");
var clearCanvasButton = document.getElementById("clear-canvas-button");
var selectedTile = [0, 0]; //Which tile we will paint from the menu

var tilesetContainer = document.getElementById("tileset-container");
var tileSetSourceImage = new Image();
var tileSize = 32;

var layerSelect = document.getElementById("layer-select");

var isMouseDown = false;
var currentLayer = 0;
var layers = [{}, {}];

layerSelect.onchange = (event) => {
    setLayer(layerSelect.value);
};

function selectTile(x, y) {

    let oldCanvas = document.getElementById("tile-selection-canvas-" + selectedTile[0] + "-" + selectedTile[1]);
    let newCanvas = document.getElementById("tile-selection-canvas-" + x + "-" + y);

    if (oldCanvas != null && oldCanvas.classList != null) {
        if (oldCanvas.classList.contains("selected-tile"))
        {
            oldCanvas.classList.remove("selected-tile");
        }
    }

    selectedTile = [x, y];
    selectTile.classList = [];
    newCanvas.classList.add("selected-tile");
}

//Handler for placing new tiles on the map
function addTile(mouseEvent) {
    var clicked = getCoords(mouseEvent);
    var key = clicked[0] + "-" + clicked[1];

    if (mouseEvent.shiftKey) {
        delete layers[currentLayer][key];
    } else {
        layers[currentLayer][key] = [selectedTile[0], selectedTile[1]];
    }
    draw();
}

//Bind mouse events for painting (or removing) tiles on click/drag
mainCanvas.addEventListener("mousedown", () => {
    isMouseDown = true;
});
mainCanvas.addEventListener("mouseup", () => {
    isMouseDown = false;
});
mainCanvas.addEventListener("mouseleave", () => {
    isMouseDown = false;
});
mainCanvas.addEventListener("mousedown", addTile);
mainCanvas.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        addTile(event);
    }
});

//Utility for getting coordinates of mouse click
function getCoords(e) {
    const { x, y } = e.target.getBoundingClientRect();
    const mouseX = e.clientX - x;
    const mouseY = e.clientY - y;
    return [Math.floor(mouseX / 32), Math.floor(mouseY / 32)];
}

//converts data to image:data string and pipes into new browser tab
function exportImage() {
    var data = mainCanvas.toDataURL();
    var image = new Image();
    image.src = data;

    var w = window.open("");
    w.document.write(image.outerHTML);
}

function setLayer(newLayer) {
    //Update the layer
    currentLayer = newLayer;

    //Update the UI to show updated layer
    var oldActiveLayer = document.querySelector(".layer.active");
    if (oldActiveLayer) {
        oldActiveLayer.classList.remove("active");
    }
    document.querySelector(`[tile-layer="${currentLayer}"]`).classList.add("active");
}

function draw() {
    var ctx = mainCanvas.getContext("2d");
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    var size_of_crop = 32;

    layers.forEach((layer) => {
        Object.keys(layer).forEach((key) => {
            //Determine x/y position of this placement from key ("3-4" -> x=3, y=4)
            var positionX = Number(key.split("-")[0]);
            var positionY = Number(key.split("-")[1]);
            var [tilesheetX, tilesheetY] = layer[key];

            ctx.drawImage(
                tileSetSourceImage,
                tilesheetX,
                tilesheetY,
                size_of_crop,
                size_of_crop,
                positionX * tileSize,
                positionY * tileSize,
                size_of_crop,
                size_of_crop
            );
        });
    });
}

clearCanvasButton.onclick = () => { clearMainCanvas(); }

//Reset state to empty
function clearMainCanvas() {
    layers = [{}, {}, {}];
    draw();
}

function InitTileSelector() {
    for (let y = 0; y < tileSetSourceImage.height; y += tileSize) {
        for (let x = 0; x < tileSetSourceImage.width; x += tileSize) {
            const newCanvas = document.createElement("canvas");
            newCanvas.width = tileSize;
            newCanvas.height = tileSize;
            newCanvas.classList.add('tile-canvas');
            newCanvas.id = "tile-selection-canvas-" + x + "-" + y;
            newCanvas.onclick = () => { selectTile(x, y); };
            var ctx = newCanvas.getContext("2d");
            ctx.drawImage(tileSetSourceImage, x, y, tileSize, tileSize, 0, 0, tileSize, tileSize);
            tilesetContainer.append(newCanvas);
        }
    }
}

tileSetSourceImage.onload = () => { InitTileSelector(); };

tileSetSourceImage.src = "./RoomTiles.png";