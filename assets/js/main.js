import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const $ = (selector) => document.querySelector(selector);
const canvasMount = $('#canvasMount');
const viewport = $('#viewport');
const toastElement = $('#toast');
const objectTab = $('#objectTab');
const materialTab = $('#materialTab');

let toastTimer;
function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 2400);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e8f0f5');
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
camera.position.set(5.4, 4.3, 7.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'Interactive 3D viewport');
canvasMount.appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.07;
orbit.target.set(0, 0.7, 0);
orbit.minDistance = 2;
orbit.maxDistance = 35;

scene.add(new THREE.HemisphereLight(0xddefff, 0x8a9baf, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
keyLight.position.set(4, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8bc9e8, 1.2);
fillLight.position.set(-5, 3, -4);
scene.add(fillLight);

const grid = new THREE.GridHelper(20, 40, 0xb1c4d1, 0xd0dbe2);
grid.position.y = -0.015;
scene.add(grid);
const axes = new THREE.AxesHelper(2.4);
axes.position.y = 0.01;
scene.add(axes);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.09 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.025;
floor.receiveShadow = true;
scene.add(floor);

const assetRoot = new THREE.Group();
assetRoot.name = 'Scene Assets';
scene.add(assetRoot);
let selected = null;
let wireframe = false;
let autoRotate = false;
let isPlaying = false;
let currentTime = 0;
let lastFrame = performance.now();
let frameCounter = 0;
let fpsStamp = performance.now();
let mixer = null;
const keyframes = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const loader = new GLTFLoader();
const exporter = new GLTFExporter();
const transform = new TransformControls(camera, renderer.domElement);
scene.add(transform.getHelper());
transform.setMode('translate');
transform.addEventListener('dragging-changed', (event) => { orbit.enabled = !event.value; });
transform.addEventListener('objectChange', () => updateInspectorValues());
transform.addEventListener('change', () => { if (selected) updateInspectorValues(); });

function makeMaterial(color, metalness = 0.22, roughness = 0.3) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, roughness: roughness, wireframe });
}
function makeDemo() {
  const group = new THREE.Group();
  group.name = 'Orbit Sculpture';
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.83, 2), makeMaterial('#71b8d9', 0.42, 0.23));
  core.name = 'Core';
  core.castShadow = true;
  group.add(core);

  const ringMaterial = new THREE.MeshStandardMaterial({ color: '#9de2d5', metalness: 0.62, roughness: 0.2 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.045, 16, 120), ringMaterial);
  ring.name = 'Orbit ring';
  ring.rotation.x = Math.PI * 0.38;
  ring.rotation.y = -Math.PI * 0.12;
  ring.castShadow = true;
  group.add(ring);

  const small = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), makeMaterial('#c1b3f3', 0.3, 0.2));
  small.name = 'Satellite';
  small.position.set(1.15, 0.38, 0.3);
  small.castShadow = true;
  group.add(small);

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), makeMaterial('#efb58e', 0.2, 0.26));
  bead.name = 'Accent';
  bead.position.set(-0.92, -0.5, 0.28);
  bead.castShadow = true;
  group.add(bead);
  group.position.y = 1.15;
  return group;
}

function addPrimitive(type) {
  let geometry;
  let name;
  if (type === 'box') { geometry = new THREE.BoxGeometry(1.35, 1.35, 1.35); name = 'Cube'; }
  else if (type === 'sphere') { geometry = new THREE.SphereGeometry(0.8, 48, 32); name = 'Sphere'; }
  else if (type === 'torus') { geometry = new THREE.TorusKnotGeometry(0.62, 0.2, 120, 18); name = 'Torus knot'; }
  else { geometry = new THREE.CylinderGeometry(0.62, 0.62, 1.5, 48); name = 'Cylinder'; }
  const material = makeMaterial('#75b9d8');
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name + ' ' + (assetRoot.children.length + 1);
  mesh.position.y = 0.8;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  assetRoot.add(mesh);
  selectObject(mesh);
  renderSceneTree();
  toast(name + ' added to scene');
}

function selectObject(object) {
  selected = object || null;
  if (selected) {
    transform.attach(selected);
    $('#floatingHint').textContent = selected.name;
  } else {
    transform.detach();
    $('#floatingHint').textContent = 'Select an object to inspect it';
  }
  renderSceneTree();
  renderInspector();
}

function renderSceneTree() {
  const tree = $('#sceneTree');
  tree.innerHTML = '';
  const rootRow = document.createElement('div');
  rootRow.className = 'tree-row';
  rootRow.innerHTML = '<span class="tree-chevron">⌄</span><span class="tree-icon">◫</span><span class="tree-name">Scene Assets</span><span class="tree-kind">ROOT</span>';
  tree.appendChild(rootRow);
  assetRoot.children.forEach((object) => {
    const row = document.createElement('div');
    row.className = 'tree-row' + (object === selected ? ' active' : '');
    row.innerHTML = '<span class="tree-chevron">·</span><span class="tree-icon">◇</span><span class="tree-name"></span><span class="tree-kind">3D</span>';
    row.querySelector('.tree-name').textContent = object.name || 'Object';
    row.addEventListener('click', () => selectObject(object));
    tree.appendChild(row);
  });
  $('#objectCount').textContent = assetRoot.children.length + (assetRoot.children.length === 1 ? ' object' : ' objects');
}

function axisInput(label, key, value, kind) {
  return '<div class="axis-field"><label>' + label + '</label><input class="number-input" type="number" step="0.1" data-kind="' + kind + '" data-axis="' + key + '" value="' + Number(value).toFixed(2) + '"></div>';
}

function renderInspector() {
  if (!selected) {
    objectTab.innerHTML = '<div class="empty-inspector">Select an object in the scene to edit its position, rotation and scale.</div>';
    materialTab.innerHTML = '<div class="empty-inspector">Select an object to view its material settings.</div>';
    return;
  }
  objectTab.innerHTML =
    '<section class="field-section"><div class="field-section-title">OBJECT NAME <span>✎</span></div><input class="object-name-input" id="objectNameInput" value=""></section>' +
    '<section class="field-section"><div class="field-section-title">POSITION <button data-reset="position">↺</button></div><div class="axis-fields">' +
    axisInput('X', 'x', selected.position.x, 'position') + axisInput('Y', 'y', selected.position.y, 'position') + axisInput('Z', 'z', selected.position.z, 'position') + '</div></section>' +
    '<section class="field-section"><div class="field-section-title">ROTATION <button data-reset="rotation">↺</button></div><div class="axis-fields">' +
    axisInput('X', 'x', THREE.MathUtils.radToDeg(selected.rotation.x), 'rotation') + axisInput('Y', 'y', THREE.MathUtils.radToDeg(selected.rotation.y), 'rotation') + axisInput('Z', 'z', THREE.MathUtils.radToDeg(selected.rotation.z), 'rotation') + '</div></section>' +
    '<section class="field-section"><div class="field-section-title">SCALE <button data-reset="scale">↺</button></div><div class="axis-fields">' +
    axisInput('X', 'x', selected.scale.x, 'scale') + axisInput('Y', 'y', selected.scale.y, 'scale') + axisInput('Z', 'z', selected.scale.z, 'scale') + '</div></section>' +
    '<div class="action-row"><button class="secondary-action" id="duplicateButton">Duplicate</button><button class="secondary-action" id="deleteButton">Delete object</button></div>';

  $('#objectNameInput').addEventListener('input', (event) => {
    selected.name = event.target.value || 'Object';
    renderSceneTree();
    $('#floatingHint').textContent = selected.name;
  });
  objectTab.querySelectorAll('[data-kind]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!selected) return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      const kind = input.dataset.kind;
      const axis = input.dataset.axis;
      selected[kind][axis] = kind === 'rotation' ? THREE.MathUtils.degToRad(value) : value;
      transform.updateMatrixWorld();
    });
  });
  objectTab.querySelectorAll('[data-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.reset;
      if (kind === 'position') selected.position.set(0, kind === 'position' ? 0 : selected.position.y, 0);
      if (kind === 'rotation') selected.rotation.set(0, 0, 0);
      if (kind === 'scale') selected.scale.set(1, 1, 1);
      renderInspector();
    });
  });
  $('#duplicateButton').addEventListener('click', duplicateSelected);
  $('#deleteButton').addEventListener('click', deleteSelected);
  renderMaterialTab();
}

function updateInspectorValues() {
  if (!selected) return;
  const values = {
    position: selected.position,
    rotation: { x: THREE.MathUtils.radToDeg(selected.rotation.x), y: THREE.MathUtils.radToDeg(selected.rotation.y), z: THREE.MathUtils.radToDeg(selected.rotation.z) },
    scale: selected.scale
  };
  objectTab.querySelectorAll('[data-kind]').forEach((input) => {
    const value = values[input.dataset.kind][input.dataset.axis];
    if (document.activeElement !== input) input.value = Number(value).toFixed(2);
  });
}

function renderMaterialTab() {
  if (!selected) return;
  const material = firstMaterial(selected);
  if (!material || !material.color) {
    materialTab.innerHTML = '<div class="empty-inspector">This model does not expose a standard editable material.</div>';
    return;
  }
  const color = '#' + material.color.getHexString();
  materialTab.innerHTML =
    '<div class="material-preview"><div class="material-ball" id="materialBall"></div></div>' +
    '<div class="field-section"><div class="field-section-title">SURFACE</div>' +
    '<div class="color-row"><span>Base color</span><input class="color-input" id="materialColor" type="color" value="' + color + '"></div>' +
    '<div class="color-row"><span>Metalness</span><strong id="metalValue">' + (material.metalness || 0).toFixed(2) + '</strong></div><input class="range-input" id="metalnessInput" type="range" min="0" max="1" step="0.01" value="' + (material.metalness || 0) + '">' +
    '<div class="color-row"><span>Roughness</span><strong id="roughValue">' + (material.roughness || 0).toFixed(2) + '</strong></div><input class="range-input" id="roughnessInput" type="range" min="0" max="1" step="0.01" value="' + (material.roughness || 0.3) + '"></div>' +
    '<div class="action-row"><button class="secondary-action" id="wireMaterialButton">Toggle wireframe</button></div>';
  $('#materialColor').addEventListener('input', (event) => {
    eachMaterial(selected, (item) => { if (item.color) item.color.set(event.target.value); });
    $('#materialBall').style.background = 'radial-gradient(circle at 30% 25%, #ffffff, ' + event.target.value + ' 55%, #526fc1)';
  });
  $('#metalnessInput').addEventListener('input', (event) => {
    eachMaterial(selected, (item) => { if ('metalness' in item) item.metalness = Number(event.target.value); });
    $('#metalValue').textContent = Number(event.target.value).toFixed(2);
  });
  $('#roughnessInput').addEventListener('input', (event) => {
    eachMaterial(selected, (item) => { if ('roughness' in item) item.roughness = Number(event.target.value); });
    $('#roughValue').textContent = Number(event.target.value).toFixed(2);
  });
  $('#wireMaterialButton').addEventListener('click', toggleWireframe);
}

function firstMaterial(object) {
  let result = null;
  object.traverse((child) => { if (!result && child.isMesh) result = Array.isArray(child.material) ? child.material[0] : child.material; });
  return result;
}
function eachMaterial(object, callback) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(callback);
  });
}

function duplicateSelected() {
  if (!selected) return;
  const copy = selected.clone(true);
  copy.name = selected.name + ' copy';
  copy.position.x += 1.1;
  assetRoot.add(copy);
  selectObject(copy);
  toast('Object duplicated');
}
function deleteSelected() {
  if (!selected) return;
  const old = selected;
  transform.detach();
  assetRoot.remove(old);
  disposeObject(old);
  selected = null;
  renderSceneTree();
  renderInspector();
  $('#floatingHint').textContent = 'Select an object to inspect it';
  toast('Object removed');
}
function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function frameSelected() {
  if (!selected) return;
  const bounds = new THREE.Box3().setFromObject(selected);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.8);
  orbit.target.copy(sphere.center);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.12;
  const direction = new THREE.Vector3().subVectors(camera.position, orbit.target).normalize();
  camera.position.copy(orbit.target).add(direction.multiplyScalar(distance));
  camera.near = Math.max(0.01, distance / 100);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  orbit.update();
}
function resetCamera() {
  camera.position.set(5.4, 4.3, 7.4);
  orbit.target.set(0, 0.7, 0);
  camera.near = 0.1;
  camera.far = 300;
  camera.updateProjectionMatrix();
  orbit.update();
}

function setTransformMode(mode) {
  transform.setMode(mode);
  document.querySelectorAll('[data-tool]').forEach((button) => button.classList.toggle('active', button.dataset.tool === mode));
}
document.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => setTransformMode(button.dataset.tool)));

function toggleWireframe() {
  wireframe = !wireframe;
  assetRoot.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => { if ('wireframe' in material) material.wireframe = wireframe; });
  });
  $('#wireButton').classList.toggle('active', wireframe);
}
$('#gridButton').addEventListener('click', () => {
  grid.visible = !grid.visible;
  $('#gridButton').classList.toggle('active', grid.visible);
});
$('#axesButton').addEventListener('click', () => {
  axes.visible = !axes.visible;
  $('#axesButton').classList.toggle('active', axes.visible);
});
$('#wireButton').addEventListener('click', toggleWireframe);
$('#frameButton').addEventListener('click', frameSelected);
$('#resetViewButton').addEventListener('click', resetCamera);
$('#resetObjectButton').addEventListener('click', () => {
  if (!selected) return;
  selected.position.set(0, 0, 0);
  selected.rotation.set(0, 0, 0);
  selected.scale.set(1, 1, 1);
  renderInspector();
  toast('Transform reset');
});

const modelInput = $('#modelInput');
function openImport() { modelInput.click(); }
$('#importButton').addEventListener('click', openImport);
$('#assetDropCard').addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  openImport();
});
modelInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (file) importModel(file);
  modelInput.value = '';
});
async function importModel(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (!['glb', 'gltf'].includes(extension)) { toast('Please choose a .glb or .gltf file'); return; }
  try {
    toast('Loading ' + file.name + '…');
    const buffer = await file.arrayBuffer();
    loader.parse(buffer, '', (gltf) => {
      while (assetRoot.children.length) {
        const child = assetRoot.children[0];
        assetRoot.remove(child);
      }
      const model = gltf.scene || gltf.scenes[0];
      model.name = file.name.replace(/\.(glb|gltf)$/i, '');
      model.traverse((child) => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      assetRoot.add(model);
      mixer = gltf.animations && gltf.animations.length ? new THREE.AnimationMixer(model) : null;
      if (mixer && gltf.animations.length) {
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        mixer.timeScale = 0;
      }
      selectObject(model);
      frameSelected();
      renderSceneTree();
      toast('Imported ' + file.name);
    }, (error) => {
      console.error(error);
      toast('Could not read this model. Check that the GLB is valid.');
    });
  } catch (error) {
    console.error(error);
    toast('Import failed: ' + error.message);
  }
}

const dragOverlay = $('#dropOverlay');
let dragDepth = 0;
viewport.addEventListener('dragenter', (event) => {
  event.preventDefault(); dragDepth += 1; dragOverlay.classList.add('visible');
});
viewport.addEventListener('dragover', (event) => event.preventDefault());
viewport.addEventListener('dragleave', (event) => {
  event.preventDefault(); dragDepth -= 1;
  if (dragDepth <= 0) { dragDepth = 0; dragOverlay.classList.remove('visible'); }
});
viewport.addEventListener('drop', (event) => {
  event.preventDefault(); dragDepth = 0; dragOverlay.classList.remove('visible');
  const file = event.dataTransfer && event.dataTransfer.files[0];
  if (file) importModel(file);
});

function updateTimelineUI() {
  $('#timelineScrubber').value = currentTime;
  $('#playhead').style.left = (currentTime / 10 * 100) + '%';
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;
  $('#timeReadout').textContent = String(minutes).padStart(2, '0') + ':' + seconds.toFixed(2).padStart(5, '0');
  $('#keyCount').textContent = keyframes.length + (keyframes.length === 1 ? ' KEYFRAME' : ' KEYFRAMES');
  const markers = $('#keyframeMarkers');
  markers.innerHTML = '';
  keyframes.forEach((frame) => {
    const marker = document.createElement('span');
    marker.className = 'key-marker';
    marker.style.left = (frame.time / 10 * 100) + '%';
    markers.appendChild(marker);
  });
}
function captureKeyframe() {
  if (!selected) { toast('Select an object before adding a keyframe'); return; }
  const existing = keyframes.findIndex((frame) => Math.abs(frame.time - currentTime) < 0.03);
  const frame = {
    time: currentTime,
    position: selected.position.toArray(),
    rotation: selected.rotation.toArray(),
    scale: selected.scale.toArray()
  };
  if (existing >= 0) keyframes[existing] = frame;
  else keyframes.push(frame);
  keyframes.sort((a, b) => a.time - b.time);
  updateTimelineUI();
  toast('Keyframe added at ' + currentTime.toFixed(2) + 's');
}
function applyTimelineTime(time) {
  if (!selected || keyframes.length === 0) return;
  const frames = keyframes.slice().sort((a, b) => a.time - b.time);
  let left = frames[0], right = frames[frames.length - 1];
  if (time <= left.time) right = left;
  else if (time >= right.time) left = right;
  else {
    for (let i = 0; i < frames.length - 1; i += 1) {
      if (time >= frames[i].time && time <= frames[i + 1].time) { left = frames[i]; right = frames[i + 1]; break; }
    }
  }
  const span = right.time - left.time;
  const alpha = span <= 0 ? 0 : THREE.MathUtils.clamp((time - left.time) / span, 0, 1);
  const eased = alpha * alpha * (3 - 2 * alpha);
  ['position', 'rotation', 'scale'].forEach((kind) => {
    const a = left[kind], b = right[kind];
    selected[kind].set(
      THREE.MathUtils.lerp(a[0], b[0], eased),
      THREE.MathUtils.lerp(a[1], b[1], eased),
      THREE.MathUtils.lerp(a[2], b[2], eased)
    );
  });
  updateInspectorValues();
}
function setTime(value) {
  currentTime = THREE.MathUtils.clamp(Number(value), 0, 10);
  applyTimelineTime(currentTime);
  updateTimelineUI();
}
function togglePlayback() {
  isPlaying = !isPlaying;
  $('#playButton').textContent = isPlaying ? 'Ⅱ' : '▶';
  $('#playButton').title = isPlaying ? 'Pause animation' : 'Play animation';
  if (isPlaying && mixer) mixer.timeScale = 1;
  if (!isPlaying && mixer) mixer.timeScale = 0;
}
$('#addKeyButton').addEventListener('click', captureKeyframe);
$('#playButton').addEventListener('click', togglePlayback);
$('#timelineScrubber').addEventListener('input', (event) => setTime(event.target.value));
$('#goStartButton').addEventListener('click', () => { setTime(0); });
$('#goEndButton').addEventListener('click', () => { setTime(10); });

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((tab) => tab.classList.toggle('active', tab === button));
    objectTab.classList.toggle('hidden', button.dataset.tab !== 'object');
    materialTab.classList.toggle('hidden', button.dataset.tab !== 'material');
  });
});

$('#addMenuButton').addEventListener('click', () => {
  const options = ['box', 'sphere', 'torus', 'cylinder'];
  const choice = window.prompt('Add object: box, sphere, torus, or cylinder', 'box');
  if (choice && options.includes(choice.trim().toLowerCase())) addPrimitive(choice.trim().toLowerCase());
  else if (choice) toast('Choose box, sphere, torus or cylinder');
});
$('#saveButton').addEventListener('click', () => {
  const state = {
    name: 'Untitled scene',
    objects: assetRoot.children.map((object) => ({
      name: object.name,
      position: object.position.toArray(),
      rotation: object.rotation.toArray(),
      scale: object.scale.toArray()
    })),
    keyframes: keyframes
  };
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'form-scene-settings.json');
  toast('Scene settings downloaded');
});
$('#exportButton').addEventListener('click', () => {
  if (!assetRoot.children.length) { toast('There is no model to export'); return; }
  exporter.parse(assetRoot, (result) => {
    const blob = new Blob([result], { type: 'model/gltf-binary' });
    downloadBlob(blob, 'form-scene.glb');
    toast('GLB export complete');
  }, (error) => {
    console.error(error);
    toast('GLB export failed');
  }, { binary: true, onlyVisible: true });
});
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (transform.dragging) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(assetRoot.children, true);
  if (!hits.length) return;
  let root = hits[0].object;
  while (root.parent && root.parent !== assetRoot) root = root.parent;
  if (root.parent === assetRoot) selectObject(root);
});

function resize() {
  const width = Math.max(1, canvasMount.clientWidth);
  const height = Math.max(1, canvasMount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvasMount);
window.addEventListener('resize', resize);
resize();

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  orbit.update();
  if (isPlaying) {
    currentTime += delta;
    if (currentTime > 10) currentTime = 0;
    applyTimelineTime(currentTime);
    updateTimelineUI();
    if (mixer) mixer.update(delta);
  } else if (autoRotate && selected) {
    selected.rotation.y += delta * 0.45;
    updateInspectorValues();
  }
  renderer.render(scene, camera);
  frameCounter += 1;
  if (now - fpsStamp >= 1000) {
    $('#renderStats').innerHTML = frameCounter + ' FPS <span>•</span> REALTIME';
    frameCounter = 0;
    fpsStamp = now;
  }
}
requestAnimationFrame(animate);

function setupKeyboard() {
  window.addEventListener('keydown', (event) => {
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
    if (event.code === 'Space') { event.preventDefault(); togglePlayback(); }
    if (event.key.toLowerCase() === 'w') setTransformMode('translate');
    if (event.key.toLowerCase() === 'e') setTransformMode('rotate');
    if (event.key.toLowerCase() === 'r') setTransformMode('scale');
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected) deleteSelected();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected(); }
  });
}
setupKeyboard();

const demo = makeDemo();
assetRoot.add(demo);
selectObject(demo);
renderSceneTree();
updateTimelineUI();

// The supplied Blender model is stored as gzip-compressed GLB to keep the
// repository lightweight. It is decompressed in-browser before GLTFLoader parses it.
async function loadDefaultModel() {
  try {
    const parts = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        fetch('./assets/models/google-part-' + String(index + 1).padStart(2, '0') + '.txt')
          .then((response) => {
            if (!response.ok) throw new Error('Model part ' + (index + 1) + ' returned ' + response.status);
            return response.text();
          })
      )
    );
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser does not support gzip decompression streams.');
    }
    const compressedBase64 = parts.join('').trim();
    const binaryString = atob(compressedBase64);
    const compressed = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const glbBuffer = await new Response(stream).arrayBuffer();
    loader.parse(glbBuffer, '', (gltf) => {
      while (assetRoot.children.length) {
        const child = assetRoot.children[0];
        assetRoot.remove(child);
        disposeObject(child);
      }
      const model = gltf.scene || gltf.scenes[0];
      model.name = 'Google G';
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => { material.needsUpdate = true; });
          }
        }
      });
      assetRoot.add(model);
      selectObject(model);
      frameSelected();
      renderSceneTree();
      toast('Your Google 3D model is ready');
    }, (error) => {
      console.error('Default GLB parse error:', error);
      toast('The supplied model could not be loaded');
    });
  } catch (error) {
    console.error('Default GLB load error:', error);
    toast('Could not load the supplied model: ' + error.message);
  }
}
loadDefaultModel();
