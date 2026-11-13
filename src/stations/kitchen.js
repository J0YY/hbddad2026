import { station, h, hiDPI } from './common.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L } from '../game/i18n.js';
import { checkPrep, DISHES, SERVICE_AT, checkSchedule } from '../game/logic.js';

const BOWLS = [['onion'], ['carrot'], ['meat']];
const TAGS = ['Onion', 'Carrot', 'Meat'];
const FOOD = (k) => ({ onion: L('onion', '洋葱'), carrot: L('carrot', '胡萝卜'), meat: L('meat', '肉') }[k]);
const BOWL_NAME = (k) => ({ onion: L('Onion bowl', '洋葱碗'), carrot: L('Carrot bowl', '胡萝卜碗'), meat: L('Meat bowl', '肉碗') }[k]);
const TAG_NAME = (t) => ({ Onion: L('Onion', '洋葱'), Carrot: L('Carrot', '胡萝卜'), Meat: L('Meat', '肉') }[t]);
const DISH = (d) => ({ stew: L('stew', '炖菜'), rice: L('rice', '米饭'), garnish: L('garnish', '配菜') }[d]);
const PLACE = (r) => ({ burner: L('stove', '灶'), oven: L('oven', '烤箱'), trivet: L('pot stand', '锅垫') }[r]);

export function prepStation() {
  const st = S.station('prep');
  const routing = st.routing || { onion: null, carrot: null, meat: null };
  const grams = st.grams || { onion: 0, carrot: 0, meat: 0 };
  station({
    id: 'prep', kicker: L('The kitchen', '厨房'), title: L('Weigh the ingredients', '称食材'), hint: 'prep',
    build(body, ctx) {
      const total = h('div', { class: 'lcd' });
      const rows = h('div', { class: 'prep-rows' });
      const save = () => { st.routing = routing; st.grams = grams; S.saveStation(); };
      const drawTotal = () => { total.textContent = `${String(grams.onion + grams.carrot + grams.meat).padStart(4, ' ')} g`; };
      BOWLS.forEach(([k]) => {
        const label = BOWL_NAME(k);
        const seg = h('div', { class: 'seg' });
        TAGS.forEach((t) => {
          const b = h('button', { 'aria-pressed': String(routing[k] === t) }, L(`“${t}” container`, `“${TAG_NAME(t)}”罐`));
          b.onclick = () => { routing[k] = t; seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); save(); G.sfx('click'); };
          seg.append(b);
        });
        const amt = h('input', { type: 'number', step: 50, min: 0, max: 1000, value: grams[k], 'aria-label': L(`${label} grams`, `${label}克数`) });
        const set = (v) => { grams[k] = Math.max(0, Math.min(1000, Math.round(v / 50) * 50)); amt.value = grams[k]; drawTotal(); save(); };
        amt.onchange = () => set(Number(amt.value) || 0);
        const minus = h('button', { class: 'btn small', 'aria-label': L(`Take 50 grams out of the ${label}`, `${label}减 50 克`) }, '− 50 g');
        const plus = h('button', { class: 'btn small', 'aria-label': L(`Add 50 grams to the ${label}`, `${label}加 50 克`) }, '+ 50 g');
        minus.onclick = () => set(grams[k] - 50);
        plus.onclick = () => { set(grams[k] + 50); G.sfx('click'); };
        rows.append(h('div', { class: 'prep-row' }, h('div', { class: 'lbl' }, label), h('div', { class: 'small muted' }, L('Pour from the container labelled:', '从这个标签的罐子里倒：')), seg, h('div', { class: 'amt' }, minus, amt, h('span', {}, 'g'), plus)));
      });
      const tare = h('button', { class: 'btn' }, L('Empty the bowls', '把碗倒空'));
      tare.onclick = () => { for (const [k] of BOWLS) grams[k] = 0; rows.querySelectorAll('input').forEach((i) => (i.value = 0)); drawTotal(); save(); };
      const go = h('button', { class: 'btn primary' }, L('Pour', '倒'));
      go.onclick = () => {
        if (BOWLS.some(([k]) => !routing[k])) { ctx.say(L('Each bowl needs a container poured into it before you check.', '检查之前，每个碗都要倒进一个罐子。'), 'bad'); return; }
        const r = checkPrep(routing, grams);
        if (r.ok) {
          G.sfx('good');
          S.set('prep_ok');
          S.set('service_ok'); // the stew goes on and the ladle token comes out at the serving window
          ctx.say(L('That’s 200 g of onion, 300 g of carrot and 500 g of meat, exactly 1,000 g in all. The stew goes on the stove, and a token slides out at the serving window.', '洋葱 200 克，胡萝卜 300 克，肉 500 克，一共正好 1000 克。炖菜上了灶，出菜窗口滑出来一块铜牌。'), 'good');
          setTimeout(() => ctx.close(), 1800);
          return;
        }
        G.sfx('bad');
        if (r.wrongBowls.length) {
          const b = r.wrongBowls[0];
          ctx.say(L(`The ${FOOD(b)} bowl fills up with ${FOOD(r.got[b])}. That’s not right, so you tip everything back and start again.`, `${BOWL_NAME(b)}里倒出来的是${FOOD(r.got[b])}。不对，你把东西倒回去重新来。`), 'bad');
          for (const [k] of BOWLS) grams[k] = 0;
          rows.querySelectorAll('input').forEach((i) => (i.value = 0));
          drawTotal(); save();
          return;
        }
        if (r.total !== 1000) ctx.say(L(`The scale says ${r.total} g. The recipe is 1,000 g altogether.`, `秤上显示 ${r.total} 克。菜谱是一共 1000 克。`), 'bad');
        else ctx.say(L('The total is right, but the split isn’t, since the recipe wants onion, carrot and meat at 2 : 3 : 5.', '总重对了，可分配不对，菜谱要的是洋葱、胡萝卜、肉 2 : 3 : 5。'), 'bad');
      };
      drawTotal();
      body.append(h('div', { class: 'cols' },
        h('div', {},
          h('div', { class: 'club' }, h('div', { class: 'lbl' }, L('The recipe', '菜谱')), h('p', { class: 'small' }, L('Onion, carrot and meat in the ratio 2 : 3 : 5. 1,000 g altogether.', '洋葱、胡萝卜、肉，比例 2 : 3 : 5。一共 1000 克。'))),
          h('div', { class: 'club' }, h('div', { class: 'lbl' }, L('The note on the containers', '罐子上的纸条')), h('p', { class: 'small' }, L('Every label is wrong. Only the Meat container has a window, and it’s full of onion.', '每个标签都贴错了。只有“肉”罐有小窗，里面是洋葱。'))),
          h('div', { class: 'lbl', style: 'margin-top:16px' }, L('Scale', '秤')), total),
        h('div', {}, rows, h('div', { class: 'actions' }, tare, go))));
    },
  });
}

const LANES = ['burner', 'oven', 'trivet'];
const DISH_COLORS = { stew: '#c78b4a', rice: '#e2d6a8', garnish: '#7fae6a' };
const FOUND = { stew: 'stewcard', rice: 'ricelid', garnish: 'garnishtag' };

export function serviceStation() {
  const st = S.station('service');
  const starts = st.starts || { stew: 0, rice: 0, garnish: 0 };
  station({
    id: 'service', kicker: L('The kitchen', '厨房'), title: L('Plan the cooking times', '安排做饭时间'), hint: 'service',
    build(body, ctx) {
      const cv = h('canvas', { class: 'board' });
      const g = hiDPI(cv, 560, 230);
      const known = (d) => S.data.journal.includes(FOUND[d]);
      const draw = () => {
        const res = checkSchedule(starts);
        g.fillStyle = '#1d1a16'; g.fillRect(0, 0, 560, 230);
        const X = (m) => 90 + m * 38, laneY = (i) => 36 + i * 58;
        g.font = '600 13px "Sofia Sans Semi Condensed", "Noto Sans SC", sans-serif';
        for (let m = 0; m <= 12; m++) { g.fillStyle = m === SERVICE_AT ? '#e0a030' : '#7a705e'; g.fillText(String(m), X(m) - 4, 20); g.fillStyle = 'rgba(239,230,214,0.08)'; g.fillRect(X(m), 28, 1, 180); }
        g.fillStyle = 'rgba(224,160,48,0.6)'; g.fillRect(X(12) - 1, 28, 2, 180);
        LANES.forEach((l, i) => { g.fillStyle = '#a89c84'; g.fillText(PLACE(l).toUpperCase(), 14, laneY(i) + 26); g.fillStyle = '#2a2520'; g.fillRect(X(0), laneY(i) + 6, X(12) - X(0), 32); });
        for (const p of res.phases) {
          if (!known(p.dish)) continue;
          const i = LANES.indexOf(p.res);
          const a = Math.max(-1, p.from), b = Math.min(14, p.to);
          g.fillStyle = DISH_COLORS[p.dish];
          g.globalAlpha = 0.9;
          g.fillRect(X(a) + 1, laneY(i) + 8, X(b) - X(a) - 2, 28);
          g.globalAlpha = 1;
          g.fillStyle = '#1d1a16'; g.font = '700 13px "Sofia Sans Semi Condensed", "Noto Sans SC", sans-serif';
          g.fillText(DISH(p.dish), X(a) + 6, laneY(i) + 27);
        }
        for (const c of res.clashes) {
          if (!known(c.a) || !known(c.b)) continue;
          const i = LANES.indexOf(c.res);
          g.strokeStyle = '#ff6a50'; g.lineWidth = 3; g.strokeRect(X(c.from) + 1, laneY(i) + 6, X(c.to) - X(c.from) - 2, 32);
        }
      };
      const controls = h('div', { class: 'svc-rows' });
      for (const d of Object.keys(DISHES)) {
        const k = known(d);
        const steps = DISHES[d].map((p) => L(`${p.dur} min on the ${PLACE(p.res)}`, `${PLACE(p.res)}上 ${p.dur} 分钟`)).join(L(', then ', '，然后'));
        const out = h('output', {}, L(`minute ${starts[d]}`, `第 ${starts[d]} 分钟`));
        const range = h('input', { type: 'range', min: 0, max: 12, step: 1, value: starts[d], disabled: !k, 'aria-label': L(`When the ${DISH(d)} goes on the stove`, `${DISH(d)}什么时候上灶`) });
        range.oninput = () => { starts[d] = Number(range.value); out.textContent = L(`minute ${starts[d]}`, `第 ${starts[d]} 分钟`); st.starts = starts; S.saveStation(); draw(); ctx.say(''); };
        controls.append(h('div', { class: 'svc-row' },
          h('div', {}, h('b', {}, L(DISH(d)[0].toUpperCase() + DISH(d).slice(1), DISH(d))), h('div', { class: 'small muted' }, k ? steps : L(`Cooking time not known yet. Find the ${{ stew: 'stew card', rice: 'rice pot lid', garnish: 'garnish tag' }[d]}.`, `还不知道时间。去找${{ stew: '炖菜卡片', rice: '米饭锅盖', garnish: '配菜标签' }[d]}。`))),
          h('div', { class: 'small' }, L('Goes on the stove at', '上灶时间')), range, out));
      }
      const go = h('button', { class: 'btn primary' }, L('Start cooking', '开始做饭'));
      go.onclick = () => {
        const missing = Object.keys(DISHES).filter((d) => !known(d));
        if (missing.length) { const names = missing.map(DISH);
        const list = names.length > 1 ? L(`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`, names.join('、')) : names[0];
        ctx.say(L(`You don’t know how long the ${list} take${missing.length > 1 ? '' : 's'} yet. Have a look around the stove.`, `你还不知道${list}要做多久。去灶台附近找找。`), 'bad'); return; }
        const r = checkSchedule(starts);
        if (r.ok) {
          G.sfx('passbell');
          S.set('service_ok');
          ctx.say(L('Three hot dishes, all ready at minute 12, and the serving bell rings all by itself.', '三道热菜，第 12 分钟全部做好，出菜铃自己响了起来。'), 'good');
          setTimeout(() => { ctx.close(); G.porter([[L('Dinner is served, and I had no idea that bell could ring by itself. There is also something waiting for you in the serving window.', '开饭了，我都不知道那个铃会自己响。另外，出菜窗口里有样东西在等您。'), 3800]]); }, 1900);
          return;
        }
        G.sfx('bad');
        if (r.clashes.length) { const c = r.clashes[0]; ctx.say(L(`The ${DISH(c.a)} and the ${DISH(c.b)} both need the ${PLACE(c.res)} at minute ${c.from}. There’s only one.`, `第 ${c.from} 分钟，${DISH(c.a)}和${DISH(c.b)}都要用${PLACE(c.res)}。可是只有一个。`), 'bad'); }
        else { const d = r.late[0]; ctx.say(L(`The ${DISH(d)} would be ready at minute ${r.finish[d]}, not minute 12.`, `${DISH(d)}会在第 ${r.finish[d]} 分钟做好，不是第 12 分钟。`), 'bad'); }
      };
      draw();
      body.append(cv, controls, h('div', { class: 'actions' }, go));
    },
  });
}
