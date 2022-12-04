export const tilesetContainer = document.getElementById("tileset-container");
export const selectedTile = [0, 0];
export let sourceImage = new Image();

export function reinitialize(project, tileSetSourceImage) {
    clear(tilesetContainer);
    create(project, tileSetSourceImage, tilesetContainer);
}

// Removes all child canvases from the tileset selection container
export function clear() {
    while (tilesetContainer.firstChild) {
        tilesetContainer.removeChild(tilesetContainer.firstChild);
    }
}

// Initializes the tileset selection container with selectable canvases which represent individual tiles
export function create(tileSize) {
    for (let y = 0; y < sourceImage.height; y += tileSize) {
        for (let x = 0; x < sourceImage.width; x += tileSize) {
            const newCanvas = document.createElement("canvas");
            newCanvas.width = tileSize;
            newCanvas.height = tileSize;
            newCanvas.classList.add('tile-canvas');
            newCanvas.id = "tile-selection-canvas-" + x + "-" + y;
            newCanvas.onclick = () => { selectTile(x, y); };
            let ctx = newCanvas.getContext("2d");
            ctx.drawImage(sourceImage, x, y, tileSize, tileSize, 0, 0, tileSize, tileSize);
            tilesetContainer.append(newCanvas);
        }
    }
}

// Sets the selected tileset
export function selectTile(x, y) {
    let oldCanvas = document.getElementById("tile-selection-canvas-" + selectedTile[0] + "-" + selectedTile[1]);
    let newCanvas = document.getElementById("tile-selection-canvas-" + x + "-" + y);

    if (oldCanvas != null && oldCanvas.classList != null) {
        if (oldCanvas.classList.contains("selected-tile")) {
            oldCanvas.classList.remove("selected-tile");
        }
    }

    selectedTile[0] = x;
    selectedTile[1] = y;
    selectTile.classList = [];
    newCanvas.classList.add("selected-tile");
}