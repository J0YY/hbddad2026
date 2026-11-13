import { station, h, hiDPI } from './common.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L } from '../game/i18n.js';
import { W } from '../world/kit.js';
import { STAR } from '../game/content.js';
import { CHART_START, chartAligned, chartPartial, checkSight } from '../game/logic.js';

const GAP = 36;
const MERAK = [262, 300];
// Sky positions relative to Merak, in pointer gaps (screen coords, y down).
const SKY = {
  Merak: [0, 0], Dubhe: [0, -1], Phecda: [-1.3, 0.2], Megrez: [-1.25, -0.75], Alioth: [-2.3, -0.95], Mizar: [-3.2, -1.05], Alkaid: [-4.1, -0.7],
};
const CANDIDATES = { bright: [0.18, -4], reverse: [0, 3.5], polaris: [0, -6] };
const CAND_LABEL = { bright: 'A', reverse: 'B', polaris: 'C' };
const SHAPES = { Merak: 'circle', Dubhe: 'square', Alioth: 'triangle' };
const sp = ([x, y]) => [MERAK[0] + x * GAP, MERAK[1] + y * GAP];

function shape(g, kind, x, y, r, fill) {
  g.beginPath();
  if (kind === 'circle') g.arc(x, y, r, 0, 7);
  else if (kind === 'square') g.rect(x - r, y - r, r * 2, r * 2);
  else { g.moveTo(x, y - r * 1.2); g.lineTo(x + r * 1.1, y + r * 0.8); g.lineTo(x - r * 1.1, y + r * 0.8); g.closePath(); }
  fill ? g.fill() : g.stroke();
}

export function telescopeStation() {
  const st = S.station('telescope');
  const chart = st.chart || { ...CHART_START };
  let shown = { a: chart.rot * 45, f: chart.flip ? -1 : 1 };
  let raf = null;
  station({
    id: 'telescope', kicker: L('The hilltop', '山顶'), title: L('The telescope', '望远镜'), hint: S.has('chart_ok') ? 'sight' : 'chart',
    build(body, ctx) {
      const cv = h('canvas', { class: 'board eyepiece', 'aria-label': L('View through the telescope', '望远镜里的景象') });
      const g = hiDPI(cv, 520, 520);
      ctx.cleanup.push(() => cancelAnimationFrame(raf));
      const stars = (r = 1) => {
        const rnd = (() => { let s = 11; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
        for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(220,228,255,${0.2 + rnd() * 0.5})`; g.fillRect(rnd() * 520, rnd() * 520, 1.2, 1.2); }
        for (const [n, p] of Object.entries(SKY)) { const [x, y] = sp(p); g.fillStyle = '#f2f4ff'; g.beginPath(); g.arc(x, y, n === 'Dubhe' || n === 'Merak' ? 3.4 : 2.8, 0, 7); g.fill(); }
        for (const [k, p] of Object.entries(CANDIDATES)) { const [x, y] = sp(p); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, k === 'bright' ? 4.6 : k === 'polaris' ? 3.2 : 2.8, 0, 7); g.fill(); }
        // finder plate shapes around the reference stars
        g.strokeStyle = 'rgba(201,162,91,0.85)'; g.lineWidth = 1.5;
        for (const [n, k] of Object.entries(SHAPES)) { const [x, y] = sp(SKY[n]); shape(g, k, x, y, 11, false); }
        g.fillStyle = 'rgba(201,162,91,0.9)'; g.font = '600 12px "Sofia Sans Semi Condensed", "Noto Sans SC", sans-serif';
        for (const n of Object.keys(SHAPES)) { const [x, y] = sp(SKY[n]); g.fillText(STAR(n), x + 14, y + 4); }
      };
      const frameMask = () => {
        g.save();
        g.globalCompositeOperation = 'destination-in';
        g.beginPath(); g.arc(260, 260, 252, 0, 7); g.fill();
        g.restore();
        g.strokeStyle = '#8c6d33'; g.lineWidth = 6; g.beginPath(); g.arc(260, 260, 252, 0, 7); g.stroke();
        g.fillStyle = 'rgba(201,162,91,0.7)'; g.font = '700 12px "Sofia Sans Semi Condensed", "Noto Sans SC", sans-serif'; g.fillText(L('N', '北'), 256, 22);
      };
      const tf = ([x, y], a, f) => {
        const t = (a * Math.PI) / 180;
        const xf = x * f;
        return [xf * Math.cos(t) + y * Math.sin(t), -xf * Math.sin(t) + y * Math.cos(t)];
      };
      const drawChart = () => {
        g.fillStyle = '#05070d'; g.fillRect(0, 0, 520, 520);
        stars();
        // the transparent chart, pivoting on Merak
        const part = chartPartial(chart);
        g.save();
        g.fillStyle = 'rgba(210,225,240,0.08)';
        const corners = [[-5, -2], [1.5, -2], [1.5, 1.5], [-5, 1.5]].map((p) => sp(tf(p, shown.a, shown.f)));
        g.beginPath(); corners.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(210,225,240,0.25)'; g.stroke();
        // arrow Merak -> Dubhe and beyond
        const a0 = sp(tf([0, 0.4], shown.a, shown.f)), a1 = sp(tf([0, -1.7], shown.a, shown.f));
        g.strokeStyle = 'rgba(91,143,214,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...a0); g.lineTo(...a1); g.stroke();
        const ah = sp(tf([0.18, -1.45], shown.a, shown.f)), ah2 = sp(tf([-0.18, -1.45], shown.a, shown.f));
        g.beginPath(); g.moveTo(...a1); g.lineTo(...ah); g.moveTo(...a1); g.lineTo(...ah2); g.stroke();
        for (const [n, k] of Object.entries(SHAPES)) {
          const [x, y] = sp(tf(SKY[n], shown.a, shown.f));
          const ok = part[n.toLowerCase()] && Math.abs(shown.a - chart.rot * 45) < 1;
          g.fillStyle = ok ? 'rgba(127,208,154,0.75)' : 'rgba(91,143,214,0.65)';
          shape(g, k, x, y, 6, true);
        }
        g.restore();
        frameMask();
      };
      const drawSight = (pick) => {
        g.fillStyle = '#05070d'; g.fillRect(0, 0, 520, 520);
        stars();
        // ruler from Dubhe along the pointer line
        const [dx, dy] = sp(SKY.Dubhe);
        g.strokeStyle = 'rgba(201,162,91,0.9)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx, dy - 5 * GAP); g.stroke();
        g.fillStyle = 'rgba(201,162,91,0.95)'; g.font = '700 12px "Sofia Sans Semi Condensed", "Noto Sans SC", sans-serif';
        for (let i = 1; i <= 5; i++) { g.fillRect(dx - 7, dy - i * GAP - 1, 14, 2); g.fillText(String(i), dx + 10, dy - i * GAP + 4); }
        g.strokeStyle = 'rgba(91,143,214,0.8)'; g.lineWidth = 1.5; g.setLineDash([4, 4]);
        const [mx, my] = sp(SKY.Merak);
        g.beginPath(); g.moveTo(mx, my); g.lineTo(dx, dy); g.stroke(); g.setLineDash([]);
        for (const [k, p] of Object.entries(CANDIDATES)) {
          const [x, y] = sp(p);
          g.strokeStyle = pick === k ? '#7fd09a' : 'rgba(236,230,217,0.6)'; g.lineWidth = 1.5;
          g.beginPath(); g.arc(x, y, 14, 0, 7); g.stroke();
          g.fillStyle = pick === k ? '#7fd09a' : '#ece6d9'; g.font = '700 14px "Sofia Sans Semi Condensed", "Noto Sans SC", sans-serif';
          g.fillText(CAND_LABEL[k], x - 26, y + 5);
        }
        frameMask();
      };
      const animate = () => {
        const ta = chart.rot * 45, tfv = chart.flip ? -1 : 1;
        const reduced = S.settings.reduced;
        shown.a += reduced ? ta - shown.a : (ta - shown.a) * 0.22;
        shown.f += reduced ? tfv - shown.f : (tfv - shown.f) * 0.22;
        drawChart();
        if (Math.abs(ta - shown.a) > 0.2 || Math.abs(tfv - shown.f) > 0.01) raf = requestAnimationFrame(animate);
        else { shown.a = ta; shown.f = tfv; drawChart(); checkAligned(); }
      };
      const controls = h('div', { class: 'scope-ctl' });
      const status = h('div', { class: 'scope-status' });
      const stage1 = () => {
        controls.innerHTML = '';
        const rl = h('button', { class: 'btn' }, L('Turn left (anticlockwise)', '向左转（逆时针）'));
        const rr = h('button', { class: 'btn' }, L('Turn right (clockwise)', '向右转（顺时针）'));
        const fl = h('button', { class: 'btn' }, L('Flip the chart over', '把星图翻面'));
        rl.onclick = () => { chart.rot += 1; st.chart = chart; S.saveStation(); G.sfx('click'); cancelAnimationFrame(raf); animate(); };
        rr.onclick = () => { chart.rot -= 1; st.chart = chart; S.saveStation(); G.sfx('click'); cancelAnimationFrame(raf); animate(); };
        fl.onclick = () => { chart.flip = !chart.flip; st.chart = chart; S.saveStation(); G.sfx('paper'); cancelAnimationFrame(raf); animate(); };
        controls.append(h('p', {}, L('The see-through star chart is pinned to the lens at Merak. Turn or flip it until all three blue dots sit inside their matching gold outlines.', '透明星图在天璇那里钉在镜片上。转动或翻面，让三个蓝点都落进对应的金色框里。')), h('div', { class: 'actions wrap' }, rl, rr, fl));
        drawChart();
        updateStatus();
      };
      const updateStatus = () => {
        const p = chartPartial(chart);
        status.innerHTML = ['Merak', 'Dubhe', 'Alioth'].map((n) => `<span class="${p[n.toLowerCase()] ? 'ok' : ''}">${STAR(n)} ${p[n.toLowerCase()] ? L('lined up', '对上了') : L('not yet', '还没对上')}</span>`).join('');
      };
      const checkAligned = () => {
        updateStatus();
        if (chartAligned(chart) && !S.has('chart_ok')) {
          S.set('chart_ok');
          G.sfx('good');
          ctx.say(L('All three dots sit exactly on their stars, and the chart clicks into place.', '三个点都正好对上了星星，星图咔哒一声卡到位。'), 'good');
          setTimeout(stage2, 1400);
        } else if (chartPartial(chart).dubhe && !chartAligned(chart)) {
          ctx.say(L('Merak and Dubhe line up but Alioth doesn’t, so the chart might be the wrong way round.', '天璇和天枢对上了，可玉衡没对上，星图可能放反了。'), '');
        } else ctx.say('');
      };
      const stage2 = () => {
        status.innerHTML = '';
        controls.innerHTML = '';
        ctx.say('');
        controls.append(h('p', {}, L('Start at Dubhe. Keep going the same way, from Merak towards Dubhe, for five more of those steps. Each mark on the gold ruler is one step. Then point the telescope at the star you find.', '从天枢出发，沿着天璇到天枢的方向，再往前走五步。金色尺子上每一格就是一步。然后把望远镜对准那颗星。')));
        const row = h('div', { class: 'actions wrap' });
        for (const k of ['bright', 'reverse', 'polaris']) {
          const b = h('button', { class: 'btn' }, L(`Point at star ${CAND_LABEL[k]}`, `对准 ${CAND_LABEL[k]} 星`));
          b.onclick = () => {
            drawSight(k);
            const r = checkSight(k);
            if (!r.ok) {
              G.sfx('bad');
              ctx.say(r.why === 'short' ? L('That one is brighter, but the ruler goes past it. It’s only three steps beyond Dubhe.', '那颗更亮，可是尺子还没到头。它离天枢只有三步。') : L('That one is behind Merak. The arrow points the other way.', '那颗在天璇后面。箭头指的是另一个方向。'), 'bad');
              return;
            }
            row.querySelectorAll('button').forEach((x) => (x.disabled = true));
            G.sfx('lens');
            S.set('scope_ok');
            ctx.say(L('That’s the North Star. The lens locks in with a soft click, and down among the trees a beam of light shoots straight up into the sky.', '那就是北极星。镜片轻轻咔哒一声锁住，下面的树林里一道光柱直冲上天。'), 'good');
            setTimeout(() => {
              ctx.close();
              S.set('tok_star'); G.give('tok_star', ['Star token', '星星铜牌']);
              S.set('trail_open'); W.trailT = 0;
              setTimeout(() => G.sfx('lanterns'), 600);
              G.porter([[L('One by one, the lanterns along the trail are coming on.', '小路上的灯笼一盏接一盏亮了起来。'), 3000], [L('I have also found two chairs in storage, and they seem to belong to somebody.', '另外，我在储藏室里找到了两把椅子，好像是有主的。'), 4200]]);
            }, 2400);
          };
          row.append(b);
        }
        controls.append(row);
        drawSight(null);
      };
      body.append(h('div', { class: 'cols scopecols' }, h('div', {}, cv), h('div', {}, controls, status)));
      if (S.has('chart_ok')) stage2(); else stage1();
    },
  });
}
