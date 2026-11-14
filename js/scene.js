/* scene.js: three.js scene, model loading, controls, render loop */
(() => {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = $('#scene');
  const status = $('#status');

  /* renderer & scene */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    status.textContent = 'Browser ini belum mendukung WebGL.';
    document.documentElement.classList.remove('pre');
    console.error(err);
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe6f5, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(3, 5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  scene.add(key);

  const COLORS = [0x4285F4, 0xEA4335, 0xFBBC05, 0x34A853];
  const orbit = COLORS.map((hex, i) => {
    const l = new THREE.PointLight(hex, 0.5, 8, 2);
    scene.add(l);
    return { l, a: i * Math.PI / 2 };
  });

  const sc = document.createElement('canvas');
  sc.width = sc.height = 256;
  const sx = sc.getContext('2d');
  const grad = sx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(20,23,31,0.30)');
  grad.addColorStop(0.5, 'rgba(20,23,31,0.12)');
  grad.addColorStop(1, 'rgba(20,23,31,0)');
  sx.fillStyle = grad;
  sx.fillRect(0, 0, 256, 256);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.scale.set(3.2, 2.0, 1);
  scene.add(ground);

  const pivot = new THREE.Group();
  const holder = new THREE.Group();
  pivot.add(holder);
  scene.add(pivot);

  /* responsive layout */
  const L = { x: 1, y: 0 };
  let baseZ = 6.6;
  const cam = { zoom: 1, zt: 1 };
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.05;
    baseZ = wide ? 6.6 : 10;
    camera.updateProjectionMatrix();
    L.x = wide ? 0.65 : 0;
    L.y = wide ? 0 : 0.1;
  }
  addEventListener('resize', resize);
  resize();

  /* state */
  const state = { s: 0, ry: -Math.PI * 2, ex: 0 };
  const rot = { yaw: 0, pitch: 0 }, goal = { yaw: 0, pitch: 0 };
  const ptr = { x: 0, y: 0 }, pSm = { x: 0, y: 0 };
  let auto = !reduce, drag = null, wire = false, exploded = false, loaded = false;
  const parts = {};

  $('#btnSpin').setAttribute('aria-pressed', String(auto));

  /* decode base64 GLB */
  const bin = atob(GLB_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  function onLoad(gltf) {
    const model = gltf.scene;

    /* fit & center, measured before the model joins the rig */
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const fit = 2.2 / Math.max(size.x, size.y, size.z);

    holder.add(model);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.scale.setScalar(fit);
    holder.position.copy(center).multiplyScalar(-fit);
    holder.updateMatrixWorld(true);
    ground.position.y = -(size.y * fit) / 2 - 0.15;

    /* collect the four colored parts and precompute explode directions */
    model.traverse(o => {
      const m = /^GoogleG_(Blue|Red|Yellow|Green)$/.exec(o.name);
      if (m) parts[m[1]] = o;
    });
    const worldCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    Object.values(parts).forEach(p => {
      const wc = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());
      const dir = wc.clone().sub(worldCenter).normalize();
      const a = p.parent.worldToLocal(wc.clone());
      const b = p.parent.worldToLocal(wc.clone().addScaledVector(dir, 1));
      p.userData = { origin: p.position.clone(), s0: p.scale.clone(), disp: b.sub(a) };
    });

    loaded = true;
    status.classList.add('done');
    buildIntro();
  }

  new THREE.GLTFLoader().parse(bytes.buffer, '', onLoad, err => {
    status.textContent = 'Model gagal dimuat.';
    document.documentElement.classList.remove('pre');
    console.error(err);
  });

  /* one orchestrated entrance */
  function buildIntro() {
    document.documentElement.classList.remove('pre');
    anime.timeline({ easing: 'easeOutExpo' })
      .add({ targets: state, s: [0, 1], ry: [-Math.PI * 2, 0], duration: reduce ? 1 : 2200, easing: 'easeOutElastic(1, .6)' })
      .add({ targets: '.line > span', translateY: ['110%', 0], delay: anime.stagger(140), duration: 1100 }, reduce ? 0 : 500)
      .add({ targets: '.reveal', opacity: [0, 1], translateY: [18, 0], delay: anime.stagger(110), duration: 900 }, reduce ? 0 : 900);
  }

  /* explode: anime.js tween on a single value, applied to each part */
  function place() {
    Object.values(parts).forEach(p => {
      p.position.copy(p.userData.origin).addScaledVector(p.userData.disp, state.ex * 0.28);
    });
  }
  const btnEx = $('#btnExplode');
  btnEx.addEventListener('click', () => {
    if (!loaded) return;
    exploded = !exploded;
    btnEx.setAttribute('aria-pressed', String(exploded));
    btnEx.textContent = exploded ? 'Satukan' : 'Pisahkan';
    anime({ targets: state, ex: exploded ? 1 : 0, duration: 1100, easing: 'easeInOutCubic', update: place });
  });

  /* click a color chip to pop that part */
  document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
    const p = parts[btn.dataset.part];
    if (!p || !p.userData.s0) return;
    const s0 = p.userData.s0, s = p.scale;
    anime({
      targets: s,
      x: [s0.x * 1.18, s0.x], y: [s0.y * 1.18, s0.y], z: [s0.z * 1.18, s0.z],
      duration: 1000, easing: 'easeOutElastic(1, .45)'
    });
  }));

  $('#btnWire').addEventListener('click', e => {
    wire = !wire;
    e.currentTarget.setAttribute('aria-pressed', String(wire));
    holder.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => { m.wireframe = wire; }); });
  });

  $('#btnSpin').addEventListener('click', e => {
    auto = !auto;
    e.currentTarget.setAttribute('aria-pressed', String(auto));
  });

  $('#btnReset').addEventListener('click', () => {
    goal.yaw = Math.round(rot.yaw / (Math.PI * 2)) * Math.PI * 2;
    goal.pitch = 0;
    cam.zt = 1;
    if (exploded) btnEx.click();
  });

  /* drag to rotate, hover to tilt */
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.classList.add('grabbing');
    canvas.setPointerCapture(e.pointerId);
  });
  addEventListener('pointermove', e => {
    ptr.x = e.clientX / innerWidth * 2 - 1;
    ptr.y = e.clientY / innerHeight * 2 - 1;
    if (drag) {
      goal.yaw += (e.clientX - drag.x) * 0.008;
      goal.pitch = Math.max(-0.9, Math.min(0.9, goal.pitch + (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
    }
  });
  const release = () => { drag = null; canvas.classList.remove('grabbing'); };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  /* zoom & keyboard (only while the hero is on screen) */
  addEventListener('keydown', e => {
    if (scrollY > innerHeight * 0.5) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft') goal.yaw -= 0.25;
    else if (k === 'arrowright') goal.yaw += 0.25;
    else if (k === 'e') btnEx.click();
    else if (k === 'w') $('#btnWire').click();
    else if (k === '+' || k === '=') cam.zt = Math.max(0.55, cam.zt - 0.1);
    else if (k === '-') cam.zt = Math.min(1.6, cam.zt + 0.1);
  });

  /* loop */
  const clock = new THREE.Clock();
  function frame() {
    if (scrollY > innerHeight * 1.2) { requestAnimationFrame(frame); return; }
    const t = clock.getElapsedTime();
    if (auto && !drag) goal.yaw += 0.005;
    rot.yaw += (goal.yaw - rot.yaw) * 0.09;
    rot.pitch += (goal.pitch - rot.pitch) * 0.09;
    pSm.x += (ptr.x - pSm.x) * 0.05;
    pSm.y += (ptr.y - pSm.y) * 0.05;

    pivot.rotation.set(rot.pitch + pSm.y * 0.15, rot.yaw + state.ry + pSm.x * 0.25, 0);
    const k = loaded ? Math.max(state.s, 0.0001) : 1;
    pivot.scale.set(k, k, k);
    pivot.position.x += (L.x - pivot.position.x) * 0.08;
    pivot.position.y = L.y + Math.sin(t * 1.2) * 0.06 * state.s;
    ground.position.x = pivot.position.x;

    orbit.forEach(o => {
      o.l.position.set(Math.cos(t * 0.6 + o.a) * 3.2, Math.sin(t * 0.5 + o.a) * 1.6, Math.sin(t * 0.6 + o.a) * 3.2 + 1);
    });

    cam.zoom += (cam.zt - cam.zoom) * 0.1;
    camera.position.set(0, 0.5, baseZ * cam.zoom);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
