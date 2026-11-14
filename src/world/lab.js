import * as THREE from 'three';
import { W, M, PAL, TEX, box, cyl, sphere, room, slidingDoor, item, mark, labelTex, FONT, showWhen, canvasTex, solid, rng } from './kit.js';
import { porterUnit, note, fixture, screen, token, familyPhoto } from './props.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L, KT } from '../game/i18n.js';
import { PUZZLES, piecesFound } from '../game/clues.js';

export const CASE = { x: -5.5, z: -26.5, top: 0.92, cell: 0.24 };
export const cellWorld = (x, y) => [CASE.x - 0.72 + x * CASE.cell, CASE.z - 0.72 + y * CASE.cell];

function rackFace(key, seed) {
  return canvasTex('rack-' + key, 128, 256, (c, w, h) => {
    c.fillStyle = '#0d0f11'; c.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let y = 6; y < h - 6; y += 16) {
      c.fillStyle = '#1b1f23'; c.fillRect(6, y, w - 12, 13);
      c.fillStyle = '#0a0b0c'; for (let x = 12; x < w - 30; x += 4) c.fillRect(x, y + 3, 2, 7);
      for (let k = 0; k < 3; k++) { c.fillStyle = r() < 0.7 ? (r() < 0.8 ? '#4fd08a' : '#e0a030') : '#203028'; c.fillRect(w - 26 + k * 6, y + 5, 3, 3); }
    }
  });
}

export function buildLab() {
  const g = room({
    x0: -11, x1: 0, z0: -32, z1: -20, h: 3.4,
    floor: M(0xffffff, { map: TEX.tiles('#5a5f62', '#52575a', 'labfloor', 8), r: 0.6, m: 0.1 }), floorUV: 4,
    wall: M(0xffffff, { map: TEX.plain('#6a7276', 'labwall', 6000, 0.05), r: 0.85 }), wallUV: 3,
    ceil: M(0x2a2f32),
    trim: M(0x101213),
    doors: [{ side: 's', at: -5.5, w: 1.4, h: 2.4 }, { side: 'n', at: -5.5, w: 1.4, h: 2.4 }],
  });
  W.areas.push({
    id: 'lab', name: ['The computer room', '机房'], x0: -11, x1: 0, z0: -32, z1: -20, ceil: 3.4,
    hemi: [0xa8c4d2, 0x3a4248, 1.25], key: [0xd8ecf6, 0.85], fog: [0x0a1014, 18, 45], bg: 0x080b0d, amb: 'lab', exposure: 1.3, fill: 2.4,
    chapter: [['Room two', '第二个房间'], ['The robot in here plays chess, and it has decided that nobody leaves until somebody beats it.', '这里的机器人会下棋，它已经决定了：没人赢它，谁也别想走。']],
  });
  W.anchors.lab = { x: -5.5, z: -21.4, yaw: 0 };

  // server racks along both side walls
  const rackBody = M(0x16191c, { r: 0.4, m: 0.6 });
  const leds = [];
  let rk = 0;
  for (const [x, ry] of [[-10.45, Math.PI / 2], [-0.55, -Math.PI / 2]]) {
    for (let z = -21.2; z > -31; z -= 0.75) {
      if (x > -1 && z < -22.5 && z > -24.6) continue; // gap for the archive spool
      if (x < -10 && z < -24.2 && z > -28.6) continue; // gap for terminal + hatch
      box(g, [0.9, 2.2, 0.7], rackBody, [x, 0, z], { solid: true });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 2.0), M(0xffffff, { map: rackFace(rk % 4, rk * 7 + 1), e: 0xffffff, ei: 0.7, unique: true }));
      f.material.emissiveMap = f.material.map;
      f.position.set(x + (ry > 0 ? 0.46 : -0.46), 1.1, z);
      f.rotation.y = ry;
      g.add(f);
      leds.push(f.material);
      rk++;
    }
  }
  W.tick.push((dt, t) => { leds.forEach((m, i) => (m.emissiveIntensity = 0.55 + 0.25 * Math.sin(t * 3 + i * 1.7) * Math.sin(t * 7.1 + i))); });

  // ceiling strips
  for (const x of [-8.2, -2.8]) for (const z of [-22.6, -26.2, -29.8]) fixture(g, [x, 3.35, z], 0xdcefff, 9, () => true, { dist: 7, kind: 'strip' });

  // ---------------- wall terminal with the incident report taped over it ----------------
  const wt = new THREE.Group();
  wt.position.set(-10.9, 0, -25.2);
  g.add(wt);
  box(wt, [0.12, 1.1, 1.3], M(0x1a1d20, { r: 0.4, m: 0.5 }), [0, 0.9, 0]);
  const termScr = screen(wt, 1.1, 0.8, [0.08, 1.45, 0], [0, Math.PI / 2, 0], 'waitterm', (c, w, h) => {
    c.fillStyle = '#071012'; c.fillRect(0, 0, w, h);
    c.font = `700 26px ${FONT.mono}`;
    c.fillStyle = S.has('deadlock_ok') ? '#7fd09a' : '#e0a030';
    c.fillText(S.has('deadlock_ok') ? 'RESULT: WEISHUAI 3, ROBOT 0' : 'ROBOT v ALL COMERS', 24, 44);
    c.font = `400 22px ${FONT.mono}`;
    const rows = [['GAMES PLAYED', S.has('deadlock_ok') ? '3' : '0'], ['GAMES LOST', S.has('deadlock_ok') ? '3' : '0'], ['PIECES MISSING', String(3 - piecesFound())], ['MOOD', S.has('deadlock_ok') ? 'HUMBLED' : 'SMUG']];
    rows.forEach((r, i) => { c.fillStyle = '#7f9a88'; c.fillText(r[0], 24, 100 + i * 36); c.fillStyle = '#cfe3c1'; c.fillText(r[1], 300, 100 + i * 36); });
  }, 1.0, 512);
  S.on('flag', (f) => { if (f === 'deadlock_ok' || f.startsWith('piece_')) termScr.redraw(); });
  const report = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), M(0xf1ece0, { r: 0.95, side: THREE.DoubleSide }));
  report.position.set(-10.8, 1.45, -25.2);
  report.rotation.y = Math.PI / 2 + 0.05;
  g.add(report);
  const rLbl = labelTex('report', 256, 320, (c, w, h) => {
    c.fillStyle = '#f1ece0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#222'; c.font = `700 26px ${FONT.mono}`; c.fillText('NOTICE', 22, 46);
    c.font = `400 17px ${FONT.mono}`;
    ['ROBOT REFUSES TO', 'HAND OVER PARCEL', 'UNTIL BEATEN AT', 'CHESS. PARCEL:', '1 COMPLAINT'].forEach((l, i) => c.fillText(l, 22, 90 + i * 26));
    c.fillStyle = '#2e5a9c'; c.beginPath(); c.moveTo(w, 0); c.lineTo(w - 46, 0); c.lineTo(w, 46); c.fill();
    c.fillStyle = 'rgba(200,190,160,0.6)'; c.fillRect(w / 2 - 40, -6, 80, 22);
  });
  report.material = M(0xffffff, { map: rLbl.tex, r: 0.95, side: THREE.DoubleSide, unique: true });
  W.reactives.push((dt, snap) => {
    const target = S.has('read_L3') ? 1 : 0;
    // fold the report up and out of the way once read
    report.userData.k = snap ? target : (report.userData.k ?? 0) + (target - (report.userData.k ?? 0)) * Math.min(1, dt * 4);
    const k = report.userData.k;
    report.position.y = 1.45 + k * 0.62;
    report.scale.y = 1 - k * 0.7;
  });

  // service hatch below the terminal
  const hatch = new THREE.Group();
  hatch.position.set(-10.88, 0.55, -27.6);
  g.add(hatch);
  const hatchDoor = new THREE.Group();
  hatch.add(hatchDoor);
  box(hatchDoor, [0.05, 0.6, 0.7], M(0x2c3236, { r: 0.4, m: 0.6 }), [0.02, 0, 0]);
  box(hatchDoor, [0.03, 0.03, 0.25], PAL.steel(), [0.06, 0.5, 0]);
  box(hatch, [0.02, 0.56, 0.66], M(0x0c0d0e), [-0.01, 0.02, 0]);
  const pieceMat = M(0xefe8d8, { r: 0.45 });
  const chessPiece = (parent, kind, [x, y, z], k = 1) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    p.scale.setScalar(k);
    parent.add(p);
    cyl(p, 0.05, 0.055, 0.025, pieceMat, [0, 0, 0]);
    cyl(p, 0.028, 0.042, 0.11, pieceMat, [0, 0.025, 0]);
    if (kind === 'rook') { cyl(p, 0.042, 0.038, 0.05, pieceMat, [0, 0.13, 0]); for (let i = 0; i < 4; i++) box(p, [0.018, 0.02, 0.018], pieceMat, [Math.cos(i * 1.57) * 0.03, 0.18, Math.sin(i * 1.57) * 0.03]); }
    if (kind === 'queen') { cyl(p, 0.022, 0.03, 0.08, pieceMat, [0, 0.13, 0]); cyl(p, 0.04, 0.025, 0.03, pieceMat, [0, 0.2, 0]); sphere(p, 0.016, pieceMat, [0, 0.245, 0]); }
    if (kind === 'knight') { const hd = box(p, [0.04, 0.09, 0.08], pieceMat, [0, 0.12, 0.01]); hd.rotation.x = -0.35; box(p, [0.035, 0.035, 0.07], pieceMat, [0, 0.19, 0.04]); }
    p.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return p;
  };
  W.chessPiece = chessPiece;
  const rookPc = chessPiece(hatch, 'rook', [-0.05, -0.2, 0], 0.9);
  showWhen(rookPc, () => S.has('hatch_open') && !S.has('piece_rook'));
  W.reactives.push((dt, snap) => {
    const target = S.has('hatch_open') ? -1.4 : 0;
    hatchDoor.rotation.z = snap ? target : hatchDoor.rotation.z + (target - hatchDoor.rotation.z) * Math.min(1, dt * 4);
    hatchDoor.position.set(0, 0, 0);
  });
  solid(-11, -10.6, -28, -24.4, 0, 2.2);

  // archive spool on the east side, with a blinking lamp
  const spool = new THREE.Group();
  spool.position.set(-1.0, 0, -23.55);
  g.add(spool);
  box(spool, [0.6, 0.9, 0.9], M(0x2a2e31, { r: 0.5, m: 0.4 }), [0, 0, 0], { solid: true });
  const reel = cyl(spool, 0.35, 0.35, 0.08, M(0x3a3f44, { r: 0.35, m: 0.7 }), [0, 1.0, 0.1]);
  reel.rotation.z = Math.PI / 2; reel.position.set(-0.05, 1.3, 0.1);
  const reel2 = cyl(spool, 0.35, 0.35, 0.08, M(0x3a3f44, { r: 0.35, m: 0.7 }), [0, 1.0, -0.3]);
  reel2.rotation.z = Math.PI / 2; reel2.position.set(-0.05, 1.3, -0.3);
  const casing = new THREE.Group();
  casing.position.set(-0.35, 0.9, 0.36);
  spool.add(casing);
  cyl(casing, 0.08, 0.08, 0.12, M(0x8a8f93, { r: 0.35, m: 0.8 }), [0, 0, 0]);
  const blink = sphere(spool, 0.03, M(0xffffff, { e: 0xffa030, ei: 2, unique: true }), [-0.32, 0.8, -0.3], { cast: false });
  W.tick.push((dt, t) => { blink.material.emissiveIntensity = S.has('deadlock_ok') ? 0.2 : Math.sin(t * 5) > 0 ? 3 : 0.1; reel.rotation.x = reel2.rotation.x = S.has('deadlock_ok') ? t * 2 : 0; });

  // one status light over the table per puzzle, and cables to it
  const status = [];
  for (let i = 0; i < PUZZLES.length; i++) {
    const m = M(0xffffff, { e: 0xffa030, ei: 2, unique: true });
    sphere(g, 0.06, m, [-6.3 + i * 0.8, 2.6, -31.74], { cast: false });
    box(g, [0.2, 0.2, 0.06], PAL.black(), [-6.3 + i * 0.8, 2.5, -31.82]);
    status.push(m);
  }
  const cableMat = M(0x111111, { e: 0x5fd0ff, ei: 0, unique: true, r: 0.6 });
  for (let i = 0; i < PUZZLES.length; i++) {
    const x = -6.3 + i * 0.8;
    const pts = [new THREE.Vector3(x, 2.4, -31.78), new THREE.Vector3(x, 0.03, -31.75), new THREE.Vector3(x, 0.03, -28.5), new THREE.Vector3(CASE.x + (i - 1) * 0.5, 0.03, -27.6)];
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 40, 0.025, 6), cableMat);
    g.add(tube);
  }
  W.tick.push((dt, t) => {
    const ok = S.has('deadlock_ok');
    // one light per puzzle, green once that one is solved
    status.forEach((m, i) => { const won = S.has('chess_' + PUZZLES[i].id); m.emissive.setHex(won ? 0x5fd08a : 0xffa030); m.emissiveIntensity = won ? 1.6 : 1.2 + Math.sin(t * 2.4) * 1.0; });
    cableMat.emissiveIntensity += ((ok ? 1.6 : 0) - cableMat.emissiveIntensity) * Math.min(1, dt * 1.5);
  });
  fixture(g, [-5.5, 2.4, -31.4], 0xffb050, 2.5, () => !S.has('deadlock_ok'), { dist: 5, kind: 'bulb' });

  // ---------------- the robot's chess table ----------------
  box(g, [2.0, CASE.top, 2.0], M(0x24282b, { r: 0.4, m: 0.5 }), [CASE.x, 0, CASE.z], { solid: true });
  const boardTex = labelTex('chessboard', 512, 512, (c, w, h) => {
    c.fillStyle = '#3a2a1e'; c.fillRect(0, 0, w, h);
    const m = 32, s = (w - m * 2) / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#7a5636' : '#e2d2b0'; c.fillRect(m + x * s, m + y * s, s, s); }
    c.fillStyle = '#c9b48a'; c.font = `600 18px ${FONT.hud}`;
    for (let i = 0; i < 8; i++) { c.fillText('abcdefgh'[i], m + i * s + s / 2 - 4, h - 10); c.fillText(String(8 - i), 10, m + i * s + s / 2 + 6); }
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 1.68), M(0xffffff, { map: boardTex.tex, r: 0.55 }));
  board.rotation.x = -Math.PI / 2;
  board.position.set(CASE.x, CASE.top + 0.002, CASE.z);
  g.add(board);
  // the robot's black army, already set up and waiting
  const blackMat = M(0x1c1a18, { r: 0.35 });
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Group();
    p.position.set(CASE.x - 0.665 + i * 0.19, CASE.top, CASE.z - 0.475);
    g.add(p);
    cyl(p, 0.045, 0.05, 0.02, blackMat, [0, 0, 0]); cyl(p, 0.02, 0.035, 0.08, blackMat, [0, 0.02, 0]); sphere(p, 0.025, blackMat, [0, 0.11, 0]);
  }
  for (const [i, k] of [[0, 1.25], [7, 1.25], [3, 1.5], [4, 1.6]]) {
    const p = new THREE.Group();
    p.position.set(CASE.x - 0.665 + i * 0.19, CASE.top, CASE.z - 0.665);
    p.scale.setScalar(k);
    g.add(p);
    cyl(p, 0.045, 0.05, 0.02, blackMat, [0, 0, 0]); cyl(p, 0.022, 0.036, 0.1, blackMat, [0, 0.02, 0]); sphere(p, 0.026, blackMat, [0, 0.13, 0]);
  }
  for (const [dx, dz] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) box(g, [0.04, 0.12, 0.04], PAL.brass(), [CASE.x + dx, CASE.top, CASE.z + dz]);
  // the white pieces you find are set out on the near edge of the table
  const found = {};
  [['rook', -0.3], ['knight', 0.3]].forEach(([k, dx]) => {
    found[k] = chessPiece(g, k, [CASE.x + dx, CASE.top, CASE.z + 0.85], 1.1);
    showWhen(found[k], () => S.has('piece_' + k));
  });
  fixture(g, [CASE.x, 2.2, CASE.z], 0xfff0d8, 6, () => true, { dist: 4, kind: 'bulb' });

  // the robot itself, sitting across the board from you
  const robot = new THREE.Group();
  robot.position.set(CASE.x, CASE.top, CASE.z - 1.25);
  g.add(robot);
  const rb = M(0xd9a441, { r: 0.4, m: 0.3 });
  box(robot, [0.5, 0.92, 0.4], rb, [0, -0.92, 0]);
  box(robot, [0.36, 0.26, 0.3], M(0x2b2b2b, { r: 0.5 }), [0, 0.0, 0]);
  const eye = sphere(robot, 0.04, M(0xffffff, { e: 0x5fd0ff, ei: 2, unique: true }), [0.08, 0.15, 0.15], { cast: false });
  sphere(robot, 0.04, eye.material, [-0.08, 0.15, 0.15], { cast: false });
  for (const sx of [-1, 1]) { const arm = box(robot, [0.05, 0.05, 0.32], rb, [sx * 0.22, 0.02, 0.18]); arm.rotation.x = 0.3; }
  const parcel = note(robot, [0, 0.27, -0.02], 0, { w: 0.2, d: 0.14 });
  showWhen(parcel, () => !S.has('robot_ok'));
  solid(CASE.x - 0.3, CASE.x + 0.3, CASE.z - 1.5, CASE.z - 1.0, 0, 1.4);
  W.robot = { group: robot, eye };
  W.tick.push((dt, t) => { eye.material.emissiveIntensity = 1.8 + Math.sin(t * 2) * 0.6; robot.rotation.y = S.has('robot_ok') ? Math.sin(t * 0.5) * 0.15 : Math.sin(t * 0.8) * 0.06; });

  // chip token, handed over on the board once the robot has lost three times
  const chip = token(g, 'chip', [CASE.x, CASE.top + 0.25, CASE.z]);
  showWhen(chip, () => S.has('robot_ok') && !S.has('tok_chip'));
  const px = CASE.x - 0.12, pz = CASE.z - 0.12;

  // ---------------- the two missing white pieces ----------------
  // the knight is behind a low wall of boxes in the north-west corner
  const crateMat = M(0xffffff, { map: TEX.plain('#5a6064', 'labcrate', 3100, 0.08), r: 0.7, m: 0.2 });
  for (let z = -31.9; z < -30.1; z += 0.6) box(g, [0.5, 0.5, 0.56], crateMat, [-7.6, 0, z + 0.28]);
  for (let x = -9.95; x < -7.6; x += 0.6) box(g, [0.56, 0.5, 0.5], crateMat, [x + 0.28, 0, -30.0]);
  solid(-7.85, -7.35, -32, -29.75, 0, 0.5);
  solid(-10, -7.35, -30.25, -29.75, 0, 0.5);
  const knightPc = chessPiece(g, 'knight', [-9.0, 0, -31.2], 1.4);
  showWhen(knightPc, () => !S.has('piece_knight'));

  const JOY_NOTES = {
    rook: () => L('Taped to the rook, in Joy’s writing: “Rooks spend most of the game stuck in a corner doing nothing, so I thought it should feel at home down here.”', '车上贴着 Joy 写的字条：“车大半盘棋都窝在角落里什么也不干，所以我觉得它待在这底下会很自在。”'),
    knight: () => L('Taped to the knight: “The knight is the only piece that can jump over things, so it seemed fair that you should have to as well.”', '马上贴着字条：“马是唯一能跳过别的棋子的，所以让你也跳一下才公平。”'),
  };
  const findPiece = (k) => {
    if (!S.set('piece_' + k)) return;
    G.give('piece_' + k, { rook: ['The white rook', '白车'], knight: ['The white knight', '白马'] }[k]);
    G.note(JOY_NOTES[k]() + L(` That’s ${piecesFound()} of the 2 missing pieces.`, ` 缺的两个棋子找到了 ${piecesFound()} 个。`), 7500);
  };

  // the rack that slides aside into the tennis hall
  const rackDoor = slidingDoor(g, { side: 'n', at: -5.5, fixed: -31.95, w: 1.4, h: 2.4, mat: M(0x16191c, { r: 0.4, m: 0.6 }), isOpen: () => S.has('rack_open'), slide: 1 });
  const rf = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), M(0xffffff, { map: rackFace('door', 99), e: 0xffffff, ei: 0.6 }));
  rf.material.emissiveMap = rf.material.map;
  rf.position.set(0, 0, 0.05);
  rackDoor.panel.add(rf);

  const porter = porterUnit(g, [-10.75, 1.9, -22.4], Math.PI / 2, { wall: true });

  // ---------------- interactions ----------------
  item({
    id: 'report', pos: [-10.8, 1.45, -25.2], obj: report, label: () => L('Read the notice taped over the wall screen', '看贴在墙上屏幕上的告示'),
    when: () => !S.has('read_L3'),
    use: () => G.read('L3', { onClose: () => S.set('read_L3') }),
  });
  item({
    id: 'hatch', pos: [-10.8, 0.55, -27.6], obj: hatch, reach: 1.8,
    label: () => (S.has('hatch_open') ? L('Take the rook out of the hatch', '从小门里拿出车') : L('Open the little hatch by the floor', '打开贴近地面的小门')),
    when: () => !S.has('piece_rook'),
    use: () => {
      if (!(G.ctl?.crouchK > 0.5)) { G.note(KT(L('The hatch is down by your ankles, so you’ll have to crouch to open it. Press C.', '小门贴着地面，得蹲下才能打开。按 C。'), L('The hatch is down by your ankles, so you’ll have to crouch to open it. Tap Crouch.', '小门贴着地面，得蹲下才能打开。点“蹲下”。'))); return; }
      if (S.set('hatch_open')) { G.sfx('door'); setTimeout(() => findPiece('rook'), 500); return; }
      findPiece('rook');
    },
  });
  item({
    id: 'knightpc', pos: [-9.0, 0.15, -31.2], obj: knightPc, reach: 1.3, allow: 0.9,
    label: () => L('Pick up the knight', '拿起马'),
    when: () => !S.has('piece_knight'),
    use: () => findPiece('knight'),
  });
  item({
    id: 'tray', pos: [CASE.x, 0.97, CASE.z + 0.85], obj: board, reach: 2.0, label: () => L('Sit down at the chessboard', '在棋盘前坐下'),
    when: () => !S.has('robot_ok'),
    use: () => {
      if (!piecesFound()) { G.sfx('deny'); G.note(L('The robot points at the empty squares on your side of the board. Three of your white pieces are missing, and it won’t play without at least one of them.', '机器人指了指你这边棋盘上的空格。你缺了三个白子，它说至少得找回一个才肯下。')); return; }
      G.station('chess');
    },
  });
  item({
    id: 'chip', pos: [px + 0.12, CASE.top + 0.25, pz + 0.12], obj: chip, reach: 2.3, label: () => L('Pick up the token from the plate', '从铜板上拿起铜牌'),
    when: () => S.has('robot_ok') && !S.has('tok_chip'),
    use: () => {
      S.set('tok_chip'); G.give('tok_chip', ['Chip token', '芯片铜牌']);
      S.set('rack_open'); G.sfx('door');
      setTimeout(() => G.sfx('thock'), 1400);
      G.porter([[L('That cabinet is moving. It isn’t a cabinet. It seems to be a door.', '那个机柜在动。它不是机柜，好像是一扇门。'), 3400], [L('Something is bouncing towards us.', '有什么东西朝我们弹过来了。'), 2600]]);
    },
  });

  mark('report', [-10.8, 1.45, -25.2]);
  mark('tray', [CASE.x, 0.97, CASE.z + 0.85]);
  mark('chip', [px, CASE.top, pz]);
  // one of the family photos hidden around the house
  familyPhoto(g, 'ph_lunch', { img: 'img/photo-lunch.jpg', pos: [-2.5, 1.75, -20.16], ry: Math.PI, portrait: true });
  return g;
}
