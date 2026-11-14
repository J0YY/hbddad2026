import * as THREE from 'three';
import { W, M, PAL, TEX, box, cyl, sphere, room, slidingDoor, item, mark, labelTex, FONT, showWhen, canvasTex, solid, vlight } from './kit.js';
import { porterUnit, note, fixture, screen, token, chair, familyPhoto } from './props.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L, KT } from '../game/i18n.js';
import { buildTennis } from './tennis.js';

// Hall: x -16..6, z -66..-32. Court centred on x = -5.
export const COURT = { cx: -5, near: -37, net: -48, far: -59, sx0: -9, sx1: -1, dx0: -10, dx1: 0, svcNear: -42.1, svcFar: -53.9 };
export const railWorld = (x, y) => [-9 + x * 2, [-49.5, -54, -58.5][y]];

function clayTex() {
  // 22 x 34 m hall floor, 30 px per metre
  const PX = 30, Wm = 22, Dm = 34;
  return canvasTex('clay', Wm * PX, Dm * PX, (c, w, h) => {
    c.fillStyle = '#a4543a'; c.fillRect(0, 0, w, h);
    let s = 5; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 26000; i++) { const v = r(); c.fillStyle = v > 0.5 ? `rgba(255,220,190,${r() * 0.05})` : `rgba(60,20,10,${r() * 0.07})`; c.fillRect(r() * w, r() * h, 2, 2); }
    // brushed sweep marks
    c.strokeStyle = 'rgba(80,30,15,0.06)';
    for (let i = 0; i < 90; i++) { c.beginPath(); const y = r() * h; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + 20, w * 0.7, y - 20, w, y + 4); c.stroke(); }
    const X = (x) => (x + 16) * PX, Z = (z) => (z + 66) * PX;
    c.strokeStyle = '#efe6d6'; c.lineWidth = 0.06 * PX;
    const L = (x0, z0, x1, z1) => { c.beginPath(); c.moveTo(X(x0), Z(z0)); c.lineTo(X(x1), Z(z1)); c.stroke(); };
    const C = COURT;
    L(C.dx0, C.near, C.dx1, C.near); L(C.dx0, C.far, C.dx1, C.far);
    L(C.dx0, C.near, C.dx0, C.far); L(C.dx1, C.near, C.dx1, C.far);
    L(C.sx0, C.near, C.sx0, C.far); L(C.sx1, C.near, C.sx1, C.far);
    L(C.sx0, C.svcNear, C.sx1, C.svcNear); L(C.sx0, C.svcFar, C.sx1, C.svcFar);
    L(C.cx, C.svcNear, C.cx, C.svcFar);
    L(C.cx, C.near, C.cx, C.near - 0.3); L(C.cx, C.far, C.cx, C.far + 0.3);
  }, { repeat: [1, 1] });
}

export function buildCourt() {
  const floorMat = M(0xffffff, { map: clayTex(), r: 0.95 });
  floorMat.map.wrapS = floorMat.map.wrapT = THREE.ClampToEdgeWrapping;
  const g = room({
    x0: -16, x1: 6, z0: -66, z1: -32, h: 9,
    floor: floorMat,
    wall: M(0xffffff, { map: TEX.plain('#2e3b36', 'hallwall', 8000, 0.06), r: 0.9 }), wallUV: 4,
    ceil: M(0x121514),
    trim: M(0x1b2420),
    doors: [{ side: 's', at: -5.5, w: 1.4, h: 2.4 }, { side: 'w', at: -50, w: 1.4, h: 2.4 }],
  });
  W.areas.push({
    id: 'court', name: ['The tennis court', '网球场'], x0: -16, x1: 6, z0: -66, z1: -32, ceil: 9,
    hemi: [0x9a8a78, 0x2a1810, 0.55], key: [0xfff0dc, 0.8], fog: [0x0d0f0e, 24, 70], bg: 0x0a0b0b, amb: 'court', exposure: 1.0, fill: 1.2,
    chapter: [['Room three', '第三个房间'], ['The booking says “singles”, which Porter has taken to mean one person and one very confident machine.', '订场单上写着“单打”，Porter 理解成了一个人，外加一台非常自信的机器。']],
  });
  W.anchors.court = { x: -5.5, z: -33.3, yaw: 0 };

  // stadium lights that come on in pairs the first time you walk in
  const pairs = [[-38.5, 0], [-48, 1], [-57.5, 2]];
  const lit = { n: 0 };
  W.courtLit = lit;
  for (const [z, i] of pairs) {
    for (const x of [-9.5, -0.5]) {
      fixture(g, [x, 8.6, z], 0xfff2de, 70, () => S.has('court_lit') && lit.n > i, { dist: 22, kind: 'strip' });
    }
  }
  W.onAreaHooks = W.onAreaHooks || [];
  W.onAreaHooks.push((id) => {
    if (id !== 'court') return;
    if (!S.has('court_lit')) {
      S.set('court_lit');
      [0, 1, 2].forEach((i) => setTimeout(() => { lit.n = i + 1; G.sfx('thock'); }, 600 + i * 900));
    } else lit.n = 3;
  });
  W.reactives.push((dt, snap) => { if (snap && S.has('court_lit')) lit.n = 3; });

  // net and posts
  const C = COURT;
  for (const x of [C.dx0 - 0.4, C.dx1 + 0.4]) cyl(g, 0.05, 0.05, 1.07, PAL.darkBrass(), [x, 0, C.net], { solid: true });
  const netTex = canvasTex('net', 256, 32, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(20,20,20,0.85)'; c.lineWidth = 1;
    for (let x = 0; x < w; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }, { repeat: [8, 1] });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(C.dx1 - C.dx0 + 0.8, 0.92), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.2 }));
  net.position.set(C.cx, 0.46, C.net);
  g.add(net);
  box(g, [C.dx1 - C.dx0 + 0.8, 0.06, 0.02], M(0xeeeeee), [C.cx, 0.9, C.net], { cast: false });
  solid(C.dx0 - 0.4, C.dx1 + 0.4, C.net - 0.08, C.net + 0.08, 0, 1);

  // returner on its rails
  const returner = new THREE.Group();
  returner.position.set(-5, 0, C.far + 1.2);
  g.add(returner);
  box(returner, [0.7, 0.5, 0.5], M(0x2c4a40, { r: 0.5, m: 0.4 }), [0, 0.05, 0]);
  box(returner, [0.9, 0.06, 0.06], PAL.steel(), [0, 0.8, 0]);
  cyl(returner, 0.04, 0.04, 0.3, PAL.steel(), [0, 0.55, 0]);
  const paddle = box(returner, [0.5, 0.35, 0.03], M(0x1a1a1a), [0, 0.9, 0.04]);
  const rEye = sphere(returner, 0.04, M(0xffffff, { e: 0xff8040, ei: 2, unique: true }), [0.2, 0.4, 0.26], { cast: false });
  W.returner = returner;
  W.tick.push((dt, t) => { rEye.material.emissiveIntensity = S.has('rally_ok') ? 0.2 : 1.5 + Math.sin(t * 3); });

  // ball machine near the near baseline
  const machine = new THREE.Group();
  machine.position.set(-3, 0, -37.8);
  g.add(machine);
  box(machine, [0.6, 0.55, 0.7], M(0x3a5a8a, { r: 0.5 }), [0, 0.12, 0], { solid: true });
  for (const [dx, dz] of [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0.3], [0.25, 0.3]]) { const w = cyl(machine, 0.07, 0.07, 0.04, PAL.black(), [dx, 0.07, dz]); w.rotation.z = Math.PI / 2; }
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.35, 16, 1, true), M(0x2c2c2c, { side: THREE.DoubleSide }));
  hopper.position.set(0, 0.85, 0);
  machine.add(hopper);
  const ballMat = M(0xd6e04a, { r: 0.8 });
  for (let i = 0; i < 9; i++) sphere(machine, 0.034, ballMat, [(Math.random() - 0.5) * 0.4, 0.95, (Math.random() - 0.5) * 0.4], { seg: 8, seg2: 6 });
  cyl(machine, 0.06, 0.06, 0.18, PAL.black(), [0, 0.5, -0.4]).rotation.x = Math.PI / 2;

  // ball basket with the candle
  const basket = new THREE.Group();
  basket.position.set(-1.4, 0, -36.6);
  g.add(basket);
  const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.55, 12, 4, true), M(0x8a8f93, { r: 0.4, m: 0.7, side: THREE.DoubleSide, t: true, o: 0.6 }));
  bk.position.y = 0.3;
  basket.add(bk);
  for (let i = 0; i < 14; i++) sphere(basket, 0.034, ballMat, [(Math.random() - 0.5) * 0.3, 0.1 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3], { seg: 8, seg2: 6 });
  solid(-1.65, -1.15, -36.85, -36.35, 0, 0.6);

  // umpire's chair (west of the net) with a compartment under the seat
  const ump = new THREE.Group();
  ump.position.set(-12.2, 0, C.net);
  g.add(ump);
  const umpWood = M(0x2e4a3e, { r: 0.6 });
  for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) box(ump, [0.06, 1.8, 0.06], umpWood, [dx, 0, dz]);
  box(ump, [0.8, 0.08, 0.8], umpWood, [0, 1.8, 0]);
  box(ump, [0.6, 0.6, 0.06], umpWood, [-0.3, 1.88, 0]);
  box(ump, [0.06, 0.6, 0.6], umpWood, [-0.34, 1.88, 0]);
  for (let i = 0; i < 5; i++) box(ump, [0.06, 0.04, 0.5], PAL.steel(), [0.42, 0.3 + i * 0.35, 0]);
  const comp = new THREE.Group();
  comp.position.set(0, 1.0, 0);
  ump.add(comp);
  box(comp, [0.7, 0.4, 0.7], umpWood, [0, 0, 0]);
  const lid = new THREE.Group();
  lid.position.set(0.35, 0.4, 0);
  comp.add(lid);
  box(lid, [0.04, 0.4, 0.66], M(0x3a5a4e, { r: 0.5 }), [0.01, -0.4, 0]);
  W.reactives.push((dt, snap) => {
    const target = S.has('rally_ok') ? -1.5 : 0;
    lid.rotation.z = snap ? target : lid.rotation.z + (target - lid.rotation.z) * Math.min(1, dt * 3);
  });
  solid(-12.6, -11.8, C.net - 0.4, C.net + 0.4, 0, 2.4);
  const slip = note(ump, [0.43, 1.35, 0.1], 0, { w: 0.14, d: 0.2 });
  slip.rotation.set(0, 0, Math.PI / 2);
  const rtoken = token(g, 'racket', [-11.85, 1.3, C.net]);
  showWhen(rtoken, () => S.has('rally_ok') && !S.has('tok_racket'));

  // replay screen on a stand
  const rep = new THREE.Group();
  rep.position.set(-13.4, 0, -40.5);
  rep.rotation.y = Math.PI / 2;
  g.add(rep);
  box(rep, [0.1, 1.2, 0.1], PAL.black(), [0, 0, 0]);
  box(rep, [1.5, 0.9, 0.06], PAL.black(), [0, 1.1, 0]);
  const repScr = screen(rep, 1.4, 0.8, [0, 1.55, 0.035], [0, 0, 0], 'replayscr', (c, w, h) => {
    c.fillStyle = '#0a0d0c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#a4543a'; c.fillRect(40, 60, w - 80, h - 120);
    c.strokeStyle = '#efe6d6'; c.lineWidth = 3; c.strokeRect(80, 80, w - 160, h - 160);
    c.beginPath(); c.moveTo(w / 2, 80); c.lineTo(w / 2, h - 80); c.stroke();
    c.fillStyle = '#efe6d6';
    c.font = `700 30px ${FONT.hud}, sans-serif`; c.fillText(W.tennis?.on ? L('LIVE', '直播') : S.has('rally_ok') ? L('FINAL', '终场') : L('COURT 1', '1 号场'), 40, 40);
    c.font = `700 40px ${FONT.hud}, sans-serif`;
    c.fillText(W.tennis?.on ? W.tennis.scoreText() : S.has('rally_ok') ? L('WEISHUAI WINS', 'WEISHUAI 获胜') : L('WAITING FOR A PLAYER', '等待球员'), 40, h - 22);
  }, 0.9, 512);
  solid(-13.6, -13.2, -41.3, -39.7, 0, 2);

  // scoreboard high on the far wall
  const sb = screen(g, 6, 2, [C.cx, 6.2, -65.8], [0, 0, 0], 'scoreboard', (c, w, h) => {
    c.fillStyle = '#060606'; c.fillRect(0, 0, w, h);
    c.font = `800 120px ${FONT.wide}`;
    c.textAlign = 'center';
    c.font = `800 120px ${FONT.wide}, sans-serif`;
    if (S.has('rally_ok') && !W.tennis?.on) { c.fillStyle = '#f0d9a0'; c.fillText(L('GAME, WEISHUAI', 'WEISHUAI 胜'), w / 2, h / 2 + 44); return; }
    c.fillStyle = '#f0d9a0';
    c.fillText(W.tennis?.on ? W.tennis.scoreText() : '0 – 0', w / 2, h / 2 + 10);
    c.font = `600 44px ${FONT.hud}, sans-serif`;
    c.fillStyle = '#8a8a8a';
    c.fillText(L('WEISHUAI    v    THE MACHINE', 'WEISHUAI    对    发球机'), w / 2, h - 40);
  }, 1.2, 1024);
  W.scoreboard = { redraw: () => { sb.redraw(); repScr.redraw(); } };
  S.on('flag', (f) => { if (f === 'rally_ok') W.scoreboard.redraw(); });
  S.on('settings', () => W.scoreboard.redraw());
  const T = buildTennis(g, C);

  // the second racket, tagged as staff equipment, on a bench by the west wall
  box(g, [0.45, 0.45, 2.4], M(0x3a2a1e, { r: 0.6 }), [-15.5, 0, -44], { solid: true });
  const racket = new THREE.Group();
  racket.position.set(-15.4, 0.47, -44.2);
  racket.rotation.set(-Math.PI / 2, 0, 0.4);
  g.add(racket);
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 24), M(0x1c1c1c, { r: 0.3 }));
  head.scale.set(1, 1.3, 1);
  racket.add(head);
  cyl(racket, 0.015, 0.015, 0.33, M(0x1c1c1c), [0, -0.5, 0]);
  const tagM = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), M(0xe0a030, { side: THREE.DoubleSide }));
  tagM.position.set(0.05, -0.22, 0.02);
  racket.add(tagM);

  // kitchen door on the west wall, a warm pass window beside it
  slidingDoor(g, { side: 'w', at: -50, fixed: -16, w: 1.4, h: 2.4, mat: M(0x6a4a30, { r: 0.6 }), frameMat: PAL.darkBrass(), isOpen: () => S.has('kitchen_door'), slide: -1 });
  const lock = new THREE.Group();
  lock.position.set(-15.82, 1.1, -51.0);
  g.add(lock);
  box(lock, [0.06, 0.16, 0.1], PAL.brass(), [0, 0, 0]);
  const pass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), M(0x000000, { e: 0xffb070, ei: 1.4 }));
  pass.position.set(-15.825, 1.3, -47.2);
  pass.rotation.y = Math.PI / 2;
  g.add(pass);
  box(g, [0.03, 0.72, 1.12], PAL.darkBrass(), [-15.845, 0.94, -47.2], { cast: false });
  vlight([-15.4, 1.3, -47.2], 0xffb070, 3, { dist: 4 });

  const porter = porterUnit(g, [-15.8, 1.6, -36], Math.PI / 2, { wall: true });

  // ---------------- interactions ----------------
  item({
    id: 'slip', pos: [-11.75, 1.35, C.net + 0.1], obj: slip, reach: 2.2,
    label: () => L('Read the booking slip', '看订场单'),
    use: () => G.read('L4', { onClose: () => S.set('read_L4') }),
  });
  item({
    id: 'machine', pos: [-3, 0.7, -37.8], obj: machine, reach: 2.2,
    when: () => !T.on,
    label: () => (S.has('rally_ok') ? L('Play the machine again', '再和发球机打一局') : L('Start the ball machine', '启动发球机')),
    use: () => {
      if (!S.has('racket_got')) { G.sfx('deny'); G.note(L('The machine won’t play anyone who turns up without a racket. There’s one lying on the bench by the left-hand wall.', '没带球拍的人，发球机一概不陪打。左边墙那儿的长凳上放着一把。')); return; }
      T.start();
    },
  });
  showWhen(racket, () => !S.has('racket_got'));
  item({
    id: 'racket2', pos: [-15.4, 0.55, -44.2], obj: racket, reach: 2, label: () => L('Borrow the racket marked STAFF EQUIPMENT', '借走那把写着“员工器材”的球拍'),
    when: () => !S.has('racket_got'),
    use: () => {
      S.set('racket_got');
      G.give('racket_got', ['A racket', '一把球拍']);
      G.porter([[L('That racket is staff equipment. I will be writing this down.', '那把球拍是员工器材。这件事我会记下来的。'), 3600]]);
    },
  });
  item({
    id: 'umpire', pos: [-11.85, 1.3, C.net], obj: comp, reach: 2.3, label: () => L('Take what’s in the umpire’s chair', '拿出裁判椅里的东西'),
    when: () => S.has('rally_ok') && !S.has('tok_racket'),
    use: () => {
      S.set('tok_racket'); G.give('tok_racket', ['Racket token', '球拍铜牌']);
      S.set('kitchenkey');
      setTimeout(() => { G.toast(['Kitchen key', '厨房钥匙']); G.sfx('pickup'); }, 700);
      setTimeout(() => G.read('guesttag'), 900);
    },
  });
  item({
    id: 'kdoor', pos: [-15.9, 1.1, -51.0], obj: lock, reach: 2.2,
    label: () => (S.has('kitchenkey') ? L('Unlock the kitchen door', '打开厨房门') : L('Kitchen door', '厨房门')),
    when: () => !S.has('kitchen_door'),
    use: () => {
      if (!S.has('kitchenkey')) { G.sfx('deny'); G.note(L('It’s locked, and something on the other side smells very good indeed.', '门锁着，门那边飘来一股特别香的味道。')); return; }
      S.set('kitchen_door'); G.sfx('door');
      G.porter([[L('The kitchen is for staff only, although I may have been wrong today about who counts as staff.', '厨房只对工作人员开放，不过今天谁算工作人员，我可能弄错了。'), 4000]]);
    },
  });

  mark('slip', [-11.75, 1.35, C.net]);
  mark('racket2', [-15.4, 0.55, -44.2]);
  mark('machine', [-3, 0.7, -37.8]);
  mark('umpire', [-11.85, 1.3, C.net]);
  mark('kdoor', [-15.9, 1.1, -50.0]);
  // one of the family photos hidden around the house
  familyPhoto(g, 'ph_garden', { img: 'img/photo-garden.jpg', pos: [-15.84, 1.8, -42], ry: Math.PI / 2, portrait: true, size: 0.6 });
  return g;
}
