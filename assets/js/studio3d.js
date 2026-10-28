// 3D Detail Studio — scroll-driven walkthrough of the detailing process.
// The car is an original, procedurally built model (no third-party assets).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('car3d');
const scrolly = document.querySelector('.scrolly');
const panels = [...document.querySelectorAll('.stage-panel')];
const rail = document.querySelector('[data-rail]');
const glossBar = document.querySelector('[data-gloss]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const STAGES = panels.map(p => ({ id: p.dataset.stage, name: p.querySelector('h2').textContent }));
rail.innerHTML = STAGES.map((s, i) => `<li data-i="${i}"><span>${s.name}</span></li>`).join('');
const railItems = [...rail.children];

// Text panel highlighting works even without WebGL
const setActivePanel = i => {
  panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
  railItems.forEach((li, k) => { li.classList.toggle('is-active', k === i); li.classList.toggle('is-done', k < i); });
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (e) {
  document.querySelector('.stage-fallback').hidden = false;
  canvas.hidden = true;
}

/* ---------- helpers ---------- */
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

function noiseTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

if (renderer) {
  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071022);
  scene.fog = new THREE.Fog(0x071022, 12, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x0a1020, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  key.shadow.radius = 6;
  scene.add(key);
  // Moving highlight used for the coating sweep
  const sweep = new THREE.PointLight(0xffffff, 0, 6, 1.5);
  sweep.position.set(3, 2.2, 1.6);
  scene.add(sweep);

  /* ---------- floor ---------- */
  const floorTex = noiseTexture(512, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, '#0f1d38'); grd.addColorStop(0.5, '#0a152b'); grd.addColorStop(1, '#071022');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 1, metalness: 0, envMapIntensity: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // Brass ring "turntable" detail
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.15, 3.18, 128), new THREE.MeshBasicMaterial({ color: 0xb8945a, transparent: true, opacity: 0.55 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002;
  scene.add(ring);

  /* ---------- the car ---------- */
  const car = new THREE.Group();
  scene.add(car);

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x0b0d12, metalness: 0.55, roughness: 0.6, clearcoat: 0, clearcoatRoughness: 0.3, envMapIntensity: 0.6
  });
  const cleanColor = new THREE.Color(0x0b0d12);
  const dustColor = new THREE.Color(0x857c6c);

  const W = 1.74; // body width
  const WHEEL_Y = 0.36, ARCH_R = 0.43;
  const profile = new THREE.Shape();
  profile.moveTo(-2.2, 0.3);
  profile.lineTo(-1.84, 0.3);
  profile.absarc(-1.4, WHEEL_Y, ARCH_R, Math.PI, 0, true);
  profile.lineTo(-0.9, 0.28);
  profile.lineTo(0.88, 0.28);
  profile.absarc(1.32, WHEEL_Y, ARCH_R, Math.PI, 0, true);
  profile.lineTo(2.02, 0.3);
  profile.quadraticCurveTo(2.3, 0.31, 2.31, 0.48);
  profile.quadraticCurveTo(2.29, 0.64, 2.06, 0.69);
  profile.quadraticCurveTo(1.35, 0.8, 0.68, 0.87);
  profile.lineTo(-1.55, 0.91);
  profile.quadraticCurveTo(-2.12, 0.92, -2.25, 0.76);
  profile.quadraticCurveTo(-2.31, 0.5, -2.2, 0.3);
  const bodyGeo = new THREE.ExtrudeGeometry(profile, { depth: W, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.09, bevelSegments: 10, curveSegments: 48 });
  bodyGeo.translate(0, 0, -W / 2);
  // Sculpt: tuck the upper sides in (tumblehome) and round the corners in plan view
  function sculpt(geo, yStart, yEnd, tuck, endStart) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      let k = 1 - tuck * smooth((y - yStart) / (yEnd - yStart));
      const e = (Math.abs(x) - endStart) / (2.35 - endStart);
      if (e > 0) k *= 1 - 0.22 * e * e;
      pos.setZ(i, pos.getZ(i) * k);
    }
    geo.computeVertexNormals();
  }
  sculpt(bodyGeo, 0.55, 0.95, 0.1, 1.5);
  const body = new THREE.Mesh(bodyGeo, paint);
  body.castShadow = true;
  car.add(body);

  // Greenhouse (tinted glass)
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0f18, metalness: 0.2, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.94, envMapIntensity: 1.3 });
  const cab = new THREE.Shape();
  cab.moveTo(0.74, 0.84);
  cab.quadraticCurveTo(0.2, 1.24, -0.28, 1.33);
  cab.quadraticCurveTo(-0.6, 1.37, -0.92, 1.32);
  cab.quadraticCurveTo(-1.55, 1.18, -1.98, 0.88);
  cab.lineTo(0.74, 0.84);
  const CW = 1.36;
  const cabGeo = new THREE.ExtrudeGeometry(cab, { depth: CW, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.07, bevelSegments: 8, curveSegments: 36 });
  cabGeo.translate(0, 0, -CW / 2);
  sculpt(cabGeo, 0.9, 1.36, 0.2, 9);
  const cabin = new THREE.Mesh(cabGeo, glass);
  cabin.castShadow = true;
  car.add(cabin);

  // Lights
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfeaff, emissiveIntensity: 1.4 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2030, emissiveIntensity: 1.2 });
  [-1, 1].forEach(s => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.42), headMat);
    h.position.set(2.27, 0.6, s * 0.6); h.rotation.z = -0.55; h.scale.z = 0.9; car.add(h);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, W + 0.1), tailMat);
  tail.position.set(-2.33, 0.72, 0); tail.scale.z = 0.86; car.add(tail);
  // Lower trim
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.5 });
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 1.0), trimMat);
  grille.position.set(2.36, 0.4, 0); car.add(grille);

  // Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.9, envMapIntensity: 0.25 });
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0x8c8f96, metalness: 1, roughness: 0.55, clearcoat: 0 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xc81e28, roughness: 0.4 });
  const wheels = [];
  const tireGeo = new THREE.TorusGeometry(0.25, 0.1, 20, 48);
  const rimGeo = new THREE.CylinderGeometry(0.235, 0.235, 0.05, 40);
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16);
  const spokeGeo = new THREE.BoxGeometry(0.04, 0.2, 0.025);
  [[1.32, 1], [1.32, -1], [-1.4, 1], [-1.4, -1]].forEach(([x, s]) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat); tire.scale.z = 1.4; tire.castShadow = true;
    w.add(tire);
    const rim = new THREE.Mesh(rimGeo, rimMat); rim.rotation.x = Math.PI / 2; rim.position.z = s * 0.06; rim.material = rimMat;
    w.add(rim);
    const hub = new THREE.Mesh(hubGeo, rimMat); hub.rotation.x = Math.PI / 2; hub.position.z = s * 0.1; w.add(hub);
    for (let k = 0; k < 10; k++) {
      const sp = new THREE.Mesh(spokeGeo, rimMat);
      const a = (k / 10) * Math.PI * 2 + (k % 2) * 0.12;
      sp.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, s * 0.09);
      sp.rotation.z = a - Math.PI / 2;
      w.add(sp);
    }
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.06), caliperMat);
    cal.position.set(0.1, 0.1, s * 0.02); cal.rotation.z = -0.6; w.add(cal);
    w.position.set(x, WHEEL_Y, s * (W / 2 + 0.0));
    car.add(w);
    wheels.push(w);
  });

  // Interior (seen when glass clears)
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xcfb593, roughness: 0.6 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.7 });
  const interior = new THREE.Group();
  [-0.36, 0.36].forEach(z => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.44), seatMat); base.position.set(-0.45, 0.97, z);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.44), seatMat); back.position.set(-0.72, 1.14, z); back.rotation.z = 0.2;
    interior.add(base, back);
  });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 1.3), dashMat); dash.position.set(0.42, 1.0, 0); interior.add(dash);
  const wheelS = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 10, 32), dashMat); wheelS.position.set(0.2, 1.08, 0.36); wheelS.rotation.y = Math.PI / 2; wheelS.rotation.x = 0.4; interior.add(wheelS);
  car.add(interior);

  /* ---------- overlays: dust, swirls ---------- */
  const dustTex = noiseTexture(512, (g, s) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const r = Math.random() * 2.2 + 0.3, a = Math.random() * 0.55;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.beginPath(); g.arc(Math.random() * s, Math.random() * s, r, 0, 7); g.fill();
    }
    for (let i = 0; i < 70; i++) { // streaks
      g.strokeStyle = `rgba(255,255,255,${Math.random() * 0.25})`; g.lineWidth = Math.random() * 8 + 2;
      const x = Math.random() * s; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 40, s); g.stroke();
    }
  });
  dustTex.repeat.set(0.7, 0.7);
  const dustMat = new THREE.MeshStandardMaterial({ color: 0x9a907c, roughness: 1, transparent: true, alphaMap: dustTex, opacity: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const dust = new THREE.Mesh(bodyGeo, dustMat);
  car.add(dust);

  const swirlTex = noiseTexture(1024, (g, s) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
    g.lineWidth = 1;
    for (let i = 0; i < 380; i++) {
      const cx = Math.random() * s, cy = Math.random() * s, r = 20 + Math.random() * 160;
      const a0 = Math.random() * 6.28, len = 0.3 + Math.random() * 1.4;
      g.strokeStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
      g.beginPath(); g.arc(cx, cy, r, a0, a0 + len); g.stroke();
    }
  });
  swirlTex.repeat.set(0.5, 0.5);
  const swirlMat = new THREE.MeshBasicMaterial({ color: 0xdfe6f2, transparent: true, alphaMap: swirlTex, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, blending: THREE.AdditiveBlending });
  const swirls = new THREE.Mesh(bodyGeo, swirlMat);
  car.add(swirls);

  /* ---------- surface sampling for foam & water ---------- */
  const ray = new THREE.Raycaster();
  const hitTargets = [body, cabin];
  scene.updateMatrixWorld(true);
  function sampleSurface(n, opts = {}) {
    const pts = [];
    let guard = 0;
    while (pts.length < n && guard++ < n * 20) {
      const side = Math.random();
      let origin, dir;
      if (side < (opts.topBias ?? 0.55)) {
        origin = new THREE.Vector3(lerp(-2.3, 2.3, Math.random()), 3, lerp(-1.05, 1.05, Math.random()));
        dir = new THREE.Vector3(0, -1, 0);
      } else {
        const s = Math.random() < 0.5 ? 1 : -1;
        origin = new THREE.Vector3(lerp(-2.2, 2.2, Math.random()), lerp(0.4, 1.35, Math.random()), s * 3);
        dir = new THREE.Vector3(0, 0, -s);
      }
      ray.set(origin, dir);
      const hit = ray.intersectObjects(hitTargets, false)[0];
      if (hit) pts.push({ p: hit.point.clone(), n: hit.face.normal.clone().transformDirection(hit.object.matrixWorld) });
    }
    return pts;
  }

  const foamPts = sampleSurface(2600, { topBias: 0.5 });
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const foam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), foamMat, foamPts.length);
  const foamScale = foamPts.map(() => 0.028 + Math.random() * 0.04);
  car.add(foam);

  const beadPts = sampleSurface(1300, { topBias: 0.6 });
  const beadMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 0, transparent: true, opacity: 0.4, clearcoat: 1, envMapIntensity: 2.2 });
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), beadMat, beadPts.length);
  const beadSize = beadPts.map(() => 0.008 + Math.random() * 0.016);
  const beadPhase = beadPts.map(() => Math.random());
  car.add(beads);

  // Iron remover "bleeding" on the wheels
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x8b2fc9, emissive: 0x3b0a5a, roughness: 0.3, transparent: true, opacity: 0.9 });
  const IRON_PER = 60;
  const iron = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), ironMat, IRON_PER * wheels.length);
  const ironPos = [];
  wheels.forEach(w => {
    const s = Math.sign(w.position.z);
    for (let k = 0; k < IRON_PER; k++) {
      const a = Math.random() * Math.PI * 2, r = 0.05 + Math.random() * 0.24;
      ironPos.push(new THREE.Vector3(w.position.x + Math.cos(a) * r, w.position.y + Math.sin(a) * r, w.position.z + s * 0.14));
    }
  });
  car.add(iron);

  // Polisher
  const polisher = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0xd8462f, roughness: 0.8 }));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.4, metalness: 0.3 }));
  head.position.y = 0.09;
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.42, 6, 12), new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.5 }));
  handle.rotation.z = Math.PI / 2; handle.position.set(-0.28, 0.14, 0);
  polisher.add(pad, head, handle);
  polisher.visible = false;
  scene.add(polisher);

  /* ---------- camera keyframes per stage ---------- */
  //            camera position          look-at target
  const SHOTS = {
    arrive:   [[6.2, 2.4, 6.4],  [0, 0.6, 0]],
    foam:     [[5.0, 2.8, -5.4], [0, 0.7, 0]],
    decon:    [[3.6, 0.9, 3.9],  [1.32, 0.4, 0.9]],
    correct:  [[4.6, 3.4, 2.6],  [1.2, 0.75, 0]],
    coat:     [[-4.2, 1.4, 4.6], [0.2, 0.75, 0]],
    bead:     [[3.4, 2.4, 3.4],  [0.6, 0.75, 0.2]],
    wheels:   [[-2.7, 0.6, 3.4], [-1.4, 0.4, 0.9]],
    interior: [[0.6, 1.55, 3.6], [-0.35, 1.0, 0]],
    reveal:   [[5.6, 1.7, 5.6],  [0, 0.65, 0]]
  };
  const shots = STAGES.map(s => SHOTS[s.id] || SHOTS.reveal);
  const v3 = a => new THREE.Vector3(...a);

  /* ---------- per-stage look ---------- */
  // Each value is defined as "how much of the effect is present" at stage i.
  const IDX = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
  function lookAt(p) {
    // p: continuous stage position (0 .. n-1)
    const ramp = (from, to) => smooth((p - from) / (to - from)); // 0 before from, 1 after to
    const pulse = (i, w = 0.6) => smooth(1 - Math.abs(p - i) / w);
    const clean = ramp(IDX.foam - 0.1, IDX.decon + 0.2);
    return {
      dust: 1 - ramp(IDX.foam - 0.2, IDX.foam + 0.45),
      foam: pulse(IDX.foam, 0.75),
      iron: pulse(IDX.decon, 0.6),
      swirl: clamp01(ramp(IDX.decon - 0.15, IDX.decon + 0.35) - ramp(IDX.correct - 0.05, IDX.correct + 0.55)),
      polish: pulse(IDX.correct, 0.55),
      gloss: lerp(0.15, 0.55, clean) + 0.45 * ramp(IDX.coat - 0.4, IDX.coat + 0.35),
      sweep: pulse(IDX.coat, 0.7),
      beads: pulse(IDX.bead, 0.8),
      wheels: ramp(IDX.wheels - 0.4, IDX.wheels + 0.1),
      interior: pulse(IDX.interior, 0.7),
      spin: ramp(IDX.reveal - 0.5, IDX.reveal)
    };
  }

  /* ---------- paint color picker ---------- */
  const paintPick = document.querySelector('[data-paint]');
  const paintName = document.querySelector('[data-paint-name]');
  paintPick?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    paintPick.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    cleanColor.set(b.dataset.color);
    paintName.textContent = b.dataset.name;
    needsRender = true;
  });

  /* ---------- sizing ---------- */
  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < 0.8 ? 52 : 35;
    // Shift the picture away from the text panel: right on desktop, up on phones
    if (r.width >= 900) camera.setViewOffset(r.width, r.height, -r.width * 0.17, 0, r.width, r.height);
    else camera.setViewOffset(r.width, r.height, 0, r.height * 0.16, r.width, r.height);
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  window.addEventListener('resize', resize);

  /* ---------- scroll progress ---------- */
  let target = 0, current = 0, needsRender = true;
  function readScroll() {
    const r = scrolly.getBoundingClientRect();
    const total = scrolly.offsetHeight - window.innerHeight;
    const t = clamp01(-r.top / Math.max(1, total));
    target = t * (STAGES.length - 1);
  }
  window.addEventListener('scroll', () => { readScroll(); needsRender = true; }, { passive: true });

  // Pointer parallax
  let px = 0, py = 0;
  window.addEventListener('pointermove', e => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; needsRender = true; }, { passive: true });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
  let lastStage = -1, visible = true;

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(canvas);

  function frame(time) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = time / 1000;
    current += (target - current) * (reduceMotion ? 1 : 0.085);
    const animating = Math.abs(target - current) > 0.0005;
    const L = lookAt(current);
    const live = L.foam > 0.01 || L.polish > 0.01 || L.beads > 0.01 || L.sweep > 0.01 || L.spin > 0.01 || L.iron > 0.01;
    if (!animating && !live && !needsRender) return;
    needsRender = false;

    // Stage UI
    const si = Math.round(current);
    if (si !== lastStage) { lastStage = si; setActivePanel(si); }

    // Camera: interpolate between neighbouring shots
    const i0 = Math.floor(current), i1 = Math.min(STAGES.length - 1, i0 + 1), f = smooth(current - i0);
    camPos.copy(v3(shots[i0][0])).lerp(v3(shots[i1][0]), f);
    camTarget.copy(v3(shots[i0][1])).lerp(v3(shots[i1][1]), f);
    if (L.spin > 0) { // slow orbit on the final reveal
      const ang = t * 0.15 * L.spin, rr = Math.hypot(camPos.x, camPos.z), base = Math.atan2(camPos.z, camPos.x);
      camPos.x = Math.cos(base + ang) * rr; camPos.z = Math.sin(base + ang) * rr;
    }
    if (camera.aspect < 0.8) camPos.sub(camTarget).multiplyScalar(1.35).add(camTarget); // phones: pull back
    camPos.x += px * 0.5; camPos.y += -py * 0.3;
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    // Paint
    paint.color.copy(cleanColor).lerp(dustColor, L.dust * 0.18);
    paint.roughness = lerp(0.7, 0.04, L.gloss);
    paint.clearcoat = clamp01((L.gloss - 0.35) / 0.6);
    paint.clearcoatRoughness = lerp(0.35, 0.02, L.gloss);
    paint.envMapIntensity = lerp(0.35, 1.5, L.gloss);
    dustMat.opacity = L.dust * 0.42;
    dust.visible = L.dust > 0.01;
    swirlMat.opacity = L.swirl * 0.55;
    swirls.visible = L.swirl > 0.01;
    glass.opacity = lerp(0.92, 0.22, L.interior);
    interior.visible = L.interior > 0.02;
    rimMat.roughness = lerp(0.6, 0.12, L.wheels);
    rimMat.clearcoat = L.wheels;
    rimMat.color.setScalar(lerp(0.22, 0.7, L.wheels));
    tireMat.roughness = lerp(0.95, 0.45, L.wheels);
    tireMat.color.setScalar(lerp(0.035, 0.012, L.wheels));
    if (glossBar) glossBar.style.transform = `scaleX(${clamp01(L.gloss)})`;

    // Foam
    foam.visible = L.foam > 0.01;
    if (foam.visible) {
      foamPts.forEach((fp, k) => {
        const s = foamScale[k] * L.foam * (1 + 0.06 * Math.sin(t * 2 + k));
        sv.copy(fp.p).addScaledVector(fp.n, s * 0.4);
        q.setFromUnitVectors(up, fp.n);
        m4.compose(sv, q, new THREE.Vector3(s * 1.3, s * 0.55, s * 1.3));
        foam.setMatrixAt(k, m4);
      });
      foam.instanceMatrix.needsUpdate = true;
    }

    // Iron remover
    iron.visible = L.iron > 0.01;
    if (iron.visible) {
      ironPos.forEach((ip, k) => {
        const drip = ((t * 0.08 + k * 0.137) % 1) * 0.06;
        const s = 0.012 * L.iron * (0.6 + (k % 5) * 0.15);
        sv.set(ip.x, ip.y - drip, ip.z);
        m4.compose(sv, q.identity(), new THREE.Vector3(s, s * 1.5, s));
        iron.setMatrixAt(k, m4);
      });
      iron.instanceMatrix.needsUpdate = true;
    }

    // Polisher circles on the hood
    polisher.visible = L.polish > 0.02;
    if (polisher.visible) {
      const pp = clamp01(current - IDX.correct + 0.5);
      const hx = lerp(1.9, 0.85, pp) + Math.cos(t * 3) * 0.12, hz = Math.sin(t * 1.3) * 0.45 + Math.sin(t * 3) * 0.1;
      polisher.position.set(hx, 0.8 - (hx - 0.7) * 0.07 + 0.06 + (1 - L.polish) * 0.6, hz);
      pad.rotation.y = t * 30;
      polisher.rotation.z = -0.1;
    }

    // Coating sweep light
    sweep.intensity = L.sweep * 30;
    sweep.position.set(Math.sin(t * 0.9) * 2.4, 2.0, 1.9);

    // Water beads, sliding slowly down the sides
    beads.visible = L.beads > 0.01;
    if (beads.visible) {
      beadPts.forEach((bp, k) => {
        const s = beadSize[k] * L.beads;
        const slide = Math.abs(bp.n.y) < 0.6 ? ((t * 0.05 + beadPhase[k]) % 1) * 0.18 : 0;
        sv.copy(bp.p).addScaledVector(bp.n, s * 0.5); sv.y -= slide;
        q.setFromUnitVectors(up, bp.n);
        m4.compose(sv, q, new THREE.Vector3(s, s * 0.6, s));
        beads.setMatrixAt(k, m4);
      });
      beads.instanceMatrix.needsUpdate = true;
    }

    // Wheels idle spin on reveal
    wheels.forEach(w => { w.rotation.z = -t * 0.6 * L.spin; });

    renderer.render(scene, camera);
  }

  resize();
  readScroll();
  current = target;
  setActivePanel(Math.round(current));
  requestAnimationFrame(frame);
  window.__studioReady = true;
} else {
  // No WebGL: still highlight panels as they scroll by
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) setActivePanel(panels.indexOf(en.target)); }), { threshold: 0.5 });
  panels.forEach(p => io.observe(p));
}
