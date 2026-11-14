// Every piece of readable text in the house, in English and Chinese.
// kind: letter (handwritten, folded in quarters), receipt (Porter's printer), doc (printed paper).
import { L, N, lang, KT } from './i18n.js';

// The five lines copied onto the backs of the tokens, all in Joy's blue pencil.
export const PENCIL_BY = { bell: 'joy', chip: 'joy', racket: 'joy', ladle: 'joy', star: 'joy' };
const PENCIL_T = {
  bell: ['The stock market goes first, before chess, because you always think better in the morning.', '股市放在最前面，排在下棋之前，因为你早上脑子最清楚。'],
  chip: ['Tennis comes straight after chess, with nothing at all in between.', '下完棋马上打网球，中间什么都不安排。'],
  racket: ['There should be exactly one thing between lunch and tennis, and it doesn’t matter which of the two comes first.', '午饭和网球之间正好隔一件事，谁先谁后都行。'],
  ladle: ['Please don’t put lunch right next to camping, and leave at least one thing in between them.', '午饭和露营别挨着，中间至少隔一件事。'],
  star: ['Camping goes after tennis, because the lanterns look so much nicer once it’s dark.', '露营排在网球后面，天黑了灯笼才好看。'],
};
export const PENCIL = new Proxy({}, { get: (_, k) => (PENCIL_T[k] ? L(...PENCIL_T[k]) : undefined) });

const TOKENS_T = {
  bell: [['Bell token', '铃铛铜牌'], ['Stock market', '股市'], ['The trading room', '交易室']],
  chip: [['Chip token', '芯片铜牌'], ['Chess with the robot', '和机器人下棋'], ['The computer room', '机房']],
  racket: [['Racket token', '球拍铜牌'], ['Tennis', '网球'], ['The tennis court', '网球场']],
  ladle: [['Ladle token', '汤勺铜牌'], ['Lunch', '午饭'], ['The kitchen', '厨房']],
  star: [['Star token', '星星铜牌'], ['Camping', '露营'], ['The buried box', '埋着的盒子']],
};
export const TOKENS = new Proxy({}, {
  get: (_, k) => (TOKENS_T[k] ? { name: L(...TOKENS_T[k][0]), booking: L(...TOKENS_T[k][1]), from: L(...TOKENS_T[k][2]) } : undefined),
  ownKeys: () => Object.keys(TOKENS_T),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

// Display names for the stuck jobs and the things they hold.
export const JOB = (k) => L(k, { Courier: '快递机器人', Scorekeeper: '记分员', Beacon: '信号灯', Archive: '档案库' }[k]);
export const RES = (k) => L(k, { Grip: '机械爪', Bus: '数据线', Lamp: '灯' }[k]);
export const STAR = (k) => L(k, { Merak: '天璇', Dubhe: '天枢', Alioth: '玉衡', Polaris: '北极星' }[k] || k);

const table = (head, rows) => `<table class="ledger"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${c}</td>` : `<th>${c}</th>`)).join('')}</tr>`).join('')}</tbody></table>`;

const JOY_LETTER = [
  "dear dad,",
  "happy 49th birthday!! i'm proud you made it to the end of my game - i made it an escape the room game because we like puzzles, even though they're tedious. just like sci-fi, it takes some thinking/effort to make it to the end, but it's very rewarding!",
  "also, i’ve only recently started to understand why you like investing so much, and it’s not only because it helps you make money and accumulate over time, but because there’s something inherently fun and satisfying about coming up with a strategy that works and optimizes for consistency while making gains.",
  "have you heard of goodhart's law? it's a concept that comes up a lot in ML research, and it says, \"when a measure becomes a target, it ceases to be a good measure,\" and it's something I think about a lot when it comes to what we are optimizing for in life. money, status, all of those are reasonable \"proxies\" for success, but just like all proxies, they leave out some parts of the greater thing (success) in the process of compressing it into a proxy.",
  "that's why i admire that you've always been so clear about what you're ultimately optimizing for: freedom. money isn't the end goal, but a means of getting to a point where material constraints no longer prevent you from doing the things you love, like traveling and exploring the world. i think that's a wonderful way to approach life, and it's something i'm working towards as well. you're a great role model for me.",
  "thank you for being the best possible mentor and dad i could have. although i don't always take your advice, i often realize later that you were right all along (like with tech being the optimal career path, lol). i'm very lucky to have grown up with someone whose judgment i can trust and whose perspective continues to shape my own, even as i figure things out for myself.",
  "i love you very much!! <3",
  "love, joy"
];

// Each entry: shared fields + en() / zh() returning the language-specific parts.
const E = {
  /* ---------- Study ---------- */
  L1: {
    kind: 'letter',
    en: () => ({
      title: 'The invitation', where: 'On the desk in the study',
      body: ['Dad,', 'Happy birthday! I built you a house inside the computer, and because it’s your birthday you get to be the very first person to walk around in it.', 'The house is run by a robot butler called Porter, who keeps all the keys and has very firm opinions about rules that he mostly made up himself. If Porter ever tells you one thing and one of my notes tells you something else, believe the note.', 'Every room in this house has a puzzle. Solve it and you get a little brass token, and at the very end you’ll need all five to open the last surprise.', 'Turn this over whenever you’re ready to start.', 'Love, Joy'],
      todo: ['Ring the bell on the desk. That calls Porter, our robot butler.', 'Porter won’t let you into the other rooms without a guest badge, and he won’t print one until he hears an OK from me over the radio. The radio is on the windowsill, and the back of the photo on the desk tells you which station to tune to.', 'Take your badge from Porter’s printer and tap it on the reader by the glass door.'],
      back: 'Ring the bell on the desk once, and Porter will come to the front desk.',
    }),
    zh: () => ({
      title: '邀请函', where: '书房的桌子上',
      body: ['爸：', '生日快乐！我在电脑里给你盖了一座房子，今天是你生日，所以你是第一个走进来逛的人。', '房子由一个叫 Porter 的机器人管家打理，钥匙都在他手里，他对各种规矩特别较真，虽然那些规矩大多是他自己编的。要是 Porter 说的和我纸条上写的不一样，就信纸条。', '这座房子里每个房间都有一道谜题。解开了，就能拿到一块小铜牌。最后你要用齐这五块铜牌，才能打开最后的惊喜。', '准备好了，就把这张纸翻过来。', '爱你的 Joy'],
      todo: ['摇一下桌上的铃，把机器人管家 Porter 叫出来。', '没有宾客胸牌，Porter 不让你进别的房间；而他不在收音机里听到我说一声“可以”，就不给你打印胸牌。收音机在窗台上，桌上那张照片的背面会告诉你该调到哪个台。', '从 Porter 的打印机里拿出胸牌，到玻璃门旁的读卡器上刷一下。'],
      back: '摇一下桌上的铃，Porter 就会到前台来。',
    }),
  },
  R_badge: {
    kind: 'receipt',
    en: () => ({ title: 'Guest badge', where: 'From Porter’s printer', lines: ['THE HOUSE', 'GUEST LIST LOADED', '', `GUEST ........ ${N('dad').toUpperCase()}`, 'NUMBER OF GUESTS ... 1', 'STAFF .............. 1', '(JOY. NOT A GUEST)', '', 'EVERY GUEST GETS', 'A WINDOW SEAT'] }),
    zh: () => ({ title: '宾客胸牌', where: 'Porter 的打印机', lines: ['本宅', '宾客名单已导入', '', `宾客 ………… ${N('dad')}`, '宾客人数 ……… 1', '工作人员 ……… 1', '（Joy，不算宾客）', '', '保证每位宾客', '都有靠窗座位'] }),
  },
  photo: {
    kind: 'photo', img: 'img/family.jpg',
    en: () => ({
      title: 'The photo on the desk', where: 'The study',
      caption: 'The three of you outside the hot pot place, and when you turn it over there’s something written on the back in blue pencil.',
      back: ['The radio station is 101 point something, and the number after the point is how many of us are in this photo.', 'Joy'],
    }),
    zh: () => ({
      title: '桌上的照片', where: '书房',
      caption: '你们三个人在火锅店门口的合影，翻过来，背面有人用蓝铅笔写了字。',
      back: ['电台是 101 点几，点后面的那个数字，就是这张照片里有几个人。', 'Joy'],
    }),
  },
  ph_garden: {
    kind: 'photo', img: 'img/photo-garden.jpg',
    en: () => ({ title: 'A photo', where: 'On the wall by the tennis court', caption: 'You and Joy on the grass, mid-hug.' }),
    zh: () => ({ title: '一张照片', where: '网球场边的墙上', caption: '你和 Joy 在草地上，正抱在一起。' }),
  },
  ph_boat: {
    kind: 'photo', img: 'img/photo-boat.jpg',
    en: () => ({ title: 'A photo', where: 'On the wall of the trading room', caption: 'You and Joy out on a boat, both in life jackets, and you look very pleased about it.' }),
    zh: () => ({ title: '一张照片', where: '交易室的墙上', caption: '你和 Joy 在船上，都穿着救生衣，你看起来特别开心。' }),
  },
  ph_lunch: {
    kind: 'photo', img: 'img/photo-lunch.jpg',
    en: () => ({ title: 'A photo', where: 'On the wall of the computer room', caption: 'Lunch out with Mom.' }),
    zh: () => ({ title: '一张照片', where: '机房的墙上', caption: '和妈妈出去吃午饭。' }),
  },
  ph_selfie: {
    kind: 'photo', img: 'img/photo-selfie.jpg',
    en: () => ({ title: 'A photo', where: 'Pinned to the front of the tent', caption: 'The three of you, squeezed into one selfie.' }),
    zh: () => ({ title: '一张照片', where: '别在帐篷前面', caption: '你们三个，挤在一张自拍里。' }),
  },
  ph_tea: {
    kind: 'photo', img: 'img/photo-tea.jpg',
    en: () => ({ title: 'A photo', where: 'On the kitchen wall', caption: 'Bubble tea with Joy, who was holding the camera and the other cup.' }),
    zh: () => ({ title: '一张照片', where: '厨房的墙上', caption: '和 Joy 一起喝奶茶，相机和另一杯都在她手里。' }),
  },
  drawernote: {
    kind: 'letter',
    en: () => ({
      title: 'In the desk drawer', where: 'The study, with two batteries',
      body: ['Dad,', 'These batteries are for the radio on the windowsill. Porter only takes orders from staff, and I’m the only staff he’s got, so I recorded him an OK on one of the stations.', 'I’m not telling you which one, but the photo on the desk will.', 'Joy'],
    }),
    zh: () => ({
      title: '书桌抽屉里', where: '书房，和两节电池放在一起',
      body: ['爸：', '这两节电池是给窗台上那台收音机用的。Porter 只听工作人员的，而他手下唯一的工作人员就是我，所以我在其中一个台里给他录了一句“可以”。', '我不告诉你是哪个台，不过桌上那张照片会告诉你。', 'Joy'],
    }),
  },
  radiomsg: {
    kind: 'letter',
    en: () => ({
      title: 'On the radio, 101.3', where: 'The study',
      body: ['Hi Dad, it’s Joy, and if you can hear this then you found the station.', 'Porter, this is your OK from the staff, so please go ahead and print his badge.', 'Have fun in there, and I’ll see you at the end.'],
    }),
    zh: () => ({
      title: '收音机里，101.3', where: '书房',
      body: ['爸，是我，Joy。你能听到，说明你找到这个台了。', 'Porter，这就是工作人员给你的许可，请给他打印胸牌吧。', '在里面好好玩，最后见。'],
    }),
  },

  /* ---------- Trading room ---------- */
  L2: {
    kind: 'letter', pencil: 'bell',
    en: () => ({
      title: 'Under the brass clip', where: 'The trading room',
      body: ['Dad,', 'Porter spent the whole weekend staring at our four holdings, VONG, TQQQ, NVDA and Bitcoin, and by Sunday night he had convinced himself that every one of them was broken. He has queued up orders to sell the lot at the opening bell, which is about a minute from now.', 'You and I both know none of them is broken, but there’s no time to explain that to a receipt printer. He printed all four orders out, and then the printer got a bit carried away and they ended up scattered all over this room.', 'Find all four and tear them up before the bell rings. A couple of them landed in awkward places, so you may have to jump or crouch to get at them.', 'Joy'],
      todo: ['The clock starts when you put this note down, and you have 90 seconds.', 'Find Porter’s four sell orders. They’re small glowing slips of paper. Click each one to tear it up, so Porter can’t sell anything.', 'Some are in awkward spots, so you’ll need to ' + KT('crouch (C)', 'crouch (the Crouch button)') + ' under things and ' + KT('jump (Space)', 'jump (the Jump button)') + ' over things.', 'If the bell rings first, the clock just starts again, and anything you’ve already torn up stays torn up. Tear up all four and you get the bell token and the key card for the next room.'],
    }),
    zh: () => ({
      title: '铜夹子下面', where: '交易室',
      body: ['爸：', 'Porter 一整个周末都盯着我们的四样投资，VONG、TQQQ、NVDA 和比特币，到星期天晚上，他已经认定这四样全坏了，还下好了单，开盘铃一响就全部卖掉，离开盘大概只剩一分钟。', '你我都知道它们一样也没坏，可现在没时间跟一台小票打印机讲道理。他把四张卖单都打印了出来，结果打印机太卖力，单子飞得满屋都是。', '赶在开盘铃响之前把四张都找到撕掉。有几张落在不太好拿的地方，你可能得跳一下或者蹲下去才够得着。', 'Joy'],
      todo: ['放下这张纸条就开始计时，你有 90 秒。', '找到 Porter 的四张卖单，就是会发光的小纸条。点一下就能撕掉，这样 Porter 就卖不成了。', '有几张在不好拿的地方，得' + KT('蹲下（C 键）', '蹲下（按“蹲”）') + '钻过去，或者' + KT('跳（空格键）', '跳（按“跳”）') + '翻过去。', '要是开盘铃先响了，只是重新计时，已经撕掉的不会回来。四张都撕掉，就能拿到铃铛铜牌和下一个房间的门卡。'],
    }),
  },
  R_trade: {
    kind: 'receipt',
    en: () => ({ title: 'Porter’s short statement', where: 'From Porter’s printer', lines: ['THE HOUSE', 'TRADING DESK', '', 'ORDERS CANCELLED .... 4', 'ORDERS EXECUTED ..... 0', '', 'THINGS PORTER LEARNED', 'TODAY:', '1. A 10-FOR-1 SPLIT IS', '   NOT A 90% LOSS', '2. 3X MEANS 3X', '3. BITCOIN WORKS', '   WEEKENDS', '4. A DIVIDEND IS NOT', '   A SCAM', '', 'PORTER WILL NOT BE', 'WATCHING THE MARKET', 'NEXT WEEKEND'] }),
    zh: () => ({ title: 'Porter 的简短声明', where: 'Porter 的打印机', lines: ['本宅', '交易台', '', '已撤销订单 ……… 4', '已成交订单 ……… 0', '', 'PORTER 今日所学：', '1. 一拆十不等于', '   亏了 90%', '2. 三倍就是三倍', '3. 比特币周末', '   也上班', '4. 分红不是骗局', '', '下个周末', 'PORTER 不再盯盘'] }),
  },
  sleeve: {
    kind: 'doc',
    en: () => ({ title: 'A spare badge holder', where: 'In the drawer', html: `<p>It has the same holes as your badge, and the label inside it says <b>BUILDER</b>, which is the job title Joy gave herself when she made this place.</p>` }),
    zh: () => ({ title: '一个备用胸牌套', where: '抽屉里', html: `<p>打孔和你的胸牌一样，里面的标签写着 <b>BUILDER</b>（建造者），这是 Joy 盖这座房子时给自己起的头衔。</p>` }),
  },

  /* ---------- Computer room ---------- */
  L3: {
    kind: 'letter', pencil: 'chip',
    en: () => ({
      title: 'Taped over the wall screen', where: 'The computer room',
      body: ['Dad,', 'I found my own badge in here, and Porter has me down as BUILDER, which apparently means I’m allowed to wire every light in the building but still need someone to invite me to lunch.', 'I tried sending Porter a complaint by robot, but the robot in this room only cares about chess, and it has announced that it won’t hand anything over until somebody beats it. It’s very proud of the fact that a computer beat the world champion back in 1997, even though it had nothing whatsoever to do with that.', 'Porter tidied up its white pieces earlier, so two of them are missing. Find them and you can play. Each puzzle needs one particular piece before the robot will start it.', 'Joy'],
      todo: ['The robot in this room is holding the next token, and it won’t give it up until you beat it at chess twice.', 'First find its two missing white pieces. One is down low by the wall screen (' + KT('crouch with C', 'press Crouch') + '), and one is hidden behind some crates in the corner (' + KT('jump over with Space', 'press Jump') + ').', 'Then sit down at the chessboard. Each piece you find unlocks one puzzle, and each puzzle is checkmate in one or two moves.', 'Win both and the robot gives you the chip token and opens the door to the next room.'],
    }),
    zh: () => ({
      title: '贴在墙上屏幕上', where: '机房',
      body: ['爸：', '我在这儿找到了自己的胸牌，Porter 给我登记的是 BUILDER（建造者），意思好像是这栋楼的每一盏灯都归我接，可吃午饭还得等别人请。', '我想派机器人给 Porter 送一封投诉信，可这个房间里的机器人只关心下棋，它宣布了，没人赢它之前，什么都不交出来。它特别骄傲 1997 年有台电脑赢了世界冠军，虽然那事跟它半点关系都没有。', 'Porter 之前把它的白子收拾走了，现在缺了两个。找到了就能下。每一盘残局都得先有特定的那个棋子，机器人才肯开始。', 'Joy'],
      todo: ['这个房间的机器人拿着下一块铜牌，你得在棋盘上赢它两次，它才肯交出来。', '先找到它缺的两个白子：一个在墙上屏幕旁边很低的地方（' + KT('按 C 蹲下', '按“蹲”') + '），另一个藏在角落几个箱子后面（' + KT('按空格跳过去', '按“跳”') + '）。', '然后到棋盘前坐下。每找到一个棋子，就能解锁一盘残局，每盘都是一两步就能将死。', '两盘都赢了，机器人就会给你芯片铜牌，再打开去下一个房间的门。'],
    }),
  },
  robotcard: {
    kind: 'doc',
    en: () => ({ title: 'The plaque on the robot', where: 'Screwed to its chest', html: `<p>In May 1997, a computer called <b>Deep Blue</b> beat the reigning world chess champion, Garry Kasparov, in a six-game match. It was the first time a computer had beaten a world champion under match conditions.</p><p>This robot was not involved in any way, but it has had this plaque made anyway, and it likes people to read it before they sit down.</p>` }),
    zh: () => ({ title: '机器人身上的铭牌', where: '拧在它胸口上', html: `<p>1997 年 5 月，一台名叫<b>深蓝</b>的电脑在六局制的比赛中赢了当时的国际象棋世界冠军卡斯帕罗夫。这是电脑第一次在正式比赛中赢下世界冠军。</p><p>这个机器人和那件事毫无关系，可它还是专门做了这块铭牌，而且喜欢让人坐下之前先读一遍。</p>` }),
  },

  /* ---------- Tennis ---------- */
  L4: {
    kind: 'letter', pencil: 'racket',
    en: () => ({
      title: 'On the back of the booking slip', where: 'The tennis court',
      body: ['Dad,', 'I booked us a tennis court, but I booked it as a singles court, and Porter has decided that means exactly one person. He confiscated my racket, put a STAFF EQUIPMENT sticker on it, and booked you an hour with the ball machine instead.', 'The good news is that the machine has never lost a game, mostly because nobody has ever played it. Borrow my racket from the bench, start the machine, and see if you can take one game off it.', 'Joy'],
      todo: ['Take my racket from the bench by the left-hand wall.', 'Start the ball machine by the near baseline.', 'When a ball comes towards you, get close to it and ' + KT('click (or press E)', 'tap the screen') + ' to hit it. The ball goes where you’re looking, so aim away from the returner on the other side.', 'Win one game against it, and Porter has to hand over the racket token and the key to the kitchen.'],
    }),
    zh: () => ({
      title: '订场单的背面', where: '网球场',
      body: ['爸：', '我订了一块网球场，可订的是单打场，Porter 就认定只能来一个人。他没收了我的球拍，贴上“员工器材”的标签，然后给你约了一小时的发球机。', '好消息是，这台机器一局都没输过，主要是因为从来没人跟它打过。去长凳上把我的球拍借来，启动机器，看看能不能从它手里赢一局。', 'Joy'],
      todo: ['去左边墙旁的长凳上拿我的球拍。', '启动近端底线旁边的发球机。', '球朝你飞过来的时候，走近它，' + KT('点鼠标（或按 E）', '点一下屏幕') + '就能挥拍。球会往你看的方向飞，所以往对面回球机不在的那边打。', '赢它一局，Porter 就得把球拍铜牌和厨房钥匙交出来。'],
    }),
  },
  guesttag: {
    kind: 'doc',
    en: () => ({ title: 'The racket’s real tag', where: 'Inside the umpire’s chair', html: `<p>Inside the chair is the tag Porter peeled off the racket you’ve just been playing with, and it says <b>GUEST: JOY</b>.</p>` }),
    zh: () => ({ title: '球拍原来的标签', where: '裁判椅里', html: `<p>椅子里放着 Porter 从你刚才那把球拍上撕下来的标签，上面写着<b>宾客：JOY</b>。</p>` }),
  },

  /* ---------- Kitchen ---------- */
  L5: {
    kind: 'letter', pencil: 'ladle',
    en: () => ({
      title: 'Under the recipe stand', where: 'The kitchen',
      body: ['Dad,', 'Porter cleared two of our three bowls off the table, twice, because he’s convinced only one person is coming to dinner. I’ve hidden them in the oven, which is the one place I’m fairly sure he never looks.', 'The stew makes enough for three, and yes, the three is on purpose.', 'Joy'],
      todo: ['Read the note next to the scale, then weigh out the ingredients. Every label on the containers is wrong, so you’ll have to work out what’s really inside each one.', 'Plan the cooking on the board by the stove, so the stew, the rice and the garnish are all ready at the same time. The stew card, the rice pot lid and the garnish tag each tell you how long theirs takes.', 'Take the ladle token from the serving window, and turn on the oven light to find the two hidden bowls.', 'Put the tray on the shelf by the back door, and Porter will open the door outside for you.'],
    }),
    zh: () => ({
      title: '菜谱架下面', where: '厨房',
      body: ['爸：', 'Porter 把我们三个碗里的两个从桌上收走了，还收了两回，因为他认定晚饭只来一个人。我把碗藏进了烤箱，我敢肯定他从来不往那儿看。', '这份炖菜够三个人吃，三个人是我特意的。', 'Joy'],
      todo: ['先看秤旁边的纸条，再称食材。罐子上的标签全贴错了，你得想清楚每个罐子里到底装的是什么。', '在灶台旁的板子上安排做饭时间，让炖菜、米饭和配菜同时做好。炖菜卡片、米饭锅盖和配菜标签上各写着要做多久。', '从出菜窗口拿汤勺铜牌，再打开烤箱灯，找到藏起来的两个碗。', '把托盘放到后门旁边的架子上，Porter 就会给你打开去外面的门。'],
    }),
  },
  recipe: {
    kind: 'doc',
    en: () => ({ title: 'The recipe', where: 'Under the recipe stand', html: `<p class="hand">Stew, for three.</p><p>Onion, carrot and meat at <b>2 : 3 : 5</b> by weight, and <b>1,000 grams</b> altogether.</p>` }),
    zh: () => ({ title: '菜谱', where: '菜谱架下面', html: `<p class="hand">炖菜，三人份。</p><p>洋葱、胡萝卜、肉按重量 <b>2 : 3 : 5</b>，一共 <b>1000 克</b>。</p>` }),
  },
  pantry: {
    kind: 'doc', blue: true,
    en: () => ({ title: 'The note next to the scale', where: 'The kitchen', html: `<p>Porter relabelled all three containers this morning and somehow managed to get <b>every single label wrong</b>, which takes a kind of talent. The only container you can see inside is the one with the little window.</p>` }),
    zh: () => ({ title: '秤旁边的纸条', where: '厨房', html: `<p>Porter 今天早上给三个罐子重新贴了标签，居然<b>一个都没贴对</b>，这也算是一种本事。唯一能看见里面的，是那个带小窗的罐子。</p>` }),
  },
  window: {
    kind: 'doc',
    en: () => ({ title: 'The container with a window', where: 'The kitchen', html: `<p>The container labelled <b>Meat</b> has a little window in it, and through the window you can see that it’s full of <b>onion</b>.</p>` }),
    zh: () => ({ title: '有小窗的罐子', where: '厨房', html: `<p>标着<b>“肉”</b>的罐子上有个小窗，从窗口看进去，里面装满了<b>洋葱</b>。</p>` }),
  },
  stewcard: {
    kind: 'doc',
    en: () => ({ title: 'Stew card', where: 'Leaning on the stove', html: `<p>Four minutes on the stove, and then straight into the oven with the lid on for another eight.</p>` }),
    zh: () => ({ title: '炖菜卡片', where: '靠在灶台上', html: `<p>先在灶上煮 4 分钟，然后盖上盖子直接进烤箱，再烤 8 分钟。</p>` }),
  },
  ricelid: {
    kind: 'doc',
    en: () => ({ title: 'Rice pot lid', where: 'The kitchen', html: `<p>Scratched into the lid: six minutes on the stove, and then two minutes resting on the pot stand.</p>` }),
    zh: () => ({ title: '米饭锅盖', where: '厨房', html: `<p>锅盖上刻着：灶上煮 6 分钟，然后放到锅垫上焖 2 分钟。</p>` }),
  },
  garnishtag: {
    kind: 'doc',
    en: () => ({ title: 'Garnish tag', where: 'The kitchen', html: `<p>Two minutes on the stove, and then it goes straight to the table.</p>` }),
    zh: () => ({ title: '配菜标签', where: '厨房', html: `<p>灶上炒 2 分钟，出锅直接上桌。</p>` }),
  },
  serviceboard: {
    kind: 'doc',
    en: () => ({ title: 'Cooking timetable', where: 'The kitchen', html: `<p>Everything has to be on the table at <b>minute 12</b>. There’s one burner, one oven and one pot stand, and each step runs straight into the next without any waiting around.</p>` }),
    zh: () => ({ title: '做饭时间表', where: '厨房', html: `<p>所有菜都要在<b>第 12 分钟</b>上桌。只有一个灶眼、一个烤箱和一个锅垫，每一步做完马上接下一步，中间不等。</p>` }),
  },

  /* ---------- Outdoors ---------- */
  L6: {
    kind: 'letter', pencil: 'star',
    en: () => ({
      title: 'Rolled up inside a mug', where: 'The campsite',
      body: ['Dad,', 'The chipped mug is mine, and before you say anything, I picked it out on purpose because I like it. The green one is Mom’s and the plain one is yours.', 'My map was in the tent pocket, and you’ll want it for the next bit.', 'The view from the top of the hill is worth the walk, and I know that because I went up and checked.', 'Joy'],
      todo: ['The last token is in a little box I buried out here, because it was the only place I could think of that Porter wouldn’t tidy.', 'Go to the split pine. It’s the tree with two trunks, and it’s P on my map (' + KT('press J', 'it’s in your journal') + '). There’s a tag on it that tells you where the box is.', 'Find the big red X, stand on it and ' + KT('press E', 'tap Use') + ' to dig up the box.', 'Open the box and take the star token. The lanterns will light up and show you the way to the end.'],
    }),
    zh: () => ({
      title: '卷在杯子里的信', where: '营地',
      body: ['爸：', '有缺口的那个杯子是我的，你先别说什么，是我特意挑的，我就喜欢它。绿色的是妈妈的，没花纹的是你的。', '我的地图在帐篷口袋里，接下来用得着。', '山顶的风景值得走一趟，我亲自上去看过了。', 'Joy'],
      todo: ['最后一块铜牌在一个小盒子里，我把它埋在外面了，因为我实在想不出还有哪儿是 Porter 收拾不到的。', '去分叉松树那儿。就是有两根树干的那棵，我地图上的 P（' + KT('按 J', '在日记本里') + '）。树上系着一张标签，写着盒子在哪儿。', '找到那个大红 X，站上去，' + KT('按 E', '点“使用”') + '把盒子挖出来。', '打开盒子，拿出星星铜牌。灯笼会亮起来，给你指去最后一站的路。'],
    }),
  },
  map: {
    kind: 'doc', map: true,
    en: () => ({ title: 'Joy’s map', where: 'The tent pocket', html: `<p class="hand">There’s a tag tied to the split pine (P) that tells you where I buried the box.</p><p class="small">The blue arrow is you, and it points the way you’re facing. North is at the top. P is the split pine.</p>` }),
    zh: () => ({ title: 'Joy 的地图', where: '帐篷口袋', html: `<p class="hand">分叉松树（P）上系着一张标签，上面写着我把盒子埋在哪儿。</p><p class="small">蓝色箭头就是你，箭头指着你面朝的方向。上面是北。P 是分叉松树。</p>` }),
  },
  pinetag: {
    kind: 'doc',
    en: () => ({ title: 'The tag on the split pine', where: 'Tied on with blue thread', html: `<p class="hand">Dad, you found the right tree! The box is buried 12 metres due east of here, three squares on my map, which means straight ahead if you’re facing this tag. I painted a big red X over the spot and left a shovel next to it. Stand on the X and dig.</p><p class="hand">The last token is inside the box. — Joy</p>` }),
    zh: () => ({ title: '分叉松树上的标签', where: '用蓝线系着', html: `<p class="hand">爸，你找对树了！盒子埋在这里正东方 12 米的地方，也就是我地图上的三格，面对这张标签往前走就是。我在那儿画了一个大红 X，旁边还放了一把铲子。站到 X 上挖就行。</p><p class="hand">最后一块铜牌就在盒子里。——Joy</p>` }),
  },
  docklog: {
    kind: 'doc',
    en: () => ({ title: 'Park ranger’s notebook', where: 'The dock', html: `<p>Fish caught this season: 0.</p><p>Underneath, in much neater handwriting: <i>Porter has asked for the pond to be listed as decorative.</i></p>` }),
    zh: () => ({ title: '护林员的记录本', where: '码头', html: `<p>本季钓到的鱼：0 条。</p><p>下面一行字写得工整多了：<i>Porter 申请把这个池塘登记为“装饰用”。</i></p>` }),
  },
  cairn: {
    kind: 'doc',
    en: () => ({ title: 'Plaque on the pile of stones', where: 'The hilltop', html: `<p>HILLTOP LOOKOUT. The telescope is right behind these stones. Put its lens back in, and on a clear night you can find the North Star from here.</p>` }),
    zh: () => ({ title: '石堆上的铜牌', where: '山顶', html: `<p>山顶瞭望点。望远镜就在这堆石头后面。把镜片装回去，晴朗的晚上从这里能找到北极星。</p>` }),
  },
  chart: {
    kind: 'doc',
    en: () => ({ title: 'Star chart', where: 'In the beacon box', html: `<p>A see-through star chart with three pinholes marked Merak, Dubhe and Alioth from the Big Dipper, and an arrow drawn from Merak through Dubhe.</p><p>Pencilled underneath: start at Dubhe and keep going the same way for about <b>five</b> times the distance between the two pointer stars.</p>` }),
    zh: () => ({ title: '星图', where: '信标盒子里', html: `<p>一张透明星图，上面有三个针孔，标着北斗七星里的天璇、天枢和玉衡，还有一个箭头从天璇穿过天枢。</p><p>下面用铅笔写着：从天枢出发，顺着同一个方向，再走大约两颗指极星间距的<b>五倍</b>。</p>` }),
  },

  /* ---------- Ending ---------- */
  L7: {
    // Joy's own words, kept exactly as she wrote them (in both languages)
    kind: 'letter',
    en: () => ({ title: 'Under your place card', where: 'The clearing', body: JOY_LETTER }),
    zh: () => ({ title: '压在你的座位卡下面', where: '林间空地', body: JOY_LETTER }),
  },
  R_final: {
    kind: 'receipt',
    en: () => ({ title: 'Porter’s last receipt', where: 'The clearing', lines: ['THE HOUSE', 'BOOKING CHANGED', '', 'TABLE FOR THREE', '', `GUEST ........ ${N('dad').toUpperCase()}`, `GUEST ............. ${N('joy').toUpperCase()}`, `GUEST ............. ${N('mom').toUpperCase()}`, '', 'STAFF .............. 0', 'YOUR TABLE IS READY', '', 'TO VISIT ANY ROOM AGAIN,', 'CHOOSE “GO TO A ROOM”', 'ON THE TITLE SCREEN.', `PASSWORD: ${SHORTCUT_WORD}`] }),
    zh: () => ({ title: 'Porter 的最后一张小票', where: '林间空地', lines: ['本宅', '预订已更改', '', '三人桌', '', `宾客 ………… ${N('dad')}`, `宾客 ………… ${N('joy')}`, `宾客 ………… ${N('mom')}`, '', '工作人员 ……… 0', '您的餐桌已备好', '', '想再去任何房间，', '在标题画面选', '“直接去某个房间”。', `密码：${SHORTCUT_WORD}`] }),
  },
  R_cake: {
    kind: 'receipt',
    en: () => ({ title: 'One more receipt', where: 'The clearing', lines: ['THE HOUSE', '', 'ONE (1) SMALL', 'CELEBRATION', '', 'CANDLES ............. 5', 'SINGING ....... 1 VERSE'] }),
    zh: () => ({ title: '又一张小票', where: '林间空地', lines: ['本宅', '', '小型庆祝 一（1）场', '', '蜡烛 …………… 5 根', '唱歌 …………… 1 段'] }),
  },
};

// The password for the room shortcut on the title screen. It's printed on the last receipt.
export const SHORTCUT_WORD = 'HOT POT';

export const ENTRIES = new Proxy({}, {
  get(_, id) {
    const e = E[id];
    if (!e) return undefined;
    const { en, zh, ...rest } = e;
    return { ...rest, ...(lang() === 'zh' ? zh() : en()) };
  },
  has: (_, id) => id in E,
});

// Candles hidden around the house (optional).
const CANDLES_T = {
  c_market: ['Tucked inside the spare badge holder in the trading room drawer.', '塞在交易室抽屉里那个备用胸牌套里。'],
  c_lab: ['Inside the empty tape reel case in the computer room.', '在机房那个空磁带盒里。'],
  c_court: ['At the very bottom of the tennis ball basket.', '在网球筐的最底下。'],
  c_kitchen: ['Rolled up inside the spare napkin ring in the kitchen.', '卷在厨房那个多出来的餐巾环里。'],
  c_camp: ['Wound into the lantern cord at the campsite.', '缠在营地的灯笼电线里。'],
};
export const CANDLES = new Proxy({}, { get: (_, k) => (CANDLES_T[k] ? L(...CANDLES_T[k]) : undefined) });

const HINTS_T = {
  study: [
    ['The envelope is on the desk under the green lamp, and once you’ve read it you can ring the bell next to it.', '信封在桌上的绿色台灯下面，看完以后摇一下旁边的铃。'],
    ['Porter wants an OK from Joy over the radio. The radio is on the windowsill, and the station is written on the back of the photo on the desk.', 'Porter 要 Joy 通过收音机给个许可。收音机在窗台上，电台写在桌上那张照片的背面。'],
    ['There are three people in the photo, so the station is 101.3. As soon as Porter hears it, take your badge from his printer and tap it on the reader by the glass door.', '照片里有三个人，所以电台是 101.3。Porter 一听到，就从他的打印机里拿出胸牌，在玻璃门旁的读卡器上刷一下。'],
  ],
  screen: [
    ['The clock starts when you read Joy’s note, and it stops while you have something open to read, so there’s no rush while you’re looking at this.', '看完 Joy 的纸条就开始计时，打开东西阅读的时候计时会暂停，所以看提示不用着急。'],
    ['One order is in the wastebasket by the big desk, one is on the floor under a desk by the west windows, one is behind the low wall of boxes in the south-east corner, and one is under the SELL banner in the south-west corner.', '一张在大桌子旁的废纸篓里，一张在西边窗户旁一张桌子底下的地上，一张在东南角那排矮箱子后面，还有一张在西南角写着 SELL 的横幅底下。'],
    ['Crouch (C) to reach under the desk and to get under the banner, and jump (Space) over the boxes. If the bell rings first, the clock just starts again and anything you’ve torn up stays torn up.', '蹲下（C）才能够到桌子底下，也才能钻过横幅；跳（空格）才能翻过箱子。要是开盘铃先响了，只是重新计时，撕掉的不会回来。'],
  ],
  chess: [
    ['Two white pieces are missing: one is somewhere low near the wall screen, and one is behind a little wall of crates in a corner.', '缺了两个白子：一个在墙上屏幕附近很低的地方，另一个在角落里一圈箱子后面。'],
    ['Crouch (C) to open the hatch under the wall screen, and jump (Space) over the crates in the north-west corner for the knight.', '蹲下（C）打开墙上屏幕下面的小门；跳过西北角的箱子（空格）拿马。'],
    ['The back rank: Re8. Smothered: Qg8+, and after the rook takes, Nf7.', '底线：车 e8。闷杀：后 g8 将军，等车吃掉后，马 f7。'],
  ],
  tennis: [
    ['Take the racket from the bench by the left-hand wall, then start the ball machine near the baseline. When a ball comes your way, get close to it and click (or press E, or tap) to swing.', '先从左边墙旁的长凳上拿球拍，然后到底线附近启动发球机。球过来时靠近它，点鼠标（或按 E，或点屏幕）挥拍。'],
    ['The ball goes where you’re looking. Look higher to hit it deeper and lower to drop it short, and turn left or right to change where it goes.', '球会往你看的方向飞。往高处看打深球，往低处看打短球，往左右转就能改变方向。'],
    ['The returner on the far side is slow. Hit the ball to whichever side it isn’t on, and after it gets a ball back, send the next one to the opposite corner.', '对面的回球机走得慢。往它不在的那一边打，它每回一个球，你就把下一个打到对角去。'],
  ],
  prep: [
    ['Read the note next to the scale first, and then look through the one container that has a window in it.', '先看秤旁边的纸条，再从那个带小窗的罐子往里看。'],
    ['Every label is wrong. If the Meat label is really onion, then the Carrot label can’t be carrot, and it can’t be onion either.', '每个标签都是错的。如果“肉”罐里其实是洋葱，那“胡萝卜”罐里既不是胡萝卜，也不是洋葱。'],
    ['Pour the Meat container into the onion bowl (200 g), the Onion container into the carrot bowl (300 g), and the Carrot container into the meat bowl (500 g).', '“肉”罐倒进洋葱碗，200 克；“洋葱”罐倒进胡萝卜碗，300 克；“胡萝卜”罐倒进肉碗，500 克。'],
  ],
  service: [
    ['The stew card, the rice pot lid and the garnish tag each give a cooking time, and all three are somewhere around the stove.', '炖菜卡片、米饭锅盖和配菜标签上各有一个时间，三样都在灶台附近。'],
    ['Everything has to be ready at minute 12, so it’s easiest to work backwards from there.', '所有东西都要在第 12 分钟做好，从那里倒着推最容易。'],
    ['The stew goes on the stove at minute 0, the rice at minute 4 and the garnish at minute 10.', '炖菜第 0 分钟上灶，米饭第 4 分钟，配菜第 10 分钟。'],
  ],
  tray: [
    ['Joy’s note under the recipe stand says where the other two bowls are.', '菜谱架下面 Joy 的纸条说了另外两个碗在哪儿。'],
    ['They’re hidden in the oven.', '藏在烤箱里。'],
    ['Turn on the oven light, take the bowls out, and then put the tray on the shelf by the back door.', '打开烤箱灯，把碗拿出来，再把托盘放到后门边的架子上。'],
  ],
  beacon: [
    ['Go to the split pine, the tree with two trunks and a loop of blue thread round it, and read the tag on it. It’s P on Joy’s map.', '去分叉松树那儿，就是有两根树干、系着一圈蓝线的那棵，看看上面的标签。它是 Joy 地图上的 P。'],
    ['The tag says the box is 12 metres due east of the pine, which is three squares to the right on the map. Walk straight past the tag, away from the tree, and look for a big red X on the ground with a light above it.', '标签上说，盒子在松树正东方 12 米，也就是地图上往右三格。从标签那面往前直走，离开松树，找地上一个大红 X，上面还亮着一盏灯。'],
    ['Stand on the red X and press E (or tap Use) to dig up the box, then open it to take the star token.', '站到红色 X 上，按 E（或点“使用”）把盒子挖出来，再打开盒子拿出星星铜牌。'],
  ],
  chart: [
    ['Line up all three stars, not just two of them.', '三颗星都要对上，不是只对两颗。'],
    ['Two stars can line up perfectly while the third is still back to front.', '可能两颗星对得好好的，第三颗却是反的。'],
    ['Turn it a quarter turn anticlockwise (two clicks), and then flip it over.', '逆时针转 90 度（点两下），然后翻面。'],
  ],
  sight: [
    ['Read the arrow on the lens. Each mark on the ruler is the distance from Merak to Dubhe.', '看看镜片上的箭头。尺子上的每一格，就是天璇到天枢的距离。'],
    ['Start counting at Dubhe and keep going in the direction the arrow points.', '从天枢开始数，顺着箭头的方向往前。'],
    ['Five marks past Dubhe on the same line, and not the brighter star that’s closer in.', '天枢往前五格，在同一条线上，不是离得近的那颗亮星。'],
  ],
  clock: [
    ['Turn the tokens over, because each one has a line copied from one of the letters.', '把铜牌翻过来，每一块背面都抄着信里的一句话。'],
    ['Leave lunch out for now and put the stock market, chess, tennis and camping in order first.', '先别管午饭，把股市、下棋、网球、露营排好顺序。'],
    ['Stock market, lunch, chess, tennis, camping.', '股市、午饭、下棋、网球、露营。'],
  ],
};
export const HINTS = new Proxy({}, { get: (_, k) => (HINTS_T[k] ? HINTS_T[k].map((p) => L(...p)) : undefined) });
