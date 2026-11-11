# RAVS Motion

A JavaScript animation playground by RAVS-DEV, inspired by the layout and interactive motion showcases of Anime.js. The page is built around the original Google G Blender export at `assets/models/google.glb`.

## Experience

- A fixed, central Three.js scene stays on screen while the page scrolls through seven chapters.
- The Google G rotates, shifts, scales and changes camera perspective based on scroll progress.
- Left-side chapter copy and right-side interactive demos transition as the scroll advances.
- Seven demo chapters: introduction, WAAPI-style animation, timeline, stagger, SVG path, spring/drag, and scroll progress.
- A toolbox list lets visitors jump directly to a selected chapter.
- Anime.js v4 powers intro choreography, chapter transitions and interactive demos.
- Three.js + GLTFLoader load the exact binary GLB file from the repository.
- Runtime geometry fitting, studio lights, pedestal, orbit rings and particles.
- Responsive layout, mobile navigation and reduced-motion support.

## Run locally

Use an HTTP server because the site uses ES modules and loads the GLB through fetch:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Main files

- `index.html` — pinned scroll experience, demo chapters and toolbox list.
- `assets/css/style.css` — fixed scene layout, responsive design and motion demos.
- `assets/js/main.js` — Anime.js animations, scroll chapter controller and interactive demos.
- `assets/js/model.js` — Three.js scene, GLB loader and scroll-controlled 3D choreography.
- `assets/models/google.glb` — original Google G model exported from Blender.
