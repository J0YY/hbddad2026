import * as THREE from 'three';
import { station, h, Panels, esc } from './common.js';
import { W } from '../world/kit.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L, KT } from '../game/i18n.js';
import { checkDay } from '../game/logic.js';
import { PENCIL, PENCIL_BY, TOKENS } from '../game/content.js';
import { glyphSVG } from '../ui/icons.js';
import { N } from '../game/i18n.js';
import { renderEntry } from '../ui/panels.js';

const TIMES = ['09:30', '12:00', '14:00', '17:00', '21:00'];
const TOK_FOR = { market: 'bell', workbench: 'chip', tennis: 'racket', lunch: 'ladle', camp: 'star' };
const BOOK_FOR = Object.fromEntries(Object.entries(TOK_FOR).map(([b, t]) => [t, b]));

export function clockStation() {
  const st = S.station('clock');
  const slots = st.slots || [null, null, null, null, null]; // token ids
  let held = null;
  const flipped = new Set(st.flipped || []);
  station({
    id: 'clock', kicker: L('The clearing', '林间空地'), title: L('Put the day in order', '排好这一天'), hint: 'clock',
    build(body, ctx) {
      const dial = h('div', { class: 'dial' });
      const tray = h('div', { class: 'tray' });
      const save = () => { st.slots = slots; st.flipped = [...flipped]; S.saveStation(); };
      let bad = [];
      const tokenEl = (t, where) => {
        const isFlipped = flipped.has(t);
        const el = h('div', { class: `tok ${held === t ? 'held' : ''} ${bad.includes(t) ? 'bad' : ''} ${isFlipped ? 'flipped' : ''}`, draggable: 'true', 'data-tok': t });
        const face = h('button', { class: 'coin', 'aria-label': `${TOKENS[t].name}, ${TOKENS[t].booking}. ${where === 'tray' ? L('Pick up', '拿起') : L('Take back', '拿回来')}` , html: glyphSVG(t, '#3a2a12') });
        face.onclick = () => {
          if (where === 'slot') { const i = slots.indexOf(t); slots[i] = null; held = t; }
          else held = held === t ? null : t;
          bad = []; save(); draw(); G.sfx('click');
        };
        const name = h('div', { class: 'tname' }, TOKENS[t].booking);
        const flip = h('button', { class: 'textbtn small' }, isFlipped ? L('Turn back', '翻回去') : L('Turn over', '翻过来看'));
        flip.onclick = () => { isFlipped ? flipped.delete(t) : flipped.add(t); save(); draw(); G.sfx('paper'); };
        el.append(face, name);
        if (isFlipped) el.append(h('div', { class: `back ${PENCIL_BY[t] === 'yan' ? 'yan' : ''}` }, PENCIL[t]));
        el.append(flip);
        el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', t); held = t; });
        return el;
      };
      const draw = () => {
        dial.innerHTML = '';
        TIMES.forEach((time, i) => {
          const s = h('div', { class: `socket ${slots[i] ? 'full' : ''} ${held && !slots[i] ? 'ready' : ''}` }, h('div', { class: 'time' }, time));
          if (slots[i]) s.append(tokenEl(slots[i], 'slot'));
          else {
            const drop = h('button', { class: 'empty', 'aria-label': L(`Put ${held ? TOKENS[held].booking : 'a token'} at ${time}`, `把${held ? TOKENS[held].booking : '铜牌'}放在 ${time}`) }, held ? L('Put it here', '放这里') : L('Empty', '空'));
            drop.onclick = () => { if (!held) return; place(held, i); };
            s.append(drop);
          }
          s.addEventListener('dragover', (e) => e.preventDefault());
          s.addEventListener('drop', (e) => { e.preventDefault(); const t = e.dataTransfer.getData('text/plain'); if (t) place(t, i); });
          dial.append(s);
        });
        tray.innerHTML = '';
        for (const t of Object.keys(TOKENS)) if (!slots.includes(t)) tray.append(tokenEl(t, 'tray'));
        if (!tray.children.length) tray.append(h('p', { class: 'muted small' }, L('All five tokens are on the clock.', '五块铜牌都放上去了。')));
      };
      const place = (t, i) => {
        const from = slots.indexOf(t);
        if (from >= 0) slots[from] = slots[i];
        slots[i] = t;
        held = null; bad = [];
        save(); draw(); G.sfx('thock');
      };
      const lever = h('button', { class: 'btn primary' }, L('Check the order', '检查顺序'));
      lever.onclick = () => {
        if (slots.some((x) => !x)) { ctx.say(L('Every slot needs a token in it before you can check the order.', '每个槽里都放上铜牌，才能检查顺序。'), 'bad'); return; }
        const order = slots.map((t) => BOOK_FOR[t]);
        const r = checkDay(order);
        if (!r.ok) {
          G.sfx('bad');
          bad = r.rule.pair.map((b) => TOK_FOR[b]);
          draw();
          ctx.say(L(`“${PENCIL[r.rule.token]}” That one isn’t true yet. The two tokens it’s about are outlined in red.`, `“${PENCIL[r.rule.token]}”这一条还不对。相关的两块铜牌用红圈标出来了。`), 'bad', L('Porter reads', 'Porter 念道'));
          return;
        }
        G.sfx('good');
        S.set('day_ok');
        ctx.say(L('The clasps let go one at a time, from morning through to night.', '扣子一个接一个松开，从早上一直到晚上。'), 'good');
        setTimeout(() => { ctx.close(); G.porter([[L('That order is correct, so I am letting go of the chairs.', '顺序正确，我这就把椅子放开。'), 3200], [L('There is also an envelope waiting for you under your place card.', '另外，您的座位卡下面压着一个信封。'), 3400]]); }, 1800);
      };
      draw();
      body.append(
        h('p', { class: 'muted' }, L('A plaque says: “Put the day back in order, from morning to night.” ' + KT('Click a token to pick it up, then click a time.', 'Tap a token to pick it up, then tap a time.') + ' Turn the tokens over to read the line on the back.', '牌子上写着：“把这一天从早到晚排好。”点一块铜牌拿起来，再点一个时间放下。把铜牌翻过来，可以看背面的字。')),
        dial, h('div', { class: 'lbl', style: 'margin-top:18px' }, L('Your tokens', '你的铜牌')), tray, h('div', { class: 'actions' }, lever));
    },
  });
}

/* ---------------- the ending ---------------- */


export function ending() {
  const first = !S.has('read_L7');
  G.read('L7', {
    onClose: () => {
      S.set('read_L7');
      if (!first && S.has('ending_seen')) return;
      S.set('ending_seen');
      G.sfx('printer');
      G.porter([[L('The booking has been changed, and I am printing the new one.', '预订已更改，正在打印新的。'), 2600]]);
      setTimeout(() => G.read('R_final', { onClose: () => setTimeout(lightCake, 80) }), 1200);
    },
  });
}

function credits() {
  Panels.show({
    label: L('Credits', '制作名单'),
    cls: 'credits-wrap',
    build(el, close) {
      const credits = L(`THE BACK OF THE RECEIPT

MADE BY ............ ${N('joy').toUpperCase()}
BUTLER .......... PORTER
  (BACK ON THE FRONT
   DESK. FOR GOOD)

FOR ........... ${N('dad').toUpperCase()}
HAPPY 49TH BIRTHDAY`, `小票背面

制作 …………… ${N('joy')}
管家 …………… Porter
（以后只管前台）

送给 …………… ${N('dad')}
四十九岁生日快乐`);
      el.innerHTML = `<div class="paper receipt credits">${esc(credits)}</div>
      <div class="reader-controls" style="justify-content:center;gap:14px;flex-wrap:wrap">
        <button class="btn" data-a="letter">${L('Read the letter again', '再读一遍信')}</button>
        <button class="btn" data-a="sing">${L('Hear them sing again', '再听她们唱一遍')}</button>
        <button class="btn primary" data-a="walk" autofocus>${L('Keep looking around', '继续逛逛')}</button>
      </div>`;
      el.querySelector('[data-a="letter"]').onclick = () => { close(); release(); G.read('L7'); };
      el.querySelector('[data-a="sing"]').onclick = () => { close(); frame(); singSong(credits); };
      el.querySelector('[data-a="walk"]').onclick = () => { close(); release(); };
    },
  });
}

// The camera settles on the table, with Dad at his chair.
function frame() {
  const cg = W.clearing;
  if (!cg) return;
  const c = cg.position;
  G.ctl.place(c.x, c.z + 1.55, 0);
  G.ctl.snapCam = true;
  G.ctl.frozen = true;
  G.view({ pos: new THREE.Vector3(c.x + 1.1, c.y + 1.85, c.z + 3.3), look: new THREE.Vector3(c.x + 0.45, c.y + 1.0, c.z - 0.7) });
}
function release() {
  G.view(null);
  if (G.ctl) G.ctl.frozen = false;
}

function singSong(after) {
  W.family?.sing(true);
  G.sfx('birthday');
  G.say(L('Joy and Yan', 'Joy 和 Yan'), [
    [L('Happy birthday to you', '祝你生日快乐'), 3510],
    [L('Happy birthday to you', '祝你生日快乐'), 3510],
    [L('Happy birthday, dear Dad', '祝你生日快乐'), 4095],
    [L('Happy birthday to you!', '祝你生日快乐！'), 3900],
  ]);
  setTimeout(() => { W.family?.sing(false); G.say(N('joy'), [[L('Make a wish, Dad!', '爸，许个愿吧！'), 2800]]); }, 15200);
  setTimeout(after, 18400);
}

// The end: Joy and Yan walk out of the trees to their chairs, the candles light, and they sing.
export function lightCake() {
  if (!W.clearing || !W.family) { credits(); return; }
  frame();
  G.porter([[L('Two more guests have just arrived. It turns out they were on the list all along.', '又来了两位客人。原来她们一直都在名单上。'), 3600]]);
  const go = () => {
    S.set('family_here');
    S.set('cake_lit');
    G.sfx('lanterns');
    setTimeout(() => singSong(credits), 900);
  };
  if (S.has('family_here')) setTimeout(go, 1200);
  else setTimeout(() => W.family.walkIn(go), 1200);
}

export { renderEntry };
