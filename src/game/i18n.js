import { S } from '../core/state.js';

// Two languages. Every piece of text goes through L(en, zh).
export const lang = () => (S.settings.lang === 'zh' ? 'zh' : 'en');
export const L = (en, zh) => (lang() === 'zh' ? zh : en);

// Names in one place. If the family wants Chinese characters for these, change the zh values.
export const NAMES = {
  dad: { en: 'Weishuai', zh: 'Weishuai' },
  mom: { en: 'Yan', zh: 'Yan' },
  joy: { en: 'Joy', zh: 'Joy' },
};
export const N = (who) => NAMES[who][lang()];

import { IN } from '../core/input.js';
// Pick between keyboard wording and touch-screen wording.
export const KT = (keys, touch) => (IN.touch ? touch : keys);
