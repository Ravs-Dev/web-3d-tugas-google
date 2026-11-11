import 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.4.0/dist/model-viewer.min.js';

const MODEL_URL = new URL('../models/google.glb', import.meta.url).href;

export function initModel(container, options = {}) {
  if (!container) return null;

  const {
    autoRotate = false,
    exposure = 1.18,
    shadowIntensity = 0.72
  } = options;

  let disposed = false;
  let progress = 0;
  let baseOrbit = { theta: 0, phi: 1.18, radius: 2.8 };
  let lastAppliedProgress = -1;

  container.classList.add('model-loading');
  container.dataset.modelState = 'loading';

  const viewer = document.createElement('model-viewer');
  viewer.setAttribute('src', MODEL_URL);
  viewer.setAttribute('alt', 'Original four-colour Google G model exported from Blender');
  viewer.setAttribute('camera-controls', '');
  viewer.setAttribute('touch-action', 'pan-y');
  viewer.setAttribute('interaction-prompt', 'none');
  viewer.setAttribute('loading', 'eager');
  viewer.setAttribute('reveal', 'auto');
  viewer.setAttribute('shadow-intensity', String(shadowIntensity));
  viewer.setAttribute('shadow-softness', '0.9');
  viewer.setAttribute('exposure', String(exposure));
  viewer.setAttribute('environment-image', 'neutral');
  viewer.setAttribute('tone-mapping', 'aces');
  viewer.setAttribute('min-camera-orbit', 'auto 10deg auto');
  viewer.setAttribute('max-camera-orbit', 'auto 170deg auto');
  viewer.setAttribute('camera-orbit', '0deg 75deg auto');
  viewer.setAttribute('field-of-view', '28deg');
  viewer.setAttribute('disable-zoom', 'false');
  viewer.setAttribute('disable-pan', '');
  viewer.setAttribute('auto-rotate', autoRotate ? '' : 'false');
  viewer.setAttribute('rotation-per-second', '18deg');
  viewer.setAttribute('interpolation-decay', '180');
  viewer.setAttribute('style', 'width:100%;height:100%;background:transparent;--poster-color:transparent;');

  container.replaceChildren(viewer);

  function onLoad() {
    if (disposed) return;
    container.classList.remove('model-loading', 'model-error');
    container.classList.add('model-ready');
    container.dataset.modelState = 'ready';
    container.dataset.modelLoaded = 'true';

    try {
      const orbit = viewer.getCameraOrbit();
      if (orbit && Number.isFinite(orbit.radius)) {
        baseOrbit = {
          theta: orbit.theta,
          phi: orbit.phi,
          radius: orbit.radius
        };
      }
    } catch (error) {
      console.warn('Could not read initial model camera orbit:', error);
    }

    // Re-apply current progress after the first model-load event, because
    // the initial camera framing is calculated by model-viewer at load time.
    lastAppliedProgress = -1;
    applyScroll(progress);
  }

  function onProgress(event) {
    const total = event.detail?.totalProgress;
    if (Number.isFinite(total)) {
      container.dataset.modelProgress = String(Math.round(total * 100));
    }
  }

  function onError(event) {
    if (disposed) return;
    const message = event?.detail?.sourceURL
      ? 'Failed to load ' + event.detail.sourceURL
      : 'The browser could not decode the supplied GLB file.';
    console.error('Google GLB model-viewer error:', event);
    container.classList.remove('model-loading');
    container.classList.add('model-error');
    container.dataset.modelState = 'error';
    container.dataset.modelError = 'true';
    container.dataset.modelErrorMessage = message;
  }

  viewer.addEventListener('load', onLoad);
  viewer.addEventListener('progress', onProgress);
  viewer.addEventListener('error', onError);

  function applyScroll(value) {
    if (disposed || !viewer.loaded) return;
    const p = Math.max(0, Math.min(1, value));
    if (Math.abs(p - lastAppliedProgress) < 0.0015) return;
    lastAppliedProgress = p;

    const wave = Math.sin(p * Math.PI);
    const turn = p * Math.PI * 4;
    const sway = Math.sin(p * Math.PI * 2) * 0.1;
    const phi = Math.max(0.38, Math.min(2.55, baseOrbit.phi + Math.sin(p * Math.PI * 2) * 0.12));
    const radius = Math.max(0.01, baseOrbit.radius * (1 - wave * 0.12 + Math.sin(p * Math.PI * 4) * 0.018));
    const theta = baseOrbit.theta + turn + sway;

    viewer.cameraOrbit = `${theta}rad ${phi}rad ${radius}m`;
    viewer.fieldOfView = `${28 - wave * 3}deg`;
    viewer.exposure = exposure + wave * 0.2;
  }

  function setScrollProgress(value) {
    progress = Math.max(0, Math.min(1, value));
    applyScroll(progress);
  }

  function dispose() {
    disposed = true;
    viewer.removeEventListener('load', onLoad);
    viewer.removeEventListener('progress', onProgress);
    viewer.removeEventListener('error', onError);
    viewer.remove();
  }

  return {
    viewer,
    setScrollProgress,
    dispose
  };
}
