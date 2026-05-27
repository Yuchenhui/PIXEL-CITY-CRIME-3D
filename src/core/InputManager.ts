/**
 * Unified input management: keyboard, mouse, pointer lock, and iframe fallback.
 *
 * In iframe environments where PointerLock API is blocked, we use movementX/Y
 * from standard MouseEvent (available without pointer lock) and hide the cursor
 * via CSS. This gives near-identical behavior to real pointer lock.
 */
export class InputManager {
  /** Current keyboard state (code -> pressed) */
  readonly keys: Record<string, boolean> = {};

  /** Accumulated mouse delta since last frame */
  mouseDx = 0;
  mouseDy = 0;

  /** Mouse button state */
  mouseDown = false;

  /** Whether pointer lock is currently active (real or simulated) */
  isPointerLocked = false;

  /** Whether we're in fallback mode (no real pointer lock) */
  private fallbackEnabled = false;

  private enabled = false;
  private canvasElement: HTMLElement | null = null;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onPointerLockError = this.onPointerLockError.bind(this);
    this.onCanvasClick = this.onCanvasClick.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
  }

  /** Attach event listeners */
  enable(canvas: HTMLElement): void {
    this.canvasElement = canvas;
    this.enabled = true;
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
    canvas.addEventListener('click', this.onCanvasClick);
    canvas.addEventListener('mouseenter', this.onMouseEnter);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
  }

  /** Remove event listeners */
  disable(): void {
    this.enabled = false;
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
    if (this.canvasElement) {
      this.canvasElement.removeEventListener('click', this.onCanvasClick);
      this.canvasElement.removeEventListener('mouseenter', this.onMouseEnter);
      this.canvasElement.removeEventListener('mouseleave', this.onMouseLeave);
    }
  }

  /** Request pointer lock on the canvas */
  requestPointerLock(): void {
    if (this.canvasElement) {
      // Hide cursor regardless of whether pointer lock succeeds
      document.body.style.cursor = 'none';
      try {
        this.canvasElement.requestPointerLock();
      } catch {
        this.enableFallback();
      }
    }
  }

  /** Enable fallback mouse tracking without pointer lock */
  private enableFallback(): void {
    this.fallbackEnabled = true;
    this.isPointerLocked = true;
    document.body.style.cursor = 'none';
  }

  /** Exit pointer lock */
  exitPointerLock(): void {
    document.body.style.cursor = '';
    if (this.fallbackEnabled) {
      this.fallbackEnabled = false;
      this.isPointerLocked = false;
    } else {
      try { document.exitPointerLock(); } catch { /* ignore */ }
    }
  }

  /** Consume and reset mouse deltas (call once per frame) */
  consumeMouseDelta(): { dx: number; dy: number } {
    const dx = this.mouseDx;
    const dy = this.mouseDy;
    this.mouseDx = 0;
    this.mouseDy = 0;
    return { dx, dy };
  }

  /** Reset a specific key (useful for same-frame consumption) */
  resetKey(code: string): void {
    this.keys[code] = false;
  }

  private onCanvasClick(): void {
    if (this.canvasElement && !this.isPointerLocked) {
      document.body.style.cursor = 'none';
      try {
        this.canvasElement.requestPointerLock();
      } catch {
        this.enableFallback();
      }
    }
  }

  private onMouseEnter(): void {
    // If in fallback mode and game is active, hide cursor
    if (this.fallbackEnabled && this.isPointerLocked) {
      document.body.style.cursor = 'none';
    }
  }

  private onMouseLeave(): void {
    // Show cursor when it leaves the game area (for menus, etc.)
    if (this.fallbackEnabled) {
      document.body.style.cursor = '';
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    this.keys[e.code] = true;
    if (e.code === 'Escape') e.preventDefault();
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.enabled) return;
    this.keys[e.code] = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.enabled) return;

    if (this.isPointerLocked && !this.fallbackEnabled) {
      // Standard pointer lock: use movementX/Y
      this.mouseDx += e.movementX;
      this.mouseDy += e.movementY;
    } else if (this.fallbackEnabled) {
      // Fallback: use movementX/Y (works without pointer lock in most browsers)
      // These give pixel delta between consecutive events
      this.mouseDx += e.movementX;
      this.mouseDy += e.movementY;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.mouseDown = true;
      if (!this.isPointerLocked && !this.fallbackEnabled) {
        this.enableFallback();
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.mouseDown = false;
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = !!document.pointerLockElement;
    if (this.isPointerLocked) {
      // Real pointer lock acquired, disable fallback
      this.fallbackEnabled = false;
      document.body.style.cursor = 'none';
    }
  }

  private onPointerLockError(): void {
    this.enableFallback();
  }
}
