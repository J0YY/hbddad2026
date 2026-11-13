import * as THREE from 'three';
import { W, M, PAL, TEX, box, cyl, sphere, room, slidingDoor, item, mark, labelTex, FONT, showWhen, canvasTex, solid } from './kit.js';
import { chair, plant, bookshelf, bankerLamp, porterUnit, note, fixture } from './props.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L } from '../game/i18n.js';

const TOKENS = ['tok_bell', 'tok_chip', 'tok_racket', 'tok_ladle', 'tok_star'];

export function buildStudy() {
  const floor = M(0xffffff, { map: TEX.wood('#5a3b26', 'wood-study'), r: 0.55 });
  floor.map.repeat.set(1, 1);
  const wall = M(0xffffff, { map: TEX.panel('#2c3a31', 'study'), r: 0.85 });
  const g = room({
    x0: -4, x1: 4, z0: -8, z1: 0, h: 3,
    floor, floorUV: 2, wall, wallUV: 2, ceil: M(0x26231f, { r: 0.95 }),
    trim: M(0x2a1a10, { r: 0.6 }),
    doors: [{ side: 'n', at: 1.8, w: 1.3, h: 2.3 }],
  });

  W.areas.push({
    id: 'study', name: ['The study', '书房'], x0: -4, x1: 4, z0: -8, z1: 0, ceil: 3,
    hemi: [0x8a7258, 0x2a2018, 0.9], key: [0xffd2a0, 0.9], fog: [0x0c0a08, 14, 40], bg: 0x0a0908, amb: 'study', exposure: 1.0,
  });
  W.anchors.study = { x: 0, z: -1.9, yaw: 0 };

  // rug
  box(g, [3.6, 0.015, 2.8], M(0xffffff, { map: TEX.carpet('#5b2a22', 'study'), r: 1 }), [0, 0, -4.2], { cast: false });

  // desk
  const walnut = M(0xffffff, { map: TEX.wood('#3d2516', 'walnut'), r: 0.45 });
  box(g, [1.9, 0.06, 0.95], walnut, [0, 0.72, -4.3], { solid: true });
  box(g, [0.5, 0.72, 0.85], walnut, [-0.65, 0, -4.3], { solid: true });
  box(g, [0.5, 0.72, 0.85], walnut, [0.65, 0, -4.3], { solid: true });
  for (const x of [-0.65, 0.65]) for (const y of [0.15, 0.4]) if (!(x > 0 && y > 0.3)) box(g, [0.06, 0.02, 0.01], PAL.brass(), [x, y + 0.08, -3.87]);
  // the top right drawer opens; Joy left batteries and a note in it
  const drawer = new THREE.Group();
  drawer.position.set(0.65, 0.4, -3.87);
  g.add(drawer);
  box(drawer, [0.44, 0.2, 0.025], walnut, [0, 0, 0]);
  box(drawer, [0.4, 0.16, 0.5], M(0x2b1a10, { r: 0.6 }), [0, 0.02, -0.26]);
  box(drawer, [0.08, 0.02, 0.012], PAL.brass(), [0, 0.12, 0.018]);
  const batt = new THREE.Group();
  batt.position.set(-0.06, 0.19, -0.2);
  drawer.add(batt);
  for (const dx of [0, 0.035]) { const c = cyl(batt, 0.014, 0.014, 0.05, M(0x1d1d1d, { r: 0.4, m: 0.5 }), [dx, 0.014, 0]); c.rotation.x = Math.PI / 2; }
  showWhen(batt, () => !S.has('batteries'));
  W.reactives.push((dt, snap) => {
    const t = -3.87 + (S.has('study_drawer') ? 0.32 : 0);
    drawer.position.z = snap ? t : drawer.position.z + (t - drawer.position.z) * Math.min(1, dt * 5);
  });
  box(g, [0.9, 0.006, 0.55], M(0x24432f, { r: 0.7 }), [0, 0.78, -4.25], { cast: false });

  // lamp and desk stuff
  bankerLamp(g, -0.62, 0.78, -4.55, 0);
  // brass service bell
  const bell = new THREE.Group();
  bell.position.set(0.55, 0.78, -4.15);
  g.add(bell);
  cyl(bell, 0.07, 0.075, 0.015, M(0x2a1a10, { r: 0.5 }), [0, 0, 0]);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), PAL.brass());
  dome.position.y = 0.015;
  dome.castShadow = true;
  bell.add(dome);
  cyl(bell, 0.006, 0.006, 0.03, PAL.brass(), [0, 0.07, 0]);
  sphere(bell, 0.011, PAL.brass(), [0, 0.105, 0]);
  // envelope
  const env = note(g, [-0.1, 0.785, -4.05], 0.15, { w: 0.24, d: 0.14 });
  showWhen(env, () => !S.has('read_L1'));
  const openEnv = note(g, [-0.15, 0.785, -4.1], -0.1, { w: 0.2, d: 0.26, blue: true });
  showWhen(openEnv, () => S.has('read_L1'));
  // pen + a framed photo facing the chair
  box(g, [0.14, 0.012, 0.012], M(0x1b1b1b, { r: 0.3 }), [0.3, 0.785, -4.0], { ry: 0.6 });
  const frame = new THREE.Group();
  frame.position.set(0.78, 0.78, -4.58);
  frame.rotation.set(-0.12, -0.35, 0);
  g.add(frame);
  box(frame, [0.27, 0.21, 0.02], PAL.brass(), [0, 0, 0]);
  box(frame, [0.02, 0.16, 0.08], PAL.brass(), [0, 0, -0.05]);
  const photoTex = new THREE.TextureLoader().load('img/family.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; });
  photoTex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.18), M(0xffffff, { map: photoTex, r: 0.55, unique: true }));
  pm.position.set(0, 0.105, 0.0115);
  frame.add(pm);

  // Dad's chair (south) and the two chairs opposite that Porter folds away (north)
  chair(g, 0, -3.45, Math.PI, { seat: 0x4a2a1c });
  const guests = [chair(g, -0.45, -5.15, 0, { seat: 0x4a2a1c }), chair(g, 0.45, -5.15, 0, { seat: 0x4a2a1c })];
  const folded = { t: 0 };
  W.reactives.push((dt, snap) => {
    const target = S.has('bell_rung') ? 1 : 0;
    folded.t = snap ? target : folded.t + Math.sign(target - folded.t) * Math.min(Math.abs(target - folded.t), dt * 0.55);
    guests.forEach((guest, i) => {
      // the nearer chair goes first, the other follows a moment later
      const k = THREE.MathUtils.clamp(folded.t * 1.35 - (1 - i) * 0.35, 0, 1);
      const e = k * k * (3 - 2 * k);
      guest.position.x = THREE.MathUtils.lerp(i ? 0.45 : -0.45, 3.7, e);
      guest.rotation.y = THREE.MathUtils.lerp(0, -Math.PI / 2, Math.min(1, e * 1.6));
      guest.scale.z = THREE.MathUtils.lerp(1, 0.08, Math.max(0, e * 1.4 - 0.4));
      guest.visible = k < 0.995;
    });
  });
  // the slot in the east wall the chairs fold into
  box(g, [0.03, 1.1, 0.6], M(0x0d0c0b), [3.845, 0, -5.15], { cast: false });

  // bookshelves, armchair corner, plant
  bookshelf(g, 3.65, -2.0, -Math.PI / 2, 1.8);
  bookshelf(g, 3.65, -7.0, -Math.PI / 2, 1.2);
  plant(g, -3.5, -7.4, 1.1);
  plant(g, 3.4, -0.5, 0.8);
  const arm = new THREE.Group();
  arm.position.set(-3.0, 0, -1.0);
  arm.rotation.y = Math.PI * 0.75;
  g.add(arm);
  const leather = M(0x5a3020, { r: 0.45 });
  box(arm, [0.85, 0.42, 0.8], leather, [0, 0.05, 0]);
  box(arm, [0.85, 0.6, 0.18], leather, [0, 0.45, -0.32]);
  box(arm, [0.16, 0.25, 0.8], leather, [-0.38, 0.45, 0]);
  box(arm, [0.16, 0.25, 0.8], leather, [0.38, 0.45, 0]);
  solid(-3.5, -2.5, -1.5, -0.5, 0, 1);

  // side cabinet + Porter
  box(g, [0.5, 0.85, 1.2], walnut, [-3.6, 0, -5.4], { solid: true });
  const porter = porterUnit(g, [-3.55, 0.85, -5.4], Math.PI / 2);
  W.studyPorter = porter;
  // the badge in the printer tray
  const badge = new THREE.Group();
  badge.position.set(-3.38, 0.98, -5.4);
  badge.rotation.set(0, Math.PI / 2, -0.35);
  g.add(badge);
  box(badge, [0.08, 0.004, 0.11], PAL.brass(), [0, 0, 0]);
  const badgeLbl = labelTex('badge-face', 128, 64, (c, w, h) => {
    c.fillStyle = '#efe9dc'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1a1a'; c.font = `700 22px ${FONT.mono}`; c.fillText('GUEST', 10, 26); c.font = `700 15px ${FONT.mono}`; c.fillText('WEISHUAI', 10, 50);
  });
  const bf = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), M(0xffffff, { map: badgeLbl.tex }));
  bf.rotation.x = -Math.PI / 2;
  bf.position.y = 0.003;
  badge.add(bf);
  showWhen(badge, () => S.has('radio_ok') && !S.has('badge'));
  // the half-printed BUIL— slip, which pops out and gets pulled back in
  const slipTex = labelTex('slip', 128, 64, (c, w, h) => {
    c.fillStyle = '#f5f2ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#222'; c.font = `700 30px ${FONT.mono}`; c.fillText('BUIL', 8, 42);
  });
  const slip = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), M(0xffffff, { map: slipTex.tex, side: THREE.DoubleSide }));
  slip.position.set(-3.38, 1.02, -5.62);
  slip.rotation.set(0, Math.PI / 2, 0);
  slip.visible = false;
  g.add(slip);
  W.studySlip = slip;

  // Five dark panes in the west wall, one for each token, looking out at a picnic table
  const view = canvasTex('study-view', 1024, 256, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1b2433'); sky.addColorStop(0.7, '#4a4a52'); sky.addColorStop(1, '#2a2a22');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#141812';
    c.beginPath(); c.moveTo(0, h * 0.75);
    for (let x = 0; x <= w; x += 32) c.lineTo(x, h * 0.72 - Math.sin(x * 0.01) * 10 - (x % 64 ? 0 : 14));
    c.lineTo(w, h); c.lineTo(0, h); c.fill();
    // pines
    for (let i = 0; i < 18; i++) {
      const x = (i * 61) % w, hh = 40 + ((i * 37) % 50);
      c.beginPath(); c.moveTo(x, h * 0.74 - hh); c.lineTo(x - 14, h * 0.76); c.lineTo(x + 14, h * 0.76); c.fill();
    }
    // picnic table with two benches
    c.fillStyle = '#0b0c0a';
    const tx = w * 0.5, ty = h * 0.82;
    c.fillRect(tx - 60, ty - 18, 120, 6);
    c.fillRect(tx - 50, ty - 12, 5, 22); c.fillRect(tx + 45, ty - 12, 5, 22);
    c.fillRect(tx - 80, ty - 2, 40, 4); c.fillRect(tx + 40, ty - 2, 40, 4);
  }, { repeat: [1, 1] });
  view.wrapS = view.wrapT = THREE.ClampToEdgeWrapping;
  const paneMats = [];
  for (let i = 0; i < 5; i++) {
    const t = view.clone();
    t.needsUpdate = true;
    t.repeat.set(0.2, 1);
    t.offset.set(i * 0.2, 0);
    const m = M(0xffffff, { map: t, e: 0xffd8a0, ei: 0, r: 0.2, unique: true });
    m.emissiveMap = t;
    paneMats.push(m);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.2), m);
    p.position.set(-3.835, 1.55, -1.8 - i * 0.68);
    p.rotation.y = Math.PI / 2;
    g.add(p);
  }
  for (let i = 0; i <= 5; i++) box(g, [0.05, 1.3, 0.05], M(0x1e150e, { r: 0.5 }), [-3.83, 0.9, -1.46 - i * 0.68]);
  box(g, [0.06, 0.06, 3.5], M(0x1e150e), [-3.83, 0.9, -3.15]);
  box(g, [0.06, 0.06, 3.5], M(0x1e150e), [-3.83, 2.18, -3.15]);
  box(g, [0.25, 0.05, 3.5], M(0x1e150e), [-3.74, 0.85, -3.15]);
  W.reactives.push((dt) => {
    const n = TOKENS.filter((f) => S.has(f)).length;
    paneMats.forEach((m, i) => {
      const target = i < n ? 0.9 : 0.05;
      m.emissiveIntensity += (target - m.emissiveIntensity) * Math.min(1, dt * 2);
    });
  });

  // a small radio on the windowsill
  const radio = new THREE.Group();
  radio.position.set(-3.68, 0.9, -1.85);
  radio.rotation.y = Math.PI / 2;
  g.add(radio);
  box(radio, [0.32, 0.17, 0.12], M(0x6a3f24, { r: 0.45 }), [0, 0, 0]);
  box(radio, [0.13, 0.11, 0.004], M(0x1e1a16, { r: 0.8 }), [-0.08, 0.03, 0.061]);
  const radioDial = sphere(radio, 0.022, M(0xffffff, { e: 0xf0c060, ei: 0, unique: true }), [0.09, 0.085, 0.06], { cast: false });
  radioDial.scale.set(1.6, 0.5, 0.3);
  for (const dx of [0.06, 0.12]) { const k = cyl(radio, 0.018, 0.018, 0.02, PAL.brass(), [0, 0, 0]); k.rotation.x = Math.PI / 2; k.position.set(dx, 0.04, 0.07); }
  const ant = cyl(radio, 0.003, 0.003, 0.34, PAL.steel(), [0.13, 0.17, -0.02]);
  ant.rotation.z = -0.5;
  W.reactives.push(() => { radioDial.material.emissiveIntensity = S.station('radio').on ? 1.4 : 0; });
  // Porter's signal meter, on the cabinet next to Porter
  const meter = new THREE.Group();
  meter.position.set(-3.62, 0.85, -5.88);
  meter.rotation.y = Math.PI / 2;
  g.add(meter);
  box(meter, [0.16, 0.12, 0.08], M(0x2a2c2e, { r: 0.4, m: 0.5 }), [0, 0, 0]);
  box(meter, [0.12, 0.06, 0.004], M(0xe8e0c8, { r: 0.8 }), [0, 0.04, 0.041]);
  const meterLamp = sphere(meter, 0.012, M(0xffffff, { e: 0x8a2a20, ei: 2, unique: true }), [0.055, 0.14, 0], { cast: false });
  cyl(meter, 0.002, 0.002, 0.18, PAL.steel(), [-0.05, 0.12, 0]);
  W.reactives.push(() => meterLamp.material.emissive.setHex(S.has('radio_ok') ? 0x5fbf6a : S.station('radio').on ? 0xe0a030 : 0x8a2a20));

  // ceiling light and wall sconces
  fixture(g, [0, 2.95, -4.3], 0xffcf96, 9, () => true, { dist: 8 });
  fixture(g, [-2, 2.95, -1.8], 0xffcf96, 6, () => true, { dist: 7 });
  fixture(g, [2, 2.95, -6.6], 0xffcf96, 5, () => true, { dist: 7 });

  // glass door + badge reader
  const glass = M(0x9cb7bd, { r: 0.05, m: 0.2, t: true, o: 0.22 });
  slidingDoor(g, { side: 'n', at: 1.8, fixed: -8, w: 1.3, h: 2.3, mat: glass, frameMat: PAL.brass(), isOpen: () => S.has('study_door'), slide: -1 });
  const reader = new THREE.Group();
  reader.position.set(2.85, 1.15, -7.82);
  g.add(reader);
  box(reader, [0.12, 0.18, 0.04], M(0x222222, { r: 0.4 }), [0, 0, 0]);
  const readerLed = sphere(reader, 0.012, M(0xffffff, { e: 0xc0392b, ei: 2, unique: true }), [0, 0.13, 0.025], { cast: false });
  W.reactives.push(() => {
    readerLed.material.emissive.setHex(S.has('study_door') ? 0x5fbf6a : S.has('badge') ? 0xe0a030 : 0x8a2a20);
  });

  const printBadge = () => {
    G.porter([[L('The staff OK has been received, so I am printing your badge now.', '已收到工作人员的许可，正在为您打印胸牌。'), 2800]]);
    setTimeout(() => {
      G.sfx('printer');
      slip.visible = true;
      slip.position.x = -3.38;
      let k = 0;
      const iv = setInterval(() => {
        k++;
        if (k > 18) slip.position.x = -3.38 - (k - 18) * 0.012;
        if (k > 30) { slip.visible = false; clearInterval(iv); }
      }, 50);
    }, 1200);
    setTimeout(() => G.porter([[L('Your badge is in the tray, and please ignore the other one, which was printed by mistake.', '您的胸牌在托盘里。另一张请别理它，是打错了。'), 3800]]), 3600);
  };
  S.on('flag', (f) => { if (f === 'radio_ok') setTimeout(printBadge, 1500); });

  // ---------------- interactions ----------------
  item({
    id: 'envelope', pos: [-0.1, 0.8, -4.05], obj: env, label: () => L('Open the envelope', '打开信封'),
    when: () => !S.has('read_L1'),
    use: () => G.read('L1', { onClose: () => S.set('read_L1'), onBack: () => S.set('L1_back') }),
  });
  item({
    id: 'bell', pos: [0.55, 0.85, -4.15], obj: bell, label: () => L('Ring the bell', '摇铃'),
    use: () => {
      G.sfx('bell');
      bell.children[1].position.y = 0.005;
      setTimeout(() => (bell.children[1].position.y = 0.015), 120);
      if (S.set('bell_rung')) {
        G.porter([
          [L('Good evening, and welcome to the house!', '晚上好，欢迎光临本宅！'), 2600],
          [L('Let me just check the guest list, which says one guest and two staff, and that suits me perfectly.', '我查一下宾客名单：一位宾客，两位工作人员，正合我意。'), 3400],
          [L('Staff don’t need chairs, which means that everybody gets a window seat.', '工作人员不需要椅子，所以每个人都能坐靠窗的位子。'), 3200],
        ]);
        setTimeout(() => G.sfx('fold'), 3000);
        setTimeout(() => G.sfx('fold'), 4200);
        setTimeout(() => G.porter([
          [L('I would happily print your badge right now, except that a guest badge needs an OK from the staff first.', '我很乐意现在就给您打印胸牌，可宾客胸牌得先有工作人员的许可。'), 3600],
          [L('The staff always send their OK by radio, and I am always listening, although I can never remember which station it is.', '工作人员总是通过收音机给许可，我也一直在听，就是老记不住是哪个台。'), 4200],
        ]), 9400);
      } else {
        G.porter([[L('There is still only one guest on the list, and I have checked it twice.', '名单上还是只有一位宾客，我核对过两遍了。'), 2600]]);
      }
    },
  });
  item({
    id: 'badge', pos: [-3.38, 1.0, -5.4], obj: badge, label: () => L('Take your badge', '拿起你的胸牌'),
    when: () => S.has('bell_rung') && !S.has('badge'),
    use: () => {
      S.set('badge');
      G.sfx('pickup');
      G.give('badge', ['Guest badge', '宾客胸牌']);
      S.addJournal('R_badge');
      G.porter([[L('Please keep it somewhere people can see it, because the doors in this house are very fussy.', '请把它戴在别人看得见的地方，这房子里的门都很挑剔。'), 3000]]);
    },
  });
  item({
    id: 'reader', pos: [2.85, 1.15, -7.85], obj: reader, label: () => (S.has('badge') ? L('Tap your badge on the reader', '在读卡器上刷胸牌') : L('Badge reader', '读卡器')),
    when: () => !S.has('study_door'),
    use: () => {
      if (!S.has('badge')) { G.sfx('deny'); G.note(L('The reader blinks red at you, because it wants to see a badge first.', '读卡器朝你闪红灯，它要先看到胸牌。')); return; }
      G.sfx('beep');
      S.set('study_door');
      G.sfx('door');
    },
  });
  item({
    id: 'photo', pos: [0.78, 0.88, -4.58], obj: frame, label: () => L('Pick up the photo', '拿起照片'),
    use: () => G.read('photo', { onBack: () => S.set('photo_back') }),
  });
  item({
    id: 'radio', pos: [-3.68, 1.0, -1.85], obj: radio, reach: 2.2, allow: 0.8,
    label: () => L('Use the radio', '用收音机'),
    use: () => {
      G.station('radio');
    },
  });


  mark('envelope', [-0.1, 0.8, -4.05]);
  mark('bell', [0.55, 0.85, -4.15]);
  mark('badge', [-3.38, 1.0, -5.4]);
  mark('radio', [-3.68, 1.0, -1.85]);
  mark('reader', [2.85, 1.15, -7.9]);
  return g;
}
