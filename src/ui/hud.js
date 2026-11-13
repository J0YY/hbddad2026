import { S } from '../core/state.js';
import { glyphSVG } from './icons.js';
import { esc } from './panels.js';
import { L, KT } from '../game/i18n.js';

const $ = (id) => document.getElementById(id);

export const HUD = {
  init() {
    this.el = $('hud');
    this.compass = $('compass').getContext('2d');
    this.renderLanyard();
    S.on('flag', (f) => { if (f.startsWith('tok_') || f === 'badge') this.renderLanyard(f); this.renderKeys(); });
    S.on('settings', () => { this.renderKeys(); this._sig = ''; });
    this.renderKeys();
  },
  show(on) { this.el.hidden = !on; },

  objective(area, text, flash) {
    const o = $('objective');
    const ar = o.querySelector('.area');
    if (ar.textContent !== (area || '')) ar.textContent = area || '';
    const t = o.querySelector('.text');
    if (t.textContent !== text) {
      t.textContent = text;
      if (flash) { o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); }
    }
  },

  prompt(label) {
    const p = $('prompt');
    const r = $('reticle');
    if (label) {
      if (p.dataset.l !== label) { p.innerHTML = `<span class="key">E</span><span>${esc(label)}</span>`; p.dataset.l = label; }
      p.classList.add('on'); r.classList.add('on');
    } else { p.classList.remove('on'); r.classList.remove('on'); p.dataset.l = ''; }
  },

  // countdown shown under the compass (seconds, or null to hide)
  timer(sec) {
    const el = this._t || (this._t = $('timer'));
    if (sec == null) { if (this._tOn) { el.classList.remove('on'); this._tOn = false; } return; }
    if (!this._tOn) { el.classList.add('on'); this._tOn = true; }
    const txt = `0:${String(Math.ceil(sec)).padStart(2, '0')}`.replace('0:60', '1:00');
    if (el.textContent !== txt) { el.textContent = txt; el.classList.toggle('low', sec <= 10); }
  },

  // when Dad's hand is in the middle of the screen it does the job of the dot
  hand(on) { if (this._hand !== on) { this._hand = on; $('reticle').classList.toggle('hand', !!on); } },

  goal(x, y) {
    const g = this._g || (this._g = $('goal'));
    if (x == null) { if (this._gOn) { g.classList.remove('on'); this._gOn = false; } return; }
    if (!this._gOn) { g.classList.add('on'); this._gOn = true; }
    g.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  },

  lockHint(on) { if (this._lh !== on) { this._lh = on; $('lockhint').classList.toggle('on', on); } },

  _noteT: 0,
  note(text, ms = 4200) {
    const n = $('note');
    n.textContent = text;
    n.classList.add('on');
    clearTimeout(this._noteT);
    this._noteT = setTimeout(() => n.classList.remove('on'), ms);
  },

  // Captions: queue of [text, ms]
  _capQ: [],
  _capBusy: false,
  porter(lines, speaker = 'Porter') {
    for (const l of lines) this._capQ.push([...(Array.isArray(l) ? l : [l, 3000]), speaker]);
    if (!this._capBusy) this._nextCap();
  },
  _nextCap() {
    const c = $('captions');
    const next = this._capQ.shift();
    if (!next) { c.innerHTML = ''; this._capBusy = false; return; }
    this._capBusy = true;
    const [text, ms, who] = next;
    c.innerHTML = `<span class="cap"><b>${esc(who)}</b>${esc(text)}</span>`;
    this.onCaption?.(who);
    setTimeout(() => this._nextCap(), ms * (S.settings.text > 1 ? 1.2 : 1));
  },
  clearCaptions() { this._capQ = []; },

  toast(text, kind = 'Added') {
    const t = document.createElement('div');
    t.className = 't';
    t.innerHTML = `<small>${esc(kind)}</small><span>${esc(text)}</span>`;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4300);
  },

  chapter(kicker, name, sub) {
    const c = $('chapter');
    c.innerHTML = `<div class="k">${esc(kicker)}</div><div class="rule"></div><div class="n">${esc(name)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}`;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
  },

  renderLanyard(newFlag) {
    const l = $('lanyard');
    const toks = ['bell', 'chip', 'racket', 'ladle', 'star'];
    l.innerHTML = (S.has('badge') ? '<div class="badge" title="Guest badge"><b>GUEST</b></div>' : '') +
      toks.map((k) => `<div class="slot ${S.has('tok_' + k) ? 'got' : ''} ${newFlag === 'tok_' + k ? 'new' : ''}" title="${k}">${glyphSVG(k, S.has('tok_' + k) ? '#3a2a12' : '#ece6d9')}</div>`).join('');
  },
  renderKeys() {
    const items = [];
    if (S.has('labcard') && !S.has('lab_door')) items.push(L('Key card', '门卡'));
    if (S.has('kitchenkey') && !S.has('kitchen_door')) items.push(L('Kitchen key', '厨房钥匙'));
    if (S.has('bowl2') && !S.has('tray_set')) items.push(L('Two bowls', '两个碗'));
    if (S.has('map')) items.push(KT(L('Joy’s map (press J)', 'Joy 的地图（按 J）'), L('Joy’s map (in your journal)', 'Joy 的地图（在日记本里）')));
    if (S.has('lens') && !S.has('scope_ok')) items.push(L('Star lens', '星图镜片'));
    $('keys').innerHTML = items.map((i) => `<div>${esc(i)}</div>`).join('');
  },

  // Compass strip: heading ticks and the objective marker.
  drawCompass(yaw, markerYaw, markerDist) {
    const sig = `${yaw.toFixed(3)}|${markerYaw == null ? '-' : markerYaw.toFixed(3)}|${markerDist == null ? '-' : Math.round(markerDist)}|${this.lang || ''}`;
    if (sig === this._sig) return;
    this._sig = sig;
    const g = this.compass;
    const W = g.canvas.width, H = g.canvas.height;
    g.clearRect(0, 0, W, H);
    const pxPerRad = W / (Math.PI * 0.95);
    const cx = W / 2;
    const fadeEdge = (x) => Math.max(0, Math.min(1, Math.min(x, W - x) / 80));
    g.save();
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,0.8)';
    g.shadowBlur = 3;
    for (let d = 0; d < 360; d += 15) {
      const a = (d * Math.PI) / 180; // compass degrees clockwise from north
      // heading yaw for that compass direction: north = 0, east = -pi/2
      let rel = -a - yaw;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const x = cx - rel * pxPerRad;
      if (x < 0 || x > W) continue;
      g.globalAlpha = fadeEdge(x);
      const major = d % 90 === 0;
      g.fillStyle = '#ece6d9';
      if (major) {
        g.font = '700 17px "Sofia Sans Semi Condensed", sans-serif';
        g.fillText('NESW'[d / 90], x, 22);
      } else if (d % 45 === 0) {
        g.font = '600 12px "Sofia Sans Semi Condensed", sans-serif';
        g.fillStyle = '#b9b2a3';
        g.fillText(['NE', 'SE', 'SW', 'NW'][(d - 45) / 90], x, 21);
      } else {
        g.fillRect(x - 0.5, 12, 1, 7);
      }
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(236,230,217,0.5)';
    g.fillRect(cx - 0.5, 30, 1, 8);
    if (markerYaw != null) {
      let rel = markerYaw - yaw;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      let x = cx - rel * pxPerRad;
      const clamped = x < 14 || x > W - 14;
      x = Math.max(14, Math.min(W - 14, x));
      g.fillStyle = '#c9a25b';
      g.beginPath();
      g.moveTo(x, 28); g.lineTo(x + 6, 35); g.lineTo(x, 42); g.lineTo(x - 6, 35); g.closePath();
      g.fill();
      if (!clamped && markerDist != null) {
        g.font = '600 12px "Sofia Sans Semi Condensed", sans-serif';
        g.fillStyle = '#c9a25b';
        g.fillText(`${Math.round(markerDist)} m`, x, 9);
      }
    }
    g.restore();
  },
};
