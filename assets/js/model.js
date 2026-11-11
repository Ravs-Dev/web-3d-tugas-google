const MODEL_URL = new URL('../models/google.glb', import.meta.url).href;

export function initModel(viewer, options = {}) {
  if (!viewer) return null;

  const { exposure = 1.18 } = options;
  let disposed = false;
  let ready = false;
  let progress = 0;
  let baseOrbit = { theta: 0, phi: Math.PI * 75 / 180, radius: 2.8 };
  let baseFieldOfView = 45;
  let lastAppliedProgress = -1;

  // Keep the source URL explicit so the viewer uses the original GLB file.
  viewer.src = MODEL_URL;
  viewer.cameraControls = true;
  viewer.interactionPrompt = 'none';
  viewer.cameraTarget = 'auto auto auto';
  viewer.cameraOrbit = '0deg 75deg auto';
  viewer.fieldOfView = 'auto';
  viewer.exposure = exposure;
  viewer.environmentImage = 'neutral';
  viewer.shadowIntensity = 0.72;
  viewer.shadowSoftness = 0.9;
  viewer.toneMapping = 'aces';
  viewer.touchAction = 'pan-y';
  viewer.interpolationDecay = 180;

  viewer.classList.add('model-loading');
  viewer.dataset.modelState = 'loading';

  function applyScroll(value) {
    if (disposed || !ready) return;
    const p = Math.max(0, Math.min(1, value));
    if (Math.abs(p - lastAppliedProgress) < 0.001) return;
    lastAppliedProgress = p;

    // Two full camera orbits across the pinned scroll story, with gentle
    // zoom and tilt beats. model-viewer keeps its own mouse/touch controls.
    const wave = Math.sin(p * Math.PI);
    const theta = baseOrbit.theta + p * Math.PI * 4 + Math.sin(p * Math.PI * 2) * 0.1;
    const phi = Math.max(0.3, Math.min(2.7, baseOrbit.phi + Math.sin(p * Math.PI * 2) * 0.12));
    const radius = Math.max(0.01, baseOrbit.radius * (1 - wave * 0.13 + Math.sin(p * Math.PI * 4) * 0.018));

    viewer.cameraOrbit = `${theta}rad ${phi}rad ${radius}m`;
    viewer.fieldOfView = `${Math.max(20, baseFieldOfView - wave * 4)}deg`;
    viewer.exposure = exposure + wave * 0.18;
  }

  function onLoad() {
    if (disposed) return;
    ready = true;
    viewer.classList.remove('model-loading', 'model-error');
    viewer.classList.add('model-ready');
    viewer.dataset.modelState = 'ready';
    viewer.dataset.modelLoaded = 'true';

    try {
      const orbit = viewer.getCameraOrbit();
      if (orbit && Number.isFinite(orbit.radius)) {
        baseOrbit = { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius };
      }
      const fov = viewer.getFieldOfView?.();
      if (Number.isFinite(fov)) baseFieldOfView = fov;
    } catch (error) {
      console.warn('Could not read initial GLB camera framing:', error);
    }

    lastAppliedProgress = -1;
    applyScroll(progress);
  }

  function onProgress(event) {
    const total = event.detail?.totalProgress;
    if (Number.isFinite(total)) {
      viewer.dataset.modelProgress = String(Math.round(total * 100));
    }
  }

  function onError(event) {
    if (disposed) return;
    const source = event?.detail?.sourceURL || MODEL_URL;
    const message = 'Browser could not load or decode ' + source;
    console.error('Google GLB failed to load:', event);
    viewer.classList.remove('model-loading');
    viewer.classList.add('model-error');
    viewer.dataset.modelState = 'error';
    viewer.dataset.modelError = 'true';
    viewer.dataset.modelErrorMessage = message;
  }

  viewer.addEventListener('load', onLoad);
  viewer.addEventListener('progress', onProgress);
  viewer.addEventListener('error', onError);

  // The web component can finish downloading before main.js binds listeners.
  if (viewer.loaded) requestAnimationFrame(onLoad);

  function setScrollProgress(value) {
    progress = Math.max(0, Math.min(1, value));
    applyScroll(progress);
  }

  function dispose() {
    disposed = true;
    viewer.removeEventListener('load', onLoad);
    viewer.removeEventListener('progress', onProgress);
    viewer.removeEventListener('error', onError);
  }

  return { viewer, setScrollProgress, dispose };
}
