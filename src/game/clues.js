import { S } from '../core/state.js';
import { L } from './i18n.js';

// The four sell orders Porter printed in the trading room.
export const TICKETS = ['NVDA', 'TQQQ', 'BTC', 'VONG'];
export const ticketsFound = () => TICKETS.filter((t) => S.has('sell_' + t)).length;

// The computer room's chess puzzles. Each is missing the white piece that delivers mate.
// Pieces: uppercase white, lowercase black. Squares like 'e4'.
const pos = (s) => Object.fromEntries(s.trim().split(/\s+/).map((t) => [t.slice(1), t[0]]));

export const PUZZLES = [
  {
    id: 'rook', piece: 'piece_rook', at: 'e1',
    name: () => L('The back rank', '底线'),
    goal: () => L('White to move, mate in one', '白先，一步杀'),
    missing: () => L('the white rook', '白车'),
    // black has spent the whole game attacking and forgot to give its king any air
    board: pos('Kg1 Re1 Pa2 Pf2 Pg2 Ph2 kg8 qd4 pa7 pb7 pf7 pg7 ph7'),
    line: ['e1e8'],
  },
  {
    id: 'knight', piece: 'piece_knight', at: 'h6',
    name: () => L('Smothered', '闷杀'),
    goal: () => L('White to move, mate in two', '白先，两步杀'),
    missing: () => L('the white knight', '白马'),
    // Philidor's old trick: give the queen away so the black rook boxes its own king in
    board: pos('Kg1 Qc4 Nh6 Pf2 Pg2 Ph2 Pa2 kh8 rd8 qb6 pg7 ph7 pa7 pb7'),
    line: ['c4g8', 'd8g8', 'h6f7'],
  },
];
export const chessSolved = () => PUZZLES.filter((p) => S.has('chess_' + p.id)).length;
export const piecesFound = () => PUZZLES.filter((p) => S.has(p.piece)).length;

