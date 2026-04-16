# Dungeon Designer

A 2D tile-based map editor for creating game levels. Design dungeon maps, platformer levels, or any grid-based game content with an intuitive visual editor.

This is a static web application — no installation required beyond a file server.

## Features

- **Multi-Layer Editing**: Background, middle, and foreground tile layers for depth
- **Tileset Import**: Load any PNG tilesheet image
- **Editing Tools**: Brush, eraser, selection, collision marking, and flood fill
- **Clipboard System**: Copy and paste tile regions for repeated patterns
- **Collision Data**: Mark collision zones for game physics
- **JSON Export**: Export map data as a ZIP containing structured JSON and the tileset PNG

## Running Locally

```bash
npm start
```

This serves the app at `http://localhost:3000` using `npx serve .`. No build step needed.

## Docker

Build and run with nginx:

```bash
docker build -t dungeon-designer .
docker run -p 8080:80 dungeon-designer
```

The app will be available at `http://localhost:8080`.

## License

MIT — see [GitHub](https://github.com/dmars8047/dungeon-designer) for source.
