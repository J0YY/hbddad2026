import * as THREE from 'three';
import { W, M, PAL, TEX, box, cyl, sphere, room, slidingDoor, item, mark, labelTex, FONT, showWhen, canvasTex, solid, vlight } from './kit.js';
import { chair, plant, porterUnit, note, fixture, screen, token, familyPhoto } from './props.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L, KT } from '../game/i18n.js';
import { IN } from '../core/input.js';
import { TICKETS, ticketsFound } from '../game/clues.js';

export function skylineTex(key, seed = 3) {
  return canvasTex(key, 1024, 512, (c, w, h) => {
    c.fillStyle = '#0d1420'; c.fillRect(0, 0, w, h);
    // low cloud glow near the horizon, drawn as soft bands rather than a gradient wash
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(80,70,90,${0.012})`; c.fillRect(0, h * 0.35 + i * 6, w, h); }
    let x = 0;
    let s = seed;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    while (x < w) {
      const bw = 30 + r() * 70, bh = 120 + r() * 300;
      const y = h - bh;
      c.fillStyle = `rgb(${14 + r() * 10},${17 + r() * 10},${24 + r() * 12})`;
      c.fillRect(x, y, bw, bh);
      for (let wy = y + 8; wy < h - 6; wy += 9) for (let wx = x + 5; wx < x + bw - 5; wx += 7) {
        if (r() < 0.3) { c.fillStyle = r() < 0.8 ? `rgba(255,${200 + r() * 40},${120 + r() * 60},${0.5 + r() * 0.5})` : 'rgba(170,210,255,0.7)'; c.fillRect(wx, wy, 3, 4); }
      }
      if (r() < 0.2) { c.fillStyle = '#c0392b'; c.fillRect(x + bw / 2, y - 6, 2, 2); }
      x += bw + 2 + r() * 8;
    }
  });
}

function rainTex() {
  return canvasTex('rain', 256, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    let s = 7;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = r() * h, l = 10 + r() * 30;
      c.strokeStyle = `rgba(200,220,240,${0.08 + r() * 0.18})`;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + l); c.stroke();
    }
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(220,235,255,${0.2 + r() * 0.3})`; c.beginPath(); c.arc(r() * w, r() * h, 1 + r() * 1.5, 0, 7); c.fill(); }
  }, { repeat: [3, 2] });
}

export function buildTrading() {
  const g = room({
    x0: -7, x1: 7, z0: -20, z1: -8, h: 4,
    floor: M(0xffffff, { map: TEX.carpet('#23272b', 'trade'), r: 0.95 }), floorUV: 3,
    wall: M(0xffffff, { map: TEX.plain('#4a4d4f', 'concrete', 9000, 0.07), r: 0.9 }), wallUV: 3,
    ceil: M(0x1a1b1c, { r: 0.9 }),
    trim: M(0x161616),
    doors: [{ side: 's', at: 1.8, w: 1.3, h: 2.3 }, { side: 'n', at: -5.5, w: 1.4, h: 2.4 }],
  });
  W.areas.push({
    id: 'trading', name: ['The trading room', '交易室'], x0: -7, x1: 7, z0: -20, z1: -8, ceil: 4,
    hemi: [0x8da5b4, 0x3a3632, 1.2], key: [0xbfd8e8, 0.8], fog: [0x0c1218, 16, 45], bg: 0x0a0e12, amb: 'trading', exposure: 1.2,
    chapter: [['Room one', '第一个房间'], ['Porter spent the weekend watching the market, which nobody should ever let a receipt printer do unsupervised.', 'Porter 一整个周末都在盯盘，这种事真不该让一台小票打印机自己干。']],
  });
  W.anchors.trading = { x: 1.8, z: -9.3, yaw: 0 };

  // City windows on both long walls, with rain running down the glass
  const sky = skylineTex('skyline');
  const rain = rainTex();
  for (const side of [-1, 1]) {
    const x = side * 6.835;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.6), M(0xffffff, { map: sky, e: 0xffffff, ei: 0.85, unique: true }));
    win.material.emissiveMap = sky;
    win.position.set(x, 2.05, -14);
    win.rotation.y = -side * Math.PI / 2;
    g.add(win);
    const rm = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.6), new THREE.MeshBasicMaterial({ map: rain, transparent: true, depthWrite: false, opacity: 0.8 }));
    rm.position.set(x - side * 0.015, 2.05, -14);
    rm.rotation.y = -side * Math.PI / 2;
    g.add(rm);
    // mullions
    for (let i = 0; i <= 5; i++) box(g, [0.06, 2.7, 0.08], M(0x111213, { r: 0.4, m: 0.6 }), [x - side * 0.035, 0.7, -19.25 + i * 2.1]);
    box(g, [0.06, 0.08, 10.6], M(0x111213, { r: 0.4, m: 0.6 }), [x - side * 0.035, 0.7, -14]);
    box(g, [0.06, 0.08, 10.6], M(0x111213, { r: 0.4, m: 0.6 }), [x - side * 0.035, 3.36, -14]);
  }
  W.tick.push((dt) => { rain.offset.y += dt * 0.35; });

  // The big wall chart: four lines, one of which looks like it fell off a cliff
  const chart = screen(g, 5.6, 2.2, [0.6, 2.35, -19.775], [0, 0, 0], 'wallchart', (c, w, h) => {
    c.fillStyle = '#05090a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,160,150,0.18)'; c.lineWidth = 1;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(40, (h * i) / 6); c.lineTo(w - 20, (h * i) / 6); c.stroke(); }
    c.fillStyle = '#7f958d'; c.font = `600 13px ${FONT.hud}`;
    const X = [60, 200, 340, 480];
    ['FRI', 'SAT', 'SUN', 'MON'].forEach((d, i) => c.fillText(d, X[i], h - 10));
    c.fillStyle = 'rgba(120,140,135,0.08)'; c.fillRect(X[0] + 20, 40, X[3] - X[0] - 40, h - 70);
    c.fillStyle = '#56645e'; c.fillText('STOCK MARKETS CLOSED', X[1] - 10, h - 34);
    const lines = {
      NVDA: ['#7fd09a', [0.18, null, null, 0.86], 3],
      TQQQ: ['#8fb9d6', [0.42, null, null, 0.52], 2],
      VONG: ['#e2b45a', [0.5, null, null, 0.535], 2],
      'NASDAQ-100': ['#6f7f78', [0.6, null, null, 0.635], 1],
      BTC: ['#d58a5a', [0.34, 0.31, 0.38, 0.3], 2],
    };
    for (const [name, [col, pts, lw]] of Object.entries(lines)) {
      c.strokeStyle = col; c.lineWidth = lw;
      const p = pts.map((v, i) => (v == null ? null : [X[i], v * h])).filter(Boolean);
      c.setLineDash(name === 'BTC' ? [] : [6, 6]);
      c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      c.setLineDash([]);
      c.fillStyle = col; p.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); });
      c.font = `700 15px ${FONT.hud}`;
      c.fillText(name, X[3] + 12, p[p.length - 1][1] + 5);
    }
    c.fillStyle = '#7fd09a'; c.font = `700 14px ${FONT.mono}`;
    c.fillText('NVDA  FRI 1,200.00   MON 120.00   -90%', 40, 28);
    c.fillStyle = '#e08070';
    c.fillText('PORTER: SELL EVERYTHING?', w - 250, 28);
  }, 1.1, 768);
  box(g, [5.8, 2.4, 0.06], M(0x0c0c0c, { r: 0.4 }), [0.6, 1.15, -19.83], { cast: false });

  // LED ticker over the south door
  const tickerTex = canvasTex('ticker', 2048, 64, (c, w, h) => {
    c.fillStyle = '#060504'; c.fillRect(0, 0, w, h);
    c.font = `700 40px ${FONT.mono}`;
    c.textBaseline = 'middle';
    const items = [['NVDA 122.00', '#7fd09a'], ['TQQQ -3%', '#e08070'], ['VONG -1%', '#e08070'], ['BTC +2%', '#7fd09a'], ['HAPPY BIRTHDAY WEISHUAI', '#f0d9a0'], ['生日快乐', '#f0d9a0'], ['PORTER NO LONGER GIVES MONEY ADVICE', '#e08070'], ['TONIGHT: YAN’S STEW', '#f0d9a0']];
    let x = 20;
    for (const [t, col] of items) { c.fillStyle = col; c.fillText(t, x, h / 2 + 2); x += c.measureText(t).width + 70; c.fillStyle = '#5a4a30'; c.fillText('·', x - 45, h / 2); }
  }, { repeat: [1, 1] });
  const tick = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.28), M(0x000000, { e: 0xffffff, ei: 1.4, unique: true }));
  tick.material.emissiveMap = tickerTex;
  tick.material.map = tickerTex;
  tick.position.set(0, 3.35, -8.205);
  tick.rotation.y = Math.PI;
  g.add(tick);
  box(g, [9.2, 0.36, 0.04], M(0x111111), [0, 3.17, -8.165], { cast: false });
  W.tick.push((dt) => { tickerTex.offset.x += dt * 0.04; });

  // Trader desks for atmosphere
  const deskMat = M(0x2a2c2e, { r: 0.5, m: 0.3 });
  const monitorDraw = (seed) => (c, w, h) => {
    c.fillStyle = '#071012'; c.fillRect(0, 0, w, h);
    let s = seed; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    c.strokeStyle = r() < 0.5 ? '#5fc28a' : '#d58a5a'; c.lineWidth = 3;
    c.beginPath(); let y = h * 0.5;
    for (let x = 10; x < w - 10; x += 12) { y += (r() - 0.5) * 22; y = Math.max(20, Math.min(h - 20, y)); x === 10 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
    c.fillStyle = 'rgba(160,200,190,0.5)';
    for (let i = 0; i < 6; i++) c.fillRect(10, 12 + i * 10, 40 + r() * 80, 4);
  };
  let n = 0;
  for (const [x, z] of [[-4.6, -11.2], [4.6, -11.2], [-4.6, -16.8], [4.6, -16.8]]) {
    box(g, [2.4, 0.05, 0.9], deskMat, [x, 0.73, z], { solid: true });
    box(g, [2.3, 0.7, 0.04], deskMat, [x, 0.03, z - 0.42], { cast: false });
    for (const dx of [-0.55, 0.55]) {
      box(g, [0.04, 0.3, 0.04], PAL.black(), [x + dx, 0.78, z - 0.2]);
      box(g, [0.6, 0.38, 0.03], PAL.black(), [x + dx, 0.95, z - 0.22]);
      screen(g, 0.56, 0.33, [x + dx, 1.14, z - 0.19], [0, 0, 0], 'mon' + n, monitorDraw(n++ * 13 + 5), 0.9, 256);
    }
    chair(g, x - 0.5, z + 0.6, Math.PI, { seat: 0x1f2326, frame: 0x101010 });
    chair(g, x + 0.6, z + 0.55, Math.PI + 0.3, { seat: 0x1f2326, frame: 0x101010 });
  }
  plant(g, -6.35, -13.4, 1.2);
  plant(g, 6.4, -19.4, 1.2);

  // ---------------- the main desk ----------------
  const walnut = M(0xffffff, { map: TEX.wood('#3a2a1e', 'walnut2'), r: 0.4 });
  const dz = -14.2;
  box(g, [3.4, 0.06, 1.0], walnut, [0, 0.74, dz], { solid: true });
  box(g, [0.06, 0.74, 0.95], walnut, [-1.65, 0, dz]);
  box(g, [0.06, 0.74, 0.95], walnut, [1.65, 0, dz]);
  box(g, [3.3, 0.6, 0.04], walnut, [0, 0.12, dz - 0.45]);
  // drawer in the middle with a keypad
  const drawer = new THREE.Group();
  drawer.position.set(0, 0.52, dz + 0.42);
  g.add(drawer);
  box(drawer, [0.9, 0.2, 0.5], M(0x2b1c12, { r: 0.5 }), [0, 0, -0.25]);
  box(drawer, [0.92, 0.2, 0.03], walnut, [0, 0, 0.01]);
  box(drawer, [0.16, 0.12, 0.02], M(0x151515, { r: 0.4 }), [0.28, 0.04, 0.03]);
  const keyLed = sphere(drawer, 0.01, M(0xffffff, { e: 0xa03020, ei: 2, unique: true }), [0.36, 0.17, 0.04], { cast: false });
  box(drawer, [0.2, 0.02, 0.02], PAL.brass(), [-0.15, 0.1, 0.035]);
  W.reactives.push((dt, snap) => {
    const open = S.has('drawer_open');
    const target = open ? 0.38 : 0;
    drawer.position.z = snap ? dz + 0.42 + target : drawer.position.z + (dz + 0.42 + target - drawer.position.z) * Math.min(1, dt * 3);
    keyLed.material.emissive.setHex(open ? 0x5fbf6a : S.has('fern_ok') ? 0xe0a030 : 0x7a2a20);
  });
  // spare badge sleeve inside the drawer
  const sleeve = new THREE.Group();
  sleeve.position.set(0.15, 0.1, -0.2);
  drawer.add(sleeve);
  box(sleeve, [0.08, 0.004, 0.11], PAL.brass(), [0, 0, 0]);
  const sleeveLbl = labelTex('sleeve', 128, 48, (c, w, h) => { c.fillStyle = '#efe9dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.font = `700 24px ${FONT.mono}`; c.fillText('BUILDER', 10, 32); });
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.025), M(0xffffff, { map: sleeveLbl.tex }));
  sl.rotation.x = -Math.PI / 2; sl.position.y = 0.003;
  sleeve.add(sl);

  // binder (left), terminal (right), mandate under a clip (centre)
  const binder = new THREE.Group();
  binder.position.set(-1.15, 0.77, dz + 0.05);
  binder.rotation.y = 0.15;
  g.add(binder);
  box(binder, [0.32, 0.07, 0.4], M(0x1f3550, { r: 0.6 }), [0, 0, 0]);
  box(binder, [0.3, 0.06, 0.38], PAL.paper(), [0.012, 0.005, 0]);
  const slip = note(binder, [0.1, 0.075, -0.22], 0.2, { w: 0.12, d: 0.08 });
  const slipItemPos = new THREE.Vector3(0.1, 0.075, -0.22).applyMatrix4(new THREE.Matrix4().makeRotationY(0.15)).add(binder.position);

  const term = new THREE.Group();
  term.position.set(1.15, 0.77, dz - 0.15);
  term.rotation.y = -0.2;
  g.add(term);
  box(term, [0.06, 0.25, 0.06], PAL.black(), [0, 0, -0.05]);
  box(term, [0.72, 0.44, 0.04], PAL.black(), [0, 0.22, -0.03]);
  const termScreen = screen(term, 0.68, 0.4, [0, 0.44, 0.002], [0, 0, 0], 'riskterm', (c, w, h) => {
    c.fillStyle = '#081210'; c.fillRect(0, 0, w, h);
    const ok = S.has('fern_ok');
    c.fillStyle = ok ? '#7fd09a' : '#e08070'; c.font = `700 22px ${FONT.mono}`;
    c.fillText(ok ? 'ALL ORDERS CANCELLED' : 'SELL AT THE OPENING BELL', 20, 36);
    c.font = `400 20px ${FONT.mono}`;
    TICKETS.forEach((t, i) => {
      c.fillStyle = '#cfe3c1'; c.fillText(t, 24, 84 + i * 34);
      const torn = S.has('sell_' + t);
      c.fillStyle = ok || torn ? '#7fd09a' : '#e0b060'; c.fillText(ok || torn ? 'CANCELLED' : 'SELL ALL', 150, 84 + i * 34);
    });
  }, 1.0, 512);
  S.on('flag', (f) => { if (f === 'fern_ok' || f.startsWith('sell_')) termScreen.redraw(); });

  const mandate = new THREE.Group();
  mandate.position.set(0, 0.775, dz + 0.1);
  g.add(mandate);
  box(mandate, [0.24, 0.008, 0.32], PAL.paper(), [0, 0, 0], { cast: false });
  box(mandate, [0.1, 0.012, 0.03], PAL.brass(), [0, 0.006, -0.14]);
  const l2 = note(mandate, [0.02, 0.012, -0.02], 0.12, { w: 0.2, d: 0.14 });
  showWhen(l2, () => !S.has('read_L2'));

  // Porter on the corner of the desk
  const porter = porterUnit(g, [-1.35, 0.77, dz - 0.3], 0.2);

  // desk lamp & ceiling strips
  fixture(g, [0, 3.9, -14.2], 0xdfeeff, 14, () => true, { dist: 9, kind: 'strip' });
  fixture(g, [-4.6, 3.9, -11.2], 0xdfeeff, 8, () => true, { dist: 8, kind: 'strip' });
  fixture(g, [4.6, 3.9, -16.8], 0xdfeeff, 8, () => true, { dist: 8, kind: 'strip' });
  fixture(g, [0.6, 3.6, -18.6], 0x9fd8b8, 4, () => true, { dist: 6, kind: 'bulb' });
  fixture(g, [5.6, 3.9, -9.2], 0xdfeeff, 7, () => true, { dist: 6, kind: 'strip' });
  fixture(g, [-5.8, 3.9, -9.2], 0xdfeeff, 7, () => true, { dist: 6, kind: 'strip' });

  // lab door + reader
  slidingDoor(g, { side: 'n', at: -5.5, fixed: -20, w: 1.4, h: 2.4, mat: M(0x2a3034, { r: 0.35, m: 0.6 }), frameMat: PAL.steel(), isOpen: () => S.has('lab_door'), slide: 1 });
  const reader = new THREE.Group();
  reader.position.set(-4.4, 1.2, -19.82);
  g.add(reader);
  box(reader, [0.12, 0.18, 0.04], M(0x222222, { r: 0.4 }), [0, 0, 0]);
  const rLed = sphere(reader, 0.012, M(0xffffff, { e: 0x8a2a20, ei: 2, unique: true }), [0, 0.13, 0.025], { cast: false });
  W.reactives.push(() => rLed.material.emissive.setHex(S.has('lab_door') ? 0x5fbf6a : S.has('labcard') ? 0xe0a030 : 0x8a2a20));
  const sign = screen(g, 0.9, 0.22, [-5.5, 2.75, -19.84], [0, 0, 0], 'labsign', (c, w, h) => { c.fillStyle = '#0c0c0c'; c.fillRect(0, 0, w, h); c.fillStyle = '#d7dde0'; c.font = `700 46px ${FONT.hud}, sans-serif`; c.fillText('COMPUTER ROOM 机房', 22, h * 0.72); }, 0.6, 512);

  // ---------------- the sell orders, and what's in the way ----------------
  // small TV on the desk by the east window, stuck on the business channel
  const tv = new THREE.Group();
  tv.position.set(5.55, 0.78, -16.95);
  g.add(tv);
  box(tv, [0.4, 0.3, 0.26], M(0x1c1d1e, { r: 0.5 }), [0, 0, 0]);
  screen(tv, 0.32, 0.22, [0, 0.15, 0.135], [0, 0, 0], 'tvscr', (c, w, h) => {
    c.fillStyle = '#14324a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e0e8ee'; c.font = `700 30px ${FONT.hud}`; c.fillText('MARKETS', 18, 44);
    c.fillStyle = '#d58a5a'; c.fillText('BTC  24/7', 18, 90);
  }, 0.9, 256);

  const bin = new THREE.Group();
  bin.position.set(1.95, 0, -13.55);
  g.add(bin);
  cyl(bin, 0.16, 0.13, 0.36, M(0x2a2c2e, { r: 0.5, m: 0.5 }), [0, 0, 0], { solid: true });

  // Porter's panic banner hangs across the south-west corner. You have to crouch to get under it.
  const bannerTex = canvasTex('sellbanner', 512, 256, (c, w, h) => {
    c.fillStyle = '#e9e1cf'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#b0302a'; c.font = `800 74px ${FONT.wide}, sans-serif`; c.textAlign = 'center';
    c.fillText('SELL!', w / 2, 100); c.font = `800 52px ${FONT.wide}, sans-serif`; c.fillText('SELL! SELL!', w / 2, 180);
    c.fillStyle = '#6a6458'; c.font = `600 22px ${FONT.hud}, sans-serif`; c.fillText('— PORTER', w / 2 + 120, 230);
  });
  const bannerMat = M(0xffffff, { map: bannerTex, r: 0.95, side: THREE.DoubleSide });
  const bannerA = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.0), bannerMat);
  bannerA.position.set(-4.9, 1.98, -9.1); bannerA.rotation.y = Math.PI / 2;
  const bannerB = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.0), bannerMat);
  bannerB.position.set(-5.95, 1.98, -10.2); bannerB.rotation.y = Math.PI; // readable from inside the room
  g.add(bannerA, bannerB);
  cyl(g, 0.012, 0.012, 2.25, PAL.steel(), [-4.9, 2.98, -9.1]).rotation.x = Math.PI / 2;
  cyl(g, 0.012, 0.012, 2.15, PAL.steel(), [-5.95, 2.98, -10.2]).rotation.z = Math.PI / 2;
  solid(-4.98, -4.82, -10.2, -8, 0.98, 4);
  solid(-7, -4.9, -10.28, -10.12, 0.98, 4);

  // a low wall of archive boxes around the south-east corner. Jump over it.
  const boxMat = M(0xffffff, { map: TEX.plain('#9a7a52', 'cardboard', 3000, 0.08), r: 0.9 });
  for (let x = 4.45; x < 7; x += 0.62) box(g, [0.58, 0.48, 0.44], boxMat, [x + 0.29, 0, -9.75]);
  for (let z = -9.5; z < -8; z += 0.5) box(g, [0.44, 0.48, 0.46], boxMat, [4.45, 0, z + 0.23]);
  solid(4.2, 7, -9.98, -9.52, 0, 0.48);
  solid(4.23, 4.67, -9.98, -8, 0, 0.48);

  // more boxes and a knocked-over chair cluttering the aisles (too tall to jump)
  for (const [x, z, n] of [[-2.6, -11.0, 3], [2.9, -17.6, 2], [-2.9, -17.5, 3], [3.0, -10.4, 2]]) {
    for (let i = 0; i < n; i++) box(g, [0.6, 0.45, 0.45], boxMat, [x + (i % 2) * 0.05, i * 0.45, z]);
    solid(x - 0.32, x + 0.36, z - 0.24, z + 0.24, 0, n * 0.45);
  }
  const fallen = new THREE.Group();
  fallen.position.set(-0.4, 0, -11.3);
  fallen.rotation.set(0, 0.6, Math.PI / 2);
  g.add(fallen);
  chair(fallen, 0, 0, 0, { seat: 0x1f2326, frame: 0x101010 });
  solid(-0.9, 0.1, -11.7, -10.9, 0, 0.6);

  // the four printed orders
  const ticketMesh = (x, y, z, ry) => {
    const m = new THREE.Group();
    m.position.set(x, y, z);
    m.rotation.y = ry;
    g.add(m);
    const lt = labelTex('ticket' + x, 128, 64, (c, w, h) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, h); c.fillStyle = '#b0302a'; c.font = `800 24px ${FONT.mono}`; c.fillText('SELL', 12, 28); c.fillStyle = '#222'; c.font = `400 16px ${FONT.mono}`; c.fillText('ORDER', 12, 50); });
    const pm = M(0xffffff, { map: lt.tex, r: 0.9, side: THREE.DoubleSide, unique: true, e: 0xffffff, ei: 0.55 });
    pm.emissiveMap = lt.tex; // a glow so the paper shows up in the darker corners
    pm.emissiveIntensity = 0.9;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), pm);
    p.rotation.x = -Math.PI / 2;
    m.add(p);
    return m;
  };
  const TK = {
    VONG: { pos: [1.95, 0.34, -13.55], obj: ticketMesh(1.95, 0.32, -13.55, 0.5), reach: 1.4, label: () => L('Fish the order out of the wastebasket', '把订单从废纸篓里捞出来') },
    NVDA: { pos: [-4.6, 0.05, -16.95], obj: ticketMesh(-4.6, 0.012, -16.95, -0.3), reach: 1.5, crouch: true, label: () => L('Reach under the desk for the order', '伸手到桌子底下够订单') },
    TQQQ: { pos: [6.25, 0.05, -8.6], obj: ticketMesh(6.25, 0.012, -8.6, 1.1), reach: 1.2, label: () => L('Grab the order behind the boxes', '抓起箱子后面的订单') },
    BTC: { pos: [-5.75, 0.05, -9.15], obj: ticketMesh(-5.75, 0.012, -9.15, 0.2), reach: 1.8, label: () => L('Grab the order under the banner', '抓起横幅底下的订单') },
  };
  for (const t of TICKETS) showWhen(TK[t].obj, () => !S.has('sell_' + t) && !S.has('fern_ok'));
  vlight([-5.75, 0.7, -9.15], 0xffe6b0, 1.6, { dist: 2.2, on: () => W.bellRun?.on && !S.has('sell_BTC') });

  // the countdown to the opening bell
  const RUN = { t: 0, on: false };
  W.bellRun = RUN;
  const LIMIT = 90;
  // Orders you have already torn up stay torn up; the bell only restarts the clock.
  const startRun = () => {
    if (S.has('fern_ok')) return;
    termScreen.redraw();
    RUN.t = LIMIT; RUN.on = true;
    G.sfx('beep');
  };
  W.tick.push((dt) => {
    if (!RUN.on) { G.timer?.(null); return; }
    if (!IN.enabled) return; // paused while reading or in the menu
    RUN.t -= dt;
    G.timer?.(Math.max(0, RUN.t));
    if (RUN.t <= 0) {
      RUN.on = false;
      G.sfx('bell');
      G.porter([[L('That was the opening bell. Fortunately for everyone I forgot to press the button, so the orders you have not torn up yet are still waiting, and the clock is starting again.', '开盘铃响了。幸好我忘了按确认键，所以还没撕的订单都还在，计时马上重新开始。'), 5200]]);
      setTimeout(startRun, 5600);
    }
  });
  const tear = (t) => {
    S.set('sell_' + t);
    G.sfx('tear');
    const n = ticketsFound();
    G.note(ENTRY_NOTE[t]() + (n < 4 ? L(` That’s ${n} of the 4.`, ` 撕掉了 ${n} 张，一共 4 张。`) : ''), 6000);
    if (n === 4) {
      RUN.on = false;
      S.set('fern_ok');
      setTimeout(() => {
        G.sfx('good');
        S.set('drawer_open');
        S.set('tok_bell'); G.give('tok_bell', ['Bell token', '铃铛铜牌']);
        setTimeout(() => { S.set('labcard'); G.give('labcard', ['Key card for the computer room', '机房门卡']); }, 700);
        G.porter([[L('All four orders are cancelled, the bell has rung on a perfectly ordinary Monday, and I have opened the drawer and printed a short statement.', '四张订单全部撤销，开盘铃在一个再普通不过的星期一响了。我已经打开抽屉，还打印了一份简短的声明。'), 4600]]);
        setTimeout(() => G.read('R_trade'), 1600);
      }, 900);
    }
  };
  const ENTRY_NOTE = {
    NVDA: () => L('SELL ALL NVDA, because it was “down 90% since Friday”. You’ve seen a ten-for-one split before, so this one goes in the bin.', '卖出全部 NVDA，理由是“比星期五跌了 90%”。一拆十的拆股你见得多了，这张直接扔掉。'),
    TQQQ: () => L('SELL ALL TQQQ, because it “fell three times as far as the Nasdaq”, which is more or less the whole point of TQQQ.', '卖出全部 TQQQ，理由是“跌幅是纳斯达克的三倍”，可三倍本来就是 TQQQ 的全部意义。'),
    BTC: () => L('SELL ALL BITCOIN, because it “kept moving on a Sunday”. Nobody has told Porter that Bitcoin doesn’t take weekends off.', '卖出全部比特币，理由是“星期天还在动”。还没人告诉 Porter，比特币周末是不休息的。'),
    VONG: () => L('SELL ALL VONG, because it “sent us money for no reason”. Porter has apparently never met a dividend before.', '卖出全部 VONG，理由是“无缘无故给我们打钱”。Porter 显然从来没见过分红。'),
  };
  W.isCrouched = () => G.ctl?.crouchK > 0.5;

  // ---------------- interactions ----------------
  item({
    id: 'mandate', pos: [0, 0.8, dz + 0.1], obj: mandate,
    label: () => L('Read Joy’s note', '看 Joy 的纸条'),
    when: () => !S.has('read_L2') || (!RUN.on && !S.has('fern_ok')),
    use: () => G.read('L2', { onClose: () => { S.set('read_L2'); startRun(); } }),
  });
  for (const t of TICKETS) {
    const d = TK[t];
    item({
      id: 'sell_' + t, pos: d.pos, obj: d.obj, reach: d.reach, allow: 0.9, prio: 0.2,
      when: () => RUN.on && !S.has('sell_' + t),
      label: d.label,
      use: () => {
        if (d.crouch && !W.isCrouched()) { G.note(KT(L('It’s too far under the desk to reach standing up. Press C to crouch.', '订单在桌子底下太深，站着够不着。按 C 蹲下。'), L('It’s too far under the desk to reach standing up. Tap Crouch first.', '订单在桌子底下太深，站着够不着。先点“蹲下”。'))); return; }
        tear(t);
      },
    });
  }
  item({
    id: 'labreader', pos: [-4.4, 1.2, -19.85], obj: reader,
    label: () => (S.has('labcard') ? L('Swipe the key card', '刷门卡') : L('Card reader', '读卡器')),
    when: () => !S.has('lab_door'),
    use: () => {
      if (!S.has('labcard')) { G.sfx('deny'); G.note(L('The reader for the computer room wants a key card, and Porter is keeping it in the desk drawer until the market calms down.', '机房的读卡器要刷门卡，Porter 把门卡锁在桌子抽屉里了，说要等市场平静下来才给。')); return; }
      G.sfx('beep'); S.set('lab_door'); G.sfx('door');
      G.porter([[L('A word of warning about the computer room: the robot in there plays chess, and it has never once let anybody forget it.', '先提醒您一句：机房里那个机器人会下棋，而且从来不让任何人忘了这件事。'), 4200]]);
    },
  });

  mark('mandate', [0, 0.8, dz + 0.1]);
  mark('labreader', [-4.4, 1.2, -19.85]);
  // one of the family photos hidden around the house
  familyPhoto(g, 'ph_boat', { img: 'img/p7508.jpg', pos: [4.6, 1.75, -19.84], ry: 0 });
  return g;
}
