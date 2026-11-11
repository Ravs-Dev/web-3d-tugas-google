const MODEL_URL = new URL('../models/google.glb', import.meta.url).href;

export function initModel(viewer, options = {}) {
  if (!viewer) return null;

  const { exposure = 1.18 } = options;
  let disposed = false;
  let wired = false;
  let ready = false;
  let progress = 0;
  let baseOrbit = { theta: 0, phi: Math.PI * 75 / 180, radius: 2.8 };
  let baseFieldOfView = 45;
  let lastAppliedProgress = -1;
  let componentTimeout = 0;

  viewer.classList.add('model-loading');
  viewer.dataset.modelState = 'loading';

  function showError(message, event) {
    if (disposed) return;
    console.error('Google GLB viewer error:', message, event || '');
    viewer.classList.remove('model-loading');
    viewer.classList.add('model-error');
    viewer.dataset.modelState = 'error';
    viewer.dataset.modelError = 'true';
    viewer.dataset.modelErrorMessage = String(message);
  }

  function applyScroll(value) {
    if (disposed || !ready) return;
    const p = Math.max(0, Math.min(1, value));
    if (Math.abs(p - lastAppliedProgress) < 0.001) return;
    lastAppliedProgress = p;

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
    const type = event?.detail?.type || 'loadfailure';
    showError(`Could not load the original GLB (${type}): ${MODEL_URL}`, event);
  }

  function connectViewer() {
    if (disposed || wired) return;
    const ViewerClass = customElements.get('model-viewer');
    if (!ViewerClass) return;

    wired = true;
    clearTimeout(componentTimeout);

    // Wait until the custom element is upgraded before assigning properties.
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

    viewer.addEventListener('load', onLoad);
    viewer.addEventListener('progress', onProgress);
    viewer.addEventListener('error', onError);

    // The HTML already points at this exact file. Only set it when missing.
    if (!viewer.getAttribute('src')) viewer.src = MODEL_URL;
    if (viewer.loaded) requestAnimationFrame(onLoad);
  }

  if (customElements.get('model-viewer')) {
    connectViewer();
  } else {
    customElements.whenDefined('model-viewer').then(connectViewer);
    componentTimeout = window.setTimeout(() => {
      if (!wired) showError('The Google model-viewer component did not finish loading from the CDN.');
    }, 12000);
  }

  function setScrollProgress(value) {
    progress = Math.max(0, Math.min(1, value));
    applyScroll(progress);
  }

  function dispose() {
    disposed = true;
    clearTimeout(componentTimeout);
    viewer.removeEventListener('load', onLoad);
    viewer.removeEventListener('progress', onProgress);
    viewer.removeEventListener('error', onError);
  }

  return { viewer, setScrollProgress, dispose };
}
