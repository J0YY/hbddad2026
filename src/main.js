import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import { S } from './core/state.js';
import { IN } from './core/input.js';
import { Audio } from './core/audio.js';
import { W } from './world/kit.js';
import { buildWorld, showRoomsAround } from './world/index.js';
import { buildDad } from './player/character.js';
import { createController } from './player/controller.js';
import { HUD } from './ui/hud.js';
import { Panels, openReader, openJournal, openHints } from './ui/panels.js';
import { Menu, applyTextScale } from './ui/menu.js';
import { Touch } from './ui/touch.js';
import { objective } from './game/objectives.js';
import { G } from './game/api.js';
import { L, KT } from './game/i18n.js';
const tx = (v) => (Array.isArray(v) ? L(v[0], v[1]) : v);
import { STATIONS, ending, lightCake } from './stations/index.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  S.load();
  applyTextScale();
  S.on('settings', applyTextScale);
  try {
    await Promise.race([
      Promise.all(['700 20px "Sofia Sans Semi Condensed"', '20px "Courier Prime"', '700 20px "Courier Prime"', '20px "Nanum Pen Script"', '20px "Nanum Brush Script"', '800 20px "Sofia Sans Extra Condensed"'].map((f) => document.fonts.load(f)),
        ...(S.settings.lang === 'zh' ? ['700 20px "Noto Sans SC"', '20px "Noto Sans SC"'].map((f) => document.fonts.load(f, '机房发球烤箱左右')) : [])),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts are optional */ }

  const canvas = $('view');
  // Graphics presets. "auto" starts balanced and steps down if the frame rate is low.
  const QUALITY = {
    fast: { pr: 0.75, samples: 0, bloom: false, shadow: 1024, pool: 6 },
    balanced: { pr: 1.0, samples: 2, bloom: true, shadow: 1024, pool: 8 },
    pretty: { pr: 1.5, samples: 4, bloom: true, shadow: 2048, pool: 12 },
  };
  // phones and tablets start on the lighter setting; Auto can still only step down from here
  let qName = S.settings.quality && S.settings.quality !== 'auto' ? S.settings.quality : IN.touch ? 'fast' : 'balanced';
  let Q = QUALITY[qName];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  W.scene = scene;
  scene.background = new THREE.Color(0x0a0908);
  scene.fog = new THREE.Fog(0x0a0908, 14, 40);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 420);

  // Lighting rig: hemisphere fill, a shadow-casting key that follows Dad, and a pool of point lights.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.4);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.6);
  key.castShadow = true;
  key.shadow.mapSize.set(Q.shadow, Q.shadow);
  key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 40;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  // soft fill that rides with the camera so Dad is never a silhouette
  const fill = new THREE.PointLight(0xffe8cc, 0, 7, 2);
  scene.add(fill);
  const POOL = 12;
  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const p = new THREE.PointLight(0xffffff, 0, 10, 2);
    scene.add(p);
    pool.push(p);
  }

  scene.add(W.root);
  buildWorld();

  const dad = buildDad();
  scene.add(dad.root);
  const ctl = createController(camera, dad);
  ctl.onStep = (run) => Audio.sfx('step', run);
  ctl.onJump = () => Audio.sfx('step', true);
  ctl.onLand = () => Audio.sfx('step', true);

  // Post-processing
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: Q.samples, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
  outline.edgeStrength = 2.6; outline.edgeGlow = 0; outline.edgeThickness = 1.2;
  outline.visibleEdgeColor.set('#f1dfb4'); outline.hiddenEdgeColor.set('#000000');
  composer.addPass(outline);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.55, 0.55, 0.82);
  composer.addPass(bloom);
  bloom.enabled = Q.bloom;
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.55 }, grain: { value: 0.035 }, tint: { value: new THREE.Color(0xfff4e6) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, grain; uniform vec3 tint; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - 0.5; float r2 = dot(d,d);
        vec2 off = d * r2 * 0.012;
        vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        c *= tint;
        float v = smoothstep(0.95, 0.25, length(d * vec2(1.0, 1.15)));
        c *= mix(1.0, v, vig);
        c += (h(vUv * 1000.0 + fract(time)) - 0.5) * grain;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  composer.addPass(grade);

  // ---------------- UI wiring ----------------
  HUD.init();
  IN.init(canvas);
  let playing = false;
  let expectUnlock = false;

  G.read = (id, opts) => openReader(id, opts);
  G.station = (id) => STATIONS[id]?.();
  G.porter = (lines) => {
    HUD.porter(lines);
    Audio.sfx('printer');
  };
  G.say = (who, lines) => HUD.porter(lines, who);
  G.toast = (t, k) => HUD.toast(tx(t), tx(k) || L('Got', '获得'));
  G.sfx = (n, ...a) => Audio.sfx(n, ...a);
  G.note = (t, ms) => HUD.note(tx(t), ms);
  G.timer = (sec) => HUD.timer(sec);
  G.chapter = (k, n, s) => HUD.chapter(k, n, s);
  G.give = (flag, label) => {
    HUD.toast(tx(label), flag.startsWith('tok_') ? L('Token', '铜牌') : L('Got', '获得'));
    Audio.sfx(flag.startsWith('tok_') ? 'token' : 'pickup');
  };
  G.candle = (id) => {
    if (S.addCandle(id)) {
      Audio.sfx('chime');
      HUD.toast(L(`Birthday candle, ${S.data.candles.length} of 5`, `生日蜡烛 ${S.data.candles.length} / 5`), L('Found', '找到'));
    }
  };
  G.camera = camera;
  G.dad = dad;
  G.ctl = ctl;
  G.view = (v) => { ctl.view = v; };

  let escClosing = false;
  Panels.onChange = (open) => {
    if (open) {
      IN.enabled = false;
      HUD.prompt(null);
      if (IN.locked) { expectUnlock = true; IN.unlock(); }
    } else if (playing && !Menu.isOpen) {
      IN.enabled = true;
      // Esc closed it: Chrome won't hand the mouse back on an Esc press (it releases the mouse on
      // Esc), so wait for the next click instead of grabbing it and dropping straight into pause.
      if (escClosing) { escClosing = false; return; }
      IN.lock();
    }
  };
  IN.onDragMode = () => HUD.note(L('This window won’t let the game take over the mouse, so hold the mouse button down and drag to look around instead.', '这个窗口不让游戏接管鼠标，所以请按住鼠标拖动来看四周。'), 6500);
  IN.onLockChange = (locked) => {
    if (locked) {
      HUD.lockHint(false);
      // a lock that arrives late, after a panel or menu opened, is handed straight back
      if (Panels.open || Menu.isOpen || !playing) { expectUnlock = true; IN.unlock(); }
      return;
    }
    if (expectUnlock) { expectUnlock = false; return; }
    if (playing && !Panels.open && !Menu.isOpen) openPause();
  };
  canvas.addEventListener('click', () => {
    Audio.start();
    if (playing && !Panels.open && !Menu.isOpen && !IN.locked) IN.lock();
  });

  function openPause() {
    IN.enabled = false;
    HUD.show(false);
    Menu.pause({
      onResume: resume,
      onJournal: () => { resume(); openJournal(); },
      onHints: () => { resume(); openHints(); },
      onQuit: () => { playing = false; HUD.show(false); showTitle(); },
    });
  }
  Touch.init({
    onUse: () => { if (!playing || Panels.open || Menu.isOpen) return; if (W.tennis?.on) W.tennis.swing(); else if (target) target.use(); },
    onJournal: () => { if (playing && !Panels.open && !Menu.isOpen) openJournal(); },
    onHints: () => { if (playing && !Panels.open && !Menu.isOpen) openHints(); },
    onPause: () => { if (playing && !Panels.open && !Menu.isOpen) openPause(); },
  });
  S.on('settings', () => Touch.relabel());
  function resume() { Menu.close(); HUD.show(true); IN.enabled = true; IN.lock(); }

  addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (Panels.open) { e.preventDefault(); escClosing = true; Panels.closeTop(); escClosing = false; return; }
      if (Menu.isOpen && playing) { e.preventDefault(); resume(); return; }
      if (playing && !IN.locked) { openPause(); return; }
    }
    if (!playing || Menu.isOpen || Panels.open) return;
    if (e.code === 'KeyJ') { e.preventDefault(); openJournal(); }
    if (e.code === 'KeyH') { e.preventDefault(); openHints(); }
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    outline.setSize(innerWidth, innerHeight);
  });

  // ---------------- areas ----------------
  let area = null;
  const areaAt = (x, z) => W.areas.find((a) => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1) || W.areas.find((a) => a.id === 'wild');
  W.ceilAt = (x, z) => { const a = areaAt(x, z); return a?.ceil ?? Infinity; };
  const look = { hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiI: 0.4, keyC: new THREE.Color(), keyI: 0.5, fog: new THREE.Color(), near: 14, far: 40, bg: new THREE.Color(), exp: 1 };
  function applyArea(a, snap) {
    const k = snap ? 1 : 0.035;
    look.hemiSky.lerp(new THREE.Color(a.hemi[0]), k);
    look.hemiGround.lerp(new THREE.Color(a.hemi[1]), k);
    look.hemiI += (a.hemi[2] - look.hemiI) * k;
    look.keyC.lerp(new THREE.Color(a.key[0]), k);
    look.keyI += (a.key[1] - look.keyI) * k;
    look.fog.lerp(new THREE.Color(a.fog[0]), k);
    look.near += (a.fog[1] - look.near) * k;
    look.far += (a.fog[2] - look.far) * k;
    look.bg.lerp(new THREE.Color(a.bg), k);
    look.exp += ((a.exposure ?? 1) - look.exp) * k;
    hemi.color.copy(look.hemiSky); hemi.groundColor.copy(look.hemiGround); hemi.intensity = look.hemiI;
    key.color.copy(look.keyC); key.intensity = look.keyI;
    scene.fog.color.copy(look.fog); scene.fog.near = look.near; scene.fog.far = look.far;
    scene.background.copy(look.bg);
    renderer.toneMappingExposure = look.exp;
    // sky visibility is handled by showRoomsAround
  }
  function enterArea(a) {
    area = a;
    Audio.area(a.amb);
    if (a.anchor !== false) S.setAnchor(a.id);
    if (a.id === 'clearing') S.set('in_clearing');
    if (playing && !S.data.seenAreas.includes(a.id) && a.chapter) {
      S.data.seenAreas.push(a.id);
      S.save();
      HUD.chapter(tx(a.chapter[0]), tx(a.name), tx(a.chapter[1]));
    }
    (W.onAreaHooks || []).forEach((f) => f(a.id));
    showRoomsAround(a.id);
  }

  // ---------------- interaction ----------------
  W.playerPos = ctl.pos;
  W.inWild = () => area?.id === 'wild';
  let target = null;
  const tmpV = new THREE.Vector3();
  let goalMark = null;
  // Rooms are sealed: nothing in one room can be picked from the room next door.
  const OPEN = new Set(['wild', 'clearing']);
  const itemArea = (it) => (it._area === undefined ? (it._area = areaAt(it.p.x, it.p.z)?.id ?? null) : it._area);
  function pickTarget() {
    let best = null, bestScore = Infinity;
    let fallback = null;
    for (const it of W.items) {
      if (!it.when()) continue;
      if (it.always) { fallback = it; continue; }
      const ia = itemArea(it);
      if (area && ia && ia !== area.id && !OPEN.has(ia) && !OPEN.has(area.id)) continue;
      const dx = it.p.x - ctl.pos.x, dz = it.p.z - ctl.pos.z;
      const flat = Math.hypot(dx, dz);
      if (flat > it.reach) continue;
      if (Math.abs(it.p.y - (ctl.pos.y + 1)) > 2.2) continue;
      tmpV.copy(it.p).sub(camera.position).normalize();
      const ang = Math.acos(THREE.MathUtils.clamp(tmpV.dot(ctl.lookDir), -1, 1));
      const allow = it.allow ?? (flat < 1.1 ? 0.75 : 0.42);
      if (ang > allow) continue;
      // The thing the objective points at wins over anything sitting next to it.
      const score = ang + flat * 0.06 - ((it.mark ?? it.id) === goalMark ? 0.35 : 0) - (typeof it.prio === 'function' ? it.prio() : it.prio || 0);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best || fallback;
  }

  function setOutline(obj) {
    outline.selectedObjects = obj ? [obj] : [];
  }

  // ---------------- lights ----------------
  // Lights are handed to a fixed pool of real PointLights. Slots fade out before they are
  // reused and fade in after, so nothing pops while Dad walks around.
  let slots = pool.slice(0, Q.pool).map((pl) => ({ pl, l: null, w: 0 }));
  pool.forEach((pl, i) => (pl.visible = i < Q.pool));

  function applyQuality(name) {
    if (!QUALITY[name] || name === qName) return;
    qName = name; Q = QUALITY[name];
    renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));
    composer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    for (const r of [composer.renderTarget1, composer.renderTarget2]) { r.samples = Q.samples; r.dispose(); }
    bloom.enabled = Q.bloom;
    key.shadow.mapSize.set(Q.shadow, Q.shadow);
    if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    pool.forEach((pl, i) => (pl.visible = i < Q.pool));
    slots = pool.slice(0, Q.pool).map((pl) => ({ pl, l: null, w: 0 }));
    W.snapLights = true;
  }
  S.on('settings', () => { if (S.settings.quality !== 'auto') applyQuality(S.settings.quality); });
  // Auto: watch the frame rate while playing and step down if it stays low.
  const perf = { t: 0, n: 0, settle: 3 };
  function watchPerf(dt) {
    if (S.settings.quality !== 'auto' || !playing || Panels.open) { perf.t = 0; perf.n = 0; return; }
    perf.t += dt; perf.n++;
    if (perf.t < 4) return;
    const fps = perf.n / perf.t;
    perf.t = 0; perf.n = 0;
    if (perf.settle > 0) { perf.settle--; return; }
    if (fps < 42 && qName !== 'fast') { applyQuality(qName === 'pretty' ? 'balanced' : 'fast'); perf.settle = 2; }
    else if (fps > 58 && qName === 'balanced' && devicePixelRatio <= 1) { /* already sharp enough on a 1x screen */ }
  }
  function updateLights(dt) {
    const p = W.lightFocus || ctl.pos;
    for (const l of W.vlights) {
      const t = l.on() ? 1 : 0;
      l.k += (t - l.k) * Math.min(1, dt * 2.5);
    }
    const wanted = W.vlights
      .filter((l) => l.k > 0.01)
      .map((l) => ({ l, d: l.pos.distanceTo(p) - l.dist }))
      .filter((x) => x.d < 8)
      .sort((a, b) => a.d - b.d)
      .slice(0, POOL)
      .map((x) => x.l);
    const want = new Set(wanted);
    const fade = Math.min(1, dt * 4);
    for (const s of slots) {
      if (s.l && !want.has(s.l)) s.w = Math.max(0, s.w - fade);
      else if (s.l) s.w = Math.min(1, s.w + fade);
      if (s.l && s.w === 0 && !want.has(s.l)) s.l = null;
    }
    const held = new Set(slots.map((s) => s.l).filter(Boolean));
    for (const l of wanted) {
      if (held.has(l)) continue;
      const free = slots.find((s) => !s.l);
      if (!free) break;
      free.l = l; free.w = W.snapLights ? 1 : 0;
      held.add(l);
    }
    W.snapLights = false;
    slots.forEach((s, i) => {
      const pl = s.pl;
      if (!s.l) { pl.intensity = 0; return; }
      const l = s.l;
      pl.position.copy(l.pos);
      pl.color.copy(l.color);
      const fl = l.flicker ? 1 + Math.sin(clock.elapsedTime * 13 + i) * l.flicker * 0.5 + Math.sin(clock.elapsedTime * 7.3) * l.flicker * 0.5 : 1;
      pl.intensity = l.intensity * l.k * fl * s.w;
      pl.distance = l.dist;
    });
  }

  // Keep the shadow camera on whole shadow-map texels so edges don't crawl.
  const lightOffset = new THREE.Vector3(3, 9, 4);
  const lightBasis = new THREE.Matrix4().lookAt(lightOffset, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  const lightBasisInv = lightBasis.clone().invert();
  const texel = (key.shadow.camera.right - key.shadow.camera.left) / key.shadow.mapSize.x;
  const snapV = new THREE.Vector3();
  function placeKey(fp) {
    snapV.copy(fp).applyMatrix4(lightBasisInv);
    snapV.x = Math.round(snapV.x / texel) * texel;
    snapV.y = Math.round(snapV.y / texel) * texel;
    snapV.applyMatrix4(lightBasis);
    key.target.position.copy(snapV);
    key.position.copy(snapV).add(lightOffset);
  }

  // ---------------- loop ----------------
  const clock = new THREE.Clock();
  let objText = '';
  let titleT = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    watchPerf(dt);
    for (const r of W.reactives) r(dt, false);
    for (const f of W.tick) f(dt, t);

    if (playing) {
      ctl.update(dt);
      const a = areaAt(ctl.pos.x, ctl.pos.z);
      if (a && a !== area) enterArea(a);
      if (area) applyArea(area, false);
      // interaction
      const canAct = IN.enabled && !Panels.open && !Menu.isOpen && !ctl.frozen;
      const o = objective();
      goalMark = o.mark;
      const tennis = W.tennis?.on;
      target = canAct && !tennis ? pickTarget() : null;
      HUD.prompt(target ? (typeof target.label === 'function' ? target.label() : target.label) : null);
      HUD.hand(ctl.handCentered);
      setOutline(target?.obj || null);
      if (target && (IN.hit('KeyE') || IN.hit('Click') || IN.hit('Enter'))) {
        Audio.start();
        target.use();
      }
      if (tennis && canAct && (IN.hit('KeyE') || IN.hit('Click') || IN.hit('Enter'))) W.tennis.swing();
      HUD.lockHint(!IN.touch && !IN.drag && !IN.locked && !Panels.open && !Menu.isOpen);
      Touch.update(canAct, tennis ? L('Swing', '挥拍') : target ? (typeof target.label === 'function' ? target.label() : target.label) : null);
      // objective + compass
      if (o.text !== objText) {
        HUD.objective(tx(area?.name), o.text, !!objText);
        objText = o.text;
      } else HUD.objective(tx(area?.name), o.text, false);
      let mYaw = null, mDist = null;
      const m = o.mark && W.marks[o.mark];
      if (m) {
        const dx = m.x - ctl.pos.x, dz = m.z - ctl.pos.z;
        mYaw = Math.atan2(-dx, -dz);
        mDist = Math.hypot(dx, dz);
        if (mDist < 1.2) mYaw = null;
      }
      const camYaw = Math.atan2(-ctl.lookDir.x, -ctl.lookDir.z);
      HUD.drawCompass(camYaw, mYaw, mDist);
      // A small marker over the next thing to use, when it's in the same room and not already aimed at.
      let gx = null, gy = null;
      if (m && canAct && mDist < 14 && areaAt(m.x, m.z) === area && (target?.mark ?? target?.id) !== o.mark) {
        tmpV.set(m.x, m.y + 0.32, m.z).project(camera);
        if (tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1) { gx = (tmpV.x * 0.5 + 0.5) * innerWidth; gy = (0.5 - tmpV.y * 0.5) * innerHeight; }
      }
      HUD.goal(gx, gy);
      dad.setLanyard(S.data.flags);
    } else {
      // title drift
      titleT += dt;
      const a = W.areas.find((x) => x.id === 'study');
      applyArea(a, true);
      camera.position.set(-1.6 + Math.sin(titleT * 0.07) * 0.6, 1.55 + Math.sin(titleT * 0.11) * 0.05, -1.2);
      camera.lookAt(0.4 + Math.sin(titleT * 0.05) * 0.3, 0.95, -4.6);
      if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
      dad.root.visible = false;
      setOutline(null);
      Touch.update(false, null);
    }

    // key light follows the player
    placeKey(playing ? ctl.pos : new THREE.Vector3(0, 0, -4));
    updateLights(dt);
    if (playing) {
      fill.position.copy(camera.position).add(new THREE.Vector3(0, 0.6, 0));
      fill.intensity = (area?.fill ?? 1.6) * (1 - ctl.viewBlend);
    } else fill.intensity = 0;
    grade.uniforms.time.value = t;
    composer.render(dt);
    IN.endFrame();
  }

  function startPlay(fresh) {
    if (fresh) { S.reset(); }
    S.data.started = true;
    S.save();
    for (const r of W.reactives) r(0, true);
    for (const l of W.vlights) l.k = l.on() ? 1 : 0;
    W.snapLights = true;
    const anchor = W.anchors[S.data.anchor] || W.anchors.study;
    ctl.place(anchor.x, anchor.z, anchor.yaw);
    area = null;
    playing = true;
    dad.root.visible = true;
    HUD.show(true);
    HUD.renderLanyard();
    HUD.renderKeys();
    const a = areaAt(anchor.x, anchor.z);
    applyArea(a, true);
    enterArea(a);
    objText = '';
    IN.enabled = true;
    IN.lock();
    Audio.start();
    Audio.applySettings();
    if (fresh) {
      HUD.chapter(L('The beginning', '序章'), L('The study', '书房'), L('A birthday house that Joy built for Dad.', '一座 Joy 给爸爸搭的生日小屋。'));
      S.data.seenAreas.push('study');
      S.save();
      setTimeout(() => HUD.note(KT(L('Use W A S D to walk and the mouse to look around. Press E to pick things up and read them.', '用 W A S D 走路，移动鼠标看四周。按 E 拿起东西、阅读。'), L('Drag on the left side to walk and on the right side to look around. Tap Use to pick things up and read them.', '在左边拖动来走路，在右边拖动来看四周。点"使用"来拿起东西、阅读。')), 8000), 5200);
    } else {
      HUD.note(KT(L('Welcome back. Press J for your journal, or H for a hint.', '欢迎回来。按 J 打开日记本，按 H 看提示。'), L('Welcome back. Your journal and hints are in the top right corner.', '欢迎回来。日记本和提示在右上角。')), 5000);
    }
  }

  function showTitle() {
    playing = false;
    HUD.show(false);
    IN.unlock();
    Menu.title({ onBegin: () => startPlay(true), onContinue: () => startPlay(false), onRoom: startAt });
  }

  // The room shortcut, unlocked by finishing the game once. Everything before the chosen room
  // is filled in as if it had been played.
  const BEFORE = {
    study: [[], []],
    trading: [['read_L1', 'L1_back', 'bell_rung', 'study_drawer', 'photo_back', 'batteries', 'radio_batt', 'radio_ok', 'badge', 'study_door'], ['L1', 'R_badge', 'photo', 'drawernote', 'radiomsg']],
    lab: [['read_L2', 'sell_NVDA', 'sell_TQQQ', 'sell_BTC', 'sell_VONG', 'fern_ok', 'drawer_open', 'tok_bell', 'labcard', 'lab_door'], ['L2', 'R_trade']],
    court: [['read_L3', 'hatch_open', 'piece_rook', 'piece_queen', 'piece_knight', 'chess_rook', 'chess_queen', 'chess_knight', 'deadlock_ok', 'robot_ok', 'tok_chip', 'rack_open'], ['L3', 'robotcard']],
    kitchen: [['read_L4', 'court_lit', 'racket_got', 'rally_ok', 'tok_racket', 'kitchenkey', 'kitchen_door'], ['L4', 'guesttag']],
    wild: [['read_L5', 'prep_ok', 'service_ok', 'tok_ladle', 'oven_light', 'bowl2', 'tray_set', 'out_door'], ['L5', 'recipe', 'pantry', 'window', 'serviceboard']],
  };
  const ORDER = ['study', 'trading', 'lab', 'court', 'kitchen', 'wild'];
  function startAt(room) {
    S.reset();
    for (const r of ORDER.slice(0, ORDER.indexOf(room) + 1)) {
      const [flags, letters] = BEFORE[r];
      flags.forEach((f) => (S.data.flags[f] = true));
      letters.forEach((id) => S.data.journal.includes(id) || S.data.journal.push(id));
      if (r !== room) S.data.seenAreas.push(r);
    }
    S.data.anchor = room;
    S.save();
    startPlay(false);
    // screens that only redraw when their flag arrives
    ['prep_ok', 'service_ok', 'fern_ok', 'rally_ok', 'deadlock_ok'].forEach((f) => S.has(f) && S.emit('flag', f));
  }

  W.onFlag = null;
  S.on('flag', (f) => {
    W.onFlag?.(f);
    if (f === 'read_L7') { try { localStorage.setItem('party-of-three/finished', '1'); } catch { /* private window */ } }
    if (f === 'read_L1') setTimeout(() => HUD.note(KT(L('Press J to open your journal. Everything you read is kept there.', '按 J 打开日记本。读过的东西都会存在里面。'), L('Everything you read is kept in your journal, in the top right corner.', '读过的东西都存在日记本里，在右上角。')), 5000), 400);
  });
  G.ending = ending;
  G.cake = lightCake;
  G.resumePlay = () => { playing = true; HUD.show(true); IN.enabled = true; IN.lock(); };
  G.toTitle = showTitle;

  window.__game = { ctl, S, W, G, camera, scene, renderer, startPlay: (f) => { Menu.close(); startPlay(f); }, Panels, IN, Menu };
  $('loading').classList.add('done');
  showTitle();
  frame();
}

boot().catch((err) => {
  console.error(err);
  const l = $('loading');
  l.classList.remove('done');
  l.innerHTML = `<div style="text-align:center;max-width:460px;line-height:1.5"><div>The house didn’t load. ${String(err.message || err).replace(/</g, '&lt;')}</div><button class="btn" onclick="location.reload()">Try again</button></div>`;
});
