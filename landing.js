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

newProjectButton.addEventListener('click', async () => {
    landingMenu.style.display = 'none';
    newProjectMenu.style.display = 'grid';
    window.electronAPI.expandWindowForProjectCreation();
});

cancelNewProjectButton.addEventListener('click', async () => {
    newProjectMenu.style.display = 'none';
    landingMenu.style.display = 'flex';
    window.electronAPI.goBackFromProjectCreation();
});

createNewProjectButton.addEventListener('click', async () => {
    if (projectNameInput.value) {
        await window.electronAPI.createProject({ projectName: projectNameInput.value, tilesize: tileSizeSelect.value });
    }
    else {
        projectNameInput.style.backgroundColor = '#ffc8c4';
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

// Import Tilset button click event
loadProjectButton.addEventListener('click', async () => {
    await window.electronAPI.openProject();
});

quitButton.addEventListener('click', async () => {
    await window.electronAPI.quitApp();
});
