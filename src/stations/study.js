import { station, h } from './common.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L, N } from '../game/i18n.js';
import { ENTRIES } from '../game/content.js';

// Joy's station. Porter's signal meter only says OK when the radio is exactly on it.
export const YAN_FM = 101.3;

const OTHER = () => ({
  94.7: L('Weather: light rain tonight, but only over the trading room.', '天气：今晚有小雨，不过只下在交易室。'),
  99.1: L('Someone is reading out the opening times of every tennis court in the city.', '有人在念全市每个网球场的开放时间。'),
  105.9: L('A piano, playing “Happy Birthday” very slowly.', '一架钢琴，在很慢很慢地弹《生日快乐》。'),
});

export function radioStation() {
  const st = S.station('radio');
  st.f = st.f ?? 92.5;
  st.on = st.on ?? false;
  station({
    id: 'radio', kicker: L('The study', '书房'), title: L('The radio on the windowsill', '窗台上的收音机'), hint: 'study',
    build(body, ctx) {
      const power = h('button', { class: 'btn', 'aria-pressed': String(st.on) });
      const dial = h('div', { class: 'fmdial' });
      const slider = h('input', { type: 'range', min: '88', max: '108', step: '0.1', value: String(st.f), 'aria-label': L('Tuning', '调台') });
      const out = h('div', { class: 'radio-out muted' });
      const meter = h('div', { class: 'meter' }, h('div', { class: 'lbl' }, L('Porter’s signal meter', 'Porter 的信号表')), h('div', { class: 'bar' }, h('i')), h('div', { class: 'lamp' }));
      const bar = meter.querySelector('.bar i');
      const lamp = meter.querySelector('.lamp');
      let played = S.has('radio_ok');

      const draw = () => {
        const f = Math.round(st.f * 10) / 10;
        power.textContent = st.on ? L('Turn off', '关掉') : L('Turn on', '打开');
        power.setAttribute('aria-pressed', String(st.on));
        dial.textContent = st.on ? `FM ${f.toFixed(1)}` : '—';
        slider.disabled = !st.on;
        fine.forEach((b) => (b.disabled = !st.on));
        const d = Math.abs(f - YAN_FM);
        const strength = st.on ? Math.max(0, 1 - d / 0.8) : 0;
        bar.style.width = `${Math.round(strength * 100)}%`;
        const ok = st.on && d < 0.05;
        lamp.className = 'lamp ' + (ok ? 'ok' : strength > 0 ? 'near' : '');
        lamp.textContent = ok ? L('OK', '可以') : strength > 0 ? L('Close', '接近了') : L('No signal', '没有信号');
        out.innerHTML = '';
        if (!st.on) { out.textContent = L('The radio is off.', '收音机关着。'); return; }
        if (ok) {
          out.className = 'radio-out';
          out.append(...[
            ...ENTRIES.radiomsg.body,
          ].map((t) => h('p', {}, t)));
          if (!played) {
            played = true;
            S.addJournal('radiomsg');
            G.sfx('chime');
            if (S.set('radio_ok')) ctx.say(L('Over on the desk, Porter’s signal meter clicks round to OK.', '桌上那边，Porter 的信号表咔哒一声跳到了“可以”。'), 'good');
          }
          return;
        }
        out.className = 'radio-out muted';
        const near = Object.entries(OTHER()).find(([k]) => Math.abs(Number(k) - f) < 0.05);
        out.textContent = near ? near[1] : L('Static.', '沙沙的杂音。');
      };
      const tune = (v) => { st.f = Math.min(108, Math.max(88, Math.round(v * 10) / 10)); slider.value = String(st.f); S.saveStation(); G.sfx('static'); ctx.say(''); draw(); };
      const fine = [h('button', { class: 'btn small', onclick: () => tune(st.f - 0.1) }, '−0.1'), h('button', { class: 'btn small', onclick: () => tune(st.f + 0.1) }, '+0.1')];
      slider.oninput = () => tune(Number(slider.value));
      power.onclick = () => { st.on = !st.on; S.saveStation(); G.sfx('click'); draw(); };
      body.append(h('div', { class: 'cols' },
        h('div', { class: 'radio' }, h('div', { class: 'radio-top' }, dial, power), slider, h('div', { class: 'choice' }, fine[0], fine[1])),
        h('div', {}, meter, out)));
      draw();
    },
  });
}
