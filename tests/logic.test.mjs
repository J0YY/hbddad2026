import assert from 'node:assert/strict';
import * as L from '../src/game/logic.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('trading: each alarm has exactly one explanation', () => {
  assert.ok(L.checkAlarms({ NVDA: 'split', TQQQ: 'triple', BTC: 'weekend', VONG: 'dividend' }).ok);
  assert.deepEqual(L.checkAlarms({ NVDA: 'triple', TQQQ: 'split', BTC: 'weekend', VONG: 'dividend' }).wrong, ['NVDA', 'TQQQ']);
  assert.equal(new Set(Object.values(L.ALARM_ANSWER)).size, 4);
  assert.ok(L.checkStrips(['a', 'b', 'c']));
  assert.ok(!L.checkStrips(['b', 'a', 'c']));
});

t('position: 12 shares, split 10-for-1, sold 90 -> 30 shares, $3,660', () => {
  assert.ok(L.checkPosition(30, 3660).ok);
  assert.ok(L.checkPosition('30', '$3,660').ok);
  assert.equal(L.checkPosition(120, 14640).why, 'forgot-sale');
  assert.equal(L.checkPosition(12, 14400).why, 'no-split');
  assert.equal(L.checkPosition(30, 3600).why, 'value');
});

t('deadlock: cycle and recovery', () => {
  assert.deepEqual(L.findCycle().sort(), ['Beacon', 'Courier', 'Scorekeeper']);
  const arch = L.checkCancel('Archive');
  assert.equal(arch.ok, false);
  assert.equal(arch.sim.released.length, 0);
  assert.equal(arch.sim.waiting.length, 3);
  const ok = L.checkCancel('Scorekeeper');
  assert.ok(ok.ok);
  assert.deepEqual(ok.sim.log.map((e) => e.job), ['Scorekeeper', 'Courier', 'Beacon', 'Archive']);
  assert.equal(ok.sim.waiting.length, 0);
  assert.equal(L.checkCancel('Courier').why, 'courier');
  assert.equal(L.checkCancel('Beacon').why, 'not-lowest');
});

t('robot: known program lands on C5 in 30 moves, 6 turns', () => {
  const prog = [
    { op: 'repeat', n: 30, indent: 0 },
    { op: 'ifblocked', indent: 1 },
    { op: 'right', indent: 2 },
    { op: 'fwd', indent: 1 },
  ];
  const r = L.runRobot(prog);
  assert.equal(r.outcome, 'plate');
  const moves = r.frames.filter((f) => f.event === 'move');
  const turns = r.frames.filter((f) => f.event === 'turn');
  assert.equal(moves.length, 30);
  assert.equal(turns.length, 6);
  const last = moves[moves.length - 1];
  assert.equal(L.cellName(last.x, last.y), 'C5');
  for (const k of [31, 32]) assert.equal(L.runRobot(prog.map((l, i) => (i === 0 ? { ...l, n: k } : l))).outcome, 'plate');
  assert.equal(L.runRobot(prog.map((l, i) => (i === 0 ? { ...l, n: 29 } : l))).outcome, 'stopped');
  // forward inside the conditional: never moves
  const bad = L.runRobot([{ op: 'repeat', n: 30, indent: 0 }, { op: 'ifblocked', indent: 1 }, { op: 'right', indent: 2 }, { op: 'fwd', indent: 2 }]);
  assert.equal(bad.outcome, 'stopped');
  // left turns crash
  const left = L.runRobot([{ op: 'repeat', n: 30, indent: 0 }, { op: 'ifblocked', indent: 1 }, { op: 'left', indent: 2 }, { op: 'fwd', indent: 1 }]);
  assert.notEqual(left.outcome, 'plate');
  assert.ok(L.parseProgram([{ op: 'repeat', n: 3, indent: 0 }]).error);
  assert.ok(L.parseProgram([{ op: 'fwd', indent: 1 }]).error);
});

t('tennis replay and serve', () => {
  assert.deepEqual(L.replayScores(), ['40–30', 'Deuce', 'Deuce', 'Ad receiver']);
  assert.ok(L.checkReplay(['40–30', 'Deuce', 'Deuce', 'Ad receiver']).ok);
  assert.equal(L.checkReplay(['40–30', 'Deuce', 'Ad receiver', 'Ad receiver']).index, 2);
  assert.ok(L.checkServe('left', 'right').ok);
  assert.equal(L.checkServe('right', 'left').why, 'side');
  assert.equal(L.checkServe('left', 'left').why, 'box');
});

t('rally: only R,R,L wins in the ring, all 8 patterns checked', () => {
  const wins = [];
  for (const a of 'LR') for (const b of 'LR') for (const c of 'LR') {
    const r = L.simulateRally([a, b, c]);
    if (r.ok) wins.push(a + b + c);
  }
  assert.deepEqual(wins, ['RRL']);
  assert.equal(L.simulateRally(['L', 'R', 'L']).why, 'early');
  assert.equal(L.simulateRally(['L', 'L', 'L']).why, 'returned');
});

t('pantry and service', () => {
  assert.ok(L.checkPrep({ onion: 'Meat', carrot: 'Onion', meat: 'Carrot' }, { onion: 200, carrot: 300, meat: 500 }).ok);
  // all 6 routings, only one works
  const tags = ['Onion', 'Carrot', 'Meat'];
  const good = L.permutations(tags).filter(([o, c, m]) => L.checkPrep({ onion: o, carrot: c, meat: m }, L.RECIPE).ok);
  assert.equal(good.length, 1);
  assert.ok(L.checkSchedule({ stew: 0, rice: 4, garnish: 10 }).ok);
  let count = 0;
  for (let s = 0; s <= 12; s++) for (let r = 0; r <= 12; r++) for (let g = 0; g <= 12; g++)
    if (L.checkSchedule({ stew: s, rice: r, garnish: g }).ok) count++;
  assert.equal(count, 1);
  assert.ok(L.checkSchedule({ stew: 0, rice: 3, garnish: 10 }).clashes.length > 0);
});

t('beacon survey', () => {
  assert.equal(L.surveyDistance(4, 4), 0);
  assert.ok(L.surveyDistance(4.3, 4.2) < 2);
  assert.ok(L.surveyDistance(5, 4) > 2);
});

t('telescope', () => {
  assert.equal(L.chartAligned(L.CHART_START), false);
  assert.ok(L.chartAligned({ rot: 0, flip: false }));
  assert.ok(L.chartAligned({ rot: 8, flip: false }));
  assert.deepEqual(L.chartPartial({ rot: 0, flip: true }), { merak: true, dubhe: true, alioth: false });
  assert.ok(L.checkSight('polaris').ok);
});

t('finale: exactly one of 120 orders, and every rule matters', () => {
  const all = L.permutations(L.BOOKINGS);
  assert.equal(all.length, 120);
  const ok = all.filter((o) => L.checkDay(o).ok);
  assert.deepEqual(ok, [['market', 'lunch', 'workbench', 'tennis', 'camp']]);
  for (const drop of L.RULES) {
    const rules = L.RULES.filter((r) => r !== drop);
    const pass = all.filter((o) => { const p = {}; o.forEach((b, i) => (p[b] = i)); return rules.every((r) => r.test(p)); });
    assert.ok(pass.length > 1, `removing ${drop.id} should admit another order`);
  }
});

console.log(`\n${n} groups passed`);
