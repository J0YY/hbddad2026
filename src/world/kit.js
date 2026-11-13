import * as THREE from 'three';
import { S } from '../core/state.js';

// Shared world registry.
export const W = {
  scene: null,
  root: new THREE.Group(),
  colliders: [], // { x0, x1, z0, z1, y0, y1, on }
  vlights: [], // virtual lights assigned to a fixed pool of real ones
  reactives: [], // (dt, snap) => void
  items: [], // interactables
  areas: [],
  anchors: {},
  marks: {}, // named positions for the compass
  tick: [], // (dt, t) => void, always runs
  ground: null, // (x, z) => y outdoors
};

/* ---------------- textures ---------------- */

const texCache = new Map();
export function canvasTex(key, w, h, draw, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

// Small deterministic random.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function noise(g, w, h, amt, seed, alpha = 0.06) {
  const r = rng(seed);
  for (let i = 0; i < amt; i++) {
    const v = r() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

export const TEX = {
  wood: (base = '#6b4a32', key = 'wood', rep = [1, 1]) =>
    canvasTex(`${key}`, 512, 512, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      const r = rng(7);
      const plank = 64;
      for (let y = 0; y < h; y += plank) {
        const shade = (r() - 0.5) * 30;
        g.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 220 : 0},${shade > 0 ? 180 : 0},${Math.abs(shade) / 255})`;
        g.fillRect(0, y, w, plank);
        for (let k = 0; k < 40; k++) {
          g.strokeStyle = `rgba(30,15,5,${0.05 + r() * 0.08})`;
          g.lineWidth = 0.6 + r();
          g.beginPath();
          const yy = y + r() * plank;
          g.moveTo(0, yy);
          g.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 8, w * 0.6, yy + (r() - 0.5) * 8, w, yy + (r() - 0.5) * 6);
          g.stroke();
        }
        g.fillStyle = 'rgba(20,10,4,0.55)';
        g.fillRect(0, y, w, 2);
        const off = r() * w;
        g.fillRect(off, y, 2, plank);
      }
      noise(g, w, h, 4000, 3);
    }, { repeat: rep }),
  plain: (base, key, amt = 3000, alpha = 0.05) =>
    canvasTex(`plain-${key}`, 256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, amt, key.length * 13, alpha); }),
  carpet: (base, key) =>
    canvasTex(`carpet-${key}`, 256, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, 18000, 11, 0.12);
    }, { repeat: [4, 4] }),
  tiles: (a, b, key, n = 8) =>
    canvasTex(`tiles-${key}`, 512, 512, (g, w, h) => {
      const s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s);
      }
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
      for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
      noise(g, w, h, 6000, 5, 0.05);
    }),
  panel: (base, key) =>
    canvasTex(`panel-${key}`, 512, 512, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
      for (let x = 0; x < w; x += 128) { g.strokeRect(x + 10, 10, 108, h * 0.55); g.strokeRect(x + 10, h * 0.62, 108, h * 0.33); }
      g.strokeStyle = 'rgba(255,240,210,0.08)'; g.lineWidth = 2;
      for (let x = 0; x < w; x += 128) { g.strokeRect(x + 14, 14, 100, h * 0.55 - 8); }
      noise(g, w, h, 4000, 9, 0.04);
    }),
};

/* ---------------- materials ---------------- */

const matCache = new Map();
export function M(color, o = {}) {
  const key = JSON.stringify([color, o.r, o.m, o.e, o.ei, o.map?.uuid, o.t, o.o, o.side, o.flat]);
  if (!o.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.r ?? 0.8,
    metalness: o.m ?? 0,
    emissive: o.e ?? 0x000000,
    emissiveIntensity: o.ei ?? 1,
    map: o.map ?? null,
    transparent: o.t ?? false,
    opacity: o.o ?? 1,
    side: o.side ?? THREE.FrontSide,
    flatShading: o.flat ?? false,
  });
  if (!o.unique) matCache.set(key, m);
  return m;
}

export const PAL = {
  brass: () => M(0xb08a4a, { r: 0.35, m: 0.85 }),
  darkBrass: () => M(0x6d5530, { r: 0.45, m: 0.8 }),
  steel: () => M(0x8a8f93, { r: 0.4, m: 0.7 }),
  black: () => M(0x161616, { r: 0.6 }),
  paper: () => M(0xeee8da, { r: 0.95 }),
  glass: () => M(0xa9c4cc, { r: 0.05, m: 0.1, t: true, o: 0.18 }),
  joyBlue: () => M(0x3b6db3, { r: 0.7 }),
};

/* ---------------- geometry helpers ---------------- */

// box(parent, [w,h,d], material, [x, yBottom, z], opts)
export function box(parent, [w, h, d], mat, [x, y, z], o = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (o.uv) scaleUV(g, w, h, d, o.uv);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + h / 2, z);
  if (o.ry) m.rotation.y = o.ry;
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.recv ?? true;
  parent.add(m);
  if (o.solid) solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h);
  return m;
}

export function cyl(parent, rt, rb, h, mat, [x, y, z], o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 20), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = true;
  parent.add(m);
  if (o.solid) solid(x - rb, x + rb, z - rb, z + rb, y, y + h);
  return m;
}

export function sphere(parent, r, mat, [x, y, z], o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg ?? 20, o.seg2 ?? 14), mat);
  m.position.set(x, y, z);
  m.castShadow = o.cast ?? true;
  parent.add(m);
  return m;
}

// World-space UV scaling so textures tile at a constant density (uv = metres per repeat).
function scaleUV(g, w, h, d, k) {
  const uv = g.attributes.uv;
  const n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    let su, sv;
    if (nx > 0.5) { su = d; sv = h; } else if (ny > 0.5) { su = w; sv = d; } else { su = w; sv = h; }
    uv.setXY(i, uv.getX(i) * su / k, uv.getY(i) * sv / k);
  }
}

export function plane(parent, w, h, mat, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function solid(x0, x1, z0, z1, y0 = 0, y1 = 3) {
  const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, on: true };
  W.colliders.push(c);
  return c;
}

/* ---------------- rooms ---------------- */

const WALL_T = 0.14;
const builtFrames = new Set();

// doors: [{ side: 'n'|'s'|'e'|'w', at, w, h }]
export function room(def) {
  const { x0, x1, z0, z1, h, floor, wall, ceil, doors = [], skipCeil, trim } = def;
  const g = new THREE.Group();
  W.root.add(g);
  const W_ = x1 - x0, D_ = z1 - z0;
  const fl = box(g, [W_, 0.1, D_], floor, [(x0 + x1) / 2, -0.1, (z0 + z1) / 2], { cast: false, uv: def.floorUV ?? 0 });
  if (def.floorUV) fl.material = floor;
  if (!skipCeil) box(g, [W_, 0.1, D_], ceil, [(x0 + x1) / 2, h, (z0 + z1) / 2], { cast: false });
  const sides = {
    n: { a: x0, b: x1, fixed: z0, axis: 'x', inward: 1 },
    s: { a: x0, b: x1, fixed: z1, axis: 'x', inward: -1 },
    w: { a: z0, b: z1, fixed: x0, axis: 'z', inward: 1 },
    e: { a: z0, b: z1, fixed: x1, axis: 'z', inward: -1 },
  };
  for (const [k, s] of Object.entries(sides)) {
    if (def.skip?.includes(k)) continue;
    const gaps = doors.filter((d) => d.side === k).map((d) => [d.at - d.w / 2, d.at + d.w / 2, d.h ?? 2.5]).sort((p, q) => p[0] - q[0]);
    let cur = s.a;
    const segs = [];
    for (const [ga, gb, gh] of gaps) {
      if (ga > cur) segs.push([cur, ga, 0, h]);
      segs.push([ga, gb, gh, h]); // lintel
      cur = gb;
    }
    if (cur < s.b) segs.push([cur, s.b, 0, h]);
    const off = s.fixed + s.inward * WALL_T / 2;
    for (const [a, b, ya, yb] of segs) {
      if (yb - ya < 0.01 || b - a < 0.01) continue;
      const len = b - a, mid = (a + b) / 2;
      const size = s.axis === 'x' ? [len, yb - ya, WALL_T] : [WALL_T, yb - ya, len];
      const pos = s.axis === 'x' ? [mid, ya, off] : [off, ya, mid];
      const m = box(g, size, wall, pos, { solid: ya < 2, cast: false, uv: def.wallUV ?? 0 });
      if (trim && ya === 0) {
        // skirting board
        const ts = s.axis === 'x' ? [len, 0.14, 0.03] : [0.03, 0.14, len];
        const tp = s.axis === 'x' ? [mid, 0, off + s.inward * (WALL_T / 2 + 0.015)] : [off + s.inward * (WALL_T / 2 + 0.015), 0, mid];
        box(g, ts, trim, tp, { cast: false });
      }
    }
    // door frames: built once per doorway (both rooms list the same door), and set slightly
    // into the opening so no face lines up exactly with a wall end or the lintel (that flickers)
    for (const [ga, gb, gh] of gaps) {
      const key = `${s.axis}:${s.fixed}:${ga.toFixed(2)}`;
      if (builtFrames.has(key)) continue;
      builtFrames.add(key);
      const fm = def.frame || PAL.darkBrass();
      const fz = s.fixed;
      const jamb = (c) => (s.axis === 'x' ? box(g, [0.08, gh, 0.34], fm, [c, 0, fz]) : box(g, [0.34, gh, 0.08], fm, [fz, 0, c]));
      jamb(ga + 0.03); jamb(gb - 0.03);
      if (s.axis === 'x') box(g, [gb - ga + 0.02, 0.1, 0.34], fm, [(ga + gb) / 2, gh - 0.04, fz]);
      else box(g, [0.34, 0.1, gb - ga + 0.02], fm, [fz, gh - 0.04, (ga + gb) / 2]);
    }
  }
  return g;
}

/* ---------------- doors ---------------- */

// A sliding door filling a gap. isOpen: () => bool.
export function slidingDoor(parent, { side, at, fixed, w, h = 2.5, mat, isOpen, slide = 1, frameMat }) {
  const along = side === 'n' || side === 's' ? 'x' : 'z';
  const pivot = new THREE.Group();
  parent.add(pivot);
  const panelW = w;
  const size = along === 'x' ? [panelW, h, 0.08] : [0.08, h, panelW];
  const pos = along === 'x' ? [at, 0, fixed] : [fixed, 0, at];
  const panel = box(pivot, size, mat, pos, { cast: false });
  if (frameMat) {
    const s2 = along === 'x' ? [panelW, 0.06, 0.1] : [0.1, 0.06, panelW];
    box(panel, s2, frameMat, [0, h / 2 - 0.06, 0]);
    box(panel, s2, frameMat, [0, -h / 2, 0]);
  }
  const col = along === 'x' ? solid(at - w / 2, at + w / 2, fixed - 0.2, fixed + 0.2, 0, h) : solid(fixed - 0.2, fixed + 0.2, at - w / 2, at + w / 2, 0, h);
  const state = { t: 0 };
  W.reactives.push((dt, snap) => {
    const target = isOpen() ? 1 : 0;
    const speed = S.settings.reduced ? 3 : 1.1;
    state.t = snap ? target : state.t + Math.sign(target - state.t) * Math.min(Math.abs(target - state.t), dt * speed);
    const e = state.t * state.t * (3 - 2 * state.t);
    const d = e * (panelW + 0.05) * slide;
    if (along === 'x') panel.position.x = at + d; else panel.position.z = at + d;
    col.on = state.t < 0.85;
    panel.visible = state.t < 0.999;
  });
  return { panel, state };
}

/* ---------------- lights ---------------- */

// Virtual point light: { pos, color, intensity, dist, on: () => bool, k }
export function vlight(pos, color, intensity, { dist = 12, on = () => true, flicker = 0 } = {}) {
  const l = { pos: new THREE.Vector3(...pos), color: new THREE.Color(color), intensity, dist, on, k: on() ? 1 : 0, flicker };
  W.vlights.push(l);
  return l;
}

/* ---------------- interactables ---------------- */

// { id, pos:[x,y,z], obj, reach, label: string|fn, when: fn, use: fn, verb }
export function item(def) {
  const it = { reach: 2.1, when: () => true, ...def };
  it.p = new THREE.Vector3(...def.pos);
  W.items.push(it);
  return it;
}

export function mark(name, pos) { W.marks[name] = new THREE.Vector3(...pos); }

// Show/hide an object based on a predicate, with a quick scale pop.
export function showWhen(obj, pred) {
  obj.visible = pred();
  W.reactives.push(() => { obj.visible = pred(); });
}

/* ---------------- text on canvas (signage, screens) ---------------- */

export function labelTex(key, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const redraw = (...a) => { draw(g, w, h, ...a); t.needsUpdate = true; };
  redraw();
  return { tex: t, redraw, canvas: c, g };
}

export const FONT = {
  hud: '"Sofia Sans Semi Condensed", "Noto Sans SC", "Arial Narrow"',
  wide: '"Sofia Sans", "Noto Sans SC"',
  mono: '"Courier Prime", "Noto Sans SC", "Courier New"',
  hand: '"Nanum Pen Script", cursive',
};
