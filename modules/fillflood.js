// Algorithm Description: https://en.wikipedia.org/wiki/Flood_fill
// Using unoptimized scanning version. I dont understand the optimized one.
export function FillFlood(x, y, layerNodes, tileSize, tileSheetX, tileSheetY, mapWidth, mapHeight, targetTile = null) {
    if (!IsInside(x, y, layerNodes, mapWidth, mapHeight, targetTile)) {
        return;
    }

    if (layerNodes.length === 0) {
        JustFillIt(layerNodes, tileSize, tileSheetX, tileSheetY, mapWidth, mapHeight);
        return;
    }

    let stack = [];

    stack.push({ X: x, Y: y });

    while (stack.length > 0) {
        let stackObject = stack[stack.length - 1];
        stack.pop();
        let lx = stackObject.X;
        while (IsInside(lx - tileSize, stackObject.Y, layerNodes, mapWidth, mapHeight, targetTile)) {
            Set(lx - tileSize, stackObject.Y, layerNodes, tileSheetX, tileSheetY, targetTile);
            lx = lx - tileSize;
        }
        while (IsInside(stackObject.X, stackObject.Y, layerNodes, mapWidth, mapHeight, targetTile)) {
            Set(stackObject.X, stackObject.Y, layerNodes, tileSheetX, tileSheetY, targetTile);
            stackObject.X = stackObject.X + tileSize;
        }
        Scan(lx, stackObject.X - tileSize, stackObject.Y + tileSize, stack, tileSize, layerNodes, mapWidth, mapHeight, targetTile);
        Scan(lx, stackObject.X - tileSize, stackObject.Y - tileSize, stack, tileSize, layerNodes, mapWidth, mapHeight, targetTile);
    }

    return;
}

function JustFillIt(layerNodes, tileSize, tileSheetX, tileSheetY, mapWidth, mapHeight) {
    console.log("just fill it!");
    for (let i = 0; i < mapHeight; i += tileSize) {
        for (let j = 0; j < mapWidth; j += tileSize) {
            Set(j, i, layerNodes, tileSheetX, tileSheetY, null);
        }
    }
}

function Scan(lx, rx, y, stack, tileSize, layerNodes, mapWidth, mapHeight, targetTile) {
    let span_added = false;

    for (let x = lx; x <= rx; x += tileSize) {
        if (!IsInside(x, y, layerNodes, mapWidth, mapHeight, targetTile)) {
            span_added = false;
        }
        else if (!span_added) {
            stack.push({ X: x, Y: y });
            span_added = true;
        }
    }
}

function IsInside(x, y, layerNodes, mapWidth, mapHeight, targetTile) {
    if (x >= mapWidth || y >= mapHeight) {
        return false;
    }

    if (x < 0 || y < 0) {
        return false;
    }

    if (!targetTile) {
        return !layerNodes.some(val => val.X === x && val.Y === y);
    }
    else {
        return layerNodes.some(val => val.X === x && val.Y === y && val.TilesheetX === targetTile.X && val.TilesheetY === targetTile.Y);
    }
}

function Set(x, y, layerNodes, tileSheetX, tileSheetY, targetTile) {
    if (targetTile) {
        let index = layerNodes.findIndex(val => val.X === x && val.Y === y && val.TilesheetX === targetTile.X && val.TilesheetY === targetTile.Y);
        layerNodes[index] = { X: x, Y: y, TilesheetX: tileSheetX, TilesheetY: tileSheetY };
    }
    else {
        layerNodes.push({ X: x, Y: y, TilesheetX: tileSheetX, TilesheetY: tileSheetY });
    }
}