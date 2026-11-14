import { S } from '../core/state.js';
import { L, KT } from './i18n.js';
import { ticketsFound, piecesFound, chessSolved, PUZZLES } from './clues.js';
import { W } from '../world/kit.js';


// The objective is always worked out from saved progress, so it can never drift out of sync.
// [flag that ends this step, English, Chinese, compass target, hint set]
const CHAIN = [
  ['read_L1', 'Open the envelope on the desk', '打开桌上的信封', 'envelope', 'study'],
  ['bell_rung', 'Ring the bell on the desk', '摇一下桌上的铃', 'bell', 'study'],
  ['radio_ok', 'Tune the radio on the windowsill to Joy’s station, so Porter hears her OK', '把窗台上的收音机调到 Joy 的电台，让 Porter 听到她的许可', 'radio', 'study'],
  ['badge', 'Take your badge from Porter’s printer', '从 Porter 的打印机里拿你的胸牌', 'badge', 'study'],
  ['study_door', 'Tap your badge on the reader by the glass door', '在玻璃门旁的读卡器上刷胸牌', 'reader', 'study'],
  ['read_L2', 'Read Joy’s note on the big desk in the middle of the room', '看房间中间大桌子上 Joy 的纸条', 'mandate', 'screen'],
  ['fern_ok', () => (W.bellRun?.on ? `Tear up Porter’s four sell orders before the opening bell. Torn up: ${ticketsFound()} of 4` : 'The bell rang, but Porter forgot to press the button. The clock starts again in a moment'),
    () => (W.bellRun?.on ? `开盘铃响之前，撕掉 Porter 的四张卖单。已撕掉：${ticketsFound()} / 4` : '开盘铃响了，可 Porter 忘了按确认键。马上重新计时'), null, 'screen'],
  ['lab_door', 'Use the room key card on the computer room door', '用门卡打开机房的门', 'labreader', 'position'],
  ['read_L3', 'Read the notice taped over the wall screen', '看贴在墙上屏幕上的告示', 'report', 'chess'],
  ['robot_ok', () => (piecesFound() < PUZZLES.length ? `Find the robot’s two missing white pieces, then beat it at the chessboard. Pieces found: ${piecesFound()} of 2, puzzles won: ${chessSolved()} of 2` : `Beat the robot at the chessboard. Puzzles won: ${chessSolved()} of 2`),
    () => (piecesFound() < PUZZLES.length ? `找到机器人缺的两个白子，再到棋盘上赢它。棋子：${piecesFound()} / 2，赢了：${chessSolved()} / 2` : `在棋盘上赢机器人。赢了：${chessSolved()} / 2`), () => (piecesFound() > chessSolved() ? 'tray' : null), 'chess'],
  ['tok_chip', 'Take the token from the robot’s glass box', '从机器人的玻璃箱里拿铜牌', 'chip', 'chess'],
  ['read_L4', 'Read the booking slip on the umpire’s chair', '看看裁判椅上的订场单', 'slip', 'tennis'],
  ['racket_got', 'Borrow the racket from the bench by the left-hand wall', '从左边墙边的长凳上借一把球拍', 'racket2', 'tennis'],
  ['rally_ok', () => (W.tennis?.on ? `Win one game against the machine. Score: ${W.tennis.scoreText()}` : 'Start the ball machine by the near baseline and win one game against it'),
    () => (W.tennis?.on ? `和发球机打赢一局。比分：${W.tennis.scoreText()}` : '启动近端底线旁的发球机，和它打赢一局'), () => (W.tennis?.on ? null : 'machine'), 'tennis'],
  ['tok_racket', 'See what opened on the umpire’s chair', '看看裁判椅上打开了什么', 'umpire', 'tennis'],
  ['kitchen_door', 'Unlock the kitchen door', '打开厨房的门', 'kdoor', 'tennis'],
  ['read_L5', 'Look under the recipe stand', '看看菜谱架下面', 'stand', 'prep'],
  ['prep_ok', 'Weigh out the ingredients on the scale', '在秤上称好食材', 'scale', 'prep'],
  ['service_ok', 'Plan the cooking times on the board by the stove', '在灶台旁的板子上安排做饭时间', 'board', 'service'],
  ['tok_ladle', 'Take the token from the serving window', '从出菜窗口拿铜牌', 'pass', 'service'],
  ['bowl2', 'Turn on the oven light and take out the two hidden bowls', '打开烤箱灯，拿出藏着的两个碗', 'oven', 'tray'],
  ['tray_set', 'Put the tray on the shelf by the back door', '把托盘放到后门边的架子上', 'shelf', 'tray'],
  ['read_L6', 'Have a look at the mugs by the tent', '看看帐篷边的杯子', 'mugs', 'beacon'],
  ['read_pine', 'Read the tag on the split pine tree (P on Joy’s map)', '看分叉松树上的标签（Joy 地图上的 P）', 'pine', 'beacon'],
  ['beacon_found', 'Dig up the box at the red X, east of the split pine', '在分叉松树东边的红色 X 那里，把盒子挖出来', 'digx', 'beacon'],
  ['tok_star', 'Open the brass box and take the star token', '打开黄铜盒子，拿出星星铜牌', 'case', 'beacon'],
  ['day_ok', 'Follow the lanterns, then put the tokens in order', '跟着灯笼走，然后把铜牌排好顺序', 'clock', 'clock'],
  ['read_L7', 'Open your letter', '打开你的信', 'letter7', null],
];

// A step counts as done once anything after it is done. Every later step is locked behind the
// earlier ones, so this only matters for notes you walked past and for saves from older versions
// of the game that are missing a flag, which would otherwise leave the objective and hints stuck.
const passed = (i) => CHAIN.slice(i + 1).some(([f]) => S.has(f));

export function objective() {
  for (const [i, [flag, en0, zh0, mark0, hint]] of CHAIN.entries()) {
    if (!S.has(flag) && !passed(i)) {
      const v = (x) => (typeof x === 'function' ? x() : x);
      const en = v(en0), zh = v(zh0), mark = v(mark0);
      let h = hint;
      if (flag === 'day_ok' && !S.has('in_clearing')) return { text: L('Follow the lanterns down the trail', '顺着灯笼沿小路走下去'), mark: 'trail', hint: null, flag };
      return { text: L(en, zh), mark, hint: h, flag };
    }
  }
  return { text: L('Walk around the house as long as you like', '随便逛，想逛多久都行'), mark: null, hint: null, flag: 'free' };
}

export const HINT_TITLES = () => ({
  study: L('The study', '书房'), screen: L('Porter’s sell orders', 'Porter 的卖单'),
  chess: L('The chess robot', '下棋的机器人'), tennis: L('Beating the machine', '打赢发球机'), prep: L('The ingredients', '食材'),
  service: L('The cooking times', '做饭时间'), tray: L('The other bowls', '另外的碗'), beacon: L('The buried box', '埋着的盒子'),
  chart: L('The star chart', '星图'), sight: L('The North Star', '北极星'), clock: L('Putting the day in order', '排好这一天'),
});
