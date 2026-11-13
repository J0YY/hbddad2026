// Hand-drawn token glyphs as inline SVG (same shapes as the engraved tokens in 3D).
const P = {
  bell: '<path d="M10 30 C10 16 15 9 20 9 C25 9 30 16 30 30 Z"/><path d="M7 30 H33"/><circle cx="20" cy="33.5" r="2.2"/><path d="M20 9 V6"/>',
  chip: '<rect x="12" y="12" width="16" height="16"/><path d="M16 12 V7 M20 12 V7 M24 12 V7 M16 28 V33 M20 28 V33 M24 28 V33 M12 16 H7 M12 20 H7 M12 24 H7 M28 16 H33 M28 20 H33 M28 24 H33"/>',
  racket: '<ellipse cx="17" cy="16" rx="8" ry="10" transform="rotate(-35 17 16)"/><path d="M22 23 L31 32"/><circle cx="29" cy="10" r="2.5"/>',
  ladle: '<path d="M8 22 A8 8 0 0 0 24 22 Z"/><path d="M24 22 C27 14 30 10 33 6"/>',
  star: '<path d="M20 6 L23.5 15.5 L33 16 L25.5 22 L28 31.5 L20 26 L12 31.5 L14.5 22 L7 16 L16.5 15.5 Z"/>',
};
export function glyphSVG(kind, color = 'currentColor') {
  return `<svg viewBox="0 0 40 40" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[kind]}</svg>`;
}
