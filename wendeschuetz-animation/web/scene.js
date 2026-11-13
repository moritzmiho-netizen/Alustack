// Reversing contactor circuit – deterministic 3D wiring animation (units: cm, panel front at z = 0)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const qs = new URLSearchParams(location.search);
const W = +qs.get('w') || 1920, H = +qs.get('h') || 1080;
const SHADOW = +(qs.get('shadow') || 4096);

await document.fonts.load('700 64px Inter');
await document.fonts.load('600 64px Inter');
await document.fonts.load('500 64px Inter');

// ---------------------------------------------------------------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd9d6cf);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

const FOV = 24;
const camera = new THREE.PerspectiveCamera(FOV, W / H, 2, 3000);

scene.add(new THREE.HemisphereLight(0xffffff, 0xa9a49a, 1.1));
const key = new THREE.DirectionalLight(0xfffaf2, 1.9);
key.position.set(-70, 130, 190);
key.target.position.set(0, 10, 0);
key.castShadow = true;
key.shadow.mapSize.set(SHADOW, SHADOW);
Object.assign(key.shadow.camera, { left: -85, right: 85, top: 70, bottom: -50, near: 50, far: 500 });
key.shadow.bias = -0.0003;
key.shadow.normalBias = 0.03;
key.shadow.radius = 5;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xeef3ff, 0.55);
fill.position.set(90, 20, 140);
scene.add(fill);

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MAT = (color, roughness = 0.6, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const mats = {
  panel: MAT(0x8f8c86, 0.88),
  frame: MAT(0xbebdb8, 0.6),
  wall: MAT(0xe6e3dc, 0.95),
  duct: MAT(0x9fa2a3, 0.72),
  rail: MAT(0xcfd2d4, 0.32, 0.85),
  beige: MAT(0xd9c8a0, 0.62),
  pe: MAT(0x3f9a3a, 0.55),
  white: MAT(0xeeeeeb, 0.5),
  lgrey: MAT(0xd9dad6, 0.5),
  dark: MAT(0x2a2b2d, 0.5),
  black: MAT(0x161616, 0.45),
  yellow: MAT(0xf2c200, 0.45),
  red: MAT(0xc8141b, 0.35),
  screw: MAT(0x9da0a3, 0.3, 0.95),
  brass: MAT(0xc9a24a, 0.3, 0.9),
  steel: MAT(0xb8bcc0, 0.25, 0.95),
  motor: MAT(0x5e7186, 0.45, 0.35),
  chrome: MAT(0xdfe2e5, 0.15, 1.0),
  hole: MAT(0x111111, 0.9),
};

function box(w, h, d, mat, x, y, z0, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z0 + d / 2);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(r, len, mat, x, y, z0, parent = scene, seg = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z0 + len / 2);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

function labelTexture(text, { color = '#111', bg = null, weight = 700, px = 140, pad = 0.22, border = null } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${weight} ${px}px Inter`;
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  const padX = bg ? px * pad * 1.6 : px * 0.06;
  const padY = bg ? px * pad : px * 0.04;
  c.width = Math.ceil(tw + padX * 2);
  c.height = Math.ceil(px * 1.05 + padY * 2);
  if (bg) {
    ctx.fillStyle = bg;
    const r = px * 0.16;
    ctx.beginPath(); ctx.roundRect(0, 0, c.width, c.height, r); ctx.fill();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = px * 0.06; ctx.stroke(); }
  }
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + px * 0.06);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return { tex, aspect: c.width / c.height };
}
function label(text, h, x, y, z, opts = {}, parent = scene) {
  const { tex, aspect } = labelTexture(text, opts);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: !opts.bg, roughness: 0.75, depthWrite: !!opts.bg }));
  m.position.set(x, y, z);
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const screwGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.22, 20);
const slotGeo = new THREE.BoxGeometry(0.46, 0.08, 0.06);
function screw(x, y, z) {
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.04), mats.hole);
  hole.position.set(x, y, z + 0.02);
  scene.add(hole);
  const s = new THREE.Mesh(screwGeo, mats.screw);
  s.rotation.x = Math.PI / 2; s.position.set(x, y, z + 0.13);
  s.castShadow = true;
  scene.add(s);
  const sl = new THREE.Mesh(slotGeo, mats.hole);
  sl.position.set(x, y, z + 0.25);
  sl.rotation.z = 0.6;
  scene.add(sl);
}

// terminal registry: entry point of the conductor (inside the clamp) + outward direction (+1 up / -1 down)
const TERM = {};
function term(name, x, y, z, dir) { TERM[name] = { name, p: V(x, y, z), dir, n: 0, k: 0 }; }

// ---------------------------------------------------------------- wall, panel, frame
box(400, 260, 1, mats.wall, 0, 0, -12);
box(124, 64, 2, mats.panel, 0, 20, -2);              // mounting plate x -62..62, y -12..52
box(128, 3, 4, mats.frame, 0, 53.5, -3);
box(128, 3, 4, mats.frame, 0, -13.5, -3);
box(3, 70, 4, mats.frame, -63.5, 20, -3);
box(3, 70, 4, mats.frame, 63.5, 20, -3);

// ---------------------------------------------------------------- cable ducts
const ducts = {
  D1: { type: 'h', c: 34, a: -58, b: 9 },
  D2: { type: 'h', c: 12, a: -58, b: 56 },
  D3: { type: 'h', c: -4, a: -58, b: 9 },
  V0: { type: 'v', c: -56, a: -1.5, b: 31.5 },
  V1: { type: 'v', c: -34, a: 14.5, b: 31.5 },
  V2: { type: 'v', c: 7, a: -1.5, b: 31.5 },
};
for (const d of Object.values(ducts)) d.n = 0;
const DW = 5, DD = 6;
const fingerMatrices = [];
function inBand(v, bands) { return bands.some(([a, b]) => v > a - 0.3 && v < b + 0.3); }
for (const [name, d] of Object.entries(ducts)) {
  const len = d.b - d.a, mid = (d.a + d.b) / 2;
  if (d.type === 'h') {
    box(len, DW, 0.3, mats.duct, mid, d.c, 0);
    const bands = Object.values(ducts).filter(o => o.type === 'v').map(o => [o.c - DW / 2, o.c + DW / 2])
      .filter(([a, b]) => true);
    for (const s of [-1, 1]) {
      // wall root
      for (let x = d.a + 0.35; x <= d.b - 0.3; x += 1.0) {
        const vb = Object.values(ducts).filter(o => o.type === 'v' && ((s < 0 && o.a < d.c) || (s > 0 && o.b > d.c)) && Math.abs(o.c - x) < DW / 2 + 0.3 && o.a <= d.c + 3 && o.b >= d.c - 3);
        if (vb.length) continue;
        fingerMatrices.push(new THREE.Matrix4().compose(V(x, d.c + s * (DW / 2 - 0.12), 0.3 + (DD - 0.3) / 2), new THREE.Quaternion(), V(0.62, 0.24, DD - 0.3)));
      }
    }
  } else {
    box(DW, len, 0.3, mats.duct, d.c, mid, 0);
    const hb = Object.values(ducts).filter(o => o.type === 'h').map(o => [o.c - DW / 2, o.c + DW / 2]);
    for (const s of [-1, 1]) {
      for (let y = d.a + 0.35; y <= d.b - 0.3; y += 1.0) {
        if (inBand(y, hb)) continue;
        fingerMatrices.push(new THREE.Matrix4().compose(V(d.c + s * (DW / 2 - 0.12), y, 0.3 + (DD - 0.3) / 2), new THREE.Quaternion(), V(0.24, 0.62, DD - 0.3)));
      }
    }
  }
}
{
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.duct, fingerMatrices.length);
  fingerMatrices.forEach((m, i) => im.setMatrixAt(i, m));
  im.castShadow = true; im.receiveShadow = true;
  scene.add(im);
}

// ---------------------------------------------------------------- DIN rails
function rail(x0, x1, y) {
  box(x1 - x0, 3.5, 0.15, mats.rail, (x0 + x1) / 2, y, 0);
  box(x1 - x0, 0.15, 0.75, mats.rail, (x0 + x1) / 2, y + 1.7, 0);
  box(x1 - x0, 0.15, 0.75, mats.rail, (x0 + x1) / 2, y - 1.7, 0);
  box(x1 - x0, 0.5, 0.12, mats.rail, (x0 + x1) / 2, y + 1.55, 0.7);
  box(x1 - x0, 0.5, 0.12, mats.rail, (x0 + x1) / 2, y - 1.55, 0.7);
}
const RY = 24;            // device rail
rail(-53, -1, RY);
rail(-55, -41, 41);       // X0 supply terminals
rail(18, 52, 20);         // X3 field terminals

// ---------------------------------------------------------------- terminal blocks
function tblock(x, y, tag, name, peBlock = false, tagH = 0.36) {
  const m = peBlock ? mats.pe : mats.beige;
  box(0.95, 4.4, 3.0, m, x, y, 0.75);
  box(0.95, 1.5, 0.9, m, x, y, 3.75);
  if (peBlock) box(0.96, 0.25, 0.92, mats.yellow, x, y + 0.45, 3.75);
  box(0.8, 1.1, 0.06, mats.white, x, y - 0.05, 4.65);
  label(tag, tagH, x, y - 0.05, 4.73, { color: '#111', weight: 700, px: 120 });
  screw(x, y + 1.45, 3.75);
  screw(x, y - 1.45, 3.75);
  term(name, x, y - 2.2, 2.6, -1);          // field side (bottom)
  term(name + 't', x, y + 2.2, 2.6, +1);    // pre-wired side (top)
}
function endPlate(x, y) { box(0.35, 4.6, 4.2, mats.beige, x, y, 0.75); }

// X0 supply terminals
const X0 = [['L1', -53.2], ['L2', -52.1], ['L3', -51.0], ['PE', -49.9], ['L', -47.4], ['N', -46.3]];
endPlate(-54.0, 41); endPlate(-48.6, 41); endPlate(-45.5, 41);
for (const [t, x] of X0) tblock(x, 41, t, 'X0.' + t, t === 'PE', t.length > 1 ? 0.34 : 0.42);
box(0.95, 4.4, 3.0, mats.beige, -48.65, 41, 0.75);
label('-X0', 0.9, -53.5 + 3.2 - 4.6, 45.2, 0.32, { color: '#f1f1ee', weight: 700 });
label('400/230 V', 0.6, -46.5, 45.0, 0.32, { color: '#e6e4de', weight: 600 });

// X3 field terminals: emergency stop + push buttons (numbers as on the training wall)
const X3 = [];
X3.push(['X18.2', '2', 21.45], ['X18.4', '4', 22.55]);
const groups = { C: [129, 130, 131, 132, 33.5], D: [133, 134, 135, 136, 40], E: [137, 138, 139, 140, 46.5] };
for (const [g, arr] of Object.entries(groups)) {
  const cx = arr[4];
  arr.slice(0, 4).forEach((n, i) => X3.push([`${g}.${n}`, String(n), cx - 1.65 + i * 1.1]));
}
endPlate(20.6, 20); endPlate(23.4, 20);
for (const g of Object.values(groups)) { endPlate(g[4] - 2.4, 20); endPlate(g[4] + 2.4, 20); }
for (const [name, tag, x] of X3) tblock(x, 20, tag, name, false, tag.length > 1 ? 0.3 : 0.42);
label('-X18', 0.75, 22, 16.6, 0.32, { color: '#f1f1ee' });
for (const [g, arr] of Object.entries(groups)) {
  label(g, 0.9, arr[4], 16.5, 0.32, { color: '#f1f1ee' });
  // NC / NO marks under the groups
  label('1-2 NC   3-4 NO', 0.42, arr[4], 15.7 + 0.0, 0.32, { color: '#dcdad4', weight: 500 });
}

// ---------------------------------------------------------------- devices on the main rail
function deviceTag(text, x, y, z, h = 0.75) { return label(text, h, x, y, z, { bg: '#ffffff', color: '#111', border: '#bbb' }); }

function numLabel(t, x, y, z, h = 0.36) { label(t, h, x, y, z, { color: '#222', weight: 700, px: 110 }); }

// MCB: F1 (3-pole) and F2 (1-pole)
function mcb(name, x, poles, rating) {
  const w = 1.78 * poles;
  box(w - 0.04, 9, 6.0, mats.white, x, RY, 0.75);
  box(w - 0.04, 4.6, 0.9, mats.white, x, RY, 6.75);
  box(w - 0.5, 2.3, 0.05, mats.dark, x, RY + 0.95, 7.65);
  box(w - 0.75, 0.85, 1.05, mats.black, x, RY + 1.5, 7.65);       // lever in ON position
  deviceTag(name, x, RY - 0.95, 7.7, poles > 1 ? 0.8 : 0.62);
  label(rating, 0.42, x, RY - 1.85, 7.69, { color: '#555', weight: 600 });
  for (let i = 0; i < poles; i++) {
    const px = x - w / 2 + 0.89 + 1.78 * i;
    screw(px, RY + 3.55, 6.75); screw(px, RY - 3.55, 6.75);
    numLabel(String(2 * i + 1), px, RY + 2.75, 6.77); numLabel(String(2 * i + 2), px, RY - 2.75, 6.77);
    term(`${name}.${2 * i + 1}`, px, RY + 4.5, 5.0, +1);
    term(`${name}.${2 * i + 2}`, px, RY - 4.5, 5.0, -1);
  }
}
mcb('F1', -46, 3, 'C16');
mcb('F2', -40.6, 1, 'C6');

// contactors
const contactors = {};
function contactor(name, x) {
  const g = new THREE.Group(); scene.add(g);
  const w = 5.6;
  box(w, 9, 5.25, mats.lgrey, x, RY, 0.75, g);
  box(w - 0.2, 5.6, 2.6, mats.lgrey, x, RY, 6.0, g);
  box(4.6, 4.6, 2.4, mats.yellow, x, RY, 8.6, g);                  // auxiliary contact block (front mounted)
  const offs = { 1: -1.95, 3: -0.75, 5: 0.45, A1: 1.95 };
  const offsB = { 2: -1.95, 4: -0.75, 6: 0.45, A2: 1.95 };
  for (const [t, dx] of Object.entries(offs)) {
    screw(x + dx, RY + 3.6, 6.0); numLabel(t, x + dx, RY + 4.22, 6.02, t.length > 1 ? 0.32 : 0.36);
    term(`${name}.${t}`, x + dx, RY + 4.5, 4.4, +1);
  }
  for (const [t, dx] of Object.entries(offsB)) {
    screw(x + dx, RY - 3.6, 6.0); numLabel(t, x + dx, RY - 4.22, 6.02, t.length > 1 ? 0.32 : 0.36);
    term(`${name}.${t}`, x + dx, RY - 4.5, 4.4, -1);
  }
  // aux block terminals 21/22 (NC) and 43/44 (NO)
  for (const [t, dx, dy] of [['21', -1.15, 1], ['43', 1.15, 1], ['22', -1.15, -1], ['44', 1.15, -1]]) {
    screw(x + dx, RY + dy * 1.5, 11.0);
    numLabel(t, x + dx, RY + dy * 0.75, 11.02, 0.34);
    term(`${name}.${t}`, x + dx, RY + dy * 2.3, 10.0, dy);
  }
  label(name, 0.82, x, RY + 0.25, 11.03, { color: '#111', weight: 800 });
  // switching position indicator
  box(0.9, 1.2, 0.05, mats.dark, x, RY - 0.95 + 0.0, 11.0, g);
  const flag = box(0.7, 0.42, 0.06, MAT(0xf4f4f4, 0.4), x, RY - 0.7, 11.02, g);
  label('A1+  A2-', 0.0001, x, RY, 0, {});
  contactors[name] = { g, flag, x };
}
contactor('Q1', -26);
contactor('Q2', -17);

// motor protection switch F3 with side-mounted auxiliary contact
const F3x = -7.2;
{
  const w = 4.5;
  box(w, 9, 5.25, MAT(0xe4e4e0, 0.5), F3x, RY, 0.75);
  box(w, 5.4, 3.0, MAT(0xe4e4e0, 0.5), F3x, RY, 6.0);
  const knobG = new THREE.Group(); knobG.position.set(F3x, RY + 0.55, 9.0); scene.add(knobG);
  const k1 = cyl(1.35, 0.7, mats.black, 0, 0, 0, knobG, 40);
  const grip = box(0.55, 2.7, 0.75, mats.black, 0, 0, 0.7, knobG);
  const ptr = box(0.12, 1.0, 0.02, MAT(0xffffff, 0.4), 0, 0.75, 1.46, knobG);
  knobG.rotation.z = -Math.PI / 2 + 0.0; // pointing to "I"
  label('0', 0.42, F3x - 1.85, RY + 1.9, 9.01, { color: '#222' });
  label('I', 0.42, F3x + 1.85, RY + 0.55, 9.01, { color: '#222' });
  deviceTag('F3', F3x, RY - 1.85, 9.03, 0.7);
  for (const [i, dx] of [[1, -1.5], [3, 0], [5, 1.5]]) {
    screw(F3x + dx, RY + 3.6, 6.0); numLabel(String(i), F3x + dx, RY + 3.0, 6.02);
    screw(F3x + dx, RY - 3.6, 6.0); numLabel(String(i + 1), F3x + dx, RY - 3.0, 6.02);
    term(`F3.${i}`, F3x + dx, RY + 4.5, 4.4, +1);
    term(`F3.${i + 1}`, F3x + dx, RY - 4.5, 4.4, -1);
  }
  const ax = F3x + w / 2 + 0.55;
  box(1.05, 9, 5.25, MAT(0xd2d3cf, 0.5), ax, RY, 0.75);
  screw(ax, RY + 3.6, 6.0); numLabel('21', ax, RY + 2.85, 6.02, 0.3);
  screw(ax, RY - 3.6, 6.0); numLabel('22', ax, RY - 2.85, 6.02, 0.3);
  label('NC', 0.3, ax, RY, 6.02, { color: '#444' });
  term('F3.21', ax, RY + 4.5, 4.4, +1);
  term('F3.22', ax, RY - 4.5, 4.4, -1);
}

// ---------------------------------------------------------------- emergency stop + push button box
const buttons = {};
{
  // NOT-HALT
  box(8, 8, 6.2, mats.yellow, 22, 30, 0);
  const mush = new THREE.Group(); mush.position.set(22, 30, 6.2); scene.add(mush);
  cyl(1.1, 1.2, mats.dark, 0, 0, 0, mush);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(2.7, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2.6), mats.red);
  cap.rotation.x = Math.PI / 2; cap.position.z = 0.0; cap.scale.set(1, 0.55, 1);
  cap.castShadow = true; mush.add(cap);
  label('NOT-HALT', 0.8, 22, 26.9, 6.21, { bg: '#ffffff', color: '#111' });
  label('S1', 0.6, 25.4, 33.3, 6.21, { color: '#333' });

  // push button box C D E
  box(20, 8, 6.0, MAT(0xdedfdc, 0.45), 40, 30, 0);
  const cols = { C: 0x161616, D: 0xc4161c, E: 0x161616 };
  for (const [g, arr] of Object.entries(groups)) {
    const bx = arr[4];
    cyl(1.75, 0.5, mats.chrome, bx, 29.6, 6.0, scene, 40);
    const bg = new THREE.Group(); bg.position.set(bx, 29.6, 6.5); scene.add(bg);
    const capm = cyl(1.35, 0.9, MAT(cols[g], 0.35), 0, 0, 0, bg, 40);
    label(g, 1.0, bx, 32.6, 6.01, { color: '#111', weight: 800 });
    buttons[g] = { g: bg, x: bx, y: 29.6, z: 7.4 };
  }
  label('C  = EIN rechts', 0.42, 36.0, 26.85, 6.01, { color: '#444', weight: 600 });
  label('D = AUS', 0.42, 40.6, 26.85, 6.01, { color: '#444', weight: 600 });
  label('E = EIN links', 0.42, 45.2, 26.85, 6.01, { color: '#444', weight: 600 });
}

// ---------------------------------------------------------------- motor M1 on a bracket below the panel
const motor = {};
{
  box(40, 1.4, 34, MAT(0xb7b9bb, 0.45, 0.6), -8, -26.7, -2);       // shelf
  box(40, 3, 1.2, MAT(0xa9abad, 0.45, 0.6), -8, -27.9, 30.8);
  label('M1', 1.3, -8, -27.9, 32.05, { bg: '#ffffff', color: '#111', border: '#999' });
  label('3~  400 V  0,37 kW', 0.6, 1, -27.9, 32.05, { color: '#222', weight: 600 });
  const mx = -8, my = -19.5, R = 5;
  const body = new THREE.Group(); body.position.set(mx, my, 0); scene.add(body);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 15, 48), mats.motor);
  housing.rotation.x = Math.PI / 2; housing.position.z = 13.5; housing.castShadow = true; housing.receiveShadow = true;
  body.add(housing);
  for (let i = 0; i < 20; i++) {                                     // cooling ribs
    const a = (i / 20) * Math.PI * 2;
    if (Math.abs(Math.sin(a) - 1) < 0.15) continue;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 13), mats.motor);
    rib.position.set(Math.cos(a) * (R + 0.25), Math.sin(a) * (R + 0.25), 13.5);
    rib.rotation.z = a + Math.PI / 2; rib.castShadow = true; body.add(rib);
  }
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 1.0, 48), mats.motor);
  fl.rotation.x = Math.PI / 2; fl.position.z = 21.5; fl.castShadow = true; body.add(fl);
  const fanCover = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.4, R + 0.4, 3.5, 48), MAT(0x4d5c6b, 0.5, 0.3));
  fanCover.rotation.x = Math.PI / 2; fanCover.position.z = 4.3; body.add(fanCover);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 12), mats.steel);
    b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * (R - 0.3), Math.sin(a) * (R - 0.3), 22.1); body.add(b);
  }
  // feet
  box(9, 1.6, 3, mats.motor, 0, -R - 0.3, 7, body);
  box(9, 1.6, 3, mats.motor, 0, -R - 0.3, 17, body);
  // terminal box (open, terminals on top)
  box(6.2, 2.4, 6.0, mats.motor, 0, R + 0.9, 9.5, body);
  box(5.6, 0.2, 5.4, MAT(0x2b2f33, 0.6), 0, R + 2.11, 9.8, body);
  const tbTop = my + R + 2.2;
  for (const [t, dx] of [['U1', -1.6], ['V1', 0], ['W1', 1.6]]) {
    cyl(0.42, 0.6, mats.brass, mx + dx, tbTop + 0.25, 12.5).rotation.x = 0;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 16), mats.brass);
    st.position.set(mx + dx, tbTop + 0.3, 12.5); scene.add(st);
    label(t, 0.42, mx + dx, tbTop + 0.02, 14.6, { color: '#f3f3f3', weight: 700 }).rotation.x = -Math.PI / 2;
    term(`M1.${t}`, mx + dx, tbTop + 0.55, 12.5, +1);
  }
  // PE stud on the terminal box side
  const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 16), mats.brass);
  pe.position.set(mx + 3.4, my + R + 0.9, 12.5); pe.rotation.z = Math.PI / 2; scene.add(pe);
  label('⏚', 0.8, mx + 3.25, my + R + 2.5, 15.6, { color: '#f3f3f3', weight: 700 });
  term('M1.PE', mx + 3.7, my + R + 0.9, 12.5, +1);
  // shaft + coupling disc
  const shaft = cyl(0.55, 3.2, mats.steel, mx, my, 22.0);
  const rot = new THREE.Group(); rot.position.set(mx, my, 25.2); scene.add(rot);
  const disc = cyl(2.6, 0.8, MAT(0xb81d22, 0.35), 0, 0, 0, rot, 48);
  const stripe = box(0.55, 2.3, 0.05, MAT(0xffffff, 0.4), 0, 1.25, 0.8, rot);
  const dot = cyl(0.35, 0.06, MAT(0x111111, 0.5), 1.3, -1.0, 0.8, rot, 16);
  motor.rot = rot; motor.center = V(mx, my, 26.1); motor.R = 2.6;
}

// ---------------------------------------------------------------- pre-wired (static) conductors
const wireMats = {};
function wireMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.0, emissive: 0x000000 });
}
function stripeTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2f9a35'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#f1d21c';
  for (let i = -2; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 34, 0); ctx.lineTo(i * 64 + 34 + 30, 64); ctx.lineTo(i * 64 + 30, 64); ctx.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
const peTex = stripeTexture();

function roundedPath(pts, R) {
  // remove duplicates / collinear points
  const P = [];
  for (const p of pts) if (!P.length || P[P.length - 1].distanceTo(p) > 1e-4) P.push(p.clone());
  const Q = [P[0]];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i].clone().sub(Q[Q.length - 1]).normalize(), b = P[i + 1].clone().sub(P[i]).normalize();
    if (a.dot(b) > 0.9999) continue;
    Q.push(P[i]);
  }
  Q.push(P[P.length - 1]);
  const path = new THREE.CurvePath();
  let cur = Q[0].clone();
  for (let i = 1; i < Q.length - 1; i++) {
    const din = Q[i].clone().sub(Q[i - 1]), dout = Q[i + 1].clone().sub(Q[i]);
    const r = Math.min(R, din.length() * 0.48, dout.length() * 0.48);
    const e1 = Q[i].clone().sub(din.normalize().multiplyScalar(r));
    const e2 = Q[i].clone().add(dout.normalize().multiplyScalar(r));
    if (cur.distanceTo(e1) > 1e-4) path.add(new THREE.LineCurve3(cur.clone(), e1));
    path.add(new THREE.QuadraticBezierCurve3(e1, Q[i].clone(), e2));
    cur = e2;
  }
  path.add(new THREE.LineCurve3(cur, Q[Q.length - 1].clone()));
  return path;
}
function staticWire(pts, color, r = 0.09) {
  const path = roundedPath(pts, 0.5);
  const len = path.getLength();
  const m = new THREE.Mesh(new THREE.TubeGeometry(path, Math.ceil(len * 5) + 4, r, 8, false), wireMat(color));
  m.castShadow = true; scene.add(m);
}
// supply cable into X0 from the top
{
  box(1.6, 12, 1.6, MAT(0x6d6f72, 0.55), -50.5, 50, 2.2).rotation.z = 0;
  const cores = [['X0.L1t', 0x6b3a1e], ['X0.L2t', 0x151515], ['X0.L3t', 0x8f9294], ['X0.PEt', null], ['X0.Lt', 0x6b3a1e], ['X0.Nt', 0x1f5fbf]];
  cores.forEach(([n, c], i) => {
    const T = TERM[n];
    const pts = [V(-50.5 + (i - 2.5) * 0.25, 44.5, 3.0), V(T.p.x, 44.0 - 0.0 + 0.0, 3.0), V(T.p.x, T.p.y, 2.6)];
    if (c === null) {
      const path = roundedPath(pts, 0.4);
      const m = new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.14, 8, false), new THREE.MeshStandardMaterial({ map: peTex, roughness: 0.45 }));
      scene.add(m);
    } else staticWire(pts, c, 0.14);
  });
}
// field side: from the button / e-stop boxes down to the top of X3
for (const [name, , x] of X3) {
  const T = TERM[name + 't'];
  const bx = name.startsWith('X18') ? 22 : groups[name[0]][4];
  staticWire([V(bx + (x - bx) * 0.35, 26.0, 2.6), V(bx + (x - bx) * 0.35, 25.0, 2.6), V(x, 24.0, 2.6), V(x, T.p.y, 2.6)], 0xcfd0d2, 0.08);
}

// ---------------------------------------------------------------- animated conductors
const COL = { ctrl: 0x161616, N: 0x1f5fbf, L1: 0x6b3a1e, L2: 0x141414, L3: 0x8f9294, PE: 'pe' };
const GLOW = new THREE.Color(0x56d8ff);
const WIRES = [];
let wireIdx = 0;

function laneOf(duct) { const d = ducts[duct]; return d.n++; }
function ductEdge(d, toward) { return d.c + Math.sign(toward - d.c) * (DW / 2); }

function endPts(T, dx, z, d) {
  // from terminal clamp out to a duct edge (start side); returns array of points
  const e = T.p.clone(); e.x += dx;
  const f = e.clone(); f.y += T.dir * 0.75;
  const edge = ductEdge(d, T.p.y);
  return [e, f, V(e.x, edge, e.z), V(e.x, edge, z)];
}

function route(A, B, via, z) {
  const ta = TERM[A], tb = TERM[B];
  const dxA = ta.k++ ? 0.17 : (ta.n > 1 ? -0.17 : 0);
  const dxB = tb.k++ ? 0.17 : (tb.n > 1 ? -0.17 : 0);
  const pts = [];
  const seq = via.map(v => ducts[v]);
  const lanes = via.map(v => laneOf(v));
  const pos = (d, k) => d.type === 'h' ? d.c - 1.9 + (k % 9) * 0.47 : d.c - 1.75 + (k % 8) * 0.5;
  pts.push(...endPts(ta, dxA, z, seq[0]));
  let x = ta.p.x + dxA, y = pos(seq[0], lanes[0]);
  pts.push(V(x, y, z));
  for (let i = 1; i < seq.length; i++) {
    const d = seq[i], c = pos(d, lanes[i]);
    if (d.type === 'v') { x = c; pts.push(V(x, y, z)); }
    else { y = c; pts.push(V(x, y, z)); }
  }
  const last = seq[seq.length - 1];
  if (B.startsWith('M1')) {
    const xb = tb.p.x + dxB;
    pts.push(V(xb, y, z), V(xb, -11.4, z), V(xb, -11.4, tb.p.z), V(xb, tb.p.y + 0.75, tb.p.z), V(xb, tb.p.y, tb.p.z));
  } else {
    const xb = tb.p.x + dxB;
    const edge = ductEdge(last, tb.p.y);
    pts.push(V(xb, y, z), V(xb, edge, z), V(xb, edge, tb.p.z), V(xb, tb.p.y + tb.dir * 0.75, tb.p.z), V(xb, tb.p.y, tb.p.z));
  }
  return pts;
}
function preCount(A, B) { TERM[A].n++; TERM[B].n++; }

const STEPS = [];
function wire(def) {
  def.id = ++wireIdx;
  WIRES.push(def);
  return def;
}

// timeline -------------------------------------------------------------------
const T_ = {
  s1: 0, s2: 4.0, s3: 11.0, s4: 14.5, s5: 23.5, s6: 32.5, s7: 40.0, s8: 50.5, end: 60,
};
STEPS.push(
  { n: 1, t: T_.s1, title: 'Empty panel – all devices mounted, no wires yet' },
  { n: 2, t: T_.s2, title: 'Control circuit: supply L  →  F2  →  F3 aux  →  NOT-HALT  →  OFF button D' },
  { n: 3, t: T_.s3, title: 'OFF button D  →  E,  bridge E  →  C' },
  { n: 4, t: T_.s4, title: 'Right run:  C  →  self-holding Q1  →  interlock Q2  →  coil Q1' },
  { n: 5, t: T_.s5, title: 'Left run:  E  →  self-holding Q2  →  interlock Q1  →  coil Q2' },
  { n: 6, t: T_.s6, title: 'Main circuit: F1  →  Q1,  bridges Q1  →  Q2' },
  { n: 7, t: T_.s7, title: 'Q1  →  F3,  Q2  →  Q1 with L2 / L3 swapped,  F3  →  motor M1' },
  { n: 8, t: T_.s8, title: 'Function test' },
);

// Definition list: [from, to, color, route, start, duration, radius, caption]
const C = 0.13, P = 0.19;
const defs = [
  // step 2
  ['X0.L', 'F2.1', 'ctrl', ['D1'], 4.7, 1.2, C],
  ['F2.2', 'F3.21', 'ctrl', ['D2', 'V2', 'D1'], 6.2, 1.25, C],
  ['F3.22', 'X18.2', 'ctrl', ['D2'], 7.8, 1.15, C],
  ['X18.4', 'D.133', 'ctrl', ['D2'], 9.3, 1.1, C],
  // step 3
  ['D.134', 'E.137', 'ctrl', ['D2'], 11.5, 1.0, C],
  ['E.137', 'C.129', 'ctrl', ['D2'], 12.9, 0.95, C, 'bridge'],
  // step 4
  ['E.138', 'C.131', 'ctrl', ['D2'], 15.0, 1.0, C],
  ['C.131', 'Q1.43', 'ctrl', ['D2', 'V2', 'D1'], 16.3, 1.25, C],
  ['C.132', 'Q1.44', 'ctrl', ['D2'], 17.8, 1.1, C],
  ['Q1.44', 'Q2.21', 'ctrl', ['D2', 'V2', 'D1'], 19.1, 1.15, C],
  ['Q2.22', 'Q1.A1', 'ctrl', ['D2', 'V1', 'D1'], 20.5, 1.15, C],
  ['Q1.A2', 'X0.N', 'N', ['D2', 'V1', 'D1'], 21.9, 1.2, C],
  // step 5
  ['C.130', 'E.139', 'ctrl', ['D2'], 24.0, 1.0, C],
  ['E.139', 'Q2.43', 'ctrl', ['D2', 'V2', 'D1'], 25.3, 1.25, C],
  ['E.140', 'Q2.44', 'ctrl', ['D2'], 26.8, 1.1, C],
  ['Q2.44', 'Q1.21', 'ctrl', ['D2', 'V1', 'D1'], 28.1, 1.15, C],
  ['Q1.22', 'Q2.A1', 'ctrl', ['D2', 'V2', 'D1'], 29.5, 1.15, C],
  ['Q2.A2', 'Q1.A2', 'N', ['D2'], 30.9, 0.95, C, 'bridge'],
  // step 6 – feed and F1 -> Q1
  ['X0.L1', 'F1.1', 'L1', ['D1'], 33.0, 1.2, P],
  ['X0.L2', 'F1.3', 'L2', ['D1'], 33.15, 1.2, P],
  ['X0.L3', 'F1.5', 'L3', ['D1'], 33.3, 1.2, P],
  ['F1.2', 'Q1.1', 'L1', ['D2', 'V1', 'D1'], 35.0, 1.5, P],
  ['F1.4', 'Q1.3', 'L2', ['D2', 'V1', 'D1'], 35.15, 1.5, P],
  ['F1.6', 'Q1.5', 'L3', ['D2', 'V1', 'D1'], 35.3, 1.5, P],
  ['Q1.1', 'Q2.1', 'L1', 'bridgeTop', 37.4, 0.9, P],
  ['Q1.3', 'Q2.3', 'L2', 'bridgeTop', 37.55, 0.9, P],
  ['Q1.5', 'Q2.5', 'L3', 'bridgeTop', 37.7, 0.9, P],
  // step 7
  ['Q1.2', 'F3.1', 'L1', ['D2', 'V2', 'D1'], 40.4, 1.4, P],
  ['Q1.4', 'F3.3', 'L2', ['D2', 'V2', 'D1'], 40.55, 1.4, P],
  ['Q1.6', 'F3.5', 'L3', ['D2', 'V2', 'D1'], 40.7, 1.4, P],
  ['Q2.2', 'Q1.2', 'L1', ['D2'], 42.4, 1.2, P],
  ['Q2.4', 'Q1.6', 'L2', 'cross', 42.6, 1.25, P],
  ['Q2.6', 'Q1.4', 'L3', 'cross', 42.8, 1.25, P],
  ['F3.2', 'M1.U1', 'L1', ['D2', 'V2', 'D3'], 46.6, 1.5, P],
  ['F3.4', 'M1.V1', 'L2', ['D2', 'V2', 'D3'], 46.75, 1.5, P],
  ['F3.6', 'M1.W1', 'L3', ['D2', 'V2', 'D3'], 46.9, 1.5, P],
  ['X0.PE', 'M1.PE', 'PE', ['D1', 'V0', 'D3'], 48.5, 1.5, P],
];
for (const d of defs) preCount(d[0], d[1]);

function crossRoute(A, B, colorKey, z) {
  // Q2 bottom -> duct D2 -> rises under Q1 and crosses the partner conductor in front of the duct
  const ta = TERM[A], tb = TERM[B];
  const dxB = tb.k++ ? 0.17 : (tb.n > 1 ? -0.17 : 0);
  ta.k++;
  const lane = laneOf('D2');
  const y = ducts.D2.c - 1.9 + (lane % 9) * 0.47;
  const black = colorKey === 'L2';
  const riseX = black ? -26.2 : -25.0;
  const jogY = black ? 16.1 : 17.25;
  const zf = black ? 6.0 : 5.1;               // black passes in front of grey
  const xb = tb.p.x + dxB;
  return [
    ta.p.clone(), V(ta.p.x, ta.p.y - 0.75, ta.p.z), V(ta.p.x, 14.5, ta.p.z), V(ta.p.x, 14.5, z), V(ta.p.x, y, z),
    V(riseX, y, z), V(riseX, 14.5, z), V(riseX, 14.5, zf), V(riseX, jogY, zf), V(xb, jogY, zf),
    V(xb, tb.p.y - 0.75, zf), V(xb, tb.p.y - 0.75, tb.p.z), tb.p.clone(),
  ];
}

defs.forEach((d, i) => {
  const [A, B, colorKey, via, t0, dur, r, kind] = d;
  const z = r > 0.15 ? 1.3 + (i % 3) * 1.25 : 1.6 + (i % 5) * 0.85;
  let pts;
  if (via === 'bridgeTop') {
    const ta = TERM[A], tb = TERM[B];
    ta.k++; tb.k++;
    const j = ['L1', 'L2', 'L3'].indexOf(colorKey);
    const yb = RY + 5.6 + (2 - j) * 0.75;
    const zb = 4.4 + 0.0;
    pts = [ta.p.clone(), V(ta.p.x, ta.p.y + 0.75, ta.p.z), V(ta.p.x, yb, zb), V(tb.p.x, yb, zb), V(tb.p.x, tb.p.y + 0.75, tb.p.z), tb.p.clone()];
  } else if (via === 'cross') {
    pts = crossRoute(A, B, colorKey, z);
  } else pts = route(A, B, via, z);
  const R = r > 0.15 ? 0.8 : 0.5;
  const path = roundedPath(pts, R);
  const len = path.getLength();
  const segs = Math.max(30, Math.ceil(len * 7));
  const radial = 10;
  const geo = new THREE.TubeGeometry(path, segs, r, radial, false);
  let mat;
  if (COL[colorKey] === 'pe') {
    const t = peTex.clone(); t.needsUpdate = true; t.repeat.set(len / 1.2, 1);
    mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.42, emissive: 0x000000 });
  } else mat = wireMat(COL[colorKey]);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.visible = false;
  scene.add(mesh);
  const halo = new THREE.Mesh(new THREE.TubeGeometry(path, segs, r * 1.9, radial, false),
    new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.visible = false; scene.add(halo);
  // ferrules at both ends
  const fer = [];
  for (const [p, q] of [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]]) {
    const dir = q.clone().sub(p).normalize();
    const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.8, 14), mats.steel);
    f.position.copy(p.clone().add(dir.clone().multiplyScalar(0.25)));
    f.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    f.visible = false; scene.add(f); fer.push(f);
  }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 2.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xbff0ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  tip.visible = false; scene.add(tip);
  wire({ A, B, colorKey, t0, dur, r, mesh, halo, fer, tip, path, segs, radial, kind, len });
});

// energized sets for the function test
const ctrlCommon = ['X0.L>F2.1', 'F2.2>F3.21', 'F3.22>X18.2', 'X18.4>D.133', 'D.134>E.137', 'E.137>C.129'];
const keyOf = w => `${w.A}>${w.B}`;
const ENERGIZED = {
  Q1: new Set([...ctrlCommon, 'E.138>C.131', 'C.131>Q1.43', 'C.132>Q1.44', 'Q1.44>Q2.21', 'Q2.22>Q1.A1', 'Q1.A2>X0.N',
    'X0.L1>F1.1', 'X0.L2>F1.3', 'X0.L3>F1.5', 'F1.2>Q1.1', 'F1.4>Q1.3', 'F1.6>Q1.5', 'Q1.1>Q2.1', 'Q1.3>Q2.3', 'Q1.5>Q2.5',
    'Q1.2>F3.1', 'Q1.4>F3.3', 'Q1.6>F3.5', 'F3.2>M1.U1', 'F3.4>M1.V1', 'F3.6>M1.W1']),
  Q2: new Set([...ctrlCommon, 'C.130>E.139', 'E.139>Q2.43', 'E.140>Q2.44', 'Q2.44>Q1.21', 'Q1.22>Q2.A1', 'Q2.A2>Q1.A2', 'Q1.A2>X0.N',
    'X0.L1>F1.1', 'X0.L2>F1.3', 'X0.L3>F1.5', 'F1.2>Q1.1', 'F1.4>Q1.3', 'F1.6>Q1.5', 'Q1.1>Q2.1', 'Q1.3>Q2.3', 'Q1.5>Q2.5',
    'Q2.2>Q1.2', 'Q2.4>Q1.6', 'Q2.6>Q1.4', 'Q1.2>F3.1', 'Q1.4>F3.3', 'Q1.6>F3.5', 'F3.2>M1.U1', 'F3.4>M1.V1', 'F3.6>M1.W1']),
};

// ---------------------------------------------------------------- function test timing
const EV = {
  pressC: 52.0, q1On: 52.12, pressD: 54.7, q1Off: 54.78, pressE: 56.5, q2On: 56.62,
};
const pressDur = 0.5;
const q1On = t => t >= EV.q1On && t < EV.q1Off;
const q2On = t => t >= EV.q2On;
// motor angle integration (deterministic)
const OMEGA_MAX = 1.35;   // rev/s for the animation (readable at 30 fps)
const angleTable = [];
{
  let w = 0, a = 0; const dt = 0.001;
  for (let t = 0; t <= 61; t += dt) {
    const target = q1On(t) ? -OMEGA_MAX : q2On(t) ? OMEGA_MAX : 0;   // negative = clockwise seen from the shaft end
    const tau = target === 0 ? 0.42 : 0.3;
    w += (target - w) * (dt / tau);
    a += w * 2 * Math.PI * dt;
    if (Math.round(t * 1000) % 10 === 0) angleTable.push([a, w]);
  }
}
const motorState = t => angleTable[Math.max(0, Math.min(angleTable.length - 1, Math.round(t * 100)))];

// ---------------------------------------------------------------- camera keyframes
const KEYS = [
  { t: 0.0, x: 2, y: 10, h: 100 },
  { t: 3.8, x: 0, y: 11, h: 92 },
  { t: 5.0, x: -8, y: 29, h: 58 },
  { t: 10.6, x: -6, y: 27, h: 60 },
  { t: 11.8, x: 35, y: 21.5, h: 22 },
  { t: 14.2, x: 35, y: 21.5, h: 21 },
  { t: 15.4, x: 4, y: 24, h: 56 },
  { t: 23.2, x: 4, y: 24, h: 55 },
  { t: 24.2, x: 6, y: 23, h: 54 },
  { t: 32.2, x: 4, y: 24, h: 55 },
  { t: 33.2, x: -36, y: 31, h: 32 },
  { t: 39.8, x: -32, y: 29, h: 31 },
  { t: 40.8, x: -15, y: 22, h: 34 },
  { t: 42.3, x: -21, y: 19.5, h: 22 },
  { t: 43.8, x: -24.4, y: 18.2, h: 13.5, yaw: 0.24, pitch: 0.12 },
  { t: 46.0, x: -24.6, y: 18.2, h: 12.8, yaw: 0.3, pitch: 0.14 },
  { t: 47.0, x: -10, y: 5, h: 66 },
  { t: 48.3, x: -14, y: 10, h: 82 },
  { t: 50.3, x: -12, y: 10, h: 84 },
  { t: 51.6, x: 4, y: 9, h: 90 },
  { t: 58.5, x: 3, y: 9, h: 88 },
  { t: 60.0, x: 0, y: 10, h: 100 },
];
const ease = u => u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);
function camAt(t) {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].t <= t) i++;
  const a = KEYS[i], b = KEYS[Math.min(i + 1, KEYS.length - 1)];
  const u = b === a ? 0 : ease((t - a.t) / (b.t - a.t));
  const L = (k, d = 0) => (a[k] ?? d) + ((b[k] ?? d) - (a[k] ?? d)) * u;
  return { x: L('x'), y: L('y'), h: L('h'), yaw: L('yaw', 0), pitch: L('pitch', 0.07) };
}
function placeCamera(t) {
  const c = camAt(t);
  const dist = (c.h / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const target = V(c.x, c.y, 5);
  camera.position.set(target.x + dist * Math.sin(c.yaw) * Math.cos(c.pitch), target.y + dist * Math.sin(c.pitch), target.z + dist * Math.cos(c.yaw) * Math.cos(c.pitch));
  camera.lookAt(target);
  camera.updateMatrixWorld();
}

// ---------------------------------------------------------------- per-frame update
const easeIO = u => u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u);
const LIVE = new THREE.Color(0x6dff8f);
let lastWireCaption = null;
function update(t) {
  placeCamera(t);
  const energ = q1On(t) ? ENERGIZED.Q1 : q2On(t) ? ENERGIZED.Q2 : null;
  let active = null;
  for (const w of WIRES) {
    const u = (t - w.t0) / w.dur;
    if (u <= 0) { w.mesh.visible = w.halo.visible = w.tip.visible = false; w.fer.forEach(f => f.visible = false); continue; }
    const p = easeIO(Math.min(1, u));
    const seg = Math.max(1, Math.floor(p * w.segs));
    const count = seg * w.radial * 6;
    w.mesh.visible = true; w.mesh.geometry.setDrawRange(0, count);
    w.fer[0].visible = true; w.fer[1].visible = p >= 1;
    const glow = u < 1 ? 1 : Math.max(0, 1 - (t - (w.t0 + w.dur)) / 1.0);
    const live = energ && energ.has(keyOf(w)) ? 0.16 + 0.05 * Math.sin(t * 9) : 0;
    w.halo.visible = glow > 0.001 || live > 0;
    w.halo.geometry.setDrawRange(0, count);
    w.halo.material.color.copy(glow > 0.001 ? GLOW : LIVE);
    w.halo.material.opacity = Math.max(0.34 * glow, live);
    w.mesh.material.emissive.copy(GLOW).multiplyScalar(0.38 * glow);
    w.tip.visible = u < 1;
    if (u < 1) { w.tip.position.copy(w.path.getPointAt(Math.min(1, seg / w.segs))); }
    if (u < 1 + 1.0) active = w;
  }
  // buttons
  for (const [g, tp] of [['C', EV.pressC], ['D', EV.pressD], ['E', EV.pressE]]) {
    const u = (t - tp) / pressDur;
    const d = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
    buttons[g].g.position.z = 6.5 - 0.42 * Math.min(1, d * 1.6);
  }
  // contactors
  for (const [name, on, tOn] of [['Q1', q1On(t), EV.q1On], ['Q2', q2On(t), EV.q2On]]) {
    const c = contactors[name];
    c.flag.position.y = on ? RY - 1.25 : RY - 0.7;
    c.flag.material.color.set(on ? 0x2fb84a : 0xf4f4f4);
    const tk = [tOn, name === 'Q1' ? EV.q1Off : 999].map(x => t - x).filter(x => x >= 0 && x < 0.12);
    c.g.position.z = tk.length ? -0.06 * Math.sin(tk[0] / 0.12 * Math.PI * 3) : 0;
  }
  const [ang] = motorState(t);
  motor.rot.rotation.z = ang;
  return active;
}

// ---------------------------------------------------------------- 2D overlay
const out = document.createElement('canvas');
out.width = W; out.height = H;
const octx = out.getContext('2d');
const S = W / 1920;           // overlay scale
function stepAt(t) { let s = STEPS[0]; for (const x of STEPS) if (t >= x.t) s = x; return s; }
function nice(n) { return n.replace('.', ' : ').replace('X0 : ', 'X0 : ').replace('X18 : ', 'NOT-HALT X18 : '); }
function project(v) { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H]; }

function drawOverlay(t, active) {
  octx.save();
  const st = stepAt(t);
  const since = t - st.t;
  const a = Math.min(1, since / 0.45);
  // step badge
  const x0 = 46 * S, y0 = 42 * S;
  octx.globalAlpha = a;
  octx.font = `600 ${22 * S}px Inter`;
  let titleW = Math.max(octx.measureText(st.title).width, 120 * S);
  octx.font = `600 ${15 * S}px Inter`;
  titleW = Math.max(titleW, octx.measureText(`STEP ${st.n} OF 8   ·   REVERSING CONTACTOR CIRCUIT`).width);
  const bw = 132 * S + titleW + 44 * S, bh = 92 * S;
  octx.fillStyle = 'rgba(18,22,28,0.78)';
  octx.beginPath(); octx.roundRect(x0, y0, bw, bh, 14 * S); octx.fill();
  octx.fillStyle = '#56d8ff';
  octx.beginPath(); octx.roundRect(x0, y0, 112 * S, bh, [14 * S, 0, 0, 14 * S]); octx.fill();
  octx.fillStyle = '#0d1a22';
  octx.textAlign = 'center'; octx.textBaseline = 'alphabetic';
  octx.font = `700 ${15 * S}px Inter`; octx.fillText('STEP', x0 + 56 * S, y0 + 30 * S);
  octx.font = `800 ${44 * S}px Inter`; octx.fillText(String(st.n), x0 + 56 * S, y0 + 76 * S);
  octx.textAlign = 'left';
  octx.fillStyle = '#9fb3c2'; octx.font = `600 ${15 * S}px Inter`;
  octx.fillText(`STEP ${st.n} OF 8   ·   REVERSING CONTACTOR CIRCUIT`, x0 + 134 * S, y0 + 34 * S);
  octx.fillStyle = '#ffffff'; octx.font = `600 ${22 * S}px Inter`;
  octx.fillText(st.title, x0 + 134 * S, y0 + 66 * S);
  octx.globalAlpha = 1;

  // current conductor caption
  let cap = null;
  if (active && t < active.t0 + active.dur + 1.0) {
    const k = active.colorKey;
    const names = { ctrl: 'control wire', N: 'neutral N (blue)', L1: 'L1 brown', L2: 'L2 black', L3: 'L3 grey', PE: 'PE green-yellow' };
    cap = { text: `${nice(active.A)}   →   ${nice(active.B)}`, sub: names[k], color: k };
  }
  if (t >= 43.6 && t < 46.4) cap = { text: 'Q2 → Q1:   L1 straight,   L2 ↔ L3 swapped', sub: 'phase sequence reversed  →  motor runs the other way', color: 'X' };
  if (cap) {
    octx.font = `600 ${24 * S}px Inter`;
    const tw = octx.measureText(cap.text).width;
    octx.font = `500 ${16 * S}px Inter`;
    const sw = octx.measureText(cap.sub).width;
    const w = Math.max(tw, sw) + 90 * S, h = 78 * S;
    const cx = W - w - 46 * S, cy = H - h - 46 * S;
    octx.fillStyle = 'rgba(18,22,28,0.78)';
    octx.beginPath(); octx.roundRect(cx, cy, w, h, 12 * S); octx.fill();
    const chip = { ctrl: '#1a1a1a', N: '#2b6fd6', L1: '#7a4423', L2: '#161616', L3: '#9a9c9e', PE: '#3a9a3a', X: '#56d8ff' }[cap.color];
    octx.fillStyle = chip; octx.beginPath(); octx.roundRect(cx + 24 * S, cy + 20 * S, 22 * S, 38 * S, 5 * S); octx.fill();
    octx.strokeStyle = 'rgba(255,255,255,0.6)'; octx.lineWidth = 1.5 * S; octx.stroke();
    if (cap.color === 'PE') { octx.fillStyle = '#f1d21c'; octx.fillRect(cx + 24 * S, cy + 33 * S, 22 * S, 9 * S); }
    octx.fillStyle = '#fff'; octx.textAlign = 'left';
    octx.font = `600 ${24 * S}px Inter`; octx.fillText(cap.text, cx + 62 * S, cy + 36 * S);
    octx.fillStyle = '#a9bccb'; octx.font = `500 ${16 * S}px Inter`; octx.fillText(cap.sub, cx + 62 * S, cy + 60 * S);
  }

  if (t >= 43.9 && t < 46.4) {
    const al = Math.min(1, (t - 43.9) / 0.3, (46.4 - t) / 0.3);
    octx.globalAlpha = al;
    for (const [txt, p, col, dx] of [['L2  black', V(-25.8, 16.1, 6.0), '#161616', -1], ['L3  grey', V(-25.2, 17.25, 5.1), '#9a9c9e', 1]]) {
      const [sx, sy] = project(p);
      octx.font = `700 ${20 * S}px Inter`;
      const w = octx.measureText(txt).width + 40 * S, h = 36 * S;
      const bx = dx < 0 ? sx - 230 * S - w : sx + 230 * S, by = sy - h / 2 + (dx < 0 ? 60 : -60) * S;
      octx.strokeStyle = 'rgba(255,255,255,0.95)'; octx.lineWidth = 3 * S;
      octx.beginPath(); octx.moveTo(sx, sy); octx.lineTo(dx < 0 ? bx + w : bx, by + h / 2); octx.stroke();
      octx.fillStyle = '#fff'; octx.beginPath(); octx.arc(sx, sy, 6 * S, 0, Math.PI * 2); octx.fill();
      octx.fillStyle = 'rgba(18,22,28,0.85)'; octx.beginPath(); octx.roundRect(bx, by, w, h, 8 * S); octx.fill();
      octx.fillStyle = col; octx.strokeStyle = '#fff'; octx.lineWidth = 1.5 * S;
      octx.beginPath(); octx.roundRect(bx + 10 * S, by + 9 * S, 14 * S, 18 * S, 3 * S); octx.fill(); octx.stroke();
      octx.fillStyle = '#fff'; octx.textAlign = 'left'; octx.fillText(txt, bx + 32 * S, by + 25 * S);
    }
    octx.globalAlpha = 1;
  }
  // function test annotations
  if (t >= T_.s8) {
    const evs = [
      [EV.pressC, EV.pressD, 'C pressed  →  Q1 picks up and holds itself  →  motor turns CLOCKWISE', '#5fe08a'],
      [EV.pressD, EV.pressE, 'D (OFF) pressed  →  Q1 drops out  →  motor stops', '#ff6b6b'],
      [EV.pressE, 99, 'E pressed  →  Q2 picks up  →  motor turns COUNTER-CLOCKWISE', '#5fe08a'],
    ];
    for (const [a0, a1, txt, col] of evs) {
      if (t >= a0 && t < a1) {
        const al = Math.min(1, (t - a0) / 0.3);
        octx.globalAlpha = al;
        octx.font = `600 ${24 * S}px Inter`;
        const w = octx.measureText(txt).width + 70 * S, h = 60 * S;
        const cx = W - w - 46 * S, cy = H - h - 46 * S;
        octx.fillStyle = 'rgba(18,22,28,0.8)'; octx.beginPath(); octx.roundRect(cx, cy, w, h, 12 * S); octx.fill();
        octx.fillStyle = col; octx.beginPath(); octx.arc(cx + 30 * S, cy + h / 2, 8 * S, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = '#fff'; octx.textAlign = 'left'; octx.fillText(txt, cx + 50 * S, cy + 39 * S);
        octx.globalAlpha = 1;
      }
    }
    // pressed-button ring
    for (const [g, tp] of [['C', EV.pressC], ['D', EV.pressD], ['E', EV.pressE]]) {
      const u = (t - tp) / 0.9;
      if (u > 0 && u < 1) {
        const [sx, sy] = project(V(buttons[g].x, buttons[g].y, 7.5));
        const [ex] = project(V(buttons[g].x + 1.8, buttons[g].y, 7.5));
        const r = (ex - sx) * (1.1 + 0.9 * u);
        octx.strokeStyle = `rgba(86,216,255,${1 - u})`; octx.lineWidth = 4 * S;
        octx.beginPath(); octx.arc(sx, sy, r, 0, Math.PI * 2); octx.stroke();
      }
    }
    // contactor ON tags
    for (const [name, on] of [['Q1', q1On(t)], ['Q2', q2On(t)]]) {
      if (!on) continue;
      const [sx, sy] = project(V(contactors[name].x, RY + 5.2, 9));
      const txt = `${name}  ON`;
      octx.font = `700 ${18 * S}px Inter`;
      const w = octx.measureText(txt).width + 26 * S;
      octx.fillStyle = 'rgba(47,184,74,0.92)'; octx.beginPath(); octx.roundRect(sx - w / 2, sy - 40 * S, w, 30 * S, 8 * S); octx.fill();
      octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.fillText(txt, sx, sy - 19 * S);
    }
    // rotation arrow around the coupling
    const [, wv] = motorState(t);
    const mag = Math.min(1, Math.abs(wv) / OMEGA_MAX);
    if (mag > 0.05) {
      const [cx, cy] = project(motor.center);
      const [ex] = project(motor.center.clone().add(V(motor.R, 0, 0)));
      const r = (ex - cx) * 1.55;
      const cw = wv < 0;
      octx.globalAlpha = mag;
      octx.strokeStyle = cw ? '#5fe08a' : '#ffb84d'; octx.fillStyle = octx.strokeStyle;
      octx.lineWidth = 6 * S; octx.lineCap = 'round';
      const a0 = -Math.PI * 0.85, a1 = -Math.PI * 0.15;
      octx.beginPath(); octx.arc(cx, cy, r, a0, a1); octx.stroke();
      const tipA = cw ? a1 : a0;
      const tx = cx + r * Math.cos(tipA), ty = cy + r * Math.sin(tipA);
      const tang = cw ? tipA + Math.PI / 2 : tipA - Math.PI / 2;
      const hs = 18 * S;
      octx.beginPath();
      octx.moveTo(tx + Math.cos(tang) * hs, ty + Math.sin(tang) * hs);
      octx.lineTo(tx + Math.cos(tang + 2.5) * hs, ty + Math.sin(tang + 2.5) * hs);
      octx.lineTo(tx + Math.cos(tang - 2.5) * hs, ty + Math.sin(tang - 2.5) * hs);
      octx.fill();
      octx.font = `700 ${22 * S}px Inter`; octx.textAlign = 'left';
      const lbl = cw ? 'CLOCKWISE' : 'COUNTER-CLOCKWISE', sub = cw ? 'right-hand run (Rechtslauf)' : 'left-hand run (Linkslauf)';
      const lx = cx + r * 1.45, ly = cy - 6 * S;
      const lw = Math.max(octx.measureText(lbl).width, (octx.font = `500 ${16 * S}px Inter`, octx.measureText(sub).width)) + 30 * S;
      octx.fillStyle = 'rgba(18,22,28,0.8)'; octx.beginPath(); octx.roundRect(lx - 15 * S, ly - 30 * S, lw, 64 * S, 10 * S); octx.fill();
      octx.fillStyle = cw ? '#5fe08a' : '#ffb84d'; octx.font = `700 ${22 * S}px Inter`; octx.fillText(lbl, lx, ly - 2 * S);
      octx.fillStyle = '#d6e0e8'; octx.font = `500 ${16 * S}px Inter`; octx.fillText(sub, lx, ly + 22 * S);
      octx.globalAlpha = 1;
    }
  }
  // fade from black at the start
  if (t < 0.7) { octx.fillStyle = `rgba(0,0,0,${1 - t / 0.7})`; octx.fillRect(0, 0, W, H); }
  octx.restore();
}

// ---------------------------------------------------------------- API used by the renderer
window.renderFrame = (t, quality = 0.93) => {
  const active = update(t);
  renderer.render(scene, camera);
  octx.clearRect(0, 0, W, H);
  octx.drawImage(renderer.domElement, 0, 0);
  drawOverlay(t, active);
  return out.toDataURL('image/jpeg', quality);
};
window.TIMELINE = {
  wires: WIRES.map(w => ({ t0: w.t0, dur: w.dur, main: w.r > 0.15 })),
  ev: EV, end: T_.end,
};
window.READY = true;
