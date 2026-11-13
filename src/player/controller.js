import * as THREE from 'three';
import { IN } from '../core/input.js';
import { S } from '../core/state.js';
import { W } from '../world/kit.js';

const R = 0.28; // capsule radius
const tmp = new THREE.Vector3();
const aimDir = new THREE.Vector3();

export function createController(camera, dad) {
  const c = {
    pos: new THREE.Vector3(0, 0, -2),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: -0.12,
    charYaw: Math.PI,
    speed: 0,
    focus: 0,
    view: null, // cinematic override { pos, look }
    viewBlend: 0,
    frozen: false,
    lookDir: new THREE.Vector3(),
    camPos: new THREE.Vector3(),
    stepDist: 0,
    onStep: null,
    jumpY: 0, // height above the ground while jumping
    vy: 0,
    crouch: false,
    crouchK: 0, // 0 standing .. 1 crouched
    reachK: 1, // how far the right hand is held out toward the middle of the screen
    swing: null, // set by the tennis court: a function that owns the right arm
    onJump: null,
  };
  const camLook = new THREE.Vector3();

  c.place = (x, z, yaw = 0) => {
    c.pos.set(x, groundAt(x, z), z);
    c.yaw = yaw;
    c.charYaw = yaw + Math.PI;
    c.pitch = -0.12;
    c.vel.set(0, 0, 0);
    c.jumpY = 0; c.vy = 0; c.crouch = false;
    c.snapCam = true;
  };

  function groundAt(x, z) {
    return W.ground ? W.ground(x, z) : 0;
  }

  // foot: height of the feet (raised while jumping, so low boxes can be cleared)
  // top: head height (lower while crouching, so you can duck under things)
  function collide(p, foot = p.y, top = 1.6) {
    for (let it = 0; it < 3; it++) {
      if (W.pushers) for (const f of W.pushers) f(p, R);
      for (const b of W.colliders) {
        if (!b.on) continue;
        if (b.y1 < foot + 0.3 || b.y0 > p.y + top) continue;
        const cx = Math.max(b.x0, Math.min(p.x, b.x1));
        const cz = Math.max(b.z0, Math.min(p.z, b.z1));
        const dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < R * R) {
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            p.x += (dx / d) * (R - d);
            p.z += (dz / d) * (R - d);
          } else {
            // centre inside box: push out the shortest way
            const pushes = [[b.x0 - R - p.x, 0], [b.x1 + R - p.x, 0], [0, b.z0 - R - p.z], [0, b.z1 + R - p.z]];
            pushes.sort((a, q) => Math.abs(a[0] + a[1]) - Math.abs(q[0] + q[1]));
            p.x += pushes[0][0]; p.z += pushes[0][1];
          }
        }
      }
    }
  }

  // Ray vs AABB list: returns nearest hit distance along dir (unit), up to maxD.
  function rayHit(o, dir, maxD) {
    let best = maxD;
    for (const b of W.colliders) {
      if (!b.on || b.cam === false) continue;
      let tmin = 0, tmax = best;
      const lo = [b.x0, b.y0, b.z0], hi = [b.x1, b.y1, b.z1];
      const oo = [o.x, o.y, o.z], dd = [dir.x, dir.y, dir.z];
      let ok = true;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(dd[k]) < 1e-6) {
          if (oo[k] < lo[k] || oo[k] > hi[k]) { ok = false; break; }
        } else {
          let t1 = (lo[k] - oo[k]) / dd[k], t2 = (hi[k] - oo[k]) / dd[k];
          if (t1 > t2) [t1, t2] = [t2, t1];
          tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
          if (tmin > tmax) { ok = false; break; }
        }
      }
      if (ok && tmin > 0.05 && tmin < best) best = tmin;
    }
    return best;
  }

  c.update = (dt) => {
    const active = !c.frozen && IN.enabled;
    // look
    if (active && (IN.locked || IN.touch || IN.drag)) {
      const sens = 0.0022 * S.settings.sens * (c.focus > 0.5 ? 0.6 : 1);
      c.yaw -= IN.dx * sens;
      c.pitch -= IN.dy * sens * (S.settings.invertY ? -1 : 1);
      c.pitch = THREE.MathUtils.clamp(c.pitch, -1.0, 0.75);
    }
    // keyboard turning for people who prefer it
    if (active) {
      if (IN.down('KeyQ')) c.yaw += dt * 1.8;
      if (IN.down('KeyR')) c.yaw -= dt * 1.8;
    }
    // move
    let mx = 0, mz = 0;
    if (active) {
      if (IN.down('KeyW', 'ArrowUp')) mz += 1;
      if (IN.down('KeyS', 'ArrowDown')) mz -= 1;
      if (IN.down('KeyA', 'ArrowLeft')) mx -= 1;
      if (IN.down('KeyD', 'ArrowRight')) mx += 1;
      mx += IN.joy.x; mz -= IN.joy.y;
    }
    const fwd = tmp.set(-Math.sin(c.yaw), 0, -Math.cos(c.yaw));
    const right = new THREE.Vector3(Math.cos(c.yaw), 0, -Math.sin(c.yaw));
    const want = new THREE.Vector3().addScaledVector(fwd, mz).addScaledVector(right, mx);
    if (want.lengthSq() > 1) want.normalize();
    // C (or the touch button) toggles crouching; sprinting or jumping stands you back up
    if (active && (IN.hit('KeyC') || IN.hit('TouchCrouch'))) c.crouch = !c.crouch;
    const running = active && (IN.down('ShiftLeft', 'ShiftRight') || Math.hypot(IN.joy.x, IN.joy.y) > 0.95) && mz >= 0;
    if (running) c.crouch = false;
    // Space jumps, but only from the ground
    if (active && (IN.hit('Space') || IN.hit('TouchJump')) && c.jumpY === 0) { c.vy = 5.0; c.crouch = false; c.onJump?.(); }
    c.vy -= 15 * dt;
    c.jumpY = Math.max(0, c.jumpY + c.vy * dt);
    if (c.jumpY === 0 && c.vy < 0) { if (c.vy < -3) c.onLand?.(); c.vy = 0; }
    c.crouchK += ((c.crouch ? 1 : 0) - c.crouchK) * Math.min(1, dt * 10);
    c.focus += ((active && IN.aim ? 1 : 0) - c.focus) * Math.min(1, dt * 9);
    const top = running ? 5.2 : c.crouchK > 0.5 ? 1.3 : c.focus > 0.5 ? 1.6 : 2.5;
    want.multiplyScalar(top);
    const acc = want.lengthSq() > 0 ? 12 : 14;
    c.vel.x += (want.x - c.vel.x) * Math.min(1, dt * acc);
    c.vel.z += (want.z - c.vel.z) * Math.min(1, dt * acc);
    const before = c.pos.clone();
    c.pos.x += c.vel.x * dt;
    c.pos.z += c.vel.z * dt;
    collide(c.pos, c.pos.y + c.jumpY, 1.6 - 0.75 * c.crouchK);
    // standing back up underneath something low: stay crouched
    if (!c.crouch && c.crouchK > 0.05 && W.colliders.some((b) => b.on && b.y0 > c.pos.y + 0.85 && b.y0 < c.pos.y + 1.6 && c.pos.x > b.x0 - R && c.pos.x < b.x1 + R && c.pos.z > b.z0 - R && c.pos.z < b.z1 + R)) c.crouch = true;
    const gy = groundAt(c.pos.x, c.pos.z);
    c.pos.y += (gy - c.pos.y) * Math.min(1, dt * 14);
    const moved = Math.hypot(c.pos.x - before.x, c.pos.z - before.z);
    c.speed = moved / Math.max(dt, 1e-4);
    c.stepDist += moved;
    if (c.stepDist > (running ? 0.85 : 0.68)) { c.stepDist = 0; c.onStep?.(running); }

    // Dad faces where you're looking, like an over-the-shoulder game. Only a sprint turns him
    // toward where he's running.
    let targetYaw = c.yaw + Math.PI;
    if (running && c.speed > 0.3) targetYaw = Math.atan2(c.vel.x, c.vel.z);
    let d = targetYaw - c.charYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const turn = d * Math.min(1, dt * 12);
    c.charYaw += turn;
    dad.root.position.copy(c.pos);
    dad.root.position.y += c.jumpY;
    dad.root.rotation.y = c.charYaw;
    // walking backwards plays the steps in reverse
    const facing = Math.sin(c.charYaw) * c.vel.x + Math.cos(c.charYaw) * c.vel.z;
    dad.animate(dt, c.speed, {
      run: running ? 1 : 0, lookPitch: c.pitch, turnRate: turn / Math.max(dt, 1e-3), reduced: S.settings.reduced,
      back: facing < -0.2, crouch: c.crouchK, air: c.jumpY > 0.02 ? 1 : 0,
    });

    // camera
    const cp = Math.cos(c.pitch);
    c.lookDir.set(-Math.sin(c.yaw) * cp, Math.sin(c.pitch), -Math.cos(c.yaw) * cp);
    const dist = THREE.MathUtils.lerp(2.65, 1.25, c.focus);
    const shoulder = THREE.MathUtils.lerp(0.5, 0.62, c.focus);
    const pivot = new THREE.Vector3(c.pos.x, c.pos.y + THREE.MathUtils.lerp(1.6, 1.58, c.focus) - c.crouchK * 0.45 + c.jumpY * 0.7, c.pos.z);
    const sideOrigin = pivot.clone().addScaledVector(right, shoulder);
    // keep the shoulder offset itself inside walls
    const sideDir = right.clone();
    const sideHit = rayHit(pivot, sideDir, shoulder + 0.2);
    if (sideHit < shoulder + 0.2) sideOrigin.copy(pivot).addScaledVector(right, Math.max(0, sideHit - 0.2));
    const back = c.lookDir.clone().negate();
    const hit = rayHit(sideOrigin, back, dist + 0.25);
    const camD = Math.max(0.35, Math.min(dist, hit - 0.25));
    const desired = sideOrigin.clone().addScaledVector(back, camD);
    const ceil = W.ceilAt ? W.ceilAt(c.pos.x, c.pos.z) : Infinity;
    desired.y = Math.min(desired.y, ceil - 0.18);
    desired.y = Math.max(desired.y, groundAt(desired.x, desired.z) + 0.25);
    if (c.snapCam) { c.camPos.copy(desired); c.snapCam = false; }
    else c.camPos.lerp(desired, Math.min(1, dt * 18));
    camLook.copy(c.camPos).addScaledVector(c.lookDir, 10);

    // cinematic view blend
    c.viewBlend += ((c.view ? 1 : 0) - c.viewBlend) * Math.min(1, dt * (S.settings.reduced ? 20 : 4));
    if (c.viewBlend > 0.001 && (c.view || c.lastView)) {
      const v = c.view || c.lastView;
      c.lastView = v;
      camera.position.lerpVectors(c.camPos, v.pos, c.viewBlend);
      const lk = new THREE.Vector3().lerpVectors(camLook, v.look, c.viewBlend);
      camera.lookAt(lk);
    } else {
      camera.position.copy(c.camPos);
      camera.lookAt(camLook);
    }
    // keep the sideways view wide enough on tall, narrow screens (phones held upright)
    const base = camera.aspect < 1.3 ? Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(36)) / camera.aspect))) : 60;
    const fov = THREE.MathUtils.lerp(base, base * 0.8, c.focus) + (running ? 3 : 0);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }
    // fade the character when the camera is jammed against it
    const near = camera.position.distanceTo(pivot);
    dad.root.visible = near > 0.45;

    // Right hand held out so it sits in the middle of the screen, where you're looking.
    // It drops while sprinting, and the tennis court takes the arm over for swings.
    const wantReach = dad.root.visible && !running && c.viewBlend < 0.05 && !c.swing ? 1 : 0;
    c.reachK += (wantReach - c.reachK) * Math.min(1, dt * 8);
    camera.updateMatrixWorld();
    camera.getWorldDirection(aimDir);
    c.handCentered = dad.reach(camera.position, aimDir, c.reachK);
    if (c.swing) c.swing(dad, dt);
  };

  return c;
}
