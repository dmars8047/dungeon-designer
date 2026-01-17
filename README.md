# Dungeon Designer

<p align="center">
  <img src="Assets/dungeondesignerlogo.png" alt="Dungeon Designer Logo" width="200">
</p>

A 2D tile-based map editor for creating game levels. Design dungeon maps, platformer levels, or any grid-based game content with an intuitive visual editor.

## Features

- **Multi-Layer Editing** - Background and foreground tile layers for depth
- **Tileset Import** - Load any PNG tilesheet image
- **Editing Tools** - Brush, eraser, selection, collision marking, and flood fill
- **Clipboard System** - Copy and paste tile regions for repeated patterns
- **Collision Data** - Mark collision zones for game physics
- **Multiple Export Formats** - JSON and custom game format (.bro)
- **Project Files** - Save and load projects as .ddes files

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm (included with Node.js)

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd dungeon-designer

# Install dependencies
npm install

# Run the application
npm start
```

## Usage

### Creating a Project

1. Launch the application
2. Click **New Project** on the landing page
3. Configure your project settings:
   - **Project Name** - Name for your map
   - **Map Width/Height** - Dimensions in tiles
   - **Tile Size** - 16, 32, 48, or 64 pixels
   - **Background Color** - Canvas background color
4. Import a tileset PNG image to start designing

### Tools & Keyboard Shortcuts

| Tool | Shortcut | Description |
|------|----------|-------------|
| Brush | `B` | Paint tiles from the tileset onto the map |
| Eraser | `E` | Remove tiles from the current layer |
| Select | `Q` | Create rectangular selections for copy/cut |
| Collision | `C` | Mark tiles as collision zones |
| Fill | `G` | Flood-fill connected empty areas with selected tile |

### Layer Management

Use the layer dropdown to switch between **Background** and **Foreground** layers. Each layer can be edited and cleared independently, allowing you to create depth in your maps.

### Selection & Clipboards

1. Select the **Select Tool** (`Q`)
2. Click and drag to create a rectangular selection
3. Right-click the selection to open the context menu:
   - **Copy to Clipboard** - Copy tiles to clipboard buffer
   - **Cut to Clipboard** - Cut tiles to clipboard buffer
   - **Delete** - Remove selected tiles

Once you have a clipboard, switch to the Brush tool to paint it onto the map.

### Canvas Navigation

- **Middle-mouse drag** - Pan around the map

### Saving & Exporting

#### Save Project
Save your work as a `.ddes` file to preserve the full project state including all layers, tileset reference, and settings.

#### Export for Games
Export your map data for use in game engines:

- **JSON Format** - Exports tile layers and collision data as JSON files
- **Custom Format (.bro)** - Comma-separated text format for easy parsing

### Export Data Structure

#### JSON Export
```json
{
  "background": [
    {"X": 0, "Y": 0, "TilesheetX": 32, "TilesheetY": 0}
  ],
  "foreground": [...],
  "collision": [
    {"X": 2, "Y": 3}
  ]
}
```

#### .bro Format
Each layer exports as a separate file with comma-separated tile indices:
```
0,0,1,1,2,2
0,0,1,1,2,2
3,3,4,4,5,5
```

## License

See [LICENSE.md](LICENSE.md) for details.
