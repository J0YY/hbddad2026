// Late-bound game actions so world modules can call UI without import cycles.
export const G = {
  read: () => {}, // (entryId, { onClose, onBack })
  station: () => {}, // (id)
  porter: () => {}, // (text, { ms })
  toast: () => {}, // (text)
  sfx: () => {}, // (name)
  chapter: () => {}, // (area)
  note: () => {}, // short observation line under the reticle
  give: () => {}, // (flag, label) adds item / token with feedback
  candle: () => {}, // (id)
  ending: () => {},
  printReceipt: () => {}, // (entryId)
};
