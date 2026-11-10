# RAVS Motion

RAVS Motion is an interactive web-motion showcase by RAVS-DEV, inspired by the presentation and playground style of Anime.js. The page is built around the actual Blender-exported Google G model in `assets/models/google.glb`.

## Highlights

- Anime.js v4 JavaScript motion sequences, scroll reveals, hover response, stagger and easing playground.
- Two live Three.js scenes loading the exact repository GLB with GLTFLoader.
- Automatic model bounds measurement and camera framing.
- Preserved Blender transform hierarchy and original four coloured meshes.
- Drag-to-rotate, pointer parallax, automatic turntable motion and scroll-driven rotation.
- Studio lights, display pedestal, orbit rings and floating particles.
- Responsive page and reduced-motion support.

## Run locally

Use an HTTP server because the application loads ES modules and the GLB asset:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## 3D asset

The viewer loads `assets/models/google.glb` directly. The Blender root transform is kept intact. The viewer calculates the mesh bounds at runtime and applies centering and fit scale through a parent group, so the source model is not modified.

## Stack

- Anime.js v4 — web motion and interaction.
- Three.js — real-time 3D renderer.
- GLTFLoader — binary GLB model loading.
- Vanilla JavaScript modules, HTML and CSS.
