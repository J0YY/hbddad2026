import * as THREE from 'three';
import { M, PAL, box, cyl, sphere, labelTex, FONT, rng, W, vlight, item } from './kit.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L } from '../game/i18n.js';

export function chair(parent, x, z, ry, { seat = 0x4a2e22, frame = 0x2a1c14, back = true } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  parent.add(g);
  const fm = M(frame, { r: 0.6 });
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(g, [0.04, 0.45, 0.04], fm, [a, 0, b]);
  box(g, [0.48, 0.07, 0.46], M(seat, { r: 0.55 }), [0, 0.45, 0]);
  if (back) {
    box(g, [0.46, 0.5, 0.05], M(seat, { r: 0.55 }), [0, 0.55, -0.21]);
    box(g, [0.04, 0.55, 0.04], fm, [-0.21, 0.45, -0.22]);
    box(g, [0.04, 0.55, 0.04], fm, [0.21, 0.45, -0.22]);
  }
  return g;
}

export function plant(parent, x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  parent.add(g);
  cyl(g, 0.2, 0.15, 0.38, M(0x8a4b32, { r: 0.85 }), [0, 0, 0]);
  const leaf = M(0x3f5a34, { r: 0.8, flat: true });
  const r = rng(Math.round(x * 100 + z));
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + r() * 0.1, 0), leaf);
    m.position.set((r() - 0.5) * 0.35, 0.55 + r() * 0.55, (r() - 0.5) * 0.35);
    m.scale.set(1, 1.4, 0.6);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

export function bookshelf(parent, x, z, ry, w = 1.6, h = 2.2) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  parent.add(g);
  const wood = M(0x3a2618, { r: 0.7 });
  box(g, [w, h, 0.04], wood, [0, 0, -0.17]);
  box(g, [0.04, h, 0.36], wood, [-w / 2, 0, 0]);
  box(g, [0.04, h, 0.36], wood, [w / 2, 0, 0]);
  const rows = 5;
  const r = rng(Math.round(Math.abs(x * 31 + z * 17)));
  const colors = [0x6b2e2a, 0x2d3f55, 0x5b5236, 0x34503f, 0x7c6a4a, 0x3a3030, 0x8b7d64, 0x4a3b55];
  const mats = colors.map((c) => M(c, { r: 0.75 }));
  for (let i = 0; i <= rows; i++) {
    const y = (i * (h - 0.05)) / rows;
    box(g, [w, 0.035, 0.36], wood, [0, y, 0]);
    if (i === rows) break;
    let bx = -w / 2 + 0.05;
    while (bx < w / 2 - 0.12) {
      const bw = 0.03 + r() * 0.045;
      const bh = 0.22 + r() * 0.13;
      if (r() < 0.08) { bx += 0.12; continue; }
      const b = box(g, [bw, bh, 0.22 + r() * 0.06], mats[Math.floor(r() * mats.length)], [bx + bw / 2, y + 0.035, 0.02]);
      if (r() < 0.1) b.rotation.z = 0.15;
      b.castShadow = false;
      bx += bw + 0.004;
    }
  }
  return g;
}

// Banker's lamp with a green shade. Returns the light handle.
export function bankerLamp(parent, x, y, z, ry = 0, on = () => true) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  cyl(g, 0.08, 0.1, 0.03, PAL.brass(), [0, 0, 0]);
  cyl(g, 0.012, 0.012, 0.32, PAL.brass(), [0, 0.03, 0]);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 24, 1, true, 0, Math.PI), M(0x1f5a3c, { r: 0.25, m: 0.2, side: THREE.DoubleSide }));
  shade.rotation.z = Math.PI / 2;
  shade.rotation.y = Math.PI / 2;
  shade.position.set(0, 0.36, 0);
  shade.castShadow = true;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 12), M(0xfff1d0, { e: 0xffd59a, ei: 3 }));
  bulb.rotation.z = Math.PI / 2;
  bulb.position.set(0, 0.32, 0);
  g.add(bulb);
  const wp = new THREE.Vector3(0, 0.25, 0.05).applyMatrix4(new THREE.Matrix4().makeRotationY(ry)).add(new THREE.Vector3(x, y, z));
  return vlight([wp.x, wp.y, wp.z], 0xffc98a, 3.2, { dist: 6, on });
}

// Pendant or wall light fixture that glows when on.
export function fixture(parent, [x, y, z], color, intensity, on = () => true, { dist = 10, kind = 'pendant', shade = 0x1d1d1b } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const bulbMat = M(0xffffff, { e: color, ei: 0, unique: true });
  if (kind === 'pendant') {
    cyl(g, 0.006, 0.006, 0.6, PAL.black(), [0, 0, 0]);
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 24, 1, true), M(shade, { r: 0.4, m: 0.6, side: THREE.DoubleSide }));
    s.position.y = -0.05;
    g.add(s);
    sphere(g, 0.06, bulbMat, [0, -0.1, 0], { cast: false });
  } else if (kind === 'bulb') {
    sphere(g, 0.05, bulbMat, [0, 0, 0], { cast: false });
  } else if (kind === 'strip') {
    box(g, [1.2, 0.04, 0.08], bulbMat, [0, 0, 0], { cast: false });
  }
  // the light itself hangs well below the fitting so ceilings don't blow out
  const l = vlight([x, y - (kind === 'bulb' ? 0.15 : 0.9), z], color, intensity, { dist: dist + 0.75, on });
  W.reactives.push(() => { bulbMat.emissiveIntensity = 2.5 * l.k; });
  return { g, light: l, mat: bulbMat };
}

// Porter: a brass-and-cream receipt printer with a little display.
export function porterUnit(parent, [x, y, z], ry = 0, { wall = false } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  const body = M(0xe6dfcf, { r: 0.5 });
  box(g, [0.42, 0.2, 0.3], body, [0, 0, 0]);
  box(g, [0.44, 0.04, 0.32], PAL.brass(), [0, 0.2, 0]);
  box(g, [0.3, 0.012, 0.03], PAL.black(), [0, 0.15, 0.15]);
  const disp = labelTex('porter-' + x + z, 256, 64, (c, w, h, text = 'PORTER') => {
    c.fillStyle = '#0d1410'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d7e8c9';
    c.font = `700 28px ${FONT.mono}`;
    c.textBaseline = 'middle';
    c.fillText(text, 14, h / 2 + 2);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.055), M(0xffffff, { map: disp.tex, e: 0xffffff, ei: 0.6, unique: true }));
  screen.material.emissiveMap = disp.tex;
  screen.position.set(-0.05, 0.1, 0.151);
  g.add(screen);
  // paper curl
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.18), M(0xf6f3ec, { r: 0.95, side: THREE.DoubleSide }));
  paper.position.set(0, 0.28, 0.08);
  paper.rotation.x = -0.35;
  g.add(paper);
  const led = sphere(g, 0.012, M(0xffffff, { e: 0x86d38a, ei: 2, unique: true }), [0.16, 0.1, 0.152], { cast: false });
  if (wall) box(g, [0.5, 0.06, 0.36], PAL.darkBrass(), [0, -0.06, 0]);
  return { g, disp, paper, led };
}

// Engraved brass token. kind: bell | chip | racket | ladle | star
const glyphs = {
  bell: (c) => { c.beginPath(); c.moveTo(-28, 22); c.quadraticCurveTo(-26, -26, 0, -30); c.quadraticCurveTo(26, -26, 28, 22); c.closePath(); c.stroke(); c.beginPath(); c.arc(0, 30, 6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(-36, 22); c.lineTo(36, 22); c.stroke(); },
  chip: (c) => { c.strokeRect(-22, -22, 44, 44); for (let i = -14; i <= 14; i += 14) { c.beginPath(); c.moveTo(i, -22); c.lineTo(i, -34); c.moveTo(i, 22); c.lineTo(i, 34); c.moveTo(-22, i); c.lineTo(-34, i); c.moveTo(22, i); c.lineTo(34, i); c.stroke(); } },
  racket: (c) => { c.beginPath(); c.ellipse(-6, -10, 20, 26, -0.6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(8, 10); c.lineTo(30, 34); c.stroke(); c.beginPath(); c.arc(26, -26, 6, 0, Math.PI * 2); c.stroke(); },
  ladle: (c) => { c.beginPath(); c.arc(-10, 12, 18, 0, Math.PI); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(6, 12); c.quadraticCurveTo(20, -20, 30, -34); c.stroke(); },
  star: (c) => { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 34; const a = -Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.stroke(); },
};
export function drawGlyph(c, kind, color = '#3a2a12', lw = 5) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  glyphs[kind](c);
  c.restore();
}
export function token(parent, kind, [x, y, z]) {
  const tex = labelTex('tok-' + kind, 128, 128, (c, w, h) => {
    c.fillStyle = '#b8924e'; c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2);
    drawGlyph(c, kind, '#5a4220', 6);
    c.setTransform(1, 0, 0, 1, 0, 0);
  });
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const rim = M(0xb8924e, { r: 0.3, m: 0.9 });
  const face = M(0xffffff, { r: 0.35, m: 0.85, map: tex.tex });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 32), [rim, face, face]);
  coin.position.y = 0.006;
  coin.castShadow = true;
  g.add(coin);
  // slow spin and glint so it reads as a pickup
  W.tick.push((dt, t) => { if (g.visible) { coin.rotation.y = t * 1.2; coin.position.y = 0.04 + Math.sin(t * 2) * 0.01; } });
  return g;
}

// Folded note with Joy's blue corner.
export function note(parent, [x, y, z], ry = 0, { blue = true, w = 0.18, d = 0.13 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  box(g, [w, 0.006, d], PAL.paper(), [0, 0, 0], { cast: false });
  if (blue) {
    const tri = new THREE.Mesh(new THREE.CircleGeometry(0.035, 3), PAL.joyBlue());
    tri.rotation.x = -Math.PI / 2;
    tri.rotation.z = Math.PI / 4;
    tri.position.set(w / 2 - 0.018, 0.0075, -d / 2 + 0.018);
    tri.scale.set(1, 1, 1);
    g.add(tri);
  }
  return g;
}

// Emissive screen with a canvas you can redraw.
export function screen(parent, w, h, pos, rot, key, draw, ei = 1.2, px = 512) {
  const lt = labelTex(key, px, Math.round((px * h) / w), draw);
  const mat = M(0x000000, { e: 0xffffff, ei, unique: true, r: 0.3 });
  mat.emissiveMap = lt.tex;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -2;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  parent.add(m);
  return { mesh: m, ...lt, mat };
}

export function mug(parent, [x, y, z], color, chipped = false) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const m = M(color, { r: 0.3, m: 0.1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.042, 0.1, 18, 1, true), m);
  body.material = M(color, { r: 0.3, side: THREE.DoubleSide });
  body.position.y = 0.05;
  body.castShadow = true;
  g.add(body);
  cyl(g, 0.042, 0.042, 0.006, m, [0, 0, 0]);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.004, 6, 24), M(0x2b2b2b, { r: 0.4 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.1;
  g.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), m);
  handle.position.set(0.045, 0.05, 0);
  handle.rotation.z = -Math.PI / 2;
  g.add(handle);
  if (chipped) {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.012), M(0xe8e2d4, { r: 0.8 }));
    chip.position.set(-0.03, 0.095, 0.033);
    g.add(chip);
  }
  return g;
}

export function bowl(parent, [x, y, z], color = 0xd9d2c3) {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 0.5; pts.push(new THREE.Vector2(0.01 + Math.sin(a) * 0.09, (1 - Math.cos(a)) * 0.06)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), M(color, { r: 0.35, side: THREE.DoubleSide }));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// String of small bulbs between two points with a sag.
export function stringLights(parent, a, b, n, on, sag = 0.4, color = 0xffd08a) {
  const mat = M(0xffffff, { e: color, ei: 0, unique: true });
  const geo = new THREE.SphereGeometry(0.035, 8, 6);
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = A.clone().lerp(B, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
    const s = new THREE.Mesh(geo, mat);
    s.position.copy(p);
    parent.add(s);
  }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.005, 4), PAL.black());
  parent.add(wire);
  let k = 0;
  W.reactives.push((dt, snap) => {
    const target = on() ? 1 : 0;
    k = snap ? target : k + (target - k) * Math.min(1, dt * 2);
    mat.emissiveIntensity = 3 * k;
  });
  return mat;
}

export function pickupPulse(obj) {
  // Joy's thread: a thin blue loop that marks something worth a look.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 6, 24), M(0x3b6db3, { e: 0x3b6db3, ei: 0.6 }));
  ring.rotation.x = Math.PI / 2;
  obj.add(ring);
  return ring;
}

export function isOn(flag) { return () => S.has(flag); }

// A family photo in a thin dark frame, hung on a wall or pinned to something, with a small light
// so it can be spotted. Returns the group; the photo faces +z before rotation.
export function photoFrame(parent, { img, pos, ry = 0, portrait = false, size = 0.52, light = true }) {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.y = ry;
  parent.add(g);
  const w = portrait ? size * 0.75 : size, h = portrait ? size : size * 0.75;
  box(g, [w + 0.06, h + 0.06, 0.025], M(0x2a1c14, { r: 0.6 }), [0, -(h + 0.06) / 2, 0]);
  const tex = new THREE.TextureLoader().load(img, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; });
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M(0xffffff, { map: tex, r: 0.5, unique: true }));
  pm.position.set(0, 0, 0.014);
  g.add(pm);
  if (light) {
    g.updateWorldMatrix(true, false);
    const p = new THREE.Vector3(0, 0.1, 0.45).applyMatrix4(g.matrixWorld);
    vlight([p.x, p.y, p.z], 0xffe2b0, 1.1, { dist: 2.4 });
  }
  return g;
}

// The five family photos hidden around the house. Finding them is optional.
export const FAMILY_PHOTOS = ['ph_garden', 'ph_boat', 'ph_lunch', 'ph_selfie', 'ph_tea'];
export function familyPhoto(parent, id, opts) {
  const frame = photoFrame(parent, opts);
  frame.updateWorldMatrix(true, false);
  const p = new THREE.Vector3().setFromMatrixPosition(frame.matrixWorld);
  item({
    id, pos: [p.x, p.y - (opts.portrait ? 0.28 : 0.2), p.z], obj: frame, reach: 2.4, allow: 0.8,
    label: () => L('Look at the photo', '看看照片'),
    use: () => G.read(id, {
      onClose: () => {
        if (!S.set('seen_' + id)) return;
        const n = FAMILY_PHOTOS.filter((k) => S.has('seen_' + k)).length;
        G.note(n < FAMILY_PHOTOS.length ? L(`That’s ${n} of the ${FAMILY_PHOTOS.length} photos hidden around the house. They’re all kept in your journal.`, `房子里藏着 ${FAMILY_PHOTOS.length} 张照片，你找到了 ${n} 张。都收在日记本里了。`) : L('That’s all five photos. They’re all kept in your journal.', '五张照片都找到了，全都收在日记本里。'), 4500);
      },
    }),
  });
  return frame;
}
