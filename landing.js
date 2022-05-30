var newProjectButton = document.getElementById('new-project-button');
var loadProjectButton = document.getElementById('load-project-button');
var quitButton = document.getElementById('quit-button');
var landingMenu = document.getElementById('landing-menu');
var newProjectMenu = document.getElementById('new-project-menu');
var cancelNewProjectButton = document.getElementById('cancel-create-project-button');
var createNewProjectButton = document.getElementById('create-project-button');
var projectNameInput = document.getElementById('project-name-input');
var tileSizeSelect = document.getElementById('tile-size-select');

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
