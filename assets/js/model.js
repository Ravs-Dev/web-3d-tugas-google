import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Load the exact Blender export committed to the repository.
const MODEL_URL = new URL('../models/google.glb', import.meta.url);

export function initModel(container, options = {}) {
  if (!container) return null;

  const {
    theme = 'light',
    autoRotate = true,
    radius = 1.26,
    cameraDistance = 5.6
  } = options;

  let disposed = false;
  let modelRoot = null;
  let frameId = 0;
  let pointerDown = false;
  let pointerInside = false;
  let previousPointer = { x: 0, y: 0 };
  let scrollProgress = 0;
  let lastTime = performance.now();

  const dark = theme === 'dark';
  const baseRotation = { x: -0.08, y: 0.52 };
  const targetRotation = { ...baseRotation };
  const currentRotation = { ...baseRotation };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, cameraDistance);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D Google G model');
  container.appendChild(renderer.domElement);
  container.classList.add('model-loading');

  // Soft studio lighting keeps the original Google colours intact.
  scene.add(new THREE.HemisphereLight(0xf7fbff, dark ? 0x142538 : 0x829db2, 1.9));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
  keyLight.position.set(4, 6, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.bias = -0.00015;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(dark ? 0x8dc9ff : 0xc7e9ff, 2.2);
  fillLight.position.set(-5, 1.5, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(dark ? 0xa2ead8 : 0xffffff, 1.65);
  rimLight.position.set(1, 3, -5);
  scene.add(rimLight);

  const frontLight = new THREE.PointLight(dark ? 0x75bfff : 0xffffff, 22, 18);
  frontLight.position.set(0, 1.2, 4);
  scene.add(frontLight);

  const objectGroup = new THREE.Group();
  scene.add(objectGroup);

  // A subtle product-display pedestal gives the model a visible ground plane.
  const pedestal = new THREE.Group();
  scene.add(pedestal);

  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: dark ? 0x28455d : 0xc6d9e8,
    metalness: 0.68,
    roughness: 0.3
  });
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.08, 1.18, 0.105, 96),
    pedestalMaterial
  );
  base.position.y = -radius - 0.12;
  base.castShadow = true;
  base.receiveShadow = true;
  pedestal.add(base);

  const baseTrim = new THREE.Mesh(
    new THREE.TorusGeometry(1.09, 0.013, 10, 120),
    new THREE.MeshBasicMaterial({
      color: dark ? 0x89d2f3 : 0x63a9d6,
      transparent: true,
      opacity: 0.8
    })
  );
  baseTrim.rotation.x = Math.PI / 2;
  baseTrim.position.y = -radius - 0.065;
  pedestal.add(baseTrim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.ShadowMaterial({ opacity: dark ? 0.23 : 0.14 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -radius - 0.175;
  floor.receiveShadow = true;
  scene.add(floor);

  // Thin orbit rings and floating particles are rendered in Three.js,
  // so they share perspective and depth with the actual GLB.
  const orbit = new THREE.Group();
  scene.add(orbit);

  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(1.72, 0.006, 8, 180),
    new THREE.MeshBasicMaterial({
      color: dark ? 0x8bcaf0 : 0x78afd8,
      transparent: true,
      opacity: dark ? 0.5 : 0.4,
      depthWrite: false
    })
  );
  ringA.rotation.set(0.38, -0.35, 0.2);
  orbit.add(ringA);

  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(1.9, 0.004, 8, 180),
    new THREE.MeshBasicMaterial({
      color: dark ? 0x9ce8d5 : 0x8bcfbd,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
  );
  ringB.rotation.set(-0.58, 0.4, -0.24);
  orbit.add(ringB);

  const particleCount = dark ? 170 : 120;
  const particleData = [];
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const distance = 1.75 + Math.random() * 0.9;
    const y = (Math.random() - 0.5) * 3.3;
    particleData.push({ theta, distance, y, speed: 0.1 + Math.random() * 0.22 });
    particlePositions[i * 3] = Math.cos(theta) * distance;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = Math.sin(theta) * distance * 0.42;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particlePoints = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: dark ? 0xc1e5ff : 0x7daecc,
      size: dark ? 0.024 : 0.018,
      transparent: true,
      opacity: dark ? 0.82 : 0.58,
      depthWrite: false
    })
  );
  scene.add(particlePoints);

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

  function showError(error) {
    console.error('Unable to load assets/models/google.glb:', error);
    container.classList.remove('model-loading');
    container.classList.add('model-error');
    container.dataset.modelError = 'true';
  }

  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL.href,
    (gltf) => {
      if (disposed) return;

      const source = gltf.scene || gltf.scenes[0];
      source.updateMatrixWorld(true);

      // Centre and fit the actual Blender export. This handles its exported
      // root translation, rotation and 150x object scale without deleting them.
      const bounds = new THREE.Box3().setFromObject(source);
      if (bounds.isEmpty()) {
        showError(new Error('The GLB contains no visible mesh geometry.'));
        return;
      }

      const centre = bounds.getCenter(new THREE.Vector3());
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      const fitScale = radius / Math.max(sphere.radius, 0.001);

      const fittedRoot = new THREE.Group();
      fittedRoot.add(source);
      // Offset the wrapper in its own parent space. Do not rewrite the
      // Blender root transform: it contains the model's real orientation/scale.
      fittedRoot.position.copy(centre).multiplyScalar(-fitScale);
      fittedRoot.scale.setScalar(fitScale);
      modelRoot = fittedRoot;
      objectGroup.add(modelRoot);

      source.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.geometry && !child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if ('roughness' in material) material.roughness = 0.28;
          if ('metalness' in material) material.metalness = 0.08;
          material.needsUpdate = true;
        });
      });

      // Fit camera to the visible object and stage, rather than assuming
      // that Blender exported the model around the origin at unit scale.
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const distanceForModel = (radius + 0.18) / Math.sin(verticalFov / 2);
      camera.position.z = Math.max(cameraDistance, distanceForModel * 0.92);
      camera.lookAt(0, -0.08, 0);
      container.classList.remove('model-loading', 'model-error');
      container.classList.add('model-ready');
      container.dataset.modelLoaded = 'true';
    },
    (event) => {
      if (event.total > 0) {
        container.dataset.modelProgress = String(Math.round((event.loaded / event.total) * 100));
      }
    },
    showError
  );

  function onPointerDown(event) {
    if (!modelRoot) return;
    pointerDown = true;
    pointerInside = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    container.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    const py = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;

    if (pointerDown) {
      const dx = event.clientX - previousPointer.x;
      const dy = event.clientY - previousPointer.y;
      targetRotation.y += dx * 0.009;
      targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * 0.007, -0.75, 0.75);
      previousPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    pointerInside = true;
    targetRotation.y = baseRotation.y + px * 0.16;
    targetRotation.x = baseRotation.x - py * 0.11;
  }

  function onPointerUp() { pointerDown = false; }

  function onPointerLeave() {
    pointerDown = false;
    pointerInside = false;
    targetRotation.x = baseRotation.x;
    targetRotation.y = currentRotation.y;
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

    if (modelRoot) {
      if (autoRotate && !pointerDown) {
        targetRotation.y += delta * (pointerInside ? 0.07 : 0.23);
      }
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.06;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.06;

      // Scroll choreography: model transform changes continuously across
      // the pinned story, with a distinct camera/scale beat at each chapter.
      const wave = Math.sin(scrollProgress * Math.PI);
      const turn = scrollProgress * Math.PI * 4;
      const sideShift = Math.sin(scrollProgress * Math.PI * 2) * 0.48;
      const depthBeat = Math.sin(scrollProgress * Math.PI * 2);
      const scaleBeat = 1 + wave * 0.13 + Math.sin(scrollProgress * Math.PI * 4) * 0.035;

      modelRoot.rotation.x = currentRotation.x + scrollProgress * Math.PI * 0.58;
      modelRoot.rotation.y = currentRotation.y + turn;
      modelRoot.rotation.z = Math.sin(scrollProgress * Math.PI * 2) * 0.11;
      modelRoot.position.x = sideShift;
      modelRoot.position.y = Math.sin(now * 0.00085) * 0.04 + Math.sin(scrollProgress * Math.PI * 2) * 0.12;
      modelRoot.position.z = depthBeat * 0.12;
      modelRoot.scale.setScalar(scaleBeat);

      // The camera eases closer and then opens the full object back up.
      camera.position.z = cameraDistance - wave * 0.62 + Math.sin(scrollProgress * Math.PI * 4) * 0.12;
      camera.position.x = Math.sin(scrollProgress * Math.PI * 2) * 0.18;
      camera.lookAt(0, -0.06 + Math.sin(scrollProgress * Math.PI * 2) * 0.06, 0);

      frontLight.intensity = (dark ? 22 : 22) + wave * 16;
      fillLight.intensity = 2.2 + (1 - wave) * 0.8;
      ringA.rotation.y = 0.38 + scrollProgress * Math.PI * 2;
      ringB.rotation.x = -0.58 - scrollProgress * Math.PI * 1.5;
    }

    orbit.rotation.y += delta * 0.055;
    orbit.rotation.x = Math.sin(now * 0.0002) * 0.045;
    particlePoints.rotation.y += delta * 0.018;

    const positions = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleData.length; i += 1) {
      const particle = particleData[i];
      const angle = particle.theta + now * 0.00012 * particle.speed;
      positions[i * 3] = Math.cos(angle) * particle.distance;
      positions[i * 3 + 1] = particle.y + Math.sin(now * 0.0007 + particle.theta) * 0.04;
      positions[i * 3 + 2] = Math.sin(angle) * particle.distance * 0.42;
    }
    particleGeometry.attributes.position.needsUpdate = true;
    pedestal.rotation.y = Math.sin(now * 0.00032) * 0.025;

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  frameId = requestAnimationFrame(render);

  return {
    setScrollProgress(value) {
      scrollProgress = THREE.MathUtils.clamp(value, 0, 1);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
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
