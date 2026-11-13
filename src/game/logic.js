// Pure puzzle logic. No DOM, no three.js. Tested by tests/logic.test.mjs.

/* ---------------- Trading floor ---------------- */

// The house account holds four things. Over the weekend Porter raised an alarm about each one.
// Each alarm has one true explanation, and each explanation is found somewhere in the trading room.
export const HOLDINGS = ['NVDA', 'TQQQ', 'BTC', 'VONG'];
export const EXPLAIN = ['split', 'triple', 'weekend', 'dividend'];
export const ALARM_ANSWER = { NVDA: 'split', TQQQ: 'triple', BTC: 'weekend', VONG: 'dividend' };

// picks: { NVDA: 'split', ... }. Returns { ok, wrong: [tickers] }.
export function checkAlarms(picks) {
  const wrong = HOLDINGS.filter((t) => picks[t] !== ALARM_ANSWER[t]);
  return { ok: wrong.length === 0, wrong };
}

// Torn notice: three strips, taped together in reading order.
export const STRIPS = ['a', 'b', 'c'];
export const checkStrips = (order) => order.join('') === 'abc';

// Bought 12 NVDA on Friday at $1,200. A 10-for-1 split took effect before Monday's open.
// Porter sold 90 at Monday's open. Monday close: $122.
export function checkPosition(shares, value) {
  const s = Number(String(shares).replace(/[,\s]/g, '')), v = Number(String(value).replace(/[$,\s]/g, ''));
  if (s === 30 && v === 3660) return { ok: true };
  if (s === 30) return { ok: false, why: 'value' };
  if (s === 120) return { ok: false, why: 'forgot-sale' };
  if (s === 12 || s < 0) return { ok: false, why: 'no-split' };
  return { ok: false, why: 'shares' };
}

/* ---------------- Server lab: deadlock ---------------- */

export const JOBS = {
  Courier: { pri: 7, holds: ['Grip'], wants: 'Bus' },
  Scorekeeper: { pri: 2, holds: ['Bus'], wants: 'Lamp' },
  Beacon: { pri: 5, holds: ['Lamp'], wants: 'Grip' },
  Archive: { pri: 1, holds: [], wants: 'Lamp' },
};

// Simulate cancelling one job. Returns the order jobs finished in and who is left waiting.
export function simulateCancel(cancel) {
  const jobs = {};
  for (const [k, j] of Object.entries(JOBS)) jobs[k] = { ...j, holds: [...j.holds], done: false };
  const owner = {};
  for (const [k, j] of Object.entries(jobs)) for (const r of j.holds) owner[r] = k;
  const log = [];
  const release = (name) => {
    const freed = [...jobs[name].holds];
    for (const r of freed) delete owner[r];
    jobs[name].holds = [];
    return freed;
  };
  let released = [];
  if (cancel) {
    released = release(cancel);
    jobs[cancel].done = true;
    jobs[cancel].cancelled = true;
    log.push({ job: cancel, event: 'cancelled', freed: released });
  }
  // Loop: any waiting job whose wanted resource is free takes it, highest priority first, then finishes.
  for (let guard = 0; guard < 20; guard++) {
    const ready = Object.entries(jobs)
      .filter(([, j]) => !j.done && !owner[j.wants])
      .sort((a, b) => b[1].pri - a[1].pri);
    if (!ready.length) break;
    const [name, j] = ready[0];
    j.holds.push(j.wants);
    owner[j.wants] = name;
    const freed = release(name);
    j.done = true;
    log.push({ job: name, event: 'finished', freed });
  }
  const waiting = Object.entries(jobs).filter(([, j]) => !j.done).map(([k]) => k);
  return { log, waiting, released, courierDone: log.some((e) => e.job === 'Courier' && e.event === 'finished') };
}

export function findCycle() {
  // Follow "waits for the owner of" links from Courier.
  const owner = {};
  for (const [k, j] of Object.entries(JOBS)) for (const r of j.holds) owner[r] = k;
  const seen = [];
  let cur = 'Courier';
  while (cur && !seen.includes(cur)) {
    seen.push(cur);
    cur = owner[JOBS[cur].wants];
  }
  return seen.slice(seen.indexOf(cur));
}

export function checkCancel(name) {
  const cycle = findCycle();
  const sim = simulateCancel(name);
  if (!cycle.includes(name)) return { ok: false, why: 'outside', sim };
  if (name === 'Courier') return { ok: false, why: 'courier', sim };
  const lowest = cycle.reduce((a, b) => (JOBS[a].pri <= JOBS[b].pri ? a : b));
  if (name !== lowest) return { ok: false, why: 'not-lowest', sim };
  return { ok: true, sim };
}

/* ---------------- Server lab: robot ---------------- */

export const ROBOT_GRID = (() => {
  // 7x7, columns A..G (x 0..6), rows 1..7 (y 0..6). true = wall.
  const w = Array.from({ length: 7 }, () => Array(7).fill(false));
  for (let x = 0; x <= 5; x++) w[1][x] = true; // row 2, A..F
  for (let y = 2; y <= 5; y++) w[y][5] = true; // F3..F6
  for (let x = 1; x <= 3; x++) w[3][x] = true; // B4..D4
  w[4][1] = true; // B5
  for (let x = 1; x <= 5; x++) w[5][x] = true; // B6..F6
  return w;
})();
export const ROBOT_START = { x: 0, y: 0, dir: 1 }; // dir: 0 N(up), 1 E, 2 S, 3 W
export const ROBOT_PLATE = { x: 2, y: 4 };
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const cellName = (x, y) => 'ABCDEFG'[x] + (y + 1);

export function isWall(x, y) {
  return x < 0 || y < 0 || x > 6 || y > 6 || ROBOT_GRID[y][x];
}

// lines: [{ op: 'fwd'|'left'|'right'|'ifblocked'|'repeat', n?, indent }]
// Indentation (Python-style) defines nesting. Returns { tree } or { error, line }.
export function parseProgram(lines) {
  const filled = lines.map((l, i) => ({ ...l, i })).filter((l) => l && l.op);
  if (!filled.length) return { error: 'empty', code: 'empty' };
  const root = { body: [] };
  const stack = [{ node: root, indent: -1 }];
  let prev = null;
  for (const l of filled) {
    const ind = l.indent || 0;
    if (prev && (prev.op === 'repeat' || prev.op === 'ifblocked')) {
      if (ind !== (prev.indent || 0) + 1)
        return { error: 'needs-body', code: 'needs-body', op: prev.op, line: prev.i };
    } else if (ind > stack[stack.length - 1].indent + 1 || (prev && ind > (prev.indent || 0))) {
      return { error: 'bad-indent', code: 'bad-indent', line: l.i };
    }
    while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
    const parent = stack[stack.length - 1].node;
    const node = { op: l.op, n: l.n, line: l.i, body: [] };
    parent.body.push(node);
    if (l.op === 'repeat' || l.op === 'ifblocked') stack.push({ node, indent: ind });
    prev = l;
  }
  if (prev && (prev.op === 'repeat' || prev.op === 'ifblocked'))
    return { error: 'needs-body', code: 'needs-body', op: prev.op, line: prev.i };
  return { tree: root };
}

export function blockLabel(l) {
  return { fwd: 'Forward', left: 'Turn left', right: 'Turn right', ifblocked: 'If front blocked', repeat: `Repeat ${l.n ?? ''}`.trim() }[l.op];
}

// Produces a list of frames for animation. Each frame: { x, y, dir, line, event }
export function runRobot(lines, maxSteps = 600) {
  const parsed = parseProgram(lines);
  if (parsed.error) return { error: parsed.error, code: parsed.code, op: parsed.op, line: parsed.line, frames: [] };
  const s = { ...ROBOT_START };
  const frames = [{ ...s, line: null, event: 'start' }];
  let steps = 0;
  let result = null;
  const sensor = () => isWall(s.x + DIRS[s.dir][0], s.y + DIRS[s.dir][1]);
  const exec = (nodes) => {
    for (const n of nodes) {
      if (result) return;
      if (++steps > maxSteps) { result = { outcome: 'timeout' }; return; }
      if (n.op === 'fwd') {
        const nx = s.x + DIRS[s.dir][0], ny = s.y + DIRS[s.dir][1];
        if (isWall(nx, ny)) {
          frames.push({ ...s, line: n.line, event: 'crash', hit: { x: nx, y: ny } });
          result = { outcome: 'crash', hit: { x: nx, y: ny } };
          return;
        }
        s.x = nx; s.y = ny;
        frames.push({ ...s, line: n.line, event: 'move' });
        if (s.x === ROBOT_PLATE.x && s.y === ROBOT_PLATE.y) { result = { outcome: 'plate' }; return; }
      } else if (n.op === 'left' || n.op === 'right') {
        s.dir = (s.dir + (n.op === 'left' ? 3 : 1)) % 4;
        frames.push({ ...s, line: n.line, event: 'turn' });
      } else if (n.op === 'ifblocked') {
        const b = sensor();
        frames.push({ ...s, line: n.line, event: 'test', blocked: b });
        if (b) exec(n.body);
      } else if (n.op === 'repeat') {
        const count = Math.max(1, Math.min(32, Number(n.n) || 1));
        for (let k = 0; k < count && !result; k++) {
          frames.push({ ...s, line: n.line, event: 'loop', iter: k + 1 });
          exec(n.body);
        }
      }
    }
  };
  exec(parsed.tree.body);
  if (!result) result = { outcome: 'stopped' };
  return { frames, ...result };
}

/* ---------------- Tennis ---------------- */

// Score as points won [server, receiver]. Start 30–30 = [2,2].
export function scoreName([s, r]) {
  const n = ['Love', '15', '30', '40'];
  if (s >= 3 && r >= 3) {
    if (s === r) return 'Deuce';
    if (s === r + 1) return 'Ad server';
    if (r === s + 1) return 'Ad receiver';
    return s > r ? 'Game server' : 'Game receiver';
  }
  if (s >= 4) return 'Game server';
  if (r >= 4) return 'Game receiver';
  return `${n[s]}–${n[r]}`;
}

export const REPLAY = [
  { id: 'r1', effect: [1, 0] }, // passing shot clips the singles sideline: in, server wins
  { id: 'r2', effect: [0, 1] }, // double fault: receiver wins
  { id: 'r3', effect: [0, 0] }, // net cord let: replayed, no change
  { id: 'r4', effect: [0, 1] }, // receiver winner
];

export function replayScores() {
  let p = [2, 2];
  return REPLAY.map((e) => {
    p = [p[0] + e.effect[0], p[1] + e.effect[1]];
    return scoreName(p);
  });
}

export const SCORE_CHOICES = ['40–30', '30–40', 'Deuce', 'Ad server', 'Ad receiver', 'Game server', 'Game receiver'];

export function checkReplay(answers) {
  const truth = replayScores();
  const firstWrong = truth.findIndex((t, i) => answers[i] !== t);
  return firstWrong === -1 ? { ok: true } : { ok: false, index: firstWrong };
}

// Points played so far (excluding lets): 4 to reach 30–30, then 3 counted.
export const POINTS_PLAYED = 7;
export function checkServe(side, box) {
  // Odd-numbered points from the right (deuce side), even from the left (ad side).
  const next = POINTS_PLAYED + 1;
  const correctSide = next % 2 === 1 ? 'right' : 'left';
  if (side !== correctSide) return { ok: false, why: 'side' };
  const correctBox = correctSide === 'left' ? 'right' : 'left'; // cross-court
  if (box !== correctBox) return { ok: false, why: 'box' };
  return { ok: true };
}

// Rally. Rail grid x 0..4, y 0..2 (y=2 baseline, y=0 net). Returner starts (2,2).
export const RALLY = [
  { name: 'Deep drive', L: [1, 2], R: [3, 2], budget: 1 },
  { name: 'Angle', L: [0, 1], R: [4, 1], budget: 2 },
  { name: 'Drop', L: [0, 0], R: [4, 0], budget: 1 },
];
export const RING = [0, 0];
export const RETURNER_START = [2, 2];
const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

export function simulateRally(choices) {
  let pos = [...RETURNER_START];
  const shots = [];
  for (let i = 0; i < 3; i++) {
    const target = RALLY[i][choices[i]];
    const need = manhattan(pos, target);
    const reached = need <= RALLY[i].budget;
    shots.push({ from: [...pos], target, need, budget: RALLY[i].budget, reached });
    if (!reached) {
      if (i < 2) return { ok: false, why: 'early', shot: i, shots };
      const inRing = target[0] === RING[0] && target[1] === RING[1];
      return inRing ? { ok: true, shots } : { ok: false, why: 'not-ring', shot: i, shots };
    }
    pos = [...target];
  }
  return { ok: false, why: 'returned', shot: 2, shots };
}

/* ---------------- Kitchen ---------------- */

// Tags on the dispensers, and what is really inside each.
export const DISPENSERS = { Onion: 'carrot', Carrot: 'meat', Meat: 'onion' };
export const RECIPE = { onion: 200, carrot: 300, meat: 500 };

// routing: { onion: 'Meat', carrot: 'Onion', meat: 'Carrot' } (bowl -> dispenser tag)
// grams: { onion: 200, ... }
export function checkPrep(routing, grams) {
  const got = {};
  for (const bowl of ['onion', 'carrot', 'meat']) got[bowl] = DISPENSERS[routing[bowl]] || null;
  const wrongBowls = Object.keys(got).filter((b) => got[b] !== b);
  const total = ['onion', 'carrot', 'meat'].reduce((a, b) => a + (Number(grams[b]) || 0), 0);
  const wrongGrams = Object.keys(RECIPE).filter((b) => Number(grams[b]) !== RECIPE[b]);
  return { ok: !wrongBowls.length && !wrongGrams.length, got, wrongBowls, wrongGrams, total };
}

export const DISHES = {
  stew: [{ res: 'burner', dur: 4 }, { res: 'oven', dur: 8 }],
  rice: [{ res: 'burner', dur: 6 }, { res: 'trivet', dur: 2 }],
  garnish: [{ res: 'burner', dur: 2 }],
};
export const SERVICE_AT = 12;

export function schedulePhases(starts) {
  const out = [];
  for (const [dish, phases] of Object.entries(DISHES)) {
    let t = Number(starts[dish]);
    for (const p of phases) {
      out.push({ dish, res: p.res, from: t, to: t + p.dur });
      t += p.dur;
    }
  }
  return out;
}

export function checkSchedule(starts) {
  const ph = schedulePhases(starts);
  const clashes = [];
  for (let i = 0; i < ph.length; i++)
    for (let j = i + 1; j < ph.length; j++) {
      const a = ph[i], b = ph[j];
      if (a.res === b.res && a.from < b.to && b.from < a.to)
        clashes.push({ res: a.res, a: a.dish, b: b.dish, from: Math.max(a.from, b.from), to: Math.min(a.to, b.to) });
    }
  const finish = {};
  for (const p of ph) finish[p.dish] = Math.max(finish[p.dish] ?? 0, p.to);
  const late = Object.keys(finish).filter((d) => finish[d] !== SERVICE_AT);
  return { ok: !clashes.length && !late.length, clashes, late, finish, phases: ph };
}

/* ---------------- Wilderness ---------------- */

export const LANDMARKS = { pine: [1, 4], post: [4, 1], cairn: [7, 7] };
export const BEACON = [4, 4];
export const GRID_M = 4; // metres per map interval

export function surveyDistance(mx, my) {
  return Math.hypot(mx - BEACON[0], my - BEACON[1]) * GRID_M;
}

/* ---------------- Telescope ---------------- */

// Chart orientation: rotation in 45° steps (positive = counter-clockwise) and a flip flag.
export const CHART_START = { rot: -2, flip: true };
export function chartAligned({ rot, flip }) {
  return ((rot % 8) + 8) % 8 === 0 && !flip;
}
export function chartPartial({ rot, flip }) {
  // Merak (pivot) always lines up. Dubhe lines up when the pointer direction matches,
  // which happens at rot 0 either way because Merak→Dubhe points straight up.
  const r = ((rot % 8) + 8) % 8;
  return { merak: true, dubhe: r === 0, alioth: r === 0 && !flip };
}

export const SIGHT_CANDIDATES = {
  bright: { gaps: 3, reverse: false },
  reverse: { gaps: 5, reverse: true },
  polaris: { gaps: 5, reverse: false },
};
export function checkSight(id) {
  return { ok: id === 'polaris', why: id === 'bright' ? 'short' : id === 'reverse' ? 'reverse' : null };
}

/* ---------------- Finale ---------------- */

export const BOOKINGS = ['market', 'workbench', 'tennis', 'lunch', 'camp'];
export const RULES = [
  { id: 'market', token: 'bell', test: (p) => p.market < p.workbench, pair: ['market', 'workbench'] },
  { id: 'workbench', token: 'chip', test: (p) => p.tennis === p.workbench + 1, pair: ['workbench', 'tennis'] },
  { id: 'tennis', token: 'racket', test: (p) => Math.abs(p.lunch - p.tennis) === 2, pair: ['lunch', 'tennis'] },
  { id: 'lunch', token: 'ladle', test: (p) => Math.abs(p.lunch - p.camp) >= 2, pair: ['lunch', 'camp'] },
  { id: 'camp', token: 'star', test: (p) => p.camp > p.tennis, pair: ['tennis', 'camp'] },
];

// order: array of 5 booking ids, earliest first
export function checkDay(order) {
  if (order.length !== 5 || order.some((x) => !x) || new Set(order).size !== 5) return { ok: false, why: 'incomplete' };
  const p = {};
  order.forEach((b, i) => (p[b] = i));
  const broken = RULES.filter((r) => !r.test(p));
  return broken.length ? { ok: false, why: 'rule', rule: broken[0], broken } : { ok: true };
}

export function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}
