import * as THREE from 'three';
import { M, canvasTex, rng } from '../world/kit.js';

// A stylised dad: knit sweater over a collared shirt, dark trousers, brown shoes,
// greying hair, glasses, and a lanyard that collects the tokens.

const Mu = (c, o = {}) => M(c, { ...o, unique: true });

function knit(base, key) {
  return canvasTex(`knit-${key}`, 128, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(4);
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
      const v = (r() - 0.5) * 0.12;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(x, y, 2, 4);
    }
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let x = 0; x < w; x += 4) g.fillRect(x + 2, 0, 1, h);
  }, { repeat: [3, 3] });
}

function limb(rt, rb, len, mat, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, len, seg, 1);
  g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}
function joint(r, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
  m.castShadow = true;
  return m;
}

// The same figure also makes Joy and Yan for the ending, with their own colours and hair.
export function buildDad(o = {}) {
  const look = { sweater: '#5b6650', hem: 0x4d5744, trousers: 0x2c2f36, glasses: true, grey: true, longHair: false, scale: 1, ...o };
  const skin = Mu(0xd7a983, { r: 0.7, unique: true });
  const sweater = Mu(parseInt(look.sweater.slice(1), 16), { r: 0.95, map: knit(look.sweater, 'sw' + look.sweater), unique: true });
  const shirt = Mu(0xd9dde0, { r: 0.85 });
  const trousers = Mu(look.trousers, { r: 0.85 });
  const shoe = Mu(0x4a3020, { r: 0.55 });
  const hair = Mu(0x2a2826, { r: 0.9, unique: true });
  const greyHair = look.grey ? Mu(0x6d6a66, { r: 0.9 }) : hair;
  const frame = Mu(0x1c1b1a, { r: 0.35, m: 0.4 });
  const strap = Mu(0x3b6db3, { r: 0.8 });

  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs and leans
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.93;
  body.add(hips);

  // pelvis
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.1, 6, 14), trousers);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(1, 1, 0.75);
  pelvis.castShadow = true;
  hips.add(pelvis);

  // torso
  const spine = new THREE.Group();
  spine.position.y = 0.05;
  hips.add(spine);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 8, 18), sweater);
  torso.position.y = 0.25;
  torso.scale.set(1.12, 1, 0.74);
  torso.castShadow = true;
  spine.add(torso);
  // ribbed hem
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.182, 0.176, 0.06, 20), Mu(look.hem, { r: 0.95 }));
  hem.scale.set(1.12, 1, 0.76);
  hem.position.y = 0.04;
  spine.add(hem);
  // collar of the shirt peeking out
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 18), shirt);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.5, 0.005);
  spine.add(collar);
  const vneck = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 3), shirt);
  vneck.rotation.x = Math.PI;
  vneck.position.set(0, 0.44, 0.115);
  vneck.scale.z = 0.3;
  spine.add(vneck);

  // neck + head
  const neck = new THREE.Group();
  neck.position.y = 0.52;
  spine.add(neck);
  const neckM = limb(0.05, 0.055, 0.1, skin);
  neckM.rotation.x = Math.PI;
  neck.add(neckM);
  const head = new THREE.Group();
  head.position.y = 0.17;
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.108, 24, 18), skin);
  skull.scale.set(0.94, 1.12, 1.02);
  skull.castShadow = true;
  head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 12), skin);
  jaw.position.set(0, -0.05, 0.02);
  jaw.scale.set(1, 0.8, 1);
  head.add(jaw);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 8), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.005, 0.11);
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), skin);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(0.1 * s, 0, -0.005);
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), Mu(0x1a1410, { r: 0.3 }));
    eye.position.set(0.036 * s, 0.025, 0.098);
    head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.01), hair);
    brow.position.set(0.037 * s, 0.05, 0.102);
    brow.rotation.z = -0.12 * s;
    head.add(brow);
    if (!look.glasses) continue;
    // glasses
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0035, 6, 20), frame);
    lens.position.set(0.037 * s, 0.022, 0.113);
    lens.scale.set(1.15, 0.85, 1);
    head.add(lens);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.1), frame);
    arm.position.set(0.064 * s, 0.025, 0.065);
    head.add(arm);
  }
  if (look.glasses) {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.004), frame);
    bridge.position.set(0, 0.027, 0.114);
    head.add(bridge);
  }
  // hair: cap + greying sides
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.114, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
  cap.scale.set(0.97, 1.08, 1.06);
  cap.position.set(0, 0.012, -0.008);
  cap.rotation.x = -0.18;
  cap.castShadow = true;
  head.add(cap);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), greyHair);
    side.scale.set(0.5, 0.9, 1.2);
    side.position.set(0.088 * s, 0.01, -0.035);
    head.add(side);
  }
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), hair);
  back.scale.set(1.05, 0.75, 0.6);
  back.position.set(0, -0.005, -0.065);
  head.add(back);
  if (look.longHair) {
    // long hair down past the shoulders, and a strand either side of the face
    const drape = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 6, 14), hair);
    drape.scale.set(1.12, 1, 0.5);
    drape.position.set(0, -0.17, -0.075);
    drape.castShadow = true;
    head.add(drape);
    for (const s of [-1, 1]) {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.2, 4, 10), hair);
      strand.position.set(0.093 * s, -0.12, -0.005);
      strand.rotation.z = 0.06 * s;
      head.add(strand);
    }
  }

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.215 * s, 0.43, 0);
    spine.add(shoulder);
    shoulder.add(joint(0.062, sweater));
    const upper = limb(0.056, 0.048, 0.29, sweater);
    shoulder.add(upper);
    shoulder.rotation.z = 0.08 * s;
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    elbow.add(joint(0.048, sweater));
    const fore = limb(0.047, 0.04, 0.24, sweater);
    elbow.add(fore);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.04, 12), Mu(look.hem, { r: 0.95 }));
    cuff.position.y = -0.235;
    elbow.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), skin);
    hand.scale.set(0.75, 1.15, 0.95);
    hand.position.y = -0.29;
    hand.castShadow = true;
    elbow.add(hand);
    arms.push({ shoulder, elbow, hand, s });
  }

  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.095 * s, -0.02, 0);
    hips.add(hip);
    hip.add(limb(0.078, 0.06, 0.44, trousers));
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    knee.add(joint(0.06, trousers));
    knee.add(limb(0.058, 0.048, 0.42, trousers));
    const ankle = new THREE.Group();
    ankle.position.y = -0.43;
    knee.add(ankle);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.25), shoe);
    foot.geometry.translate(0, -0.03, 0.05);
    foot.castShadow = true;
    ankle.add(foot);
    const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.075, 12, 1, false, 0, Math.PI), shoe);
    toe.rotation.z = Math.PI / 2;
    toe.rotation.y = Math.PI / 2;
    toe.position.set(0, -0.03, 0.175);
    ankle.add(toe);
    legs.push({ hip, knee, ankle, s });
  }

  // lanyard: strap + badge + token charms
  const lanyard = new THREE.Group();
  spine.add(lanyard);
  const strapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, 0.5, -0.02), new THREE.Vector3(-0.1, 0.42, 0.11), new THREE.Vector3(-0.03, 0.22, 0.135),
    new THREE.Vector3(0, 0.19, 0.137), new THREE.Vector3(0.03, 0.22, 0.135), new THREE.Vector3(0.1, 0.42, 0.11), new THREE.Vector3(0.07, 0.5, -0.02),
  ]);
  const strapM = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 40, 0.007, 5, false), strap);
  lanyard.add(strapM);
  const badge = new THREE.Group();
  badge.position.set(0, 0.13, 0.14);
  badge.rotation.x = -0.12;
  lanyard.add(badge);
  const badgeCard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.095, 0.004), Mu(0xb08a4a, { r: 0.35, m: 0.85 }));
  badge.add(badgeCard);
  const badgeFace = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.03), Mu(0xefe9dc, { r: 0.9 }));
  badgeFace.position.set(0, -0.012, 0.0025);
  badge.add(badgeFace);
  lanyard.visible = false;
  const charms = {};
  const charmColors = { bell: 0xc29a52, chip: 0x9aa3a6, racket: 0xb7835a, ladle: 0xa8875a, star: 0xd8b867 };
  ['bell', 'chip', 'racket', 'ladle', 'star'].forEach((k, i) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.005, 14), M(charmColors[k], { r: 0.3, m: 0.9 }));
    c.rotation.x = Math.PI / 2;
    const a = (i - 2) * 0.023;
    c.position.set(a, 0.2 - Math.abs(i - 2) * 0.012, 0.142);
    c.visible = false;
    lanyard.add(c);
    charms[k] = c;
  });

  root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  root.scale.setScalar(look.scale);

  // ---------- animation ----------
  let phase = 0;
  let blend = 0; // 0 idle -> 1 moving
  let t = 0;
  let airK = 0;
  function animate(dt, speed, { run = 0, lookPitch = 0, turnRate = 0, reduced = false, back = false, crouch = 0, air = 0 } = {}) {
    t += dt;
    const moving = Math.min(1, speed / 2.2);
    blend += (moving - blend) * Math.min(1, dt * 8);
    phase += dt * (speed > 0.05 ? 3.1 + speed * 1.65 : 0) * (back ? -1 : 1);
    airK += (air - airK) * Math.min(1, dt * 12);
    const a = blend;
    const amp = 0.55 + run * 0.25;
    for (const L of legs) {
      const p = phase + (L.s > 0 ? Math.PI : 0);
      const swing = Math.sin(p) * amp * a;
      L.hip.rotation.x = -swing;
      const kneeBend = Math.max(0, Math.sin(p + 1.6)) * (0.95 + run * 0.4) * a + 0.04;
      L.knee.rotation.x = kneeBend;
      L.ankle.rotation.x = -kneeBend * 0.35 + swing * 0.25;
    }
    for (const A of arms) {
      const p = phase + (A.s > 0 ? 0 : Math.PI);
      const breath = Math.sin(t * 1.6) * 0.015;
      A.shoulder.rotation.x = -Math.sin(p) * (0.4 + run * 0.35) * a + breath;
      A.shoulder.rotation.z = (0.09 + 0.04 * (1 - a)) * A.s;
      A.elbow.rotation.x = -(0.22 + run * 0.7 * a + Math.max(0, Math.sin(p)) * 0.25 * a);
    }
    const bob = Math.abs(Math.sin(phase)) * 0.035 * a;
    hips.position.y = 0.93 - 0.02 * a + bob;
    hips.rotation.y = Math.sin(phase) * 0.08 * a;
    spine.rotation.y = -Math.sin(phase) * 0.12 * a;
    spine.rotation.x = 0.04 * a + run * 0.12 * a + Math.sin(t * 1.6) * 0.008;
    body.rotation.z = THREE.MathUtils.clamp(-turnRate * 0.04, -0.12, 0.12) * a;
    // crouching: thighs forward, shins back, feet flat, hips dropped
    if (crouch > 0.001) {
      for (const L of legs) {
        const p = phase + (L.s > 0 ? Math.PI : 0);
        const sw = Math.sin(p) * 0.3 * a;
        L.hip.rotation.x = THREE.MathUtils.lerp(L.hip.rotation.x, -1.1 - sw, crouch);
        L.knee.rotation.x = THREE.MathUtils.lerp(L.knee.rotation.x, 1.9 + Math.max(0, Math.sin(p + 1.6)) * 0.2 * a, crouch);
        L.ankle.rotation.x = THREE.MathUtils.lerp(L.ankle.rotation.x, -0.8 + sw * 0.5, crouch);
      }
      hips.position.y -= 0.34 * crouch;
      spine.rotation.x += 0.38 * crouch;
    }
    // in the air: knees tucked up a little
    if (airK > 0.001) {
      for (const L of legs) {
        L.hip.rotation.x = THREE.MathUtils.lerp(L.hip.rotation.x, -0.55 + (L.s > 0 ? 0.25 : 0), airK);
        L.knee.rotation.x = THREE.MathUtils.lerp(L.knee.rotation.x, 0.95, airK);
        L.ankle.rotation.x = THREE.MathUtils.lerp(L.ankle.rotation.x, -0.35, airK);
      }
    }
    for (const A of arms) A.shoulder.rotation.y = 0;
    head.rotation.x = THREE.MathUtils.clamp(-lookPitch * 0.4, -0.35, 0.35) - spine.rotation.x * 0.6;
    head.rotation.y = -spine.rotation.y * 0.7;
    torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012 * (1 - a);
    return { phase, blend };
  }

  // Hold the right hand out so that it lands on the line from the camera through the middle
  // of the screen. Returns true when the hand really is on that line.
  const R_ARM = arms.find((A) => A.s < 0); // Dad's right arm (he faces +z, so his right is -x)
  const ARM = 0.571; // shoulder to the middle of the hand, with the elbow bent 0.35 rad
  const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _v = new THREE.Vector3();
  const HAND_DIR = new THREE.Vector3(0, -0.562, 0.0995).normalize(); // shoulder-to-hand, in the shoulder's own frame
  function reach(camPos, dir, w) {
    if (w < 0.01) return false;
    root.updateMatrixWorld(true);
    R_ARM.shoulder.getWorldPosition(_p);
    // point on the ray at arm's length from the shoulder: |c + t d - p| = ARM
    _v.copy(camPos).sub(_p);
    const b = _v.dot(dir), cc = _v.lengthSq() - ARM * ARM, disc = b * b - cc;
    let ok = true;
    if (disc >= 0) _d.copy(camPos).addScaledVector(dir, -b + Math.sqrt(disc));
    else { _d.copy(camPos).addScaledVector(dir, Math.max(0, -b)); ok = false; }
    _d.sub(_p).normalize();
    // the arm mustn't swing back through the body: keep it in front of the chest
    R_ARM.shoulder.parent.getWorldQuaternion(_pq);
    _d.applyQuaternion(_pq.invert());
    if (_d.z < 0.15) { _d.z = 0.15; _d.normalize(); ok = false; }
    _q.setFromUnitVectors(HAND_DIR, _d);
    R_ARM.shoulder.quaternion.slerp(_q, w);
    R_ARM.elbow.rotation.x = THREE.MathUtils.lerp(R_ARM.elbow.rotation.x, -0.35, w);
    R_ARM.shoulder.updateMatrixWorld(true);
    return ok && w > 0.9;
  }

  // a racket that appears in the right hand on the tennis court
  const racket = new THREE.Group();
  const rFrame = Mu(0x1c1c1c, { r: 0.3 });
  const rHead = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.011, 6, 28), rFrame);
  rHead.scale.set(1, 1.3, 1);
  rHead.position.y = -0.42;
  racket.add(rHead);
  const strings = new THREE.Mesh(new THREE.CircleGeometry(0.115, 20), Mu(0xe8e4d8, { r: 0.9, t: true, o: 0.35, side: THREE.DoubleSide }));
  strings.scale.set(1, 1.3, 1);
  strings.position.y = -0.42;
  racket.add(strings);
  const grip = limb(0.016, 0.016, 0.27, Mu(0x3a2a1e, { r: 0.6 }));
  racket.add(grip);
  racket.position.y = -0.02;
  racket.visible = false;
  R_ARM.hand.add(racket);

  function setLanyard(flags) {
    lanyard.visible = !!flags.badge;
    for (const k of Object.keys(charms)) charms[k].visible = !!flags['tok_' + k];
  }

  function setOpacity(o) {
    root.traverse((m) => {
      if (!m.isMesh) return;
      m.material.transparent = o < 1;
      m.material.opacity = o;
      m.material.depthWrite = o > 0.5;
    });
  }

  return { root, head, animate, setLanyard, setOpacity, reach, racket, arm: R_ARM, spine };
}
