var mainCanvas = document.getElementById("main-canvas");
// var tilesetContainer = document.querySelector(".tileset-container");
var tilesetSelection = document.querySelector(".tileset-container_selection");
var tilesetImage = document.querySelector("#tileset-source");
var topLayerButton = document.getElementById("layer-button-top");
var clearCanvasButton = document.getElementById("clear-canvas-button");
var selectedTile = [0, 0]; //Which tile we will paint from the menu

var tilesetContainer = document.getElementById("tileset-container");
var tileSetSourceImage = new Image();
var tileSize = 32;

var isMouseDown = false;
var currentLayer = 0;
var layers = [
    //Bottom
    {
        //Structure is "x-y": ["tileset_x", "tileset_y"]
        //EXAMPLE: "1-1": [3, 4],
    },
    //Middle
    {},
    //Top
    {}
];

//Select tile from the Tiles grid
// tilesetContainer.addEventListener("mousedown", (event) => {
//     selectedTile = getCoords(event);
//     tilesetSelection.style.left = selectedTile[0] * 32 + "px";
//     tilesetSelection.style.top = selectedTile[1] * 32 + "px";
// });

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

topLayerButton.onclick = () => { setLayer(2); };

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
                tilesetImage,
                tilesheetX * 32,
                tilesheetY * 32,
                size_of_crop,
                size_of_crop,
                positionX * 32,
                positionY * 32,
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

//Initialize app when tileset source is done loading
// tilesetImage.onload = function() {
//    layers = defaultState;
//    draw();
//    setLayer(0);
// }

function InitTileSelector() {
    for (y = 0; y < tileSetSourceImage.height; y += tileSize) {
        for (x = 0; x < tileSetSourceImage.width; x += tileSize) {
            const newCanvas = document.createElement("canvas");
            newCanvas.width = tileSize;
            newCanvas.height = tileSize;
            newCanvas.classList.add('tile-canvas');
            var ctx = newCanvas.getContext("2d");
            ctx.drawImage(tileSetSourceImage, x, y, tileSize, tileSize, 0, 0, tileSize, tileSize);
            tilesetContainer.append(newCanvas);
        }
    }
}

tileSetSourceImage.onload = () => { InitTileSelector(); };

tileSetSourceImage.src = "./TileEditorSpritesheet.2x_2.png";
// tilesetImage.src = "./TileEditorSpritesheet.2x_2.png";