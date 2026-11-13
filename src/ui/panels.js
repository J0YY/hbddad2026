import { S } from '../core/state.js';
import { IN } from '../core/input.js';
import { ENTRIES, TOKENS, PENCIL, PENCIL_BY, HINTS, CANDLES } from '../game/content.js';
import { HINT_TITLES, objective } from '../game/objectives.js';
import { G } from '../game/api.js';
import { glyphSVG } from './icons.js';
import { L } from '../game/i18n.js';

const root = () => document.getElementById('panels');
export const isSmall = () => innerWidth < 760 || innerHeight < 520;
const markSmall = () => document.body.classList.toggle('small', isSmall());
addEventListener('resize', markSmall);
if (document.body) markSmall(); else addEventListener('DOMContentLoaded', markSmall);
const stack = [];

export const Panels = {
  get open() { return stack.length > 0; },
  onChange: null,

  // Opens a panel. build(el, close) fills it. Returns close().
  show({ cls = '', build, onClose, scrim = true, label = 'Panel' }) {
    const wrap = document.createElement('div');
    if (scrim) {
      const s = document.createElement('div');
      s.className = 'scrim';
      s.addEventListener('mousedown', (e) => { if (e.target === s) close(); });
      wrap.appendChild(s);
    }
    const el = document.createElement('div');
    el.className = 'panel ' + cls;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', label);
    el.setAttribute('aria-modal', 'true');
    wrap.appendChild(el);
    root().appendChild(wrap);
    const prevFocus = document.activeElement;
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      wrap.remove();
      onClose?.();
      entry.cleanup?.();
      entry.unfit?.();
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch { /* */ }
      Panels.onChange?.(stack.length > 0);
    }
    const entry = { close, el, cleanup: null };
    stack.push(entry);
    Panels.onChange?.(true);
    const ret = build(el, close, entry);
    // Scale the panel down (never up) so it fits the window; scroll only as a last resort.
    const fit = () => {
      // On phones the panel becomes a full-screen sheet that scrolls, instead of shrinking the text.
      if (isSmall()) { el.style.setProperty('--fit', '1'); return; }
      const availH = innerHeight - 24, availW = innerWidth - 16;
      const h = el.scrollHeight, w = el.scrollWidth;
      const s = Math.max(0.6, Math.min(1, availH / (h + 6), availW / (w + 6)));
      el.style.setProperty('--fit', s.toFixed(3));
    };
    fit();
    // re-fit when anything inside changes size (late fonts, redraws, new content)
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    const watchKids = () => { for (const c of el.children) ro.observe(c); };
    watchKids();
    const mo = new MutationObserver(() => { watchKids(); fit(); });
    mo.observe(el, { childList: true });
    document.fonts?.ready.then(fit);
    addEventListener('resize', fit);
    entry.unfit = () => { ro.disconnect(); mo.disconnect(); removeEventListener('resize', fit); };
    setTimeout(() => {
      // on touch screens, don't focus a text box: it would pop up the keyboard straight away
      const f = IN.touch ? el.querySelector('button') : el.querySelector('[autofocus]') || el.querySelector('button, input, select');
      f?.focus({ preventScroll: true });
    }, 30);
    return ret ?? close;
  },
  closeTop() { const e = stack[stack.length - 1]; if (e) e.close(); },
  closeAll() { while (stack.length) stack[stack.length - 1].close(); },
};

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export const bellSketch = `<svg viewBox="0 0 160 120" fill="none" stroke="#2e5a9c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
<path d="M38 88 C40 52 58 36 80 35 C102 36 120 52 122 88"/><path d="M26 90 C60 86 100 86 134 90 L134 96 C100 93 60 93 26 96 Z"/><path d="M80 35 L80 24"/><circle cx="80" cy="20" r="5"/><path d="M58 56 C62 48 68 44 74 42" opacity=".6"/><path d="M140 40 l8 -6 M142 52 l10 -1 M138 28 l4 -9" opacity=".7"/></svg>`;

// Render a journal entry as paper (no controls).
export function renderEntry(id, { side = 'front' } = {}) {
  const e = ENTRIES[id];
  if (!e) return `<div class="paper doc">${L('Missing page.', '这一页不见了。')}</div>`;
  if (e.kind === 'letter') {
    const yan = e.author === 'yan';
    const ps = e.ps ? `<p class="ps">${esc(e.ps)}</p>` : '';
    if (side === 'back' && e.back) {
      return `<div class="paper letter"><span class="corner"></span><div class="back"><div>${bellSketch}<p style="margin-top:14px">${esc(e.back)}</p>${ps}</div></div></div>`;
    }
    const paras = e.body.map((p) => `<p>${esc(p)}</p>`).join('');
    const pyan = e.pencil && PENCIL_BY[e.pencil] === 'yan';
    const pencil = e.pencil ? `<div class="pencil ${pyan ? 'yan' : ''}"><small>${pyan ? L('Green ink, in the margin', '页边的绿墨水字') : L('Blue pencil, in the margin', '页边的蓝铅笔字')}</small>${esc(PENCIL[e.pencil])}</div>` : '';
    // the to-do list goes just above the signature
    const todo = e.todo ? `<div class="todo"><b>${L('What to do', '要做的事')}</b><ol>${e.todo.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>` : '';
    const sign = e.todo ? `<p>${esc(e.body[e.body.length - 1])}</p>` : '';
    const main = e.todo ? e.body.slice(0, -1).map((p) => `<p>${esc(p)}</p>`).join('') : paras;
    return `<div class="paper letter ${yan ? 'by-yan' : ''}"><span class="corner"></span>${main}${todo}${sign}${pencil}${e.back ? '' : ps}</div>`;
  }
  if (e.kind === 'photo') {
    if (side === 'back') return `<div class="paper letter photo-back">${e.back.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
    return `<figure class="photo-print"><img src="${e.img}" alt="${esc(e.caption)}"><figcaption>${esc(e.caption)}</figcaption></figure>`;
  }
  if (e.kind === 'receipt') return `<div class="paper receipt">${e.lines.map(esc).join('\n')}</div>`;
  const map = e.map ? mapSVG(G.mapYou?.()) : '';
  return `<div class="paper doc ${e.blue ? 'blue' : ''}"><h3>${esc(e.title)}</h3><div class="where">${esc(e.where)}</div>${map}${e.html}</div>`;
}

// The north-up field map, with landmarks and the player's position.
export function mapSVG(you) {
  const s = 40, o = 30;
  const X = (x) => o + x * s, Y = (y) => o + (7 - y) * s;
  let grid = '';
  for (let i = 0; i <= 7; i++) {
    grid += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(7)}"/><line x1="${X(0)}" y1="${Y(i)}" x2="${X(7)}" y2="${Y(i)}"/>`;
    grid += `<text x="${X(i)}" y="${Y(0) + 18}" text-anchor="middle">${i}</text><text x="${X(0) - 12}" y="${Y(i) + 4}" text-anchor="end">${i}</text>`;
  }
  const pin = (x, y, l, name) => `<g><circle cx="${X(x)}" cy="${Y(y)}" r="10" fill="#2f5d4a"/><text x="${X(x)}" y="${Y(y) + 4}" text-anchor="middle" fill="#f2ecdf" font-weight="700">${l}</text><text x="${X(x) + 15}" y="${Y(y) - 10}" fill="#2b2620" font-size="12">${name}</text></g>`;
  const pins = [].map(([x, y]) => `<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="none" stroke="#c0583f" stroke-width="2"/>`).join('');
  const me = you ? `<g transform="translate(${X(you.x)},${Y(you.y)}) rotate(${you.deg})"><path d="M0 -11 L7 8 L0 4 L-7 8 Z" fill="#2e5a9c"/></g>` : '';
  const xm = S.has('read_pine') && !S.has('beacon_found') ? `<g stroke="#c0392b" stroke-width="4" stroke-linecap="round"><line x1="${X(4) - 9}" y1="${Y(4) - 9}" x2="${X(4) + 9}" y2="${Y(4) + 9}"/><line x1="${X(4) + 9}" y1="${Y(4) - 9}" x2="${X(4) - 9}" y2="${Y(4) + 9}"/></g><text x="${X(4) + 14}" y="${Y(4) - 10}" fill="#c0392b" font-size="12" font-weight="700">${L('Dig here', '挖这里')}</text>` : '';
  const lake = `<ellipse cx="${X(3.5)}" cy="${Y(-1.4)}" rx="${2.2 * s}" ry="${1.5 * s}" fill="#9fb5b9" opacity=".55"/>`;
  return `<svg class="fieldmap" viewBox="0 0 ${o * 2 + 7 * s + 60} ${o * 2 + 7 * s}" style="width:100%;max-width:420px;display:block;margin:0 auto 14px;font-family:var(--hud);font-size:12px">
    <defs><clipPath id="mc"><rect x="${X(0)}" y="${Y(7)}" width="${7 * s}" height="${7 * s}"/></clipPath></defs>
    <g clip-path="url(#mc)">${lake}</g>
    <g stroke="#2b2620" stroke-opacity=".22" fill="#6b6355">${grid}</g>
    ${pin(1, 4, 'P', L('Split pine', '分叉松树'))}${pins}${xm}${me}
    <g transform="translate(${X(7) + 34},${Y(7) + 4})"><path d="M0 18 L0 -6 M-5 0 L0 -8 L5 0" stroke="#2b2620" stroke-width="1.6" fill="none"/><text x="0" y="32" text-anchor="middle" font-weight="700">${L('N', '北')}</text></g>
    <text x="${X(7) + 34}" y="${Y(0)}" text-anchor="middle" font-size="11" fill="#6b6355">${L('1 square', '1 格')}</text><text x="${X(7) + 34}" y="${Y(0) + 13}" text-anchor="middle" font-size="11" fill="#6b6355">= ${L('4 m', '4 米')}</text>
  </svg>`;
}

// Read a letter/doc/receipt. Adds it to the journal.
export function openReader(id, { onClose, onBack } = {}) {
  const e = ENTRIES[id];
  S.addJournal(id);
  G.sfx(e.kind === 'receipt' ? 'tear' : 'paper');
  let side = 'front';
  return Panels.show({
    label: e.title,
    cls: 'reader',
    onClose,
    build(el, close) {
      const draw = () => {
        el.innerHTML = `${renderEntry(id, { side })}
          <div class="reader-controls">
            <span>${e.back ? `<button class="btn" data-turn>${side === 'front' ? L('Turn over', '翻到背面') : L('Turn back', '翻回正面')}</button>` : ''}</span>
            <span class="closebar" style="margin:0"><button class="textbtn" data-close><span class="key">Esc</span> ${L('Put it down', '放下')}</button></span>
          </div>`;
        el.querySelector('[data-close]').onclick = close;
        const t = el.querySelector('[data-turn]');
        if (t) t.onclick = () => { side = side === 'front' ? 'back' : 'front'; if (side === 'back') onBack?.(); G.sfx('paper'); draw(); el.querySelector('[data-turn]').focus(); };
        if (e.kind === 'letter' && e.pencil && side === 'front' && !S.has('pencil_seen')) { /* first pencil line noticed */ }
      };
      draw();
    },
  });
}

/* ---------------- journal ---------------- */

const TABS = [
  ['letters', () => L('Letters', '信')],
  ['notes', () => L('Notes', '笔记')],
  ['lanyard', () => L('Lanyard', '挂绳')],
];

export function openJournal(startTab, startId) {
  // while you're hunting for the buried box, J opens straight to Joy's map
  const hunting = !startTab && S.has('map') && !S.has('beacon_found');
  let tab = startTab || (hunting ? 'notes' : 'letters');
  let current = startId || (hunting ? 'map' : null);
  return Panels.show({
    label: L('Journal', '日记本'),
    cls: 'frame journal',
    build(el, close) {
      const ids = () => S.data.journal.filter((id) => ENTRIES[id]);
      const inTab = (t) => ids().filter((id) => (t === 'letters' ? ENTRIES[id].kind === 'letter' : t === 'notes' ? ENTRIES[id].kind !== 'letter' : false));
      const draw = () => {
        const list = inTab(tab);
        if (tab !== 'lanyard' && (!current || !list.includes(current))) current = list[list.length - 1] || null;
        el.innerHTML = `<div class="side">
            <h2>${L('Journal', '日记本')}</h2>
            <div class="tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${n()}</button>`).join('')}</div>
            <div class="list">${tab === 'lanyard' ? lanyardList() : list.length ? list.map((id) => `<button data-id="${id}" aria-current="${id === current}">${esc(ENTRIES[id].title)}<small>${esc(ENTRIES[id].where)}</small></button>`).join('') : `<p class="empty">${L('Nothing here yet.', '这里还什么都没有。')}</p>`}</div>
          </div>
          <div class="main">${tab === 'lanyard' ? lanyardMain() : current ? renderEntry(current) + (ENTRIES[current].back ? `<div style="margin-top:20px">${renderEntry(current, { side: 'back' })}</div>` : '') : ''}</div>`;
        el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; current = null; draw(); el.querySelector(`[data-tab="${tab}"]`).focus(); }));
        el.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { current = b.dataset.id; draw(); el.querySelector(`[data-id="${current}"]`)?.focus(); }));
        const closer = document.createElement('div');
        closer.className = 'closebar';
        closer.style.cssText = 'position:absolute;right:24px;top:18px;margin:0';
        closer.innerHTML = `<button class="textbtn"><span class="key">J</span> ${L('Close', '关闭')}</button>`;
        closer.querySelector('button').onclick = close;
        el.appendChild(closer);
      };
      draw();
      el.addEventListener('keydown', (ev) => { if (ev.code === 'KeyJ') { ev.preventDefault(); close(); } });
    },
  });
}

function lanyardList() {
  const k = S.data.candles.length;
  return `<p class="empty" style="line-height:1.5">${L('Five tokens, one from each room. Each has a line from a letter copied onto the back.', '五块铜牌，每个房间一块。每块背面都抄着信里的一句话。')}</p>${k ? `<p class="empty" style="margin-top:12px">${L(`Birthday candles found: ${k} of 5`, `找到的生日蜡烛：${k} / 5`)}</p>` : ''}`;
}
function lanyardMain() {
  return `<div class="tokens-grid">${Object.entries(TOKENS).map(([k, t]) => {
    const got = S.has('tok_' + k);
    return `<div class="tokcard ${got ? '' : 'missing'}"><div class="coin">${glyphSVG(k, '#4a3518')}</div><div><b>${t.name}</b><div class="muted" style="font-size:14px">${got ? t.from : L('Not found yet', '还没找到')}</div></div>${got ? `<div class="pencil ${PENCIL_BY[k] === 'yan' ? 'yan' : ''}">${esc(PENCIL[k])}</div>` : ''}</div>`;
  }).join('')}</div>${S.data.candles.length ? `<div style="margin-top:26px;width:100%"><div class="lbl">${L('Candles', '蜡烛')}</div>${S.data.candles.map((c) => `<div class="muted" style="margin-bottom:4px">${esc(CANDLES[c])}</div>`).join('')}</div>` : ''}`;
}

/* ---------------- hints ---------------- */

const HINTS_VERSION = 3;
export function openHints() {
  // the hints were rewritten, so anything revealed under the old wording starts fresh
  if (S.data.hintsV !== HINTS_VERSION) { S.data.hints = {}; S.data.hintsV = HINTS_VERSION; S.save(); }
  const o = objective();
  const id = o.hint;
  return Panels.show({
    label: L('Hints', '提示'),
    cls: 'frame hints',
    build(el, close) {
      const draw = () => {
        if (!id || !HINTS[id]) {
          el.innerHTML = `<div class="ph"><div><div class="kicker">${L('Hints', '提示')}</div><h2>${L('Nothing to work out right now', '现在没有要解的谜题')}</h2></div></div><p class="muted">${L('What to do next:', '下一步：')} ${esc(o.text)}</p><div class="closebar"><button class="textbtn" data-close><span class="key">H</span> ${L('Close', '关闭')}</button></div>`;
        } else {
          const n = S.hint(id);
          el.innerHTML = `<div class="ph"><div><div class="kicker">${L('Hints', '提示')}</div><h2>${esc(HINT_TITLES()[id] || L('Hints', '提示'))}</h2></div></div>
            <ol>${HINTS[id].map((h, i) => (i < n ? `<li>${esc(h)}</li>` : `<li class="locked">${i === n ? L('Press the button below to see this one.', '按下面的按钮查看这条。') : L('Hidden', '未显示')}</li>`)).join('')}</ol>
            <div class="closebar"><button class="textbtn" data-close><span class="key">H</span> ${L('Close', '关闭')}</button>${n < 3 ? `<button class="btn" data-more autofocus>${n === 0 ? L('Give me a small hint', '给我一点提示') : n === 1 ? L('Give me a bigger hint', '再多给点提示') : L('Show me the answer', '直接告诉我答案')}</button>` : ''}</div>`;
          const m = el.querySelector('[data-more]');
          if (m) m.onclick = () => { S.bumpHint(id); draw(); el.querySelector('[data-more]')?.focus(); };
        }
        el.querySelector('[data-close]').onclick = close;
      };
      draw();
      el.addEventListener('keydown', (ev) => { if (ev.code === 'KeyH') { ev.preventDefault(); close(); } });
    },
  });
}

// Shared shell for station panels.
export function stationShell(el, { kicker, title, hint }, close) {
  el.innerHTML = `<div class="ph"><div><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2></div>
    <div style="display:flex;gap:18px">${hint ? `<button class="textbtn" data-hint><span class="key">H</span> ${L('Hint', '提示')}</button>` : ''}<button class="textbtn" data-close><span class="key">Esc</span> ${L('Step away', '离开')}</button></div></div>
    <div class="body"></div>`;
  el.querySelector('[data-close]').onclick = close;
  const hb = el.querySelector('[data-hint]');
  if (hb) hb.onclick = () => openStationHint(hint);
  el.addEventListener('keydown', (ev) => { if (ev.code === 'KeyH' && !/INPUT|SELECT/.test(ev.target.tagName)) { ev.preventDefault(); openStationHint(hint); } });
  return el.querySelector('.body');
}

function openStationHint(id) {
  if (!id) return;
  Panels.show({
    label: L('Hint', '提示'),
    cls: 'frame hints',
    build(el, close) {
      const draw = () => {
        const n = S.hint(id);
        el.innerHTML = `<div class="ph"><div><div class="kicker">${L('Hints', '提示')}</div><h2>${esc(HINT_TITLES()[id] || L('Hints', '提示'))}</h2></div></div>
          <ol>${HINTS[id].map((h, i) => (i < n ? `<li>${esc(h)}</li>` : `<li class="locked">${i === n ? L('Press the button below to see this one.', '按下面的按钮查看这条。') : L('Hidden', '未显示')}</li>`)).join('')}</ol>
          <div class="closebar"><button class="textbtn" data-close><span class="key">Esc</span> ${L('Back', '返回')}</button>${n < 3 ? `<button class="btn" data-more autofocus>${n === 0 ? L('Give me a small hint', '给我一点提示') : n === 1 ? L('Give me a bigger hint', '再多给点提示') : L('Show me the answer', '直接告诉我答案')}</button>` : ''}</div>`;
        el.querySelector('[data-close]').onclick = close;
        const m = el.querySelector('[data-more]');
        if (m) m.onclick = () => { S.bumpHint(id); draw(); el.querySelector('[data-more]')?.focus(); };
      };
      draw();
    },
  });
}

export { esc };
export function lockAfterClose() { if (!Panels.open) IN.lock(); }
