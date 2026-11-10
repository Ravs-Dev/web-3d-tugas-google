# FORM — 3D Motion Studio

A browser-based 3D playground built with Three.js. Create simple primitives, import Blender exports in **.glb / .gltf**, adjust transforms and materials, animate with a keyframe timeline, and export the scene as a binary GLB.

## Run locally

Because the app uses JavaScript modules, serve the folder through a local HTTP server (do not open `index.html` directly).

Examples:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Main features

- Three.js viewport with orbit, zoom, pan, grid and axes.
- Primitive creation: box, sphere, torus and cylinder.
- GLB / glTF import through the file picker or drag-and-drop.
- Translate, rotate and scale gizmos.
- Object inspector and basic material controls.
- Keyframe timeline with playback and scrubbing.
- Export the current scene assets to `.glb`.
- Responsive layout for desktop and smaller screens.

## Importing a Blender model

1. In Blender, use **File → Export → glTF 2.0**.
2. Choose **glTF Binary (.glb)** for a single-file model.
3. In FORM, select **Import GLB** or drop the file onto the viewport.
4. Select the imported object in the Scene panel to edit its transforms.

For best browser performance, keep textures reasonably sized and apply transforms before export when practical.

## Technology

- [Three.js](https://threejs.org/) for real-time 3D rendering and GLB loading/export.
- Vanilla HTML, CSS and JavaScript; no build step required.

## Deploy

The repository includes a GitHub Pages workflow. Enable **Settings → Pages → Build and deployment → GitHub Actions** if it is not already selected.
