// Three chess puzzles against the computer room's robot. Each one is missing the white piece
// that delivers mate, and that piece is hidden somewhere in the room.
import { station, h } from './common.js';
import { S } from '../core/state.js';
import { G } from '../game/api.js';
import { L, KT } from '../game/i18n.js';
import { PUZZLES, chessSolved } from '../game/clues.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';

const QUIPS = () => [
  L('The robot thinks about that for a fraction of a second and then looks unbearably pleased with itself. That isn’t mate, so have another go.', '机器人想了零点几秒，然后露出一副特别得意的样子。这步不是将死，再试一次吧。'),
  L('That isn’t mate, and the robot would like you to know it saw that one coming in 1997.', '这步不是将死。机器人想让你知道，这一招它 1997 年就料到了。'),
  L('The robot hums something that sounds a lot like gloating. Try a different move.', '机器人哼了一段，听起来很像在幸灾乐祸。换一步试试。'),
];

export function chessStation() {
  let cur = PUZZLES.find((p) => S.has(p.piece) && !S.has('chess_' + p.id)) || PUZZLES[0];
  let quip = 0;
  station({
    id: 'chess', kicker: L('The computer room', '机房'), title: L('A game with the robot', '和机器人下棋'), hint: 'chess',
    build(body, ctx) {
      const tabs = h('div', { class: 'choice chess-tabs' });
      const info = h('div', { class: 'chess-info' });
      const grid = h('div', { class: 'chessboard', role: 'grid' });
      let board, step, sel, busy;

      const reset = () => { board = { ...cur.board }; step = 0; sel = null; busy = false; };
      const drawTabs = () => {
        tabs.innerHTML = '';
        for (const p of PUZZLES) {
          const done = S.has('chess_' + p.id), have = S.has(p.piece);
          const b = h('button', { class: 'btn small' + (p === cur ? ' on' : ''), 'aria-pressed': String(p === cur) },
            `${done ? '✓ ' : ''}${p.name()}`);
          b.onclick = () => { cur = p; reset(); ctx.say(''); drawAll(); };
          if (!have) b.classList.add('locked');
          tabs.append(b);
        }
      };
      const drawInfo = () => {
        info.innerHTML = '';
        if (!S.has(cur.piece)) {
          info.append(h('p', {}, L(`This board is missing ${cur.missing()}, and the robot refuses to start a puzzle with a piece missing. It’s somewhere in this room.`, `这盘棋少了${cur.missing()}，缺子的残局机器人一概不下。棋子就在这个房间里。`)));
          return;
        }
        info.append(h('p', { class: 'goal' }, cur.goal()));
        if (S.has('chess_' + cur.id)) info.append(h('p', { class: 'muted' }, L('Solved. The robot has asked that nobody mention this one again.', '已解决。机器人请求大家以后别再提这盘棋。')));
        else info.append(h('p', { class: 'muted small' }, KT(L('Click one of your pieces, then the square you want it to go to.', '先点你的一个棋子，再点要走到的格子。'), L('Tap one of your pieces, then the square you want it to go to.', '先点你的一个棋子，再点要走到的格子。'))));
      };
      const drawBoard = () => {
        grid.innerHTML = '';
        const locked = !S.has(cur.piece);
        for (let r = 8; r >= 1; r--) {
          for (let f = 0; f < 8; f++) {
            const sq = FILES[f] + r;
            let pc = board[sq];
            if (locked && sq === cur.at) pc = null;
            const dark = (f + r) % 2 === 1;
            const cell = h('button', { class: 'sq' + (dark ? ' d' : ' l') + (sel === sq ? ' sel' : ''), 'aria-label': sq + (pc ? ' ' + pc : '') });
            if (pc) cell.append(h('span', { class: 'pc ' + (pc === pc.toUpperCase() ? 'w' : 'b') }, GLYPH[pc.toLowerCase()] + '︎'));
            if (f === 0) cell.append(h('i', { class: 'rk' }, String(r)));
            if (r === 1) cell.append(h('i', { class: 'fl' }, FILES[f]));
            cell.onclick = () => click(sq);
            grid.append(cell);
          }
        }
      };
      const drawAll = () => { drawTabs(); drawInfo(); drawBoard(); };

      const move = (mv) => { const a = mv.slice(0, 2), b = mv.slice(2, 4); board[b] = board[a]; delete board[a]; };
      const click = (sq) => {
        if (busy || !S.has(cur.piece) || S.has('chess_' + cur.id)) return;
        const pc = board[sq];
        if (!sel) {
          if (pc && pc === pc.toUpperCase()) { sel = sq; G.sfx('click'); drawBoard(); }
          return;
        }
        if (pc && pc === pc.toUpperCase()) { sel = sq === sel ? null : sq; drawBoard(); return; }
        const mv = sel + sq;
        sel = null;
        if (mv !== cur.line[step]) {
          G.sfx('deny');
          ctx.say(QUIPS()[quip++ % 3], 'bad');
          busy = true;
          move(mv); drawBoard();
          setTimeout(() => { reset(); drawBoard(); }, 900);
          return;
        }
        move(mv); step++;
        G.sfx('thock');
        drawBoard();
        if (step < cur.line.length) {
          // the robot's forced reply
          busy = true;
          ctx.say(L('Check. The robot has exactly one way out, and it takes it.', '将军。机器人只有一条路可走，它也只好走了。'), '');
          setTimeout(() => { move(cur.line[step]); step++; busy = false; G.sfx('thock'); drawBoard(); ctx.say(L('The robot took your queen and looks delighted about it. Your move.', '机器人吃掉了你的后，看起来高兴坏了。轮到你了。')); }, 900);
          return;
        }
        S.set('chess_' + cur.id);
        G.sfx('good');
        const n = chessSolved();
        ctx.say(n < PUZZLES.length ? L(`Checkmate. That’s ${n} of the ${PUZZLES.length}, and the robot has gone a slightly different shade of grey.`, `将死。${PUZZLES.length} 盘赢了 ${n} 盘，机器人的脸色都变了。`) : L('Checkmate, twice over. The robot sets down the parcel it’s been holding and rolls back to let you have it.', '将死，两盘全胜。机器人放下一直抱着的包裹，往后退开，让给你了。'), 'good');
        if (n === PUZZLES.length) { S.set('deadlock_ok'); S.set('robot_ok'); setTimeout(() => ctx.close(), 2200); }
        drawTabs(); drawInfo();
      };

      reset();
      body.append(tabs, h('div', { class: 'cols chess-cols' }, grid, info));
      drawAll();
    },
  });
}
