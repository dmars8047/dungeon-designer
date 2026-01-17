const contextMenuId = 'selection-mode-context-menu';
const contextMenuItemCssClass = 'selection-context-menu-item';
const contextMenuItemHoverHackCssClass = 'selection-context-menu-item-hover-hack';

export const SelectionModeOptions = {
    Copy: 0,
    Cut: 1,
    Delete: 2,
    Cancel: 3
}

export function PresentContext(mouseX, mouseY, selectionOverMax) {
    let contextMenuContainer = document.createElement("div");
    contextMenuContainer.style.cursor = "pointer";
    contextMenuContainer.id = contextMenuId;
    contextMenuContainer.style.width = "200px";
    contextMenuContainer.style.height = "80px";
    contextMenuContainer.style.position = "absolute";
    contextMenuContainer.style.left = `${mouseX - 16}px`;
    contextMenuContainer.style.top = `${mouseY - 16}px`;
    contextMenuContainer.style.backgroundColor = "#575655";
    contextMenuContainer.onmouseleave = () => SelectionMade(SelectionModeOptions.Cancel);

    if (!selectionOverMax) {
        let copyMenuItem = document.createElement("div");
        copyMenuItem.innerText = "Copy to Clipboard";
        copyMenuItem.classList.add(contextMenuItemHoverHackCssClass);
        copyMenuItem.onmouseleave = () => {
            copyMenuItem.classList.remove(contextMenuItemHoverHackCssClass);
            copyMenuItem.classList.add(contextMenuItemCssClass);
        };
        copyMenuItem.onclick = () => SelectionMade(SelectionModeOptions.Copy);
        contextMenuContainer.appendChild(copyMenuItem);

        let cutMenuItem = document.createElement("div");
        cutMenuItem.innerText = "Cut To Clipboard";
        cutMenuItem.classList.add(contextMenuItemCssClass);
        cutMenuItem.onclick = () => SelectionMade(SelectionModeOptions.Cut);
        contextMenuContainer.appendChild(cutMenuItem);
    }

    let delMenuItem = document.createElement("div");
    delMenuItem.innerText = "Delete";

    if (selectionOverMax) {
        delMenuItem.classList.add(contextMenuItemHoverHackCssClass);
        delMenuItem.onmouseleave = () => {
            delMenuItem.classList.remove(contextMenuItemHoverHackCssClass);
            delMenuItem.classList.add(contextMenuItemCssClass);
        };
    }
    else {
        delMenuItem.classList.add(contextMenuItemCssClass);
    }

    delMenuItem.onclick = () => SelectionMade(SelectionModeOptions.Delete);
    contextMenuContainer.appendChild(delMenuItem);

    let cancelMenuItem = document.createElement("div");
    cancelMenuItem.innerText = "Cancel";
    cancelMenuItem.classList.add(contextMenuItemCssClass);
    cancelMenuItem.onclick = () => SelectionMade(SelectionModeOptions.Cancel);
    contextMenuContainer.appendChild(cancelMenuItem);

    document.body.append(contextMenuContainer);
}

export function RemoveContext() {
    let contextMenu = document.getElementById(contextMenuId);
    contextMenu.remove();
}

function SelectionMade(selection) {
    RemoveContext();
    let event = new CustomEvent('select-mode-option-selected', { detail: selection });
    document.getElementById("map-canvas").dispatchEvent(event);
}