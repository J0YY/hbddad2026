// Single versioned save snapshot in localStorage, plus a tiny event bus.

const KEY = 'party-of-three/save';
const SKEY = 'party-of-three/settings';
const VERSION = 3;

const fresh = () => ({
  v: VERSION,
  flags: {},
  journal: [],
  hints: {},
  station: {},
  candles: [],
  choice: null,
  anchor: 'study',
  seenAreas: [],
  started: false,
});

const defaultSettings = () => ({ sens: 1, invertY: false, text: 1, reduced: false, sound: true, volume: 0.8, lang: (navigator.language || '').startsWith('zh') ? 'zh' : 'en', quality: 'auto' });

function safeGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k, v) {
  try { localStorage.setItem(k, v); } catch { /* private mode: play without saving */ }
}

const listeners = {};
export const S = {
  data: fresh(),
  settings: defaultSettings(),

  on(ev, fn) { (listeners[ev] ||= []).push(fn); },
  emit(ev, payload) { (listeners[ev] || []).forEach((f) => f(payload)); },

  load() {
    try {
      const raw = safeGet(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === VERSION) this.data = { ...fresh(), ...d };
      }
    } catch { this.data = fresh(); }
    try {
      const s = JSON.parse(safeGet(SKEY) || 'null');
      if (s) this.settings = { ...defaultSettings(), ...s };
    } catch { /* keep defaults */ }
  },
  hasSave() {
    try { const d = JSON.parse(safeGet(KEY) || 'null'); return !!(d && d.v === VERSION && d.started); } catch { return false; }
  },
  save() { safeSet(KEY, JSON.stringify(this.data)); },
  saveSettings() { safeSet(SKEY, JSON.stringify(this.settings)); this.emit('settings'); },
  reset() { this.data = fresh(); this.save(); },

  has(f) { return !!this.data.flags[f]; },
  set(f) {
    if (this.data.flags[f]) return false;
    this.data.flags[f] = true;
    this.save(); // save before any animation that follows
    this.emit('flag', f);
    return true;
  },
  addJournal(id) {
    if (this.data.journal.includes(id)) return false;
    this.data.journal.push(id);
    this.save();
    this.emit('journal', id);
    return true;
  },
  hint(id) { return this.data.hints[id] || 0; },
  bumpHint(id) { this.data.hints[id] = Math.min(3, this.hint(id) + 1); this.save(); },
  station(id) { return (this.data.station[id] ||= {}); },
  saveStation() { this.save(); },
  addCandle(id) {
    if (this.data.candles.includes(id)) return false;
    this.data.candles.push(id);
    this.save();
    this.emit('candle', id);
    return true;
  },
  setAnchor(a) { if (this.data.anchor !== a) { this.data.anchor = a; this.save(); } },
};
