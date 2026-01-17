// Algorithm Description: https://en.wikipedia.org/wiki/Flood_fill
// Optimized version using Map/Set for O(1) lookups instead of array scans

export function FillFlood(x, y, layerNodes, tileSize, tileSheetX, tileSheetY, mapWidth, mapHeight, targetTile = null) {
    if (layerNodes.length === 0 && !targetTile) {
        JustFillIt(layerNodes, tileSize, tileSheetX, tileSheetY, mapWidth, mapHeight);
        return;
    }

    // Build lookup map for O(1) coordinate checks
    const tileMap = new Map();
    for (const node of layerNodes) {
        const key = `${node.X},${node.Y}`;
        tileMap.set(key, node);
    }

    // Track filled positions to avoid redundant work
    const filled = new Set();

    if (!IsInside(x, y, tileMap, mapWidth, mapHeight, targetTile)) {
        return;
    }

    const stack = [];
    stack.push({ X: x, Y: y });

    while (stack.length > 0) {
        const stackObject = stack.pop();
        let lx = stackObject.X;

        while (IsInside(lx - tileSize, stackObject.Y, tileMap, mapWidth, mapHeight, targetTile)) {
            SetTile(lx - tileSize, stackObject.Y, tileMap, filled, tileSheetX, tileSheetY, targetTile);
            lx = lx - tileSize;
        }

        while (IsInside(stackObject.X, stackObject.Y, tileMap, mapWidth, mapHeight, targetTile)) {
            SetTile(stackObject.X, stackObject.Y, tileMap, filled, tileSheetX, tileSheetY, targetTile);
            stackObject.X = stackObject.X + tileSize;
        }

        Scan(lx, stackObject.X - tileSize, stackObject.Y + tileSize, stack, tileSize, tileMap, mapWidth, mapHeight, targetTile);
        Scan(lx, stackObject.X - tileSize, stackObject.Y - tileSize, stack, tileSize, tileMap, mapWidth, mapHeight, targetTile);
    }

    // Sync changes back to the original array
    layerNodes.length = 0;
    for (const node of tileMap.values()) {
        layerNodes.push(node);
    }
}

function JustFillIt(layerNodes, tileSize, tileSheetX, tileSheetY, mapWidth, mapHeight) {
    for (let i = 0; i < mapHeight; i += tileSize) {
        for (let j = 0; j < mapWidth; j += tileSize) {
            layerNodes.push({ X: j, Y: i, TilesheetX: tileSheetX, TilesheetY: tileSheetY });
        }
    }
}

function Scan(lx, rx, y, stack, tileSize, tileMap, mapWidth, mapHeight, targetTile) {
    let span_added = false;

    for (let x = lx; x <= rx; x += tileSize) {
        if (!IsInside(x, y, tileMap, mapWidth, mapHeight, targetTile)) {
            span_added = false;
        }
        else if (!span_added) {
            stack.push({ X: x, Y: y });
            span_added = true;
        }
    }
}

function IsInside(x, y, tileMap, mapWidth, mapHeight, targetTile) {
    if (x >= mapWidth || y >= mapHeight) {
        return false;
    }

    if (x < 0 || y < 0) {
        return false;
    }

    const key = `${x},${y}`;
    const existingTile = tileMap.get(key);

    if (!targetTile) {
        // When no targetTile, we can fill empty spaces (where no tile exists)
        return !existingTile;
    }
    else {
        // When targetTile specified, we can fill tiles that match the target
        return existingTile &&
               existingTile.TilesheetX === targetTile.X &&
               existingTile.TilesheetY === targetTile.Y;
    }
}

function SetTile(x, y, tileMap, filled, tileSheetX, tileSheetY, targetTile) {
    const key = `${x},${y}`;

    // Skip if already filled in this operation
    if (filled.has(key)) {
        return;
    }

    filled.add(key);

    // Create the new tile
    const newTile = { X: x, Y: y, TilesheetX: tileSheetX, TilesheetY: tileSheetY };

    // Update the map (either replacing existing tile or adding new one)
    tileMap.set(key, newTile);
}
