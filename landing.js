var newProjectButton = document.getElementById('new-project-button');
var loadProjectButton = document.getElementById('load-project-button');
var quitButton = document.getElementById('quit-button');

newProjectButton.addEventListener('click', async () => {
    await window.electronAPI.newProject();
});

// Import Tilset button click event
loadProjectButton.addEventListener('click', async () => {
    await window.electronAPI.openProject();
});

quitButton.addEventListener('click', async () => {
    await window.electronAPI.quitApp();
});
