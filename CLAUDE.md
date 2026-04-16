# Dungeon Designer — Project Notes

## What This Is

A static web application (HTML/CSS/vanilla JS) for editing 2D tile-based maps. No framework, no build step. Previously an Electron app; now served as plain static files.

## Tech Stack

- **Frontend**: Vanilla JS, HTML, CSS — no framework
- **Only dependency**: `jszip` (bundled at runtime from `node_modules/jszip/dist/jszip.min.js`)
- **Local dev server**: `npx serve .` via `npm start`
- **Production**: nginx Docker image (see `Dockerfile` and `nginx.conf`)

## Key Files

| File | Purpose |
|------|---------|
| `landing.html` / `landing.js` | Project selection screen (new/load) |
| `main.html` | Editor shell |
| `renderer.js` | All editor logic — canvas rendering, tools, export |
| `styles.css` | All styles |
| `modules/` | JS modules imported by renderer |

## Running Locally

```bash
npm start   # serves at http://localhost:3000
```

## Important Conventions

- No build step — changes to JS/CSS/HTML are live immediately on reload.
- `renderer.js` is the main file; it is large and handles most editor state.
- Avoid adding npm dependencies without deliberate consideration — the goal is to keep this dependency-free beyond jszip.
