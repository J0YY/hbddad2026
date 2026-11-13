import { Panels, stationShell, esc } from '../ui/panels.js';

export { Panels, esc };

// Open a station panel. build(body, ctx) where ctx = { close, say(text, kind), el }
export function station({ id, kicker, title, hint, cls = '', build, onClose }) {
  return Panels.show({
    label: title,
    cls: `frame station st-${id} ${cls}`,
    onClose,
    build(el, close, entry) {
      const body = stationShell(el, { kicker, title, hint }, close);
      const fb = document.createElement('div');
      fb.className = 'feedback';
      fb.setAttribute('role', 'status');
      const ctx = {
        el, close, body,
        say(text, kind = '', who = '') {
          fb.className = 'feedback ' + kind;
          fb.innerHTML = (who ? `<span class="who">${esc(who)}</span>` : '') + esc(text);
        },
        cleanup: [],
      };
      entry.cleanup = () => ctx.cleanup.forEach((f) => f());
      build(body, ctx);
      body.appendChild(fb);
    },
  });
}

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

export function hiDPI(canvas, w, hgt) {
  const r = Math.min(2, devicePixelRatio || 1);
  canvas.width = w * r;
  canvas.height = hgt * r;
  canvas.style.aspectRatio = `${w} / ${hgt}`;
  const g = canvas.getContext('2d');
  g.setTransform(r, 0, 0, r, 0, 0);
  return g;
}
