var newProjectButton = document.getElementById('new-project-button');
var loadProjectButton = document.getElementById('load-project-button');
var quitButton = document.getElementById('quit-button');
var landingMenu = document.getElementById('landing-menu');
var newProjectMenu = document.getElementById('new-project-menu');
var cancelNewProjectButton = document.getElementById('cancel-create-project-button');
var createNewProjectButton = document.getElementById('create-project-button');
var projectNameInput = document.getElementById('project-name-input');
var tileSizeSelect = document.getElementById('tile-size-select');
var layerElementContainer = document.getElementById('layer-element-container');
var pushLayerButton = document.getElementById('push-layer-button');
var popLayerButton = document.getElementById('pop-layer-button');
var tilesetFileInput = document.getElementById('tileset-file-input');
var importTilesetButton = document.getElementById('import-tileset-button');
var errorMessageContainer = document.getElementById('error-message-container');
var errorMessage = document.getElementById('error-message');
var mapDimensionsWidthInput = document.getElementById('map-dimensions-width-input');
var mapDimensionsHeightInput = document.getElementById('map-dimensions-height-input');

var layerNames = [];
var numLayers = 2;

pushLayerButton.addEventListener('click', async () => {
    numLayers++;
    let labelContainer = document.createElement("div");
    labelContainer.id = "layer-" + numLayers + "-label-container";
    labelContainer.style.margin = "auto";
    labelContainer.style.gridColumn = "1";
    labelContainer.style.gridRow = numLayers;

    let label = document.createElement("label");
    label.id = "layer-" + numLayers + "-label";
    label.innerHTML = "Tile Layer " + numLayers + ":";

    labelContainer.appendChild(label);

    let inputContainer = document.createElement("div");
    inputContainer.id = "layer-" + numLayers + "-input-container";
    inputContainer.style.gridColumn = "2 / span 2";
    inputContainer.style.gridRow = numLayers;

    var input = document.createElement("input");
    input.id = "layer-" + numLayers + "-input";
    input.type = "text";
    input.placeholder = "Layer " + numLayers + "...";

    inputContainer.appendChild(input);

    layerElementContainer.appendChild(labelContainer);
    layerElementContainer.appendChild(inputContainer);

    if (numLayers > 1) {
        popLayerButton.disabled = false;
    }
});

popLayerButton.addEventListener('click', async () => {
    if (numLayers > 1) {
        document.getElementById("layer-" + numLayers + "-label-container").remove();
        document.getElementById("layer-" + numLayers + "-input-container").remove();
        numLayers--;

        if (numLayers == 1) {
            popLayerButton.disabled = true;
        }
    }
});

importTilesetButton.addEventListener('click', async () => {
    var pathToTilset = await window.electronAPI.openFile();
    if (pathToTilset) {
        tilesetFileInput.value = pathToTilset;
        tilesetFileInput.style.backgroundColor = '#fff';
    }
});

newProjectButton.addEventListener('click', async () => {
    landingMenu.style.display = 'none';
    newProjectMenu.style.display = 'grid';
    window.electronAPI.expandWindowForProjectCreation();
});

cancelNewProjectButton.addEventListener('click', async () => {
    newProjectMenu.style.display = 'none';
    errorMessageContainer.style.display = 'none';
    landingMenu.style.display = 'flex';
    window.electronAPI.goBackFromProjectCreation();
});

// Handles when the user clicks the create button in the create project 'form'.
createNewProjectButton.addEventListener('click', async () => {
    if (projectCreateFormIsValid()) {

        var creationRequest = {
            projectName: projectNameInput.value,
            tileSize: parseInt(tileSizeSelect.value),
            layerNames: layerNames,
            tilesetSrc: tilesetFileInput.value,
            canvasWidth: mapDimensionsWidthInput.value,
            canvasHeight: mapDimensionsHeightInput.value
        };

        await window.electronAPI.createNewProject(creationRequest);
    }
});

projectNameInput.addEventListener('keyup', async () => {
    if (projectNameInput.value) {
        projectNameInput.style.backgroundColor = '#fff';
    }
    else {
        projectNameInput.style.backgroundColor = '#ffc8c4';
    }
});

loadProjectButton.addEventListener('click', async () => {
    await window.electronAPI.openProject();
});

quitButton.addEventListener('click', async () => {
    await window.electronAPI.quitApp();
});

function projectCreateFormIsValid() {
    let isValid = true;
    let errorMessageText = '';

    if (!projectNameInput.value) {
        projectNameInput.style.backgroundColor = '#ffc8c4';
        errorMessageText = 'A project name is required. The name of the project must be under 255 characters.'
        isValid = false;
    }
    else {
        projectNameInput.style.backgroundColor = '#fff';
    }

    if (!mapDimensionsWidthInput.value ||
        mapDimensionsWidthInput.value < 1 ||
        !mapDimensionsHeightInput.value ||
        mapDimensionsHeightInput.value < 1) {

        mapDimensionsHeightInput.style.backgroundColor = '#ffc8c4';
        mapDimensionsWidthInput.style.backgroundColor = '#ffc8c4';

        if (!errorMessageText) {
            errorMessageText = 'You must provide a width and height for first map. The values must be positive numbers.';
        }
    }
    else {
        mapDimensionsHeightInput.style.backgroundColor = '#fff';
        mapDimensionsWidthInput.style.backgroundColor = '#fff';
    }

    if (!tilesetFileInput.value) {
        tilesetFileInput.style.backgroundColor = '#ffc8c4';

        if (!errorMessageText) {
            errorMessageText = 'You must provide an initial tileset PNG file.'
        }

        isValid = false;
    }
    else {
        tilesetFileInput.style.backgroundColor = '#fff';
    }

    layerNames = [];

    for (let i = 1; i <= numLayers; i++) {
        let input = document.getElementById("layer-" + i + "-input");

        if (!input.value || layerNames.indexOf(input.value) > -1) {
            if (!errorMessageText) {
                errorMessageText = 'Each tileset layer must have a unique name.';
            }

            input.style.backgroundColor = '#ffc8c4';
            isValid = false;
        }
        else {
            layerNames.push(input.value);
            input.style.backgroundColor = '#fff';
        }
    }

    if (!isValid) {
        errorMessageContainer.style.display = 'inline';
        errorMessage.float
        errorMessage.innerHTML = '<strong>Error:</strong>&nbsp;' + errorMessageText;
        setTimeout(function () { fadeOutEffect(); }, 2500);
    }

    return isValid;
}

function fadeOutEffect() {
    var fadeEffect = setInterval(function () {
        if (!errorMessageContainer.style.opacity) {
            errorMessageContainer.style.opacity = 1;
        }
        if (errorMessageContainer.style.opacity > 0) {
            errorMessageContainer.style.opacity -= 0.1;
        } else {
            errorMessageContainer.style.display = 'none';
            errorMessageContainer.style.opacity = 1;
            clearInterval(fadeEffect);
        }
    }, 50);
}