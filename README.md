# RAVS Motion

RAVS Motion is an interactive motion-design showcase by RAVS-DEV, inspired by the feel of Anime.js. It is a creative landing page and motion playground — **not a 3D modelling editor**.

## Experience

- Animated hero typography and sequenced intro.
- Smooth scroll reveals, page progress and responsive navigation.
- Interactive hover response, stagger animation and easing playground.
- Motion showcase cards for timelines, SVG, scroll storytelling and 3D.
- Two real-time Three.js scenes using the latest supplied Blender Google G model.
- Drag-to-rotate, automatic rotation, pointer parallax and scroll-driven 3D motion.
- Cinematic lighting, orbit rings, floating particles and a small 3D display platform.
- Copyable Anime.js v4 example.
- Responsive layouts and reduced-motion support.

## Run locally

Serve the project through an HTTP server because it uses ES modules and fetches the compressed GLB parts.

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## 3D model

The latest `google.glb` was centered and optimized while preserving its four coloured mesh parts and their materials. Its gzip-compressed bytes are base64-encoded into six text fragments in `assets/models/google-v2-part-01.txt` through `google-v2-part-06.txt`.

The viewer joins the fragments, decompresses the model in the browser, and loads it with Three.js GLTFLoader. The original uploaded Blender file is not overwritten.

To replace the model later, export a new binary GLB, gzip it, base64-encode the compressed bytes, split the text into six sequential files, and update the part count in `assets/js/model.js` when needed.

## Stack

- Anime.js v4 via jsDelivr ESM for web motion.
- Three.js for real-time 3D rendering.
- GLTFLoader for loading the supplied GLB.
- Vanilla HTML, CSS and JavaScript modules.

## GitHub Pages

The workflow is included at `.github/workflows/deploy.yml`. In repository Settings → Pages, choose **GitHub Actions** as the source for deployment.
