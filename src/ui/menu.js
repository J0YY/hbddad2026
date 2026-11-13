import { S } from '../core/state.js';
import { Audio } from '../core/audio.js';
import { esc } from './panels.js';
import { L, N, lang } from '../game/i18n.js';
import { SHORTCUT_WORD } from '../game/content.js';

// The room shortcut shows up after the game has been finished once on this device
// (or with ?rooms in the address, for testing).
const shortcutOpen = () => { try { return localStorage.getItem('party-of-three/finished') === '1' || /[?&]rooms\b/.test(location.search); } catch { return false; } };
const norm = (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '');
import { IN } from '../core/input.js';

const el = () => document.getElementById('menu');

const langSwitch = () => `<div class="langswitch" role="group" aria-label="Language / 语言">
  <button data-lang="en" aria-pressed="${lang() === 'en'}">English</button><button data-lang="zh" aria-pressed="${lang() === 'zh'}">中文</button></div>`;
function bindLang(root, redraw) {
  root.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => {
    S.settings.lang = b.dataset.lang;
    S.saveSettings();
    redraw();
  }));
}

export const Menu = {
  isOpen: false,
  close() { el().innerHTML = ''; el().classList.remove('on'); this.isOpen = false; },
  _open(html) { el().innerHTML = html; el().classList.add('on'); this.isOpen = true; },

  title({ onBegin, onContinue, onRoom }) {
    const has = S.hasSave();
    const again = () => this.title({ onBegin, onContinue, onRoom });
    this._open(`<div class="title">
      ${langSwitch()}
      <h1>${L('Party<br>of Three', '三人桌')}</h1>
      <div class="for">${L(`for ${N('dad')}, from ${N('joy')}`, `送给 ${N('dad')}　来自 ${N('joy')}`)}</div>
      <div class="mlist" role="menu">
        ${has ? `<button data-a="continue" role="menuitem">${L('Continue', '继续')}</button>` : ''}
        <button data-a="begin" role="menuitem">${has ? L('Start over', '重新开始') : L('Begin', '开始')}</button>
        ${shortcutOpen() ? `<button data-a="rooms" role="menuitem">${L('Go to a room', '直接去某个房间')}</button>` : ''}
        <button data-a="settings" role="menuitem">${L('Settings', '设置')}</button>
      </div>
      <div class="foot">${IN.touch
        ? L('Put your left thumb down and drag to walk. Drag on the right to look around, and tap to use things. Turn the sound on if you can. The game saves as you go.', '左手拇指按住屏幕拖动来走路。在右边拖动来看四周，点一下来使用东西。可以的话把声音打开。游戏会自动保存。')
        : L('Mouse and keyboard. Turn the sound on if you can. The game saves as you go.', '用鼠标和键盘玩。可以的话把声音打开。游戏会自动保存。')}</div>
      <div class="turnhint">${L('Turn your phone sideways for a bigger view.', '把手机横过来，画面会更大。')}</div>
    </div>`);
    const root = el();
    bindLang(root, again);
    root.querySelector('[data-a="continue"]')?.addEventListener('click', () => { this.close(); onContinue(); });
    root.querySelector('[data-a="begin"]').addEventListener('click', () => {
      if (has) { this.confirm(L('Start again from the beginning? Your progress will be lost.', '从头开始吗？现在的进度会被清除。'), () => { this.close(); onBegin(); }, again); return; }
      this.close(); onBegin();
    });
    root.querySelector('[data-a="settings"]').addEventListener('click', () => this.settings(again));
    root.querySelector('[data-a="rooms"]')?.addEventListener('click', () => this.rooms(onRoom, again));
    setTimeout(() => root.querySelector('.mlist button')?.focus(), 50);
  },

  rooms(onRoom, back) {
    const ROOMS = [['study', L('The study', '书房')], ['trading', L('The trading room', '交易室')], ['lab', L('The computer room', '机房')], ['court', L('The tennis court', '网球场')], ['kitchen', L('The kitchen', '厨房')], ['wild', L('Outdoors', '户外')]];
    this._open(`<div class="pause"><div>
      <h1 style="font-size:44px">${L('Go to a room', '直接去某个房间')}</h1>
      <p class="muted" style="max-width:520px">${L('Type the password from Porter’s last receipt. Going to a room starts a fresh game from that point, so your current progress will be replaced.', '输入 Porter 最后那张小票上的密码。直接去某个房间会从那里重新开始，现在的进度会被替换。')}</p>
      <form class="pwform"><input type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${L('Password', '密码')}" placeholder="${L('Password', '密码')}"><button class="btn" type="submit">${L('Unlock', '解锁')}</button></form>
      <p class="pwmsg" role="status"></p>
      <div class="mlist roomlist" hidden>${ROOMS.map(([id, n]) => `<button data-room="${id}">${n}</button>`).join('')}</div>
      <div class="mlist"><button data-a="back">${L('Back', '返回')}</button></div>
    </div><div></div></div>`);
    const root = el();
    const input = root.querySelector('input'), msg = root.querySelector('.pwmsg'), list = root.querySelector('.roomlist');
    root.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      if (norm(input.value) === norm(SHORTCUT_WORD)) { list.hidden = false; root.querySelector('form').hidden = true; msg.textContent = L('Pick a room.', '选一个房间。'); list.querySelector('button').focus(); }
      else { msg.textContent = L('That isn’t the password, according to Porter.', 'Porter 说密码不对。'); Audio.sfx?.('deny'); }
    };
    root.querySelectorAll('[data-room]').forEach((b) => (b.onclick = () => { this.close(); onRoom(b.dataset.room); }));
    root.querySelector('[data-a="back"]').onclick = back;
    setTimeout(() => input.focus(), 50);
  },

  confirm(question, yes, no) {
    this._open(`<div class="pause"><div><h1 style="font-size:44px;max-width:640px;line-height:1.1">${esc(question)}</h1>
      <div class="mlist"><button data-a="no" autofocus>${L('No, go back', '不了，返回')}</button><button data-a="yes">${L('Yes, start over', '是的，重新开始')}</button></div></div><div></div></div>`);
    const root = el();
    root.querySelector('[data-a="yes"]').onclick = yes;
    root.querySelector('[data-a="no"]').onclick = no;
    setTimeout(() => root.querySelector('[data-a="no"]').focus(), 30);
  },

  pause({ onResume, onJournal, onHints, onQuit }) {
    const again = () => this.pause({ onResume, onJournal, onHints, onQuit });
    this._open(`<div class="pause">
      <div>
        <h1>${L('Paused', '暂停')}</h1>
        <div class="mlist">
          <button data-a="resume" autofocus>${L('Resume', '继续玩')}</button>
          <button data-a="journal">${L('Journal', '日记本')}</button>
          <button data-a="hints">${L('Hints', '提示')}</button>
          <button data-a="settings">${L('Settings', '设置')}</button>
          <button data-a="quit">${L('Title screen', '回到标题画面')}</button>
        </div>
      </div>
      <div class="controls">
        <h3>${L('Controls', '操作')}</h3>
        ${IN.touch ? `<div class="ctl">
          <span>${L('Walk', '走路')}</span><span>${L('Put your thumb down on the left side and drag. Push all the way out to sprint.', '在左半边按住拖动。推到底就是跑。')}</span>
          <span>${L('Look around', '看四周')}</span><span>${L('Drag on the right side.', '在右半边拖动。')}</span>
          <span>${L('Jump, crouch', '跳、蹲下')}</span><span>${L('The two buttons in the bottom right corner.', '右下角的两个按钮。')}</span>
          <span>${L('Use, pick up, read', '使用、拿起、阅读')}</span><span>${L('Tap the Use button, or tap the right side.', '点"使用"按钮，或者点一下右半边。')}</span>
          <span>${L('Journal, hints, menu', '日记本、提示、菜单')}</span><span>${L('The buttons in the top right corner.', '右上角的按钮。')}</span>
        </div>` : `<div class="ctl">
          <span>${L('Walk', '走路')}</span><span class="k"><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> ${L('or the arrow keys', '或方向键')}</span>
          <span>${L('Look around', '看四周')}</span><span>${L('Move the mouse.', '移动鼠标。')} <span class="key">Q</span> <span class="key">R</span> ${L('also turn', '也可以转身')}</span>
          <span>${L('Sprint', '跑')}</span><span class="k">${L('Hold', '按住')} <span class="key">Shift</span></span>
          <span>${L('Jump', '跳')}</span><span class="k"><span class="key">Space</span></span>
          <span>${L('Crouch, or stand back up', '蹲下 / 站起来')}</span><span class="k"><span class="key">C</span></span>
          <span>${L('Look closer', '凑近看')}</span><span>${L('Hold the right mouse button', '按住鼠标右键')}</span>
          <span>${L('Use, pick up, read', '使用、拿起、阅读')}</span><span class="k"><span class="key">E</span> ${L('or left click', '或鼠标左键')}</span>
          <span>${L('Journal', '日记本')}</span><span class="k"><span class="key">J</span></span>
          <span>${L('Hints', '提示')}</span><span class="k"><span class="key">H</span></span>
          <span>${L('Pause', '暂停')}</span><span class="k"><span class="key">Esc</span></span>
        </div>`}
      </div>
    </div>`);
    const root = el();
    root.querySelector('[data-a="resume"]').onclick = () => { this.close(); onResume(); };
    root.querySelector('[data-a="journal"]').onclick = () => { this.close(); onJournal(); };
    root.querySelector('[data-a="hints"]').onclick = () => { this.close(); onHints(); };
    root.querySelector('[data-a="settings"]').onclick = () => this.settings(again);
    root.querySelector('[data-a="quit"]').onclick = () => { this.close(); onQuit(); };
    setTimeout(() => root.querySelector('button').focus(), 30);
  },

  settings(back) {
    const s = S.settings;
    const again = () => this.settings(back);
    const seg = (key, opts) => `<span class="seg">${opts.map(([v, l]) => `<button data-k="${key}" data-v="${v}" aria-pressed="${String(s[key]) === String(v)}">${l}</button>`).join('')}</span>`;
    this._open(`<div class="pause"><div>
      <h1>${L('Settings', '设置')}</h1>
      <div class="settings">
        <label>${L('Language', '语言')}<span>${seg('lang', [['en', 'English'], ['zh', '中文']])}</span></label>
        <label>${L('Graphics', '画面')}<span>${seg('quality', [['auto', L('Auto', '自动')], ['fast', L('Fast', '流畅')], ['balanced', L('Balanced', '均衡')], ['pretty', L('Pretty', '精美')]])}</span></label>
        <label>${IN.touch ? L('Look speed', '转动速度') : L('Mouse speed', '鼠标灵敏度')}<input type="range" min="0.3" max="2.5" step="0.1" value="${s.sens}" data-r="sens"></label>
        <label>${L('Flip up and down', '上下反转')}<span>${seg('invertY', [[false, L('Off', '关')], [true, L('On', '开')]])}</span></label>
        <label>${L('Text size', '文字大小')}<span>${seg('text', [[1, '100%'], [1.2, '120%'], [1.4, '140%']])}</span></label>
        <label>${L('Less movement', '减少动画')}<span>${seg('reduced', [[false, L('Off', '关')], [true, L('On', '开')]])}</span></label>
        <label>${L('Sound', '声音')}<span>${seg('sound', [[true, L('On', '开')], [false, L('Off', '关')]])}</span></label>
        <label>${L('Volume', '音量')}<input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-r="volume"></label>
      </div>
      <p class="muted" style="max-width:460px;margin-top:18px;font-size:15px">${L('If the game feels slow, choose Fast.', '如果游戏卡，选"流畅"。')}</p>
      <div class="mlist" style="margin-top:14px"><button data-a="back" autofocus>${L('Back', '返回')}</button></div>
    </div><div></div></div>`);
    const root = el();
    root.querySelectorAll('[data-r]').forEach((r) => (r.oninput = () => { s[r.dataset.r] = Number(r.value); S.saveSettings(); Audio.applySettings(); }));
    root.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      const v = b.dataset.v;
      s[b.dataset.k] = v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v);
      S.saveSettings(); Audio.applySettings();
      if (b.dataset.k === 'lang') { again(); return; }
      root.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    root.querySelector('[data-a="back"]').onclick = back;
    setTimeout(() => root.querySelector('[data-a="back"]').focus(), 30);
  },
};

export function applyTextScale() {
  document.documentElement.style.setProperty('--scale', S.settings.text);
  document.documentElement.lang = lang();
  document.body.classList.toggle('reduced', !!S.settings.reduced);
  document.title = L('Party of Three', '三人桌');
  const ld = document.querySelector('#loading span');
  if (ld) ld.textContent = L('Building the house…', '正在搭房子…');
  const lh = document.getElementById('lockhint');
  if (lh) lh.textContent = L('Click to look around', '点击画面来看四周');
}

export { esc };
