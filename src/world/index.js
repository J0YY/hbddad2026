import { W } from './kit.js';
import { buildStudy } from './study.js';
import { buildTrading } from './trading.js';
import { buildLab } from './lab.js';
import { buildCourt } from './court.js';
import { buildKitchen } from './kitchen.js';
import { buildOutdoors } from './outdoors.js';

// Which rooms can be seen from which. Only the room you're in and its neighbours are drawn.
const NEIGHBOURS = {
  study: ['trading'],
  trading: ['study', 'lab'],
  lab: ['trading', 'court'],
  court: ['lab', 'kitchen'],
  kitchen: ['court', 'outdoors'],
  outdoors: ['kitchen'],
};
const GROUP_OF = { wild: 'outdoors', clearing: 'outdoors' };

export function buildWorld() {
  W.groups = {
    study: buildStudy(),
    trading: buildTrading(),
    lab: buildLab(),
    court: buildCourt(),
    kitchen: buildKitchen(),
    outdoors: buildOutdoors(),
  };
}

export function showRoomsAround(areaId) {
  const here = GROUP_OF[areaId] || areaId;
  const show = new Set([here, ...(NEIGHBOURS[here] || [])]);
  for (const [k, g] of Object.entries(W.groups)) g.visible = show.has(k);
  if (W.sky) W.sky.visible = show.has('outdoors');
}
