# RAVS Motion

A JavaScript animation playground by RAVS-DEV, inspired by the layout and interactive motion showcases of Anime.js. The central scene displays the original Google G Blender export at `assets/models/google.glb`.

## Scroll experience

- A central 3D Google G stays pinned while the page scrolls through seven chapters.
- The 3D camera performs two full orbits, changes zoom and tilt, and responds to the scroll progress.
- Chapter copy and interactive demos change as the page advances.
- Seven demonstrations: introduction, property animation, timeline, stagger, SVG path, spring/drag and scroll progress.
- A toolbox list jumps to each chapter.
- Anime.js powers intro choreography, chapter transitions and interactive elements.
- Google's `<model-viewer>` component displays the original GLB directly and provides pointer/touch camera controls.
- Responsive layout and reduced-motion support.

## Run locally

Use an HTTP server because the page uses JavaScript modules and loads the GLB through HTTPS/HTTP:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Main files

- `index.html` — page structure and the native model-viewer GLB element.
- `assets/css/style.css` — pinned scene, element demos and responsive styling.
- `assets/js/main.js` — Anime.js choreography, chapter progress and demo interactions.
- `assets/js/model.js` — camera orbit and exposure driven by scroll.
- `assets/models/google.glb` — original four-colour Google G model from Blender.
