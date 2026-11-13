// A real game of tennis against the ball machine's returner.
// The returner on the far side feeds and returns balls. Dad swings with a click (E, or a tap),
// and the ball goes where he's looking: look higher to hit deeper, lower to hit it short.
// The returner is slow, so the way to win a point is to put the ball where it isn't.
import * as THREE from 'three';
import { W, M, solid } from './kit.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L } from '../game/i18n.js';
import { IN } from '../core/input.js';

const GRAV = 9.8;
const BALL_R = 0.075; // a bit bigger than a real ball so it's easy to follow across the hall

export function buildTennis(g, C) {
  // the singles court on the far side, where Dad's shots have to land
  const FAR = { x0: C.sx0, x1: C.sx1, z0: C.far, z1: C.net };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 14, 10), M(0xe4f05a, { r: 0.6, e: 0xc8d840, ei: 1.1, unique: true }));
  ball.castShadow = true;
  ball.visible = false;
  g.add(ball);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  g.add(shadow);
  // during a match Dad stays on his own half
  const fence = solid(-16, 6, C.net - 0.6, C.net + 0.6, 0, 3);
  fence.on = false;
  fence.cam = false;

  const NAMES = () => [L('love', '0'), '15', '30', '40'];
  const T = {
    on: false,
    pts: [0, 0], // [Weishuai, the machine]
    p: new THREE.Vector3(), v: new THREE.Vector3(),
    live: false,
    lastHit: null, // 'dad' | 'bot'
    bounces: 0,
    landed: null, // where Dad's shot first bounced
    rally: 0,
    wait: 0, // pause between points
    swingT: -1,
    swingHit: false,
    botTarget: new THREE.Vector3(),
    botSpeed: 1.9,
    games: 0,
  };
  W.tennis = T;
  const bot = () => W.returner;

  T.scoreText = () => {
    const [a, b] = T.pts;
    if (a >= 3 && b >= 3 && a === b) return L('40–40, next point wins', '40 比 40，下一分定胜负');
    return `${NAMES()[Math.min(a, 3)]}–${NAMES()[Math.min(b, 3)]}`;
  };

  T.start = () => {
    if (T.on) return;
    T.on = true;
    T.pts = [0, 0];
    T.rally = 0;
    fence.on = true;
    G.ctl.swing = swingPose;
    G.dad.racket.visible = true;
    G.sfx('beep');
    W.scoreboard?.redraw();
    G.note(KTswing(), 6500);
    T.wait = 2.2;
    T.live = false;
  };
  T.stop = () => {
    T.on = false;
    T.live = false;
    fence.on = false;
    G.ctl.swing = null;
    G.dad.racket.visible = false;
    ball.visible = false;
    shadow.visible = false;
    W.scoreboard?.redraw();
  };
  const KTswing = () => (IN.touch
    ? L('Get near the ball and tap to swing. The ball goes where you’re looking: look higher to hit it deep, lower to drop it short.', '靠近球，点一下挥拍。球会往你看的方向飞：往高处看打深球，往低处看打短球。')
    : L('Get near the ball and click (or press E) to swing. The ball goes where you’re looking: look higher to hit it deep, lower to drop it short.', '靠近球，点鼠标（或按 E）挥拍。球会往你看的方向飞：往高处看打深球，往低处看打短球。'));

  // launch the ball from `from` so that it first lands at `to`, clearing the net comfortably
  function launch(from, to, t) {
    T.p.copy(from);
    for (let i = 0; i < 8; i++) {
      T.v.set((to.x - from.x) / t, 0, (to.z - from.z) / t);
      T.v.y = (BALL_R - from.y + 0.5 * GRAV * t * t) / t;
      // height when crossing the net
      const tn = (C.net - from.z) / T.v.z;
      const hn = tn > 0 && tn < t ? from.y + T.v.y * tn - 0.5 * GRAV * tn * tn : 9;
      if (hn > 1.15) break;
      t *= 1.12;
    }
    T.bounces = 0;
    T.live = true;
    ball.visible = shadow.visible = true;
  }

  function feed() {
    const b = bot();
    const from = new THREE.Vector3(b.position.x, 1.0, b.position.z + 0.4);
    const d = G.ctl.pos;
    const to = new THREE.Vector3(
      THREE.MathUtils.clamp(d.x + (Math.random() - 0.5) * 3.2, C.sx0 + 0.3, C.sx1 - 0.3),
      0,
      THREE.MathUtils.clamp(-41 - Math.random() * 4.5, C.svcNear - 1.5, C.near - 1.5),
    );
    launch(from, to, Math.max(1.0, 1.35 - T.rally * 0.05));
    T.lastHit = 'bot';
    G.sfx('thock');
  }

  function point(winner, why) {
    T.live = false;
    T.wait = 2.4;
    T.rally = 0;
    T.pts[winner === 'dad' ? 0 : 1]++;
    const [a, b] = T.pts;
    // no-advantage scoring: at 40–40 the next point takes the game
    const won = a >= 4 && (a - b >= 2 || b >= 3);
    const lost = b >= 4 && (b - a >= 2 || a >= 3);
    W.scoreboard?.redraw();
    if (won) {
      G.sfx('good');
      G.porter([[L('Game to Weishuai. The machine would like it noted that it was playing on one battery.', '这一局 Weishuai 赢了。发球机希望大家知道，它只装了一节电池。'), 4600]]);
      T.stop();
      S.set('rally_ok');
      return;
    }
    if (lost) {
      G.sfx('bad');
      G.porter([[L('Game to the machine. It has asked for a rematch before it changes its mind, so here comes another one.', '这一局发球机赢了。它要求马上再来一局，趁它还没改主意。'), 4200]]);
      T.pts = [0, 0];
      T.wait = 3.6;
      return;
    }
    G.sfx(winner === 'dad' ? 'good' : 'click');
    const lines = winner === 'dad' ? DAD_LINES() : BOT_LINES();
    G.note(`${T.scoreText()}. ${why || lines[Math.floor(Math.random() * lines.length)]}`, 2600);
  }
  const DAD_LINES = () => [
    L('The returner is still trying to work out where that went.', '回球机还在琢磨球去哪儿了。'),
    L('Porter’s printer made a small, disappointed noise.', 'Porter 的打印机发出了一声小小的失望。'),
    L('Nowhere near the robot, which was the idea.', '离机器人十万八千里，正是这个意思。'),
  ];
  const BOT_LINES = () => [
    L('The machine’s point. It’s pretending it isn’t pleased about it.', '发球机得分。它假装自己一点也不得意。'),
    L('The machine’s point. Get a little closer to the ball next time.', '发球机得分。下次离球再近一点。'),
  ];

  // Swinging. The hit is checked over the first part of the swing, and it's forgiving about distance.
  T.swing = () => {
    if (!T.on || T.swingT >= 0) return;
    T.swingT = 0;
    T.swingHit = false;
    G.sfx('step', true);
  };
  function tryHit() {
    if (!T.live || T.lastHit === 'dad' || T.p.z < C.net) return false;
    const d = G.ctl.pos;
    const flat = Math.hypot(T.p.x - d.x, T.p.z - d.z);
    if (flat > 2.0 || T.p.y > 2.6) return false;
    // aim: horizontal direction from the camera, depth from how high you're looking
    const dir = new THREE.Vector3();
    G.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const k = THREE.MathUtils.clamp((G.ctl.pitch + 0.45) / 0.75, 0, 1);
    const zLand = C.net - THREE.MathUtils.lerp(1.5, 10.5, k);
    const fwd = Math.max(0.2, -dir.z);
    const dist = (T.p.z - zLand) / fwd;
    const to = new THREE.Vector3(T.p.x + dir.x * dist + (Math.random() - 0.5) * 0.5, 0, zLand + (Math.random() - 0.5) * 0.6);
    launch(T.p.clone().setY(Math.max(0.6, T.p.y)), to, 0.85 + dist * 0.022);
    T.lastHit = 'dad';
    T.landed = null;
    T.rally++;
    // the returner sets off for where it thinks the ball will land
    T.botTarget.set(to.x, 0, THREE.MathUtils.clamp(to.z - 1.8, C.far + 0.6, C.net - 2));
    G.sfx('thock');
    return true;
  }

  function swingPose(dad, dt) {
    const A = dad.arm;
    let k = 0; // 0 ready, 1 follow-through
    if (T.swingT >= 0) {
      T.swingT += dt;
      k = Math.min(1, T.swingT / 0.22);
      if (!T.swingHit && T.swingT < 0.3 && tryHit()) T.swingHit = true;
      if (T.swingT > 0.5) T.swingT = -1;
    }
    const back = 1 - k;
    // forehand: racket out to the side and back, then across the body
    A.shoulder.rotation.set(THREE.MathUtils.lerp(0.5, -1.5, k), THREE.MathUtils.lerp(0.4, -0.3, k), THREE.MathUtils.lerp(-1.05, -0.35, k));
    A.elbow.rotation.x = -0.45 - 0.25 * back;
    dad.spine.rotation.y += THREE.MathUtils.lerp(0.45, -0.5, k);
  }

  const tmp = new THREE.Vector3();
  W.tick.push((dt) => {
    if (!T.on) return;
    if (!IN.enabled) return; // paused
    const b = bot();
    // leaving the court calls the match off
    const d = G.ctl.pos;
    if (d.x < -16 || d.x > 6 || d.z > -32 || d.z < -66) { T.stop(); return; }

    // the returner moves toward its target along the rails
    tmp.copy(T.botTarget).sub(b.position);
    tmp.y = 0;
    const step = Math.min(tmp.length(), T.botSpeed * dt);
    if (tmp.lengthSq() > 1e-6) b.position.addScaledVector(tmp.normalize(), step);

    if (!T.live) {
      T.wait -= dt;
      // between points it wanders back to the middle of the baseline
      T.botTarget.set(-5, 0, C.far + 1.2);
      if (T.wait <= 0 && b.position.distanceTo(T.botTarget) < 0.6) feed();
      else if (T.wait <= -3) { b.position.copy(T.botTarget); feed(); }
      return;
    }

    // ball flight
    const z0 = T.p.z;
    T.v.y -= GRAV * dt;
    T.p.addScaledVector(T.v, dt);
    // the net
    if ((z0 - C.net) * (T.p.z - C.net) < 0 && T.p.y < 0.95 && T.p.x > C.dx0 - 0.4 && T.p.x < C.dx1 + 0.4) {
      T.p.z = C.net + (z0 > C.net ? 0.08 : -0.08);
      T.v.z *= -0.15; T.v.x *= 0.3;
      G.sfx('crash');
      point(T.lastHit === 'dad' ? 'bot' : 'dad', T.lastHit === 'dad' ? L('Into the net. Look a little higher.', '下网了。视线再往上一点。') : null);
      return;
    }
    if (T.p.y < BALL_R && T.v.y < 0) {
      T.p.y = BALL_R;
      T.v.y *= -0.7;
      T.v.x *= 0.88; T.v.z *= 0.88;
      T.bounces++;
      G.sfx('thock');
      if (T.lastHit === 'dad' && T.bounces === 1) {
        T.landed = T.p.clone();
        const inside = T.p.x >= FAR.x0 - 0.05 && T.p.x <= FAR.x1 + 0.05 && T.p.z >= FAR.z0 - 0.05 && T.p.z <= FAR.z1;
        if (!inside) {
          const why = T.p.z < FAR.z0 ? L('Long. Look a bit lower.', '出底线了。视线低一点。') : L('Wide. Aim a little further in.', '出边线了。往里一点瞄。');
          point('bot', why);
          return;
        }
      }
      if (T.bounces >= 2) {
        point(T.lastHit === 'dad' ? 'dad' : 'bot', T.lastHit === 'bot' ? L('It bounced twice before you got there.', '你还没赶到，球就弹了两次。') : null);
        return;
      }
    }
    // the returner gets to Dad's shot if it's close enough after the bounce
    if (T.lastHit === 'dad' && T.landed && T.p.y > 0.2 && T.p.y < 2.2) {
      const reach = Math.hypot(T.p.x - b.position.x, T.p.z - b.position.z);
      if (reach < 0.95) {
        T.botSpeed = Math.min(2.6, T.botSpeed + 0.05);
        feed();
        T.rally++;
        return;
      }
    }
    // past Dad, or off the back of the hall
    if (T.p.z > -32.5 || T.p.z < -65.5 || T.p.x < -15.8 || T.p.x > 5.8) {
      point(T.lastHit === 'dad' ? 'dad' : 'bot', T.lastHit === 'bot' ? L('It got past you.', '球从你身边过去了。') : null);
      return;
    }
    ball.position.copy(T.p);
    shadow.position.set(T.p.x, 0.012, T.p.z);
    shadow.material.opacity = 0.4 / (1 + T.p.y * 0.8);
  });

  return T;
}
