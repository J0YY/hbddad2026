import * as THREE from 'three';
import { W, M, PAL, TEX, box, cyl, sphere, room, slidingDoor, item, mark, labelTex, FONT, showWhen, canvasTex, solid, vlight } from './kit.js';
import { porterUnit, note, fixture, screen, token, bowl, plant, familyPhoto } from './props.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L } from '../game/i18n.js';
const seen = (id) => S.data.journal.includes(id);

function tagTex(text, color = '#efe9dc') {
  return labelTex('tag-' + text, 128, 48, (c, w, h) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1a1a'; c.font = `700 26px ${FONT.mono}`; c.textAlign = 'center'; c.fillText(text.toUpperCase(), w / 2, 33);
  }).tex;
}

export function buildKitchen() {
  const g = room({
    x0: -30, x1: -16, z0: -55, z1: -41, h: 3.2,
    floor: M(0xffffff, { map: TEX.tiles('#b8743f', '#d9c7a4', 'kitchenfloor', 10), r: 0.7 }), floorUV: 3,
    wall: M(0xffffff, { map: TEX.plain('#d8cdb6', 'plaster', 5000, 0.05), r: 0.95 }), wallUV: 3,
    ceil: M(0x2a241e),
    trim: M(0x5a3a24),
    doors: [{ side: 'e', at: -50, w: 1.4, h: 2.4 }, { side: 'w', at: -48, w: 1.3, h: 2.3 }],
  });
  W.areas.push({
    id: 'kitchen', name: ['The kitchen', '厨房'], x0: -30, x1: -16, z0: -55, z1: -41, ceil: 3.2,
    hemi: [0xd8b088, 0x3a2414, 0.85], key: [0xffd6a8, 0.7], fog: [0x140e0a, 16, 40], bg: 0x0d0907, amb: 'kitchen', exposure: 1.0,
    chapter: [['Room four', '第四个房间'], ['Porter took two places away from the table, and forgot the recipe still feeds three.', 'Porter 从桌上撤走了两份餐具，却忘了菜谱还是三人份。']],
  });
  W.anchors.kitchen = { x: -17.4, z: -50, yaw: Math.PI / 2 };

  const counter = M(0x3c4a44, { r: 0.5 });
  const top = M(0xe6e0d4, { r: 0.35 });
  const brass = PAL.brass();
  // tiled backsplash on the north wall
  box(g, [12, 0.9, 0.02], M(0xffffff, { map: TEX.tiles('#e8e2d2', '#dcd4c0', 'splash', 12), r: 0.3 }), [-23, 0.92, -41.12], { cast: false, uv: 1.2 });

  // ---------------- north bench: dispensers, scale, recipe stand ----------------
  box(g, [8, 0.88, 0.7], counter, [-23.5, 0, -41.5], { solid: true });
  box(g, [8.04, 0.04, 0.74], top, [-23.5, 0.88, -41.5]);
  const disp = {};
  [['Onion', -26.8], ['Carrot', -26.0], ['Meat', -25.2]].forEach(([tag, x]) => {
    const d = new THREE.Group();
    d.position.set(x, 0.92, -41.45);
    g.add(d);
    cyl(d, 0.22, 0.22, 0.9, M(0xa8683c, { r: 0.35, m: 0.75 }), [0, 0.1, 0]);
    cyl(d, 0.06, 0.12, 0.12, M(0x6a4024, { r: 0.4, m: 0.7 }), [0, 0, 0]);
    cyl(d, 0.23, 0.23, 0.04, M(0x6a4024, { r: 0.4, m: 0.7 }), [0, 1.0, 0]);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), M(0xffffff, { map: tagTex(tag), side: THREE.DoubleSide }));
    t.position.set(0.0, 0.7, 0.225);
    t.rotation.x = -0.12;
    d.add(t);
    if (tag === 'Meat') {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.32), M(0xffffff, { map: labelTex('onionwin', 64, 128, (c, w, h) => { c.fillStyle = '#efe4c8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.fillStyle = i % 3 ? '#f4ecd6' : '#d8c8a0'; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 6, 3, Math.random() * 3, 0, 7); c.fill(); } }).tex, r: 0.1, e: 0x221e14 }));
      win.position.set(0, 0.42, 0.222);
      d.add(win);
      box(d, [0.16, 0.34, 0.01], PAL.brass(), [0, 0.25, 0.218]);
    }
    disp[tag] = d;
  });
  // the note about the labels sits right beside the scale, clear of the containers
  const pantry = note(g, [-22.85, 0.9, -41.3], -0.15, { w: 0.2, d: 0.14 });

  // scale with three prep bowls
  const scale = new THREE.Group();
  scale.position.set(-23.8, 0.92, -41.4);
  g.add(scale);
  box(scale, [0.36, 0.08, 0.3], M(0xd9d4c8, { r: 0.4 }), [0, 0, 0]);
  cyl(scale, 0.13, 0.13, 0.02, PAL.steel(), [0, 0.08, 0]);
  const sDisp = screen(scale, 0.14, 0.04, [0, 0.045, 0.151], [0, 0, 0], 'scaledisp', (c, w, h) => { c.fillStyle = '#0d1410'; c.fillRect(0, 0, w, h); c.fillStyle = '#c9e8b0'; c.font = `700 52px ${FONT.mono}`; c.fillText(S.has('prep_ok') ? '1000 g' : '   0 g', 8, h - 12); }, 1, 256);
  S.on('flag', (f) => { if (f === 'prep_ok') sDisp.redraw(); });
  const prepBowls = [];
  [-0.55, -0.3, 0.3].forEach((dx, i) => { const b = bowl(g, [-23.8 + dx + (i === 2 ? 0.3 : 0), 0.92, -41.25], 0xe2dccd); prepBowls.push(b); });
  const fillMat = [M(0xf0e6c8, { r: 0.9 }), M(0xe08a3a, { r: 0.8 }), M(0x8a3a2a, { r: 0.8 })];
  prepBowls.forEach((b, i) => {
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.075, 18), fillMat[i]);
    f.rotation.x = -Math.PI / 2; f.position.y = 0.045;
    b.add(f);
    showWhen(f, () => S.has('prep_ok'));
  });

  // recipe stand, brass, with the book on it
  const stand = new THREE.Group();
  stand.position.set(-22.3, 0.92, -41.4);
  g.add(stand);
  const standLift = new THREE.Group();
  stand.add(standLift);
  box(standLift, [0.3, 0.02, 0.22], brass, [0, 0, 0]);
  box(standLift, [0.02, 0.22, 0.02], brass, [0, 0.02, -0.08]);
  const book = box(standLift, [0.32, 0.04, 0.24], M(0x7a2e22, { r: 0.6 }), [0, 0.2, -0.02]);
  book.rotation.x = -0.9;
  const l5 = note(stand, [0.02, 0.01, 0.0], 0.2, { w: 0.16, d: 0.12 });
  W.reactives.push((dt, snap) => {
    const target = S.has('read_L5') ? 1 : 0;
    standLift.userData.k = snap ? target : (standLift.userData.k ?? 0) + (target - (standLift.userData.k ?? 0)) * Math.min(1, dt * 4);
    standLift.position.set(0.32 * standLift.userData.k, 0, 0);
    l5.visible = !S.has('read_L5');
  });

  // ---------------- south wall: burner, oven, trivet, service board ----------------
  // counter in two halves with the oven between them
  box(g, [2.7, 0.88, 0.7], counter, [-26.15, 0, -54.5]);
  box(g, [2.48, 0.88, 0.7], counter, [-22.76, 0, -54.5]);
  solid(-27.5, -21.5, -54.85, -54.15, 0, 0.9);
  box(g, [6.04, 0.04, 0.74], top, [-24.5, 0.88, -54.5]);
  // burner
  const burner = new THREE.Group();
  burner.position.set(-26.2, 0.92, -54.45);
  g.add(burner);
  box(burner, [0.6, 0.04, 0.5], PAL.black(), [0, 0, 0]);
  const flame = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 24), M(0x000000, { e: 0x4a8aff, ei: 0, unique: true }));
  flame.rotation.x = Math.PI / 2; flame.position.y = 0.045;
  burner.add(flame);
  // pots: stew pot and rice pot (with the scratched lid)
  cyl(burner, 0.13, 0.12, 0.18, M(0x8a8f93, { r: 0.3, m: 0.8 }), [-0.14, 0.04, 0.04]);
  const rice = new THREE.Group();
  rice.position.set(0.17, 0.04, 0.02);
  burner.add(rice);
  cyl(rice, 0.1, 0.09, 0.14, M(0x3a3f44, { r: 0.3, m: 0.7 }), [0, 0, 0]);
  const ricelid = cyl(rice, 0.11, 0.11, 0.015, M(0x9aa0a4, { r: 0.25, m: 0.8 }), [0, 0.14, 0]);
  cyl(rice, 0.015, 0.015, 0.03, PAL.black(), [0, 0.155, 0]);
  const stewcard = note(g, [-26.55, 1.1, -54.12], 0, { blue: false, w: 0.12, d: 0.16 });
  stewcard.rotation.set(Math.PI / 2 - 0.3, 0, 0);
  // garnish: a bunch of herbs with a tag
  const herbs = new THREE.Group();
  herbs.position.set(-25.6, 0.92, -54.25);
  g.add(herbs);
  for (let i = 0; i < 7; i++) { const s = cyl(herbs, 0.004, 0.004, 0.2, M(0x4a7a3a), [Math.random() * 0.06, 0, Math.random() * 0.06]); s.rotation.z = Math.random() * 0.6 - 0.3; sphere(herbs, 0.03, M(0x5a8a3a, { flat: true }), [Math.random() * 0.08, 0.2, Math.random() * 0.06], { seg: 5, seg2: 4 }); }
  const gtag = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), PAL.paper());
  gtag.position.set(0.05, 0.08, 0.05);
  herbs.add(gtag);
  // oven with a window and a light
  const oven = new THREE.Group();
  oven.position.set(-24.4, 0, -54.5);
  g.add(oven);
  // hollow body so the bowls show through the glass
  const ovenMat = M(0x2a2a2a, { r: 0.4, m: 0.5 });
  const cavity = M(0x15110d, { r: 0.8, unique: true, e: 0xffa050, ei: 0 });
  box(oven, [0.75, 0.08, 0.72], ovenMat, [0, 0.02, 0.02]);
  box(oven, [0.75, 0.2, 0.72], ovenMat, [0, 0.67, 0.02]);
  box(oven, [0.06, 0.6, 0.72], ovenMat, [-0.345, 0.08, 0.02]);
  box(oven, [0.06, 0.6, 0.72], ovenMat, [0.345, 0.08, 0.02]);
  box(oven, [0.64, 0.58, 0.02], cavity, [0, 0.09, -0.3]);
  box(oven, [0.64, 0.02, 0.62], cavity, [0, 0.27, 0.02]);
  const ovenWin = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.56), M(0x3a2a1a, { r: 0.05, m: 0.2, t: true, o: 0.35, unique: true }));
  ovenWin.position.set(0, 0.38, 0.385);
  oven.add(ovenWin);
  box(oven, [0.5, 0.03, 0.03], PAL.steel(), [0, 0.72, 0.4]);
  const ovenBowls = [bowl(g, [-24.6, 0.29, -54.5], 0xc9d6c0), bowl(g, [-24.2, 0.29, -54.5], 0xd7c6b0)];
  W.reactives.push((dt) => {
    cavity.emissiveIntensity += ((S.has('oven_light') ? 0.5 : 0) - cavity.emissiveIntensity) * Math.min(1, dt * 3);
    ovenWin.material.opacity = S.has('oven_light') ? 0.18 : 0.55;
    ovenBowls.forEach((b) => (b.visible = S.has('oven_light') && !S.has('bowl2')));
    flame.material.emissiveIntensity = S.has('service_ok') ? 0 : S.has('prep_ok') ? 2 : 0;
  });
  // trivet
  const trivet = new THREE.Group();
  trivet.position.set(-23.0, 0.92, -54.4);
  g.add(trivet);
  for (let i = 0; i < 4; i++) box(trivet, [0.24, 0.015, 0.02], M(0x2a2a2a, { m: 0.6 }), [0, 0, -0.08 + i * 0.05]);
  // service board on the wall
  const board = screen(g, 1.6, 0.8, [-24.4, 1.85, -54.82], [0, 0, 0], 'svcboard', (c, w, h) => {
    c.fillStyle = '#1d1a16'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#efe6d0'; c.font = `700 32px ${FONT.hud}, sans-serif`; c.fillText(L('DINNER AT MINUTE 12', '第 12 分钟上菜'), 24, 44);
    c.font = `500 22px ${FONT.hud}`; c.fillStyle = '#a89c84';
    [L('STOVE', '灶'), L('OVEN', '烤箱'), L('POT STAND', '锅垫')].forEach((l, i) => { c.fillText(l, 24, 100 + i * 50); c.fillStyle = '#3a342c'; c.fillRect(130, 80 + i * 50, w - 160, 30); c.fillStyle = '#a89c84'; });
    if (S.has('service_ok')) {
      const P = (w - 160) / 12;
      const bars = [[0, 0, 4, '#c78b4a'], [0, 4, 10, '#e2d6a8'], [0, 10, 12, '#7fae6a'], [1, 4, 12, '#c78b4a'], [2, 10, 12, '#e2d6a8']];
      for (const [r, a, b, col] of bars) { c.fillStyle = col; c.fillRect(130 + a * P + 1, 82 + r * 50, (b - a) * P - 2, 26); }
    }
  }, 0.9, 512);
  S.on('flag', (f) => { if (f === 'service_ok') board.redraw(); });
  S.on('settings', () => board.redraw());

  // ---------------- centre island with napkin rings ----------------
  box(g, [2.4, 0.9, 0.9], M(0x6a4a30, { r: 0.55 }), [-23.5, 0, -48.2], { solid: true });
  box(g, [2.5, 0.05, 1.0], M(0xffffff, { map: TEX.wood('#8a6440', 'butcher'), r: 0.5 }), [-23.5, 0.9, -48.2]);
  const rings = new THREE.Group();
  rings.position.set(-22.6, 0.95, -48.0);
  g.add(rings);
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 18), brass); r.rotation.x = Math.PI / 2; r.position.set(i * 0.1, 0.012, 0); r.castShadow = true; rings.add(r); }
  box(g, [0.4, 0.02, 0.28], M(0x8a6a48, { r: 0.6 }), [-24.2, 0.95, -48.2]);
  plant(g, -29.3, -41.7, 0.9);

  // the pass, with a bell
  box(g, [0.6, 0.06, 1.2], top, [-16.45, 0.95, -47.2], { solid: true });
  const passBell = new THREE.Group();
  passBell.position.set(-16.45, 1.0, -46.85);
  g.add(passBell);
  const pb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass);
  passBell.add(pb);
  const ladle = token(g, 'ladle', [-16.45, 1.0, -47.35]);
  showWhen(ladle, () => S.has('service_ok') && !S.has('tok_ladle'));

  // serving shelf by the back door, and the door itself
  const shelf = new THREE.Group();
  shelf.position.set(-29.6, 1.0, -46.3);
  g.add(shelf);
  box(shelf, [0.5, 0.04, 0.9], M(0x5a3a24), [0, 0, 0]);
  box(shelf, [0.04, 0.2, 0.04], M(0x3a2414), [0.2, -0.2, -0.4]);
  box(shelf, [0.04, 0.2, 0.04], M(0x3a2414), [0.2, -0.2, 0.4]);
  const tray = new THREE.Group();
  tray.position.set(-29.55, 1.05, -46.3);
  g.add(tray);
  box(tray, [0.4, 0.02, 0.6], M(0x8a6a48, { r: 0.4 }), [0, 0, 0]);
  bowl(tray, [0, 0.02, -0.15], 0xc9d6c0);
  bowl(tray, [0, 0.02, 0.15], 0xd7c6b0);
  bowl(tray, [0.0, 0.02, 0.0], 0xe2dccd).scale.setScalar(0.85);
  showWhen(tray, () => S.has('tray_set'));
  const outDoor = slidingDoor(g, { side: 'w', at: -48, fixed: -30, w: 1.3, h: 2.3, mat: M(0x4a5a3a, { r: 0.6 }), frameMat: PAL.darkBrass(), isOpen: () => S.has('out_door'), slide: -1 });
  W.tick.push((dt, t) => {
    if (!S.has('out_door') && outDoor.state.t === 0) outDoor.panel.position.x = -30 + Math.sin(t * 23) * 0.004 * (Math.sin(t * 0.9) > 0.6 ? 1 : 0);
  });

  // lights
  fixture(g, [-23.5, 3.1, -48.2], 0xffd2a0, 10, () => true, { dist: 8 });
  fixture(g, [-24, 3.1, -42.5], 0xffd2a0, 7, () => true, { dist: 6 });
  fixture(g, [-24.5, 3.1, -53.5], 0xffd2a0, 7, () => true, { dist: 6 });
  vlight([-24.4, 0.5, -54.0], 0xffa050, 1.5, { dist: 3, on: () => S.has('oven_light') });

  const porter = porterUnit(g, [-16.3, 2.1, -43.5], -Math.PI / 2, { wall: true });

  // ---------------- interactions ----------------
  item({
    id: 'stand', pos: [-22.3, 1.05, -41.4], obj: stand, reach: 1.9,
    label: () => (S.has('read_L5') ? L('Read the recipe', '看菜谱') : L('Lift the recipe stand', '把菜谱架挪开')),
    use: () => {
      if (!S.has('read_L5')) G.read('L5', { onClose: () => { S.set('read_L5'); setTimeout(() => G.read('recipe'), 60); } });
      else G.read('recipe');
    },
  });
  item({ id: 'pantry', pos: [-22.85, 0.95, -41.3], obj: pantry, reach: 1.9, prio: () => (seen('pantry') ? 0 : 0.2), label: () => L('Read the note next to the scale', '看秤旁边的纸条'), use: () => G.read('pantry') });
  item({ id: 'disp-meat', pos: [-25.2, 1.35, -41.25], obj: disp.Meat, reach: 1.8, label: () => L('Look through the window of the Meat container', '从“肉”罐的小窗往里看'), use: () => G.read('window') });
  item({ id: 'disp-onion', pos: [-26.8, 1.35, -41.25], obj: disp.Onion, reach: 1.8, label: () => L('Look at the Onion container', '看看“洋葱”罐'), use: () => G.note(L('This one is solid copper with no window, and the label says ONION, for whatever that’s worth today.', '这个罐子是实心铜的，没有小窗，标签上写着“洋葱”，今天这标签值几分信你自己掂量。')) });
  item({ id: 'disp-carrot', pos: [-26.0, 1.35, -41.25], obj: disp.Carrot, reach: 1.8, label: () => L('Look at the Carrot container', '看看“胡萝卜”罐'), use: () => G.note(L('This one is solid copper with no window, and the label says CARROT, which after this morning means very little.', '这个罐子是实心铜的，没有小窗，标签上写着“胡萝卜”，经过今天早上，这几个字已经说明不了什么了。')) });
  item({
    id: 'scale', pos: [-23.8, 1.0, -41.4], obj: scale, reach: 1.9,
    label: () => (S.has('prep_ok') ? L('The ingredients are ready', '食材已经称好了') : L('Weigh out the ingredients', '称食材')),
    when: () => true,
    use: () => {
      if (S.has('prep_ok')) { G.note(L('Three bowls and exactly 1,000 grams, just as the recipe says.', '三个碗，正好 1000 克，和菜谱上一模一样。')); return; }
      if (!S.has('read_L5')) { G.note(L('The scale is ready to go, but you don’t have the recipe yet, and it’s probably on the brass recipe stand.', '秤已经准备好了，可你还没拿到菜谱，菜谱多半在那个铜菜谱架上。')); return; }
      if (!seen('pantry')) { G.read('pantry', { onClose: () => setTimeout(() => G.station('prep'), 60) }); return; }
      G.station('prep');
    },
  });
  item({ id: 'stewcard', pos: [-26.55, 1.1, -54.1], obj: stewcard, reach: 1.8, label: () => L('Read the stew card', '看炖菜卡片'), use: () => G.read('stewcard') });
  item({ id: 'ricelid', pos: [-26.03, 1.1, -54.43], obj: rice, reach: 1.8, label: () => L('Lift the rice pot lid', '掀开米饭锅盖'), use: () => G.read('ricelid') });
  item({ id: 'garnish', pos: [-25.55, 1.05, -54.2], obj: herbs, reach: 1.8, label: () => L('Read the garnish tag', '看配菜标签'), use: () => G.read('garnishtag') });
  item({
    id: 'board', pos: [-24.4, 1.85, -54.8], obj: board.mesh, reach: 2.3,
    label: () => (S.has('service_ok') ? L('Look at the cooking timetable', '看做饭时间表') : L('Plan the cooking times', '安排做饭时间')),
    use: () => {
      if (S.has('service_ok')) { G.read('serviceboard'); return; }
      if (!S.has('prep_ok')) { G.note(L('There’s nothing to cook yet, so weigh out the ingredients on the scale first.', '现在还没东西可做，先在秤上把食材称好。')); return; }
      const times = ['stewcard', 'ricelid', 'garnishtag'].filter(seen).length;
      if (times < 3) { G.note(L(`You need all three cooking times first, for the stew, the rice and the garnish, and you’ve found ${times} of 3. They’re all somewhere around the stove.`, `先要知道三样东西的时间：炖菜、米饭和配菜，你现在找到了 ${times} 样。都在灶台附近。`)); return; }
      S.addJournal('serviceboard');
      G.station('service');
    },
  });
  item({
    id: 'pass', pos: [-16.45, 1.05, -47.35], obj: ladle, reach: 2,
    label: () => L('Take the token from the serving window', '从出菜窗口拿铜牌'),
    when: () => S.has('service_ok') && !S.has('tok_ladle'),
    use: () => { S.set('tok_ladle'); G.give('tok_ladle', ['Ladle token', '汤勺铜牌']); },
  });
  item({
    id: 'oven', pos: [-24.4, 0.6, -54.1], obj: oven, reach: 1.9,
    label: () => (!S.has('oven_light') ? L('Turn on the oven light', '打开烤箱灯') : !S.has('bowl2') ? L('Take the two bowls', '拿出两个碗') : L('Oven', '烤箱')),
    use: () => {
      if (!S.has('oven_light')) { S.set('oven_light'); G.sfx('click'); G.note(L('There are two bowls inside, hidden in the one place Porter would never think to look.', '里面有两个碗，藏在 Porter 怎么也想不到去看的地方。')); return; }
      if (!S.has('bowl2')) { S.set('bowl2'); G.give('bowl2', ['Two bowls', '两个碗']); return; }
      G.note(L('The oven is empty now, although it’s still nice and warm.', '烤箱现在空了，不过还热乎乎的。'));
    },
  });
  item({
    id: 'shelf', pos: [-29.55, 1.05, -46.3], obj: shelf, reach: 2,
    label: () => (S.has('tok_ladle') && S.has('bowl2') ? L('Put the tray on the shelf', '把托盘放到架子上') : L('Shelf by the back door', '后门边的架子')),
    when: () => !S.has('tray_set'),
    use: () => {
      if (!S.has('tok_ladle')) { G.note(L('This shelf is where the finished trays go, and nothing has been cooked yet.', '这个架子是放做好的托盘的，可现在还什么都没做好。')); return; }
      if (!S.has('bowl2')) { G.note(L('There’s only one bowl on the tray, and Joy’s note said there were more of them somewhere.', '托盘上只有一个碗，Joy 的纸条里说别处还有。')); return; }
      S.set('tray_set');
      G.sfx('pickup');
      setTimeout(() => { S.set('out_door'); G.sfx('door'); G.porter([[L('Three bowls for a party of one is highly irregular, but I will allow it, and the back door is now open.', '一位宾客配三个碗，实在不合规矩，不过我就批准了，后门已经开了。'), 3800]]); }, 700);
    },
  });

  mark('stand', [-22.3, 1.05, -41.4]);
  mark('scale', [-23.8, 1.0, -41.4]);
  mark('board', [-24.4, 1.85, -54.8]);
  mark('pass', [-16.45, 1.05, -47.35]);
  mark('oven', [-24.4, 0.6, -54.1]);
  mark('shelf', [-29.55, 1.05, -46.3]);
  // one of the family photos hidden around the house
  familyPhoto(g, 'ph_tea', { img: 'img/p9454.jpg', pos: [-19.5, 1.7, -54.84], ry: 0, portrait: true });
  return g;
}
