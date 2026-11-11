# RAVS Motion

An Anime.js-inspired JavaScript motion showcase by RAVS-DEV, built around the original Google G Blender model in `assets/models/google.glb`.

## Scroll-driven experience

The central 3D scene stays pinned for a five-chapter scroll sequence. As the page moves, the chapter copy and progress rail change while the Google G model rotates, shifts in depth, scales, and changes camera perspective in real time.

## Features

- Anime.js v4 for intro choreography, stagger, hover responses, easing and chapter transitions.
- Three.js + GLTFLoader loading the exact repository `google.glb`.
- Runtime bounds fitting while retaining the Blender model's original child/root transforms and materials.
- Pinned 3D scroll story with five chapters.
- Scroll-linked 3D rotation, position, scale, camera and lighting changes.
- Pointer drag-to-rotate, pointer parallax, orbit rings and floating particles.
- Responsive layout and prefers-reduced-motion support.

## Run locally

Serve over HTTP for JavaScript modules and GLB loading:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Main files

- `index.html` — page structure and scroll story chapters.
- `assets/css/style.css` — layout, pinned scene and visual styling.
- `assets/js/main.js` — Anime.js interactions and scroll chapter controller.
- `assets/js/model.js` — Three.js GLB viewer and scroll-driven transform choreography.
- `assets/models/google.glb` — original Blender model.
