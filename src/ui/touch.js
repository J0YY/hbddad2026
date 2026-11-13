// On-screen controls for phones and tablets.
// Left side: put a thumb down anywhere and drag to walk (push all the way to walk faster).
// Right side: drag to look around, tap to use what's in front of you.
import { IN } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { L } from '../game/i18n.js';
import { esc } from './panels.js';

const ICON = {
  journal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z M6 3v18 M9 8h6 M9 11h6" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14 M16 5v14" stroke="currentColor" stroke-width="2.4"/></svg>',
};

export const Touch = {
  on: false,
  init({ onUse, onJournal, onHints, onPause }) {
    if (!IN.touch) return;
    this.on = true;
    document.body.classList.add('touch');
    const el = document.createElement('div');
    el.id = 'touch';
    el.innerHTML = `
      <div class="zone walk"></div><div class="zone look"></div>
      <div class="stick"><i></i></div>
      <div class="tbtns">
        <button data-b="journal">${ICON.journal}<span></span></button>
        <button data-b="hint">${ICON.hint}<span></span></button>
        <button data-b="pause">${ICON.pause}<span></span></button>
      </div>
      <div class="moves">
        <button data-b="crouch"><span></span></button>
        <button data-b="jump"><span></span></button>
      </div>
      <button class="use" hidden></button>`;
    document.body.appendChild(el);
    this.el = el;
    this.useBtn = el.querySelector('.use');
    const stick = el.querySelector('.stick'), knob = stick.querySelector('i');
    const R = 56;
    let walkId = null, ox = 0, oy = 0;
    let lookId = null, lx = 0, ly = 0, lt = 0, moved = 0;

    const walkZone = el.querySelector('.walk'), lookZone = el.querySelector('.look');
    walkZone.addEventListener('pointerdown', (e) => {
      Audio.start();
      if (walkId !== null) return;
      walkId = e.pointerId; ox = e.clientX; oy = e.clientY;
      try { walkZone.setPointerCapture(e.pointerId); } catch { /* fine without capture */ }
      stick.style.transform = `translate(${ox}px, ${oy}px)`;
      knob.style.transform = '';
      stick.classList.add('on');
    });
    walkZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== walkId) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const k = Math.min(1, d / R);
      // a small dead zone so a resting thumb doesn't creep
      const m = k < 0.15 ? 0 : (k - 0.15) / 0.85;
      IN.joy.x = d ? (dx / (Math.min(d, R))) * m : 0;
      IN.joy.y = d ? (dy / (Math.min(d, R))) * m : 0;
    });
    const endWalk = (e) => {
      if (e.pointerId !== walkId) return;
      walkId = null; IN.joy.x = 0; IN.joy.y = 0;
      stick.classList.remove('on');
    };
    walkZone.addEventListener('pointerup', endWalk);
    walkZone.addEventListener('pointercancel', endWalk);

    lookZone.addEventListener('pointerdown', (e) => {
      Audio.start();
      if (lookId !== null) return;
      lookId = e.pointerId; lx = e.clientX; ly = e.clientY; lt = performance.now(); moved = 0;
      try { lookZone.setPointerCapture(e.pointerId); } catch { /* fine without capture */ }
    });
    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      IN.dx += dx * 1.8;
      IN.dy += dy * 1.8;
    });
    const endLook = (e) => {
      if (e.pointerId !== lookId) return;
      lookId = null;
      // a quick tap uses whatever is in front of you
      if (e.type === 'pointerup' && moved < 12 && performance.now() - lt < 300) IN.pressed.add('Click');
    };
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);

    this.useBtn.addEventListener('click', () => { Audio.start(); onUse(); });
    el.querySelector('[data-b="journal"]').onclick = onJournal;
    el.querySelector('[data-b="hint"]').onclick = onHints;
    el.querySelector('[data-b="pause"]').onclick = onPause;
    el.querySelector('[data-b="jump"]').addEventListener('pointerdown', (e) => { e.preventDefault(); IN.pressed.add('TouchJump'); });
    el.querySelector('[data-b="crouch"]').addEventListener('pointerdown', (e) => { e.preventDefault(); IN.pressed.add('TouchCrouch'); });
    this.relabel();
  },
  relabel() {
    if (!this.on) return;
    const t = { journal: L('Journal', '日记本'), hint: L('Hint', '提示'), pause: L('Menu', '菜单'), jump: L('Jump', '跳'), crouch: L('Crouch', '蹲下') };
    for (const [k, v] of Object.entries(t)) { const b = this.el.querySelector(`[data-b="${k}"]`); b.querySelector('span').textContent = v; b.setAttribute('aria-label', v); }
  },
  // Called every frame: show the controls only while walking around.
  update(active, label) {
    if (!this.on) return;
    if (this._active !== active) {
      this._active = active;
      this.el.classList.toggle('off', !active);
      if (!active) { IN.joy.x = 0; IN.joy.y = 0; }
    }
    const l = active && label ? label : '';
    if (this._label !== l) {
      this._label = l;
      this.useBtn.hidden = !l;
      this.useBtn.innerHTML = l ? `<b>${esc(L('Use', '使用'))}</b><span>${esc(l)}</span>` : '';
    }
  },
};
