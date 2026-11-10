import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_DATA_URL = new URL('../models/google-model.base64', import.meta.url);

export function initModel(container, options = {}) {
  if (!container) return null;
  const { theme = 'light', autoRotate = true, scale = 1 } = options;
  let disposed = false;
  let model = null;
  let frame = 0;
  let pointerDown = false;
  let previousPointer = { x: 0, y: 0 };
  let targetRotation = { x: -0.08, y: 0.35 };
  let currentRotation = { x: -0.08, y: 0.35 };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(0, 0, 7.3);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, theme === 'dark' ? 0x1c3043 : 0x9aaec0, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(3, 5, 6);
  scene.add(key);
  const blueFill = new THREE.DirectionalLight(theme === 'dark' ? 0x76bfff : 0xc5e8ff, 1.5);
  blueFill.position.set(-5, 1, -2);
  scene.add(blueFill);
  const rim = new THREE.PointLight(theme === 'dark' ? 0x7fbde9 : 0xffffff, 18, 20);
  rim.position.set(0, 3, -3);
  scene.add(rim);

  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  async function load() {
    try {
      const response = await fetch(MODEL_DATA_URL);
      if (!response.ok) throw new Error('Model data request failed: ' + response.status);
      const encoded = (await response.text()).trim();
      const binaryString = atob(encoded);
      const compressed = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('This browser does not support compressed model loading.');
      }
      const decompressedStream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      const glb = await new Response(decompressedStream).arrayBuffer();
      if (disposed) return;

      const loader = new GLTFLoader();
      loader.parse(glb, '', (result) => {
        if (disposed) return;
        model = result.scene || result.scenes[0];
        model.scale.setScalar(scale);
        model.rotation.set(-0.08, 0.35, 0);
        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = false;
          child.receiveShadow = false;
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
              if ('roughness' in material) material.roughness = 0.28;
              if ('metalness' in material) material.metalness = 0.12;
              material.needsUpdate = true;
            });
          }
        });
        scene.add(model);
        container.dataset.modelLoaded = 'true';
      }, (error) => {
        console.error('GLB parse failed:', error);
        container.classList.add('model-unavailable');
      });
    } catch (error) {
      console.error('Could not load Google GLB:', error);
      container.classList.add('model-unavailable');
    }
  }

  function onPointerDown(event) {
    pointerDown = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    container.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event) {
    if (!pointerDown) return;
    const dx = event.clientX - previousPointer.x;
    const dy = event.clientY - previousPointer.y;
    targetRotation.y += dx * 0.008;
    targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * 0.006, -0.7, 0.7);
    previousPointer = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp() { pointerDown = false; }
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('pointerleave', onPointerUp);

  let previousTime = performance.now();
  function render(now) {
    if (disposed) return;
    const delta = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    if (model) {
      if (autoRotate && !pointerDown) targetRotation.y += delta * 0.23;
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.055;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.055;
      model.rotation.x = currentRotation.x;
      model.rotation.y = currentRotation.y;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);
  load();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('pointerleave', onPointerUp);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
