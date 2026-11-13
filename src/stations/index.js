import { radioStation } from './study.js';
import { chessStation } from './chess.js';
import { prepStation, serviceStation } from './kitchen.js';
import { telescopeStation } from './sky.js';
import { clockStation, ending, lightCake } from './finale.js';

export const STATIONS = {
  radio: radioStation,
  chess: chessStation,
  prep: prepStation,
  service: serviceStation,
  telescope: telescopeStation,
  clock: clockStation,
};
export { ending, lightCake };
