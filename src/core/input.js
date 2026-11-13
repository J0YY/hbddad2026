// Keyboard + mouse. Pointer lock is requested only on deliberate clicks.

export const IN = {
  keys: new Set(),
  dx: 0,
  dy: 0,
  aim: false,
  locked: false,
  // Some embedded browsers refuse pointer lock. Then you hold the button and drag to look.
  drag: false,
  dragging: false,
  dragMoved: 0,
  onDragMode: null,
  canvas: null,
  pressed: new Set(), // edge-triggered this frame
  enabled: true,
  // Phones and tablets: no pointer lock. A thumb stick walks, dragging looks around.
  touch: /[?&]touch=1/.test(location.search) || typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches)),
  joy: { x: 0, y: 0 },

  init(canvas) {
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code) && this.enabled) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.aim = false; this.dragging = false; });
    addEventListener('mousemove', (e) => {
      if (!this.locked && !this.dragging) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
      if (this.dragging) this.dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.aim = true;
      if (e.button === 0 && this.locked) this.pressed.add('Click');
      if (e.button === 0 && this.drag && !this.locked) { this.dragging = true; this.dragMoved = 0; canvas.classList.add('grabbing'); }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 2) this.aim = false;
      if (e.button === 0 && this.dragging) {
        this.dragging = false;
        canvas.classList.remove('grabbing');
        // a click that barely moved still counts as a click (use, swing)
        if (this.dragMoved < 6) this.pressed.add('Click');
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange?.(this.locked);
    });
  },
  lock() {
    if (!this.canvas || this.locked || this.touch || this.drag) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: false });
      if (p && p.catch) p.catch((e) => { if (e && e.name === 'WrongDocumentError') this.fallBack(); });
    } catch (e) { if (e && e.name === 'WrongDocumentError') this.fallBack(); }
  },
  fallBack() {
    if (this.drag || this.touch) return;
    this.drag = true;
    this.canvas?.classList.add('draglook');
    this.onDragMode?.();
  },
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
  down(...codes) { return this.enabled && codes.some((c) => this.keys.has(c)); },
  hit(code) { return this.pressed.has(code); },
  endFrame() { this.pressed.clear(); this.dx = 0; this.dy = 0; },
};
