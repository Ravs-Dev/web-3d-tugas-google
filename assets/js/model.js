import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_PARTS = Array.from({ length: 6 }, (_, index) => {
  const part = String(index + 1).padStart(2, '0');
  return new URL('../models/google-v2-part-' + part + '.txt', import.meta.url);
});

export function initModel(container, options = {}) {
  if (!container) return null;

  const {
    theme = 'light',
    autoRotate = true,
    scale = 1.18,
    cameraDistance = 4.5,
    showStage = true
  } = options;

  let disposed = false;
  let model = null;
  let frame = 0;
  let pointerDown = false;
  let pointerInside = false;
  let previousPointer = { x: 0, y: 0 };
  let scrollProgress = 0;
  let lastTime = performance.now();

  const baseRotation = { x: -0.12, y: 0.55 };
  const targetRotation = { x: baseRotation.x, y: baseRotation.y };
  const currentRotation = { x: baseRotation.x, y: baseRotation.y };

  const dark = theme === 'dark';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.02, cameraDistance);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', 'Interactive rotating 3D Google G model');
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(
    0xf3f9ff,
    dark ? 0x17273c : 0x8da4b8,
    dark ? 1.55 : 1.8
  );
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(3.5, 5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.00018;
  scene.add(key);

  const coolFill = new THREE.DirectionalLight(dark ? 0x7cbfff : 0xc7e9ff, 2.1);
  coolFill.position.set(-4, 1, 2);
  scene.add(coolFill);

  const warmRim = new THREE.DirectionalLight(0xffd8ac, dark ? 1.5 : 0.75);
  warmRim.position.set(1, 3, -5);
  scene.add(warmRim);

  const frontGlow = new THREE.PointLight(dark ? 0x8dcfff : 0xffffff, 24, 16);
  frontGlow.position.set(0, 0.7, 3.8);
  scene.add(frontGlow);

  const stage = new THREE.Group();
  scene.add(stage);

  const platformMaterial = new THREE.MeshStandardMaterial({
    color: dark ? 0x1e344b : 0xc7d9e7,
    metalness: 0.62,
    roughness: 0.34
  });
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.27, 0.11, 72),
    platformMaterial
  );
  platform.position.set(0, -1.16, 0);
  platform.castShadow = true;
  platform.receiveShadow = true;
  stage.add(platform);

  const platformEdge = new THREE.Mesh(
    new THREE.TorusGeometry(1.19, 0.014, 12, 96),
    new THREE.MeshBasicMaterial({
      color: dark ? 0x75bde9 : 0x5d9fca,
      transparent: true,
      opacity: 0.75
    })
  );
  platformEdge.rotation.x = Math.PI / 2;
  platformEdge.position.set(0, -1.105, 0);
  stage.add(platformEdge);

  const platformGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.42, 72),
    new THREE.MeshBasicMaterial({
      color: dark ? 0x367cac : 0x9ccdeb,
      transparent: true,
      opacity: dark ? 0.10 : 0.13,
      depthWrite: false
    })
  );
  platformGlow.rotation.x = -Math.PI / 2;
  platformGlow.position.set(0, -1.22, 0);
  stage.add(platformGlow);

  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const orbitMaterial = new THREE.MeshBasicMaterial({
    color: dark ? 0x7cbce5 : 0x6aa9d6,
    transparent: true,
    opacity: dark ? 0.47 : 0.31,
    depthWrite: false
  });
  const orbitRingA = new THREE.Mesh(new THREE.TorusGeometry(1.64, 0.007, 8, 160), orbitMaterial);
  orbitRingA.rotation.set(0.35, -0.32, 0.18);
  orbitGroup.add(orbitRingA);

  const orbitRingB = new THREE.Mesh(
    new THREE.TorusGeometry(1.88, 0.004, 8, 160),
    new THREE.MeshBasicMaterial({
      color: dark ? 0x8bdcc9 : 0x8cccbf,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })
  );
  orbitRingB.rotation.set(-0.55, 0.35, -0.2);
  orbitGroup.add(orbitRingB);

  const particleCount = dark ? 190 : 130;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSeeds = [];
  for (let i = 0; i < particleCount; i += 1) {
    const radius = 1.65 + Math.random() * 0.95;
    const theta = Math.random() * Math.PI * 2;
    const vertical = (Math.random() - 0.5) * 3.2;
    particlePositions[i * 3] = Math.cos(theta) * radius;
    particlePositions[i * 3 + 1] = vertical;
    particlePositions[i * 3 + 2] = Math.sin(theta) * radius * 0.45 - 0.18;
    particleSeeds.push({ radius, theta, vertical, speed: 0.08 + Math.random() * 0.2 });
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: dark ? 0xa8d9fa : 0x72a8cf,
      size: dark ? 0.025 : 0.018,
      transparent: true,
      opacity: dark ? 0.82 : 0.55,
      sizeAttenuation: true,
      depthWrite: false
    })
  );
  scene.add(particles);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: dark ? 0.25 : 0.13 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.235;
  floor.receiveShadow = true;
  scene.add(floor);

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

  async function loadModel() {
    try {
      const responses = await Promise.all(MODEL_PARTS.map(async (url, index) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('GLB data part ' + (index + 1) + ' returned ' + response.status);
        }
        return response.text();
      }));

      if (disposed) return;

      const encoded = responses.join('').trim();
      const binaryString = atob(encoded);
      const compressed = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));

      if (typeof DecompressionStream === 'undefined') {
        throw new Error('This browser does not support gzip decompression.');
      }

      const decompressed = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      const glb = await new Response(decompressed).arrayBuffer();
      if (disposed) return;

      const loader = new GLTFLoader();
      loader.parse(glb, '', (result) => {
        if (disposed) return;

        model = result.scene || result.scenes[0];
        model.scale.setScalar(scale);
        model.rotation.set(baseRotation.x, baseRotation.y, 0);
        model.position.set(0, 0, 0);

        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();

          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
              if ('roughness' in material) material.roughness = 0.25;
              if ('metalness' in material) material.metalness = 0.2;
              material.needsUpdate = true;
            });
          }
        });

        scene.add(model);
        container.dataset.modelLoaded = 'true';
        container.classList.add('model-ready');
      }, (error) => {
        console.error('Google GLB parse failed:', error);
        container.classList.add('model-unavailable');
      });
    } catch (error) {
      console.error('Google GLB could not be loaded:', error);
      container.classList.add('model-unavailable');
    }
  }

  function onPointerDown(event) {
    pointerDown = true;
    pointerInside = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    if (container.setPointerCapture) container.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (pointerDown) {
      const dx = event.clientX - previousPointer.x;
      const dy = event.clientY - previousPointer.y;
      targetRotation.y += dx * 0.009;
      targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * 0.007, -0.82, 0.82);
      previousPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    pointerInside = true;
    const rect = container.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    const py = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    targetRotation.y = baseRotation.y + px * 0.13;
    targetRotation.x = baseRotation.x - py * 0.1;
  }

  function onPointerUp() { pointerDown = false; }

  function onPointerLeave() {
    pointerDown = false;
    pointerInside = false;
    targetRotation.x = baseRotation.x;
  }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('pointerleave', onPointerLeave);

  function render(now) {
    if (disposed) return;

    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (model) {
      if (autoRotate && !pointerDown) {
        targetRotation.y += delta * (pointerInside ? 0.08 : 0.24);
      }

      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.065;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.065;

      model.rotation.x = currentRotation.x + scrollProgress * 0.16;
      model.rotation.y = currentRotation.y + scrollProgress * 0.34;
      model.position.y = Math.sin(now * 0.0009) * 0.055 - scrollProgress * 0.08;
      model.position.z = Math.sin(now * 0.0007) * 0.035;
    }

    orbitGroup.rotation.y += delta * 0.055;
    orbitGroup.rotation.x = Math.sin(now * 0.00025) * 0.05;
    particles.rotation.y += delta * 0.018;

    const positions = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleSeeds.length; i += 1) {
      const seed = particleSeeds[i];
      const angle = seed.theta + now * 0.00012 * seed.speed;
      positions[i * 3] = Math.cos(angle) * seed.radius;
      positions[i * 3 + 1] = seed.vertical + Math.sin(now * 0.0007 + seed.theta) * 0.045;
      positions[i * 3 + 2] = Math.sin(angle) * seed.radius * 0.45 - 0.18;
    }
    particleGeometry.attributes.position.needsUpdate = true;

    platform.rotation.y = Math.sin(now * 0.00035) * 0.025;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }

  frame = requestAnimationFrame(render);
  loadModel();

  return {
    setScrollProgress(value) {
      scrollProgress = THREE.MathUtils.clamp(value, 0, 1);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);

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
