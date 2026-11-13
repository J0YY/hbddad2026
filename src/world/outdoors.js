import * as THREE from 'three';
import { W, M, PAL, TEX, box, cyl, sphere, item, mark, labelTex, FONT, showWhen, canvasTex, solid, vlight, rng } from './kit.js';
import { note, fixture, token, mug, bowl, stringLights, chair, porterUnit, familyPhoto } from './props.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L, KT } from '../game/i18n.js';
import { LANDMARKS, BEACON } from '../game/logic.js';
import { buildDad } from '../player/character.js';

// Map grid -> world. East is +x, north is -z, 4 m per square.
export const MAP = { ox: -66, oz: -40, s: 4 };
export const mapToWorld = (mx, my) => [MAP.ox + mx * MAP.s, MAP.oz - my * MAP.s];
export const worldToMap = (x, z) => [(x - MAP.ox) / MAP.s, (MAP.oz - z) / MAP.s];

const LAKE = { x: -52, z: -33.5, rx: 9, rz: 5.5 };
const DOCK = { x: -50, z0: -44, z1: -36 };
const RIDGE = { x: -36, z: -69, r: 12, h: 3.4 };
const CLEAR = { x: -38, z: -84 };
const TRAIL = [[-30.6, -48], [-35, -47.5], [-40, -51], [-44, -58], [-40, -63], [-37, -67], [-37.8, -72], [-38.4, -77], [-38, -80.5]];

function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
function lakeD(x, z) { return Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz); }
function distToTrail(x, z) {
  let best = 1e9;
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

export function terrain(x, z) {
  const rd = Math.hypot(x - RIDGE.x, z - RIDGE.z);
  let h = RIDGE.h * smooth(1 - rd / RIDGE.r);
  h += Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.25 + Math.sin(x * 0.05 + z * 0.08) * 0.35;
  const ld = lakeD(x, z);
  if (ld < 1.4) h = THREE.MathUtils.lerp(-0.9, h, smooth((ld - 0.85) / 0.55));
  // flatten the clearing and the campsite a little
  const cd = Math.hypot(x - CLEAR.x, z - CLEAR.z);
  if (cd < 9) h = THREE.MathUtils.lerp(h, 0.1, smooth(1 - (cd - 4) / 5));
  const kd = Math.hypot(x + 34, z + 47);
  if (kd < 7) h = THREE.MathUtils.lerp(h, 0, smooth(1 - (kd - 3) / 4));
  return h;
}

export function buildOutdoors() {
  const g = new THREE.Group();
  W.root.add(g);
  W.ground = (x, z) => (x < -30.2 ? terrain(x, z) : 0);

  W.areas.push({
    id: 'clearing', name: ['The clearing', '林间空地'], x0: -54, x1: -24, z0: -96, z1: -75, ceil: Infinity, outdoor: true,
    hemi: [0x8aa0cc, 0x4a4432, 2.1], key: [0xd0dcf6, 1.4], fog: [0x1c2638, 24, 85], bg: 0x1c2638, amb: 'clearing', exposure: 1.6, fill: 2.6,
    chapter: [['The last stop', '最后一站'], ['At the end of the trail there are five tokens to place, five empty slots and two folded chairs.', '小路尽头有五块铜牌、五个空槽，还有两把折起来的椅子。']],
  });
  W.areas.push({
    id: 'wild', name: ['Outside', '屋外'], x0: -100, x1: -30.2, z0: -100, z1: -10, ceil: Infinity, outdoor: true,
    hemi: [0x8aa0cc, 0x4a4432, 2.1], key: [0xd0dcf6, 1.4], fog: [0x1e2a3e, 28, 95], bg: 0x1e2a3e, amb: 'wild', exposure: 1.6, fill: 2.6,
    chapter: [['Room five', '第五个地方'], ['For the first time tonight, there’s sky overhead.', '今晚第一次，头顶上是天空。']],
  });
  W.anchors.wild = { x: -32, z: -48, yaw: Math.PI / 2 };
  W.anchors.clearing = { x: -38, z: -77.5, yaw: 0 };

  // ---------------- sky ----------------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x0a1124) }, mid: { value: new THREE.Color(0x24304d) }, low: { value: new THREE.Color(0x6a5a62) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(low, mid, smoothstep(-0.05, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat);
  sky.add(dome);
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  const r = rng(42);
  for (let i = 0; i < 1400; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2;
    const y = Math.abs(u) * 0.95 + 0.05;
    const rr = Math.sqrt(1 - y * y);
    sp.push(Math.cos(th) * rr * 280, y * 280, Math.sin(th) * rr * 280);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sky.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf2ead2, fog: false }));
  moon.position.set(120, 140, -180);
  sky.add(moon);
  sky.position.set(-50, 0, -60);
  W.scene.add(sky);
  W.sky = sky;
  sky.visible = false;

  // ---------------- terrain ----------------
  const geo = new THREE.PlaneGeometry(80, 90, 160, 180);
  geo.rotateX(-Math.PI / 2);
  geo.translate(-64, 0, -58);
  const pos = geo.attributes.position;
  const colors = [];
  const cA = new THREE.Color(0x2f3a24), cB = new THREE.Color(0x3d4a2a), cDirt = new THREE.Color(0x5a4632), cShore = new THREE.Color(0x4a4636), cRock = new THREE.Color(0x55524a);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = terrain(x, z);
    pos.setY(i, y);
    const n = (Math.sin(x * 1.3) * Math.cos(z * 1.1) + Math.sin(x * 0.37 + z * 0.51)) * 0.25 + 0.5;
    tmp.copy(cA).lerp(cB, n);
    const td = distToTrail(x, z);
    if (td < 1.1) tmp.lerp(cDirt, smooth(1 - td / 1.1) * 0.85);
    const ld = lakeD(x, z);
    if (ld < 1.25) tmp.lerp(cShore, smooth(1 - (ld - 1) / 0.25));
    if (y > 2.2) tmp.lerp(cRock, smooth((y - 2.2) / 1.2) * 0.5);
    const dd = Math.hypot(x - mapToWorld(...BEACON)[0], z - mapToWorld(...BEACON)[1]);
    if (dd < 1.6) tmp.lerp(new THREE.Color(0x5e5240), smooth(1 - dd / 1.6) * 0.35);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: TEX.plain('#ffffff', 'grassgrain', 20000, 0.1) }));
  ground.material.map.repeat.set(40, 40);
  ground.receiveShadow = true;
  g.add(ground);

  // lake
  const rip = canvasTex('ripples', 256, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const rr = rng(9);
    for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(150,170,210,${0.05 + rr() * 0.15})`; c.lineWidth = 1; c.beginPath(); const y = rr() * h, x = rr() * w; c.moveTo(x, y); c.lineTo(x + 10 + rr() * 30, y); c.stroke(); }
  }, { repeat: [6, 4] });
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshPhongMaterial({ color: 0x0c1626, specular: 0x8899bb, shininess: 90, emissive: 0xffffff, emissiveMap: rip, emissiveIntensity: 0.6, transparent: true, opacity: 0.94 }));
  water.rotation.x = -Math.PI / 2;
  water.scale.set(LAKE.rx * 1.12, LAKE.rz * 1.12, 1);
  water.position.set(LAKE.x, -0.18, LAKE.z);
  g.add(water);
  W.tick.push((dt) => { rip.offset.x += dt * 0.01; rip.offset.y += dt * 0.004; });

  // keep Dad out of the water, except on the dock
  W.pushers = W.pushers || [];
  let pondNoteAt = -1e9;
  W.pushers.push((p, R) => {
    if (p.x > -30.2) return;
    const onDock = Math.abs(p.x - DOCK.x) < 0.75 - R * 0.3 && p.z > DOCK.z1 - 0.2 && p.z < DOCK.z0;
    if (onDock) return;
    const k = 1.1; // the visible waterline, so you stop at the edge instead of knee-deep
    const dx = (p.x - LAKE.x) / LAKE.rx, dz = (p.z - LAKE.z) / LAKE.rz;
    const d = Math.hypot(dx, dz);
    if (d < k) {
      const now = performance.now();
      if (S.has('map') && !S.has('beacon_found') && now - pondNoteAt > 20000) {
        pondNoteAt = now;
        G.note(L('The pond is far too cold for wading, and anyway Joy’s map puts the beacon on dry land. The lake is the grey patch along the bottom edge.', '池塘水太凉，下不去。再说 Joy 的地图上信标在陆地上，湖是地图最下边那块灰色。'), 5000);
      }
      const s = k / Math.max(d, 1e-3);
      p.x = LAKE.x + dx * s * LAKE.rx;
      p.z = LAKE.z + dz * s * LAKE.rz;
    }
    if (Math.abs(p.x - DOCK.x) < 1.2 && p.z > DOCK.z1 - 0.2 && p.z < LAKE.z + LAKE.rz) {
      // edges of the dock
      if (p.x < DOCK.x) p.x = Math.min(p.x, DOCK.x - 0.75 - R); else p.x = Math.max(p.x, DOCK.x + 0.75 + R);
    }
  });

  // ---------------- trees ----------------
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.2, 6);
  trunkGeo.translate(0, 1.1, 0);
  const coneGeo = (rad, h, y) => { const c = new THREE.ConeGeometry(rad, h, 7); c.translate(0, y, 0); return c; };
  const needles = new THREE.MeshStandardMaterial({ color: 0x1f3326, roughness: 0.9, flatShading: true });
  const bark = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 });
  const layers = [coneGeo(1.6, 2.6, 2.6), coneGeo(1.25, 2.2, 3.9), coneGeo(0.85, 1.9, 5.1)];
  const spots = [];
  const tr = rng(77);
  const keepClear = [[...mapToWorld(...LANDMARKS.pine), 3], [...mapToWorld(...LANDMARKS.post), 3], [...mapToWorld(...LANDMARKS.cairn), 4], [...mapToWorld(...BEACON), 4], [-35, -46, 5], [CLEAR.x, CLEAR.z, 10], [RIDGE.x, RIDGE.z, 5]];
  // keep the two lines the clues describe walkable and in view: north from the dock post and
  // east from the split pine, both ending at the beacon
  const segD = ([ax, az], [bx, bz], x, z) => {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  };
  const lanes = [[mapToWorld(...LANDMARKS.post), mapToWorld(...BEACON)], [mapToWorld(...LANDMARKS.pine), mapToWorld(...BEACON)]];
  const okSpot = (x, z) => {
    if (lakeD(x, z) < 1.25) return false;
    for (const [a, b] of lanes) if (segD(a, b, x, z) < 2.6) return false;
    if (distToTrail(x, z) < 2.4) return false;
    if (Math.abs(x - DOCK.x) < 2 && z > -46 && z < -30) return false;
    if (x > -32.5 && z < -38 && z > -58) return false;
    for (const [kx, kz, kr] of keepClear) if (Math.hypot(x - kx, z - kz) < kr) return false;
    return true;
  };
  // ring of trees around the edge, dense
  for (let i = 0; i < 520; i++) {
    const x = -100 + tr() * 70, z = -100 + tr() * 82;
    const inWild = x > -84 && x < -31 && z > -74 && z < -24;
    const inClear = x > -52 && x < -26 && z > -94 && z < -75;
    if (inWild || inClear) continue;
    if (x > -30.6 && z > -56) continue;
    spots.push([x, z, 0.8 + tr() * 0.7]);
  }
  for (let i = 0; i < 140; i++) {
    const x = -82 + tr() * 50, z = -73 + tr() * 47;
    if (!okSpot(x, z)) continue;
    spots.push([x, z, 0.7 + tr() * 0.6]);
  }
  for (let i = 0; i < 26; i++) {
    const a = tr() * Math.PI * 2, d = 10 + tr() * 3;
    spots.push([CLEAR.x + Math.cos(a) * d, CLEAR.z + Math.sin(a) * d * 0.8, 0.8 + tr() * 0.5]);
  }
  const N = spots.length;
  const trunks = new THREE.InstancedMesh(trunkGeo, bark, N);
  const crowns = layers.map((lg) => new THREE.InstancedMesh(lg, needles, N));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  spots.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tr() * 6);
    sc.set(s, s * (0.9 + tr() * 0.4), s);
    ps.set(x, W.ground(x, z) - 0.1, z);
    m4.compose(ps, q, sc);
    trunks.setMatrixAt(i, m4);
    crowns.forEach((c) => c.setMatrixAt(i, m4));
    if (x < -30.6) solid(x - 0.15 * s, x + 0.15 * s, z - 0.15 * s, z + 0.15 * s, -2, 6).cam = false;
  });
  [trunks, ...crowns].forEach((m) => { m.castShadow = true; m.receiveShadow = true; g.add(m); });

  // invisible bounds
  solid(-86, -84, -100, -10, -5, 10);
  solid(-100, -20, -24, -22, -5, 10);
  solid(-56, -54, -100, -74, -5, 10);
  solid(-26, -24, -100, -74, -5, 10);
  solid(-60, -20, -96, -94, -5, 10);
  solid(-86, -40.2, -75.3, -74.6, -5, 10); // between trail and clearing, west of the gate
  solid(-35.8, -30, -75.3, -74.6, -5, 10); // east of the gate
  // east edge: house mass
  const houseMat = M(0x2a2622, { r: 0.95 });
  const facade = M(0xffffff, { map: TEX.plain('#4a4038', 'facade', 9000, 0.08), r: 0.95 });
  box(g, [0.45, 4.5, 7.35], facade, [-30.38, 0, -43.675], { solid: true, uv: 2 });
  box(g, [0.45, 4.5, 7.35], facade, [-30.38, 0, -52.33], { solid: true, uv: 2 });
  box(g, [0.45, 2.2, 1.3], facade, [-30.38, 2.3, -48]);
  box(g, [13, 4.5, 18.8], houseMat, [-24.2, 0, -31.4], { solid: true });
  box(g, [13, 4.5, 19.6], houseMat, [-24.2, 0, -65.2], { solid: true });
  // warm windows on the facade
  for (const z of [-43.5, -53]) {
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), M(0x000000, { e: 0xffb070, ei: 1.2 }));
    wm.position.set(-30.645, 1.7, z);
    wm.rotation.y = -Math.PI / 2;
    g.add(wm);
    box(g, [0.03, 1.04, 1.34], M(0x2a1a10), [-30.62, 1.18, z]);
  }
  vlight([-31.2, 2.4, -48], 0xffc080, 6, { dist: 7 }); // porch light
  sphere(g, 0.08, M(0xffffff, { e: 0xffc080, ei: 3 }), [-30.7, 2.5, -48], { cast: false });

  // ---------------- campsite ----------------
  const camp = new THREE.Group();
  camp.position.set(-36, W.ground(-36, -45), -45);
  g.add(camp);
  const tentShape = new THREE.Shape();
  tentShape.moveTo(-1.1, 0); tentShape.lineTo(0, 1.4); tentShape.lineTo(1.1, 0); tentShape.lineTo(-1.1, 0);
  const tent = new THREE.Mesh(new THREE.ExtrudeGeometry(tentShape, { depth: 2.2, bevelEnabled: false }), M(0xb8613a, { r: 0.9, side: THREE.DoubleSide }));
  tent.position.set(0, 0, -1.1);
  tent.castShadow = true;
  camp.add(tent);
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), M(0x2a1810));
  flap.position.set(0, 0.5, 1.11);
  camp.add(flap);
  solid(-37.2, -34.8, -46.2, -43.8, -1, 2);
  // the pocket on the tent and the mug line
  const pocket = box(camp, [0.3, 0.25, 0.03], M(0x6a3420, { r: 0.9 }), [0.75, 0.4, 1.12]);
  // one of the family photos, pinned to the front of the tent
  familyPhoto(camp, 'ph_selfie', { img: 'img/p9631.jpg', pos: [-0.62, 0.36, 1.13], ry: 0, size: 0.3 });
  cyl(camp, 0.025, 0.025, 1.4, M(0x4a3420), [1.6, 0, 1.2]);
  cyl(camp, 0.025, 0.025, 1.4, M(0x4a3420), [2.8, 0, 1.2]);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), M(0x9a8a70));
  line.rotation.z = Math.PI / 2; line.position.set(2.2, 1.3, 1.2);
  camp.add(line);
  const mugs = new THREE.Group();
  mugs.position.set(0, 0, 1.2);
  camp.add(mugs);
  const mJoy = mug(mugs, [1.85, 1.08, 0], 0xe9e3d6, true);
  const mYan = mug(mugs, [2.2, 1.08, 0], 0x4a7a5a);
  const mDad = mug(mugs, [2.55, 1.08, 0], 0xdad5c8);
  [mJoy, mYan, mDad].forEach((m, i) => { m.rotation.z = Math.PI; m.position.y = 1.2; });
  // campfire ring
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; sphere(camp, 0.14, M(0x6a665e, { flat: true }), [0.8 + Math.cos(a) * 0.55, 0.05, 3.2 + Math.sin(a) * 0.55], { seg: 5, seg2: 4 }); }
  for (let i = 0; i < 3; i++) { const l = cyl(camp, 0.05, 0.05, 0.7, bark, [0.8, 0.12, 3.2]); l.rotation.set(Math.PI / 2, i, 0.4); }
  const embers = vlight([camp.position.x + 0.8, camp.position.y + 0.4, camp.position.z + 3.2], 0xff7a30, 4, { dist: 6, flicker: 0.4, on: () => S.has('read_L6') });
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8), M(0x000000, { e: 0xff8a3a, ei: 2.5, t: true, o: 0.85 }));
  fire.position.set(0.8, 0.3, 3.2);
  camp.add(fire);
  showWhen(fire, () => S.has('read_L6'));
  W.tick.push((dt, t) => { fire.scale.set(1 + Math.sin(t * 9) * 0.1, 1 + Math.sin(t * 13) * 0.2, 1); });
  // coiled lantern cord
  const cord = new THREE.Group();
  cord.position.set(-1.4, 0.05, 1.4);
  camp.add(cord);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.16 - i * 0.025, 0.012, 6, 20), M(0x1a1a1a)); c.rotation.x = Math.PI / 2; c.position.y = i * 0.022; cord.add(c); }
  // camp lanterns
  for (const [dx, dz] of [[-1.5, 2.2], [2.9, 2.6]]) {
    cyl(camp, 0.02, 0.02, 1.2, M(0x2a2a2a), [dx, 0, dz]);
    sphere(camp, 0.09, M(0xffffff, { e: 0xffc070, ei: 2.5 }), [dx, 1.25, dz], { cast: false });
    vlight([camp.position.x + dx, camp.position.y + 1.25, camp.position.z + dz], 0xffc070, 3, { dist: 6 });
  }

  // ---------------- the split pine ----------------
  const [pnx, pnz] = mapToWorld(...LANDMARKS.pine);
  const pine = new THREE.Group();
  pine.position.set(pnx, W.ground(pnx, pnz) - 0.1, pnz);
  g.add(pine);
  cyl(pine, 0.32, 0.45, 1.4, bark, [0, 0, 0]);
  for (const s of [-1, 1]) {
    const tg = new THREE.Group();
    tg.position.set(0, 1.3, 0);
    tg.rotation.z = s * 0.32;
    pine.add(tg);
    cyl(tg, 0.18, 0.28, 4.2, bark, [0, 0, 0]);
    for (const [rad, h, y] of [[1.4, 2.4, 3.2], [1.05, 2.0, 4.4], [0.7, 1.6, 5.4]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), needles); c.position.y = y; c.castShadow = true; tg.add(c); }
  }
  const thread = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.015, 6, 24), M(0x3b6db3, { e: 0x3b6db3, ei: 0.5 }));
  thread.rotation.x = Math.PI / 2; thread.position.y = 1.1;
  pine.add(thread);
  solid(pnx - 0.45, pnx + 0.45, pnz - 0.45, pnz + 0.45, -2, 6);
  // the paper tag tied on with the blue thread, facing east towards the box
  box(pine, [0.02, 0.16, 0.24], M(0xf2ecdf, { e: 0xf2ecdf, ei: 0.25 }), [0.44, 1.05, 0], { cast: false });

  // ---------------- the dock and the painted post ----------------
  const plank = M(0xffffff, { map: TEX.wood('#6a5236', 'dock'), r: 0.85 });
  const dockY = -0.05;
  for (let z = DOCK.z0 + 0.3; z > DOCK.z1; z -= 0.32) box(g, [1.5, 0.06, 0.28], plank, [DOCK.x, dockY + Math.max(0, W.ground(DOCK.x, z)) * 0.0 + 0.12, z], { cast: false });
  for (const z of [DOCK.z1 + 0.2, -39, -41.5]) for (const s of [-1, 1]) cyl(g, 0.07, 0.07, 1.2, bark, [DOCK.x + s * 0.7, -1, z]);

  // ---------------- the ridge: cairn, plaque, telescope ----------------
  const [cnx, cnz] = mapToWorld(...LANDMARKS.cairn);
  const cairn = new THREE.Group();
  cairn.position.set(cnx, W.ground(cnx, cnz), cnz);
  g.add(cairn);
  const stone = M(0x7a766c, { r: 0.95, flat: true });
  let cy = 0;
  for (let i = 0; i < 6; i++) { const rr = 0.42 - i * 0.055; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(rr, 0), stone); s.scale.y = 0.55; s.position.set((i % 2 ? 0.04 : -0.03), cy + rr * 0.5, 0); s.rotation.y = i; s.castShadow = true; cairn.add(s); cy += rr * 0.85; }
  solid(cnx - 0.5, cnx + 0.5, cnz - 0.5, cnz + 0.5, -2, 3);
  const scope = new THREE.Group();
  const scx = cnx + 2.6, scz = cnz - 2.0;
  scope.position.set(scx, W.ground(scx, scz), scz);
  g.add(scope);
  for (let i = 0; i < 3; i++) { const l = cyl(scope, 0.02, 0.02, 1.3, M(0x2a2a2a, { m: 0.6 }), [0, 0, 0]); l.rotation.set(0.32 * Math.cos(i * 2.1), 0, 0.32 * Math.sin(i * 2.1)); l.position.set(Math.sin(i * 2.1) * 0.2, 0, -Math.cos(i * 2.1) * 0.2); }
  const tube = new THREE.Group();
  tube.position.set(0, 1.25, 0);
  tube.rotation.set(0.7, 0, 0);
  scope.add(tube);
  const tb = cyl(tube, 0.07, 0.09, 1.0, PAL.brass(), [0, -0.5, 0]);
  tb.rotation.x = Math.PI / 2; tb.position.set(0, 0, -0.1);
  const lensGlow = sphere(tube, 0.06, M(0xffffff, { e: 0xa8d0ff, ei: 0, unique: true }), [0, 0, -0.6], { cast: false });
  W.reactives.push(() => { lensGlow.material.emissiveIntensity = S.has('scope_ok') ? 2.5 : 0; });
  solid(scx - 0.35, scx + 0.35, scz - 0.35, scz + 0.35, -2, 2);
  box(g, [0.5, 0.04, 0.3], M(0x3a2a1e), [scx - 0.9, W.ground(scx - 0.9, scz) + 0.7, scz + 0.3]);
  cyl(g, 0.03, 0.03, 0.7, M(0x3a2a1e), [scx - 0.9, W.ground(scx - 0.9, scz), scz + 0.3]);

  // ---------------- the beacon ----------------
  const [bx, bz] = mapToWorld(...BEACON);
  const beacon = new THREE.Group();
  beacon.position.set(bx, W.ground(bx, bz), bz);
  g.add(beacon);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), M(0x2a2018, { r: 1 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.04;
  beacon.add(hole);
  const caseG = new THREE.Group();
  beacon.add(caseG);
  box(caseG, [0.42, 0.22, 0.3], PAL.brass(), [0, 0.02, 0]);
  const caseLid = new THREE.Group();
  caseLid.position.set(0, 0.24, -0.15);
  caseG.add(caseLid);
  box(caseLid, [0.42, 0.03, 0.3], PAL.darkBrass(), [0, 0, 0.15]);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.08, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xbcd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 30;
  beacon.add(beam);
  W.reactives.push((dt, snap) => {
    hole.visible = caseG.visible = S.has('beacon_found');
    caseLid.rotation.x = S.has('lens') ? -1.6 : 0;
    const tgt = S.has('tok_star') ? 0.22 : 0;
    beam.material.opacity = snap ? tgt : beam.material.opacity + (tgt - beam.material.opacity) * Math.min(1, dt * 0.8);
  });
  vlight([bx, W.ground(bx, bz) + 1.2, bz], 0xbcd8ff, 8, { dist: 10, on: () => S.has('tok_star') });

  // the red X Joy painted over the spot and a shovel, shown once you've read the tag on the pine
  const xMark = new THREE.Group();
  xMark.position.set(bx, W.ground(bx, bz) + 0.04, bz);
  g.add(xMark);
  const red = M(0xd2412f, { e: 0xd2412f, ei: 0.7 });
  for (const r of [Math.PI / 4, -Math.PI / 4]) box(xMark, [1.8, 0.04, 0.26], red, [0, 0, 0], { cast: false, ry: r });
  const shovel = new THREE.Group();
  shovel.position.set(0.95, 0, -0.55);
  shovel.rotation.z = 0.22;
  xMark.add(shovel);
  cyl(shovel, 0.025, 0.025, 1.05, M(0x6a5236), [0, 0.1, 0]);
  box(shovel, [0.24, 0.3, 0.03], M(0x8a8f94, { m: 0.6, r: 0.4 }), [0, 0.05, 0]);
  showWhen(xMark, () => S.has('read_pine') && !S.has('beacon_found'));
  vlight([bx, W.ground(bx, bz) + 1.6, bz], 0xffa080, 4, { dist: 9, on: () => S.has('read_pine') && !S.has('beacon_found') });

  // survey flags left behind by failed surveys
  const flagMat = M(0xc0583f, { r: 0.7 });
  const flags = new THREE.Group();
  g.add(flags);
  W.drawSurveyPins = () => {
    flags.clear();
    return; // digging now happens only at the red X, so old guess flags stay hidden
    for (const [mx, my] of S.data.station.survey?.pins || []) {
      const [x, z] = mapToWorld(mx, my);
      const f = new THREE.Group();
      f.position.set(x, W.ground(x, z), z);
      cyl(f, 0.01, 0.01, 0.6, PAL.black(), [0, 0, 0]);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), flagMat);
      fl.material.side = THREE.DoubleSide;
      fl.position.set(0.08, 0.55, 0);
      f.add(fl);
      flags.add(f);
    }
  };
  W.reactives.push((dt, snap) => { if (snap) W.drawSurveyPins(); });

  // ---------------- lantern trail and gate ----------------
  const trailOn = () => S.has('trail_open');
  const lanternPts = [[-36.5, -66], [-37.4, -70], [-38, -73.5], [-38.4, -77], [-38.2, -80]];
  lanternPts.forEach(([x, z], i) => {
    for (const s of [-1, 1]) {
      const lx = x + s * 1.4;
      const y = W.ground(lx, z);
      cyl(g, 0.025, 0.025, 1.3, M(0x2a2a2a), [lx, y, z]);
      const lm = M(0xffffff, { e: 0xffc070, ei: 0, unique: true });
      sphere(g, 0.08, lm, [lx, y + 1.35, z], { cast: false });
      W.reactives.push((dt, snap) => {
        const on = trailOn() && (snap || (W.trailT ?? 99) > i * 0.6);
        lm.emissiveIntensity += ((on ? 3 : 0) - lm.emissiveIntensity) * (snap ? 1 : Math.min(1, dt * 3));
      });
    }
    vlight([x, W.ground(x, z) + 1.4, z], 0xffc070, 4, { dist: 6, on: () => trailOn() && (W.trailT ?? 99) > i * 0.6 });
  });
  W.tick.push((dt) => { if (S.has('trail_open') && W.trailT != null) W.trailT += dt; });
  // the rope across the trail
  const gate = new THREE.Group();
  gate.position.set(-38, W.ground(-38, -75), -75);
  g.add(gate);
  cyl(gate, 0.06, 0.06, 1.0, bark, [-1.6, 0, 0]);
  cyl(gate, 0.06, 0.06, 1.0, bark, [1.6, 0, 0]);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 6), M(0xb09a6a));
  rope.rotation.z = Math.PI / 2; rope.position.y = 0.85;
  gate.add(rope);
  const signTex = labelTex('gatesign', 256, 96, (c, w, h) => { c.fillStyle = '#efe9dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.font = `700 26px ${FONT.mono}`; c.fillText('TRAIL CLOSED', 22, 36); c.font = `700 20px ${FONT.mono}, monospace`; c.fillText('天黑后小路关闭', 22, 66); c.font = `700 14px ${FONT.mono}`; c.fillText('AFTER DARK. PORTER', 22, 88); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), M(0xffffff, { map: signTex.tex, side: THREE.DoubleSide }));
  sign.position.set(0, 0.7, 0.02);
  gate.add(sign);
  const gateCol = solid(-40.2, -35.8, -75.3, -74.6, -5, 10);
  W.reactives.push((dt, snap) => {
    const open = S.has('trail_open');
    gateCol.on = !open;
    rope.visible = sign.visible = !open;
  });

  // ---------------- the clearing ----------------
  const cg = new THREE.Group();
  cg.position.set(CLEAR.x, W.ground(CLEAR.x, CLEAR.z), CLEAR.z);
  g.add(cg);
  W.clearing = cg;
  const tableWood = M(0xffffff, { map: TEX.wood('#6a4a30', 'tablewood'), r: 0.6 });
  box(cg, [2.0, 0.06, 1.2], tableWood, [0, 0.74, 0]);
  for (const [dx, dz] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) box(cg, [0.07, 0.74, 0.07], M(0x3a2a1e), [dx, 0, dz]);
  solid(CLEAR.x - 1.05, CLEAR.x + 1.05, CLEAR.z - 0.65, CLEAR.z + 0.65, -2, 1);
  // string lights between four poles
  const poles = [[-4, -3.2], [4, -3.2], [4, 3.2], [-4, 3.2]];
  for (const [dx, dz] of poles) cyl(cg, 0.05, 0.06, 3.2, M(0x3a2a1e), [dx, 0, dz]);
  for (let i = 0; i < 4; i++) {
    const [ax, az] = poles[i], [bx2, bz2] = poles[(i + 1) % 4];
    stringLights(cg, [ax, 3.1, az], [bx2, 3.1, bz2], 12, () => true, 0.5);
  }
  stringLights(cg, [-4, 3.1, -3.2], [4, 3.1, 3.2], 16, () => true, 0.7);
  vlight([CLEAR.x, cg.position.y + 2.6, CLEAR.z], 0xffd090, 9, { dist: 10 });
  // Dad's chair, already pulled up on the south side
  chair(cg, 0, 0.95, Math.PI, { seat: 0x6a4a30, frame: 0x3a2a1e });
  // the brass frame holding two folded chairs, with five catches
  const frame = new THREE.Group();
  frame.position.set(-2.6, 0, 0);
  cg.add(frame);
  box(frame, [0.08, 1.2, 1.4], PAL.brass(), [-0.12, 0, 0]);
  box(frame, [0.4, 0.06, 1.4], PAL.brass(), [0, 0, 0]);
  const catches = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Group();
    c.position.set(0.0, 0.25 + i * 0.2, 0.68);
    frame.add(c);
    box(c, [0.12, 0.06, 0.06], M(0xd8b867, { r: 0.3, m: 0.9 }), [0, 0, 0]);
    catches.push(c);
  }
  const folded = [box(frame, [0.06, 1.0, 0.5], M(0x6a4a30), [0.0, 0.06, -0.3]), box(frame, [0.06, 1.0, 0.5], M(0x6a4a30), [0.08, 0.06, 0.3])];
  // the two chairs that come out
  const joyChair = chair(cg, 0, -0.95, 0, { seat: 0x6a4a30, frame: 0x3a2a1e });
  const yanChair = chair(cg, 1.35, 0, -Math.PI / 2, { seat: 0x6a4a30, frame: 0x3a2a1e });
  const cstate = { t: 0 };
  W.reactives.push((dt, snap) => {
    const released = S.has('day_ok');
    catches.forEach((c, i) => {
      const target = released ? 1 : 0;
      c.userData.k = snap ? target : (c.userData.k ?? 0) + (target - (c.userData.k ?? 0)) * Math.min(1, dt * (2.5 - i * 0.35));
      c.rotation.x = -c.userData.k * 1.4;
    });
    const target = S.has('day_ok') ? 1 : 0;
    cstate.t = snap ? target : cstate.t + Math.sign(target - cstate.t) * Math.min(Math.abs(target - cstate.t), dt * 0.8);
    const e = cstate.t * cstate.t * (3 - 2 * cstate.t);
    folded.forEach((f) => (f.visible = cstate.t < 0.05));
    joyChair.visible = yanChair.visible = cstate.t > 0.02;
    joyChair.position.set(THREE.MathUtils.lerp(-2.6, 0, e), 0, THREE.MathUtils.lerp(-0.3, -0.95, e));
    yanChair.position.set(THREE.MathUtils.lerp(-2.6, 1.35, e), 0, THREE.MathUtils.lerp(0.3, 0, e));
    joyChair.scale.z = yanChair.scale.z = THREE.MathUtils.lerp(0.15, 1, Math.min(1, e * 2));
  });
  // the clock: five sockets on a pedestal next to the table
  const clock = new THREE.Group();
  clock.position.set(2.7, 0, 0);
  cg.add(clock);
  cyl(clock, 0.35, 0.4, 0.9, M(0x5a4a3a, { r: 0.8 }), [0, 0, 0]);
  const face = cyl(clock, 0.55, 0.55, 0.06, PAL.brass(), [0, 0.9, 0]);
  const socketMats = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    const sm = M(0x1a1a1a, { unique: true, e: 0x000000 });
    socketMats.push(sm);
    cyl(clock, 0.07, 0.07, 0.02, sm, [Math.cos(a) * 0.38, 0.96, Math.sin(a) * 0.38 * -1 + 0.05]);
  }
  const lever = box(clock, [0.04, 0.3, 0.04], M(0x2a2a2a, { m: 0.6 }), [0.45, 0.9, 0.2]);
  solid(CLEAR.x + 2.3, CLEAR.x + 3.1, CLEAR.z - 0.4, CLEAR.z + 0.4, -2, 1.2);
  W.reactives.push(() => {
    const placed = S.has('day_ok');
    socketMats.forEach((m) => { m.color.setHex(placed ? 0xc9a25b : 0x1a1a1a); m.metalness = placed ? 0.9 : 0; });
  });
  // mini study door on the table, as the spec asked
  const mini = new THREE.Group();
  mini.position.set(0.7, 0.77, 0.35);
  mini.scale.setScalar(0.09);
  cg.add(mini);
  box(mini, [1.5, 2.6, 0.2], PAL.brass(), [0, 0, 0]);
  box(mini, [1.2, 2.3, 0.22], M(0x9cb7bd, { t: true, o: 0.4 }), [0, 0.05, 0]);
  // table setting that appears once the chairs are out
  const setting = new THREE.Group();
  cg.add(setting);
  const lampsOn = () => S.has('day_ok');
  [[-0.6, -0.35], [0.6, -0.35], [0, 0.4]].forEach(([dx, dz]) => {
    cyl(setting, 0.05, 0.06, 0.05, PAL.brass(), [dx, 0.77, dz]);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 16, 1, true), M(0xffffff, { e: 0xffd090, ei: 1.5, side: THREE.DoubleSide }));
    shade.position.set(dx, 0.9, dz);
    setting.add(shade);
  });
  vlight([CLEAR.x, cg.position.y + 1.2, CLEAR.z], 0xffd090, 5, { dist: 6, on: lampsOn });
  mug(setting, [-0.3, 0.77, -0.2], 0xe9e3d6, true);
  mug(setting, [0.35, 0.77, 0.15], 0x4a7a5a);
  mug(setting, [-0.25, 0.77, 0.3], 0xdad5c8);
  bowl(setting, [0, 0.77, -0.4], 0xc9d6c0);
  bowl(setting, [0.75, 0.77, 0], 0xd7c6b0);
  bowl(setting, [0, 0.77, 0.42], 0xe2dccd);
  const cardTex = (name) => labelTex('place-' + name, 128, 64, (c, w, h) => { c.fillStyle = '#f2ecdf'; c.fillRect(0, 0, w, h); c.fillStyle = name === 'YAN' ? '#2f6b45' : name === 'JOY' ? '#2e5a9c' : '#2b2620'; c.font = `40px "${name === 'YAN' ? 'Nanum Brush Script' : 'Nanum Pen Script'}"`; c.textAlign = 'center'; c.fillText(name === 'DAD' ? 'Dad' : name === 'JOY' ? 'Joy' : 'Yan', w / 2, 44); }).tex;
  for (const [n, dx, dz, ry] of [['JOY', 0, -0.48, 0], ['YAN', 0.85, 0, -Math.PI / 2], ['DAD', 0, 0.5, Math.PI]]) {
    const pc = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), M(0xffffff, { map: cardTex(n), side: THREE.DoubleSide }));
    pc.position.set(dx, 0.82, dz);
    pc.rotation.set(-0.5, ry, 0, 'YXZ');
    setting.add(pc);
  }
  const envelope = note(setting, [0.08, 0.775, 0.36], 0.2, { w: 0.2, d: 0.12 });
  showWhen(setting, () => S.has('day_ok'));
  showWhen(envelope, () => !S.has('read_L7'));
  // the cake under a glass cloche, at the end of the table
  const cake = new THREE.Group();
  cake.position.set(-0.75, 0.77, 0.1);
  setting.add(cake);
  cyl(cake, 0.14, 0.14, 0.1, M(0xf2e6d6, { r: 0.6 }), [0, 0, 0]);
  cyl(cake, 0.145, 0.145, 0.015, M(0xb04a5a, { r: 0.5 }), [0, 0.1, 0]);
  const candleFlames = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const cnd = new THREE.Group();
    cnd.position.set(Math.cos(a) * 0.08, 0.115, Math.sin(a) * 0.08);
    cake.add(cnd);
    cyl(cnd, 0.006, 0.006, 0.05, M([0x3b6db3, 0x2f6b45, 0xc9a25b, 0xc0583f, 0xece6d9][i]), [0, 0, 0]);
    const fl = sphere(cnd, 0.012, M(0xffffff, { e: 0xffb050, ei: 3 }), [0, 0.065, 0], { cast: false });
    fl.scale.y = 1.6;
    candleFlames.push({ cnd, fl, i });
  }
  const cloche = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0xcfe0e6, { r: 0.05, t: true, o: 0.2 }));
  cake.add(cloche);
  W.reactives.push(() => {
    candleFlames.forEach(({ fl }) => { fl.visible = S.has('cake_lit'); });
    cloche.visible = !S.has('cake_lit');
  });
  vlight([CLEAR.x - 0.75, cg.position.y + 1.0, CLEAR.z + 0.1], 0xffb050, 2, { dist: 3, on: () => S.has('cake_lit'), flicker: 0.3 });

  const porter = porterUnit(cg, [-0.95, 0.77, -0.4], 0.4);
  W.clearPorter = porter;

  // ---------------- Joy and Yan, who come out of the trees at the very end ----------------
  const family = {
    joy: { ch: buildDad({ sweater: '#66704a', hem: 0x58613f, trousers: 0x30343c, glasses: false, grey: false, longHair: true, scale: 0.94 }),
      from: [-7, -6.5], to: [0, -1.5], face: 0, delay: 0 },
    yan: { ch: buildDad({ sweater: '#2f50a0', hem: 0x29468c, trousers: 0x2c2f36, glasses: true, grey: false, longHair: true, scale: 0.92 }),
      from: [7.5, -5.5], to: [1.85, 0], face: -Math.PI / 2, delay: 0.6 },
  };
  const fam = Object.values(family);
  for (const f of fam) { f.ch.root.visible = false; cg.add(f.ch.root); }
  const at = (f, [x, z]) => f.ch.root.position.set(x, W.ground(CLEAR.x + x, CLEAR.z + z) - cg.position.y, z);
  const settle = () => fam.forEach((f) => { at(f, f.to); f.ch.root.rotation.y = f.face; f.ch.root.visible = true; f.done = true; });
  W.reactives.push((dt, snap) => { if (snap && S.has('family_here')) settle(); });
  let walk = null; // { t, onArrive }
  let sing = 0;
  W.family = {
    walkIn(onArrive) {
      walk = { t: 0, onArrive };
      fam.forEach((f) => { at(f, f.from); f.ch.root.visible = true; f.done = false; });
    },
    sing(on) { sing = on ? 1 : 0; },
  };
  W.tick.push((dt, t) => {
    if (walk) {
      walk.t += dt;
      let all = true;
      for (const f of fam) {
        const p = f.ch.root.position;
        const dx = f.to[0] - p.x, dz = f.to[1] - p.z, d = Math.hypot(dx, dz);
        if (walk.t < f.delay || d < 0.04) {
          if (d < 0.04 && !f.done) { f.done = true; }
          f.ch.animate(dt, 0, {});
          if (f.done) f.ch.root.rotation.y += (f.face - f.ch.root.rotation.y) * Math.min(1, dt * 5);
          if (!f.done) all = false;
          continue;
        }
        all = false;
        const step = Math.min(d, dt * 1.25);
        at(f, [p.x + (dx / d) * step, p.z + (dz / d) * step]);
        f.ch.root.rotation.y = Math.atan2(dx, dz);
        f.ch.animate(dt, 1.25, {});
      }
      if (all && fam.every((f) => Math.abs(f.face - f.ch.root.rotation.y) < 0.05)) { const cb = walk.onArrive; walk = null; cb?.(); }
      return;
    }
    for (const f of fam) {
      if (!f.ch.root.visible) continue;
      f.ch.animate(dt, 0, {});
      // a little sway while they sing
      f.ch.root.rotation.z = sing * Math.sin(t * 2.6 + (f === family.yan ? 1.2 : 0)) * 0.05;
    }
  });

  // ---------------- interactions ----------------
  item({
    id: 'mugs', pos: [camp.position.x + 2.2, camp.position.y + 1.15, camp.position.z + 1.2], obj: mugs, reach: 2.2,
    label: () => (S.has('read_L6') ? L('Read Joy’s note again', '再看一遍 Joy 的信') : L('Look at the mugs', '看看杯子')),
    use: () => {
      if (!S.has('read_L6')) {
        G.read('L6', { onClose: () => { S.set('read_L6'); S.set('map'); S.addJournal('map'); G.toast(['Joy’s map', 'Joy 的地图']); G.sfx('pickup'); G.note(L('Taking the mug down opened the tent pocket. Joy’s map was inside. ' + KT(L('Press J to look at it any time.', '随时按 J 查看。'), L('It’s in your journal now.', '已经放进日记本了。')), '把杯子拿下来，帐篷口袋就打开了。Joy 的地图在里面。' + KT('随时按 J 查看。', '已经放进日记本了。')), 6500); } });
      } else G.read('L6');
    },
  });
  item({
    id: 'pine', pos: [pnx, W.ground(pnx, pnz) + 1.2, pnz], obj: pine, reach: 3,
    label: () => L('Read the tag on the split pine', '看分叉松树上的标签'),
    use: () => G.read('pinetag', { onClose: () => { if (!S.has('read_pine')) { S.set('read_pine'); G.sfx('pickup'); G.note(L('A red X has appeared on Joy’s map, and there’s a light on in the trees to the east.', 'Joy 的地图上多了一个红色 X，东边的树林里也亮起了一盏灯。'), 5000); } } }),
  });
  // where you are on Joy's map, for the arrow drawn on it
  G.mapYou = () => {
    if (!W.inWild?.() || !W.playerPos) return null;
    const [x, y] = worldToMap(W.playerPos.x, W.playerPos.z);
    if (x < -0.4 || x > 7.4 || y < -0.4 || y > 7.4) return null;
    return { x, y, deg: -(G.ctl?.yaw ?? 0) * 180 / Math.PI };
  };
  item({
    id: 'dig', pos: [bx, W.ground(bx, bz) + 0.3, bz], obj: xMark, reach: 2.6,
    label: () => L('Dig at the red X', '在红色 X 那里挖'),
    when: () => S.has('read_pine') && !S.has('beacon_found'),
    use: () => {
      G.sfx('thock');
      S.set('beacon_found');
      setTimeout(() => G.sfx('good'), 300);
      G.note(L('A few spadefuls down there’s a clunk, and up comes a small brass box. The telescope lens should be inside.', '挖了几铲，咔哒一声碰到了东西，挖出来一个黄铜小盒子。望远镜的镜片应该就在里面。'), 4500);
    },
  });
  item({
    id: 'beaconcase', pos: [bx, W.ground(bx, bz) + 0.2, bz], obj: caseG, reach: 2, label: () => L('Open the brass box', '打开黄铜盒子'),
    when: () => S.has('beacon_found') && !S.has('tok_star'),
    use: () => {
      S.set('lens');
      S.set('tok_star'); G.give('tok_star', ['Star token', '星星铜牌']);
      S.set('trail_open'); W.trailT = 0;
      G.sfx('lens');
      setTimeout(() => G.sfx('lanterns'), 600);
      G.porter([[L('That is the last token. One by one, the lanterns along the trail are coming on.', '这是最后一块铜牌。小路上的灯笼一盏接一盏亮了起来。'), 3600], [L('I have also found two chairs in storage, and they seem to belong to somebody.', '另外，我在储藏室里找到了两把椅子，好像是有主的。'), 4200]]);
    },
  });
  item({
    id: 'clock', pos: [CLEAR.x + 2.7, cg.position.y + 0.95, CLEAR.z], obj: clock, reach: 2.2,
    label: () => (S.has('day_ok') ? L('Look at the clock', '看看时钟') : L('Put the tokens in the slots', '把铜牌放进凹槽')),
    use: () => {
      if (S.has('day_ok')) { G.note(L('The day reads 9:30 stock market, 12:00 lunch, 14:00 chess, 17:00 tennis and 21:00 camping.', '这一天的安排是：9:30 股市，12:00 午饭，14:00 下棋，17:00 网球，21:00 露营。')); return; }
      G.station('clock');
    },
  });
  item({
    id: 'letter7', pos: [CLEAR.x + 0.08, cg.position.y + 0.8, CLEAR.z + 0.36], obj: envelope, reach: 2.2,
    label: () => (S.has('read_L7') ? L('Read the letter again', '再读一遍信') : L('Open your letter', '打开你的信')),
    when: () => S.has('day_ok'),
    use: () => G.ending(),
  });

  mark('mugs', [camp.position.x + 2.2, 1.1, camp.position.z + 1.2]);
  mark('case', [bx, 0, bz]);
  mark('digx', [bx, 0, bz]);
  mark('pine', [pnx, 0, pnz]);
  mark('trail', [-38, 0, -77]);
  mark('clock', [CLEAR.x + 2.7, 0, CLEAR.z]);
  mark('letter7', [CLEAR.x, 0, CLEAR.z + 0.4]);
  return g;
}
