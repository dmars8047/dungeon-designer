// Undo/Redo Module for Map Canvas Operations

const MAX_HISTORY_SIZE = 100;

export const ActionTypes = {
    TILE_PAINT: 'TILE_PAINT',
    TILE_ERASE: 'TILE_ERASE',
    COLLISION_ADD: 'COLLISION_ADD',
    COLLISION_REMOVE: 'COLLISION_REMOVE',
    FILL_FLOOD: 'FILL_FLOOD',
    CLEAR_LAYER: 'CLEAR_LAYER',
    SELECTION_DELETE: 'SELECTION_DELETE',
    SELECTION_CUT: 'SELECTION_CUT',
    SELECTION_PASTE: 'SELECTION_PASTE'
};

// Undo and redo stacks
let undoStack = [];
let redoStack = [];

// Batching state for drag operations
let currentBatch = null;
let isBatching = false;

/**
 * Start a new batch for grouping multiple tile operations (e.g., drag painting)
 * @param {string} type - ActionType for this batch
 * @param {number} layerIndex - The layer being modified
 */
export function startBatch(type, layerIndex) {
    if (isBatching) {
        // If already batching, finalize the current batch first
        finalizeBatch();
    }

    isBatching = true;
    currentBatch = {
        type: type,
        layerIndex: layerIndex,
        removed: [],
        added: [],
        timestamp: Date.now()
    };
}

/**
 * Add a tile change to the current batch
 * @param {object|null} removedTile - The tile that was removed (or null)
 * @param {object|null} addedTile - The tile that was added (or null)
 */
export function addToBatch(removedTile, addedTile) {
    if (!isBatching || !currentBatch) {
        return;
    }

    if (removedTile) {
        // Check if we're re-adding a tile at the same position we removed
        const existingAddedIndex = currentBatch.added.findIndex(
            t => t.X === removedTile.X && t.Y === removedTile.Y
        );

        if (existingAddedIndex >= 0) {
            // We're overwriting a tile we added in this same batch
            // Remove it from added, but keep the original removed tile
            currentBatch.added.splice(existingAddedIndex, 1);
        }

        // Only add to removed if not already tracking this position
        const alreadyRemoved = currentBatch.removed.some(
            t => t.X === removedTile.X && t.Y === removedTile.Y
        );

        if (!alreadyRemoved) {
            currentBatch.removed.push({ ...removedTile });
        }
    }

    if (addedTile) {
        // Remove any existing added tile at this position
        currentBatch.added = currentBatch.added.filter(
            t => t.X !== addedTile.X || t.Y !== addedTile.Y
        );
        currentBatch.added.push({ ...addedTile });
    }
}

/**
 * Finalize the current batch and push it to the undo stack
 */
export function finalizeBatch() {
    if (!isBatching || !currentBatch) {
        return;
    }

    // Only push if there were actual changes
    if (currentBatch.removed.length > 0 || currentBatch.added.length > 0) {
        pushAction(currentBatch);
    }

    isBatching = false;
    currentBatch = null;
}

/**
 * Check if currently in a batching operation
 * @returns {boolean}
 */
export function isBatchingActive() {
    return isBatching;
}

/**
 * Push an action onto the undo stack
 * @param {object} action - The action to push
 */
export function pushAction(action) {
    undoStack.push(action);

    // Clear redo stack when new action is performed
    redoStack = [];

    // Enforce max history size
    if (undoStack.length > MAX_HISTORY_SIZE) {
        undoStack.shift();
    }
}

/**
 * Pop the most recent action from the undo stack for reversal
 * @returns {object|null} The action to undo, or null if stack is empty
 */
export function undo() {
    if (undoStack.length === 0) {
        return null;
    }

    const action = undoStack.pop();
    redoStack.push(action);

    return action;
}

/**
 * Pop the most recent undone action from the redo stack
 * @returns {object|null} The action to redo, or null if stack is empty
 */
export function redo() {
    if (redoStack.length === 0) {
        return null;
    }

    const action = redoStack.pop();
    undoStack.push(action);

    return action;
}

/**
 * Check if undo is available
 * @returns {boolean}
 */
export function canUndo() {
    return undoStack.length > 0;
}

/**
 * Check if redo is available
 * @returns {boolean}
 */
export function canRedo() {
    return redoStack.length > 0;
}

/**
 * Clear all history (e.g., when loading a new project)
 */
export function clearHistory() {
    undoStack = [];
    redoStack = [];
    isBatching = false;
    currentBatch = null;
}

/**
 * Get a human-readable description of an action type
 * @param {string} type - The ActionType
 * @returns {string} Description
 */
export function getActionDescription(type) {
    switch (type) {
        case ActionTypes.TILE_PAINT:
            return 'Paint Tile';
        case ActionTypes.TILE_ERASE:
            return 'Erase Tile';
        case ActionTypes.COLLISION_ADD:
            return 'Add Collision';
        case ActionTypes.COLLISION_REMOVE:
            return 'Remove Collision';
        case ActionTypes.FILL_FLOOD:
            return 'Fill';
        case ActionTypes.CLEAR_LAYER:
            return 'Clear Layer';
        case ActionTypes.SELECTION_DELETE:
            return 'Delete Selection';
        case ActionTypes.SELECTION_CUT:
            return 'Cut Selection';
        case ActionTypes.SELECTION_PASTE:
            return 'Paste Selection';
        default:
            return 'Unknown Action';
    }
}

/**
 * Get current undo stack size (for debugging/UI)
 * @returns {number}
 */
export function getUndoStackSize() {
    return undoStack.length;
}

/**
 * Get current redo stack size (for debugging/UI)
 * @returns {number}
 */
export function getRedoStackSize() {
    return redoStack.length;
}
