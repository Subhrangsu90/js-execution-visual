/**
 * Resizable — Pixel-perfect drag-to-resize manager for split panes.
 * Locks the gutter handle directly under the cursor for true 1:1 pointer tracking.
 */
export class ResizableSplitter {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.gutter - The handle/divider element
   * @param {HTMLElement} options.firstEl - Element being resized
   * @param {HTMLElement} [options.secondEl] - Sibling element (optional)
   * @param {'horizontal'|'vertical'} options.direction - 'horizontal' (col-resize) or 'vertical' (row-resize)
   * @param {boolean} [options.invert] - If true, dragging in reverse increases size (e.g. bottom docked console)
   * @param {Function} [options.onResize] - Callback when resizing occurs
   * @param {number} [options.minFirst] - Minimum size in px
   * @param {number} [options.maxFirst] - Maximum size in px
   * @param {HTMLElement} [options.container] - Parent container element
   */
  constructor({
    gutter,
    firstEl,
    secondEl,
    direction = 'horizontal',
    invert = false,
    onResize,
    minFirst = 100,
    maxFirst = 1200,
    container,
  }) {
    this.gutter = gutter;
    this.firstEl = firstEl;
    this.secondEl = secondEl;
    this.direction = direction;
    this.invert = invert;
    this.onResize = onResize;
    this.minFirst = minFirst;
    this.maxFirst = maxFirst;
    this.container = container || gutter.parentElement;

    this.isDragging = false;
    this.grabOffset = 0;
    this.firstRect = null;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this._init();
  }

  _init() {
    this.gutter.classList.add('resizer-gutter', `resizer-${this.direction}`);
    this.gutter.addEventListener('mousedown', this._onMouseDown);
    this.gutter.addEventListener('touchstart', this._onTouchStart, { passive: false });
  }

  _onMouseDown(e) {
    e.preventDefault();
    this._startDrag(this.direction === 'horizontal' ? e.clientX : e.clientY);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  _onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this._startDrag(this.direction === 'horizontal' ? touch.clientX : touch.clientY);
      window.addEventListener('touchmove', this._onTouchMove, { passive: false });
      window.addEventListener('touchend', this._onTouchEnd);
    }
  }

  _startDrag(pos) {
    this.isDragging = true;
    this.firstRect = this.firstEl.getBoundingClientRect();

    if (this.direction === 'horizontal') {
      if (this.invert) {
        // Resizing from right edge to left
        this.grabOffset = this.firstRect.left - pos;
      } else {
        // Resizing from left edge to right
        this.grabOffset = pos - this.firstRect.right;
      }
    } else {
      if (this.invert) {
        // Resizing from bottom edge upward (e.g., bottom console)
        this.grabOffset = this.firstRect.top - pos;
      } else {
        // Resizing from top edge downward
        this.grabOffset = pos - this.firstRect.bottom;
      }
    }

    document.body.classList.add('is-resizing', `resizing-${this.direction}`);
    this.gutter.classList.add('active');
  }

  _onMouseMove(e) {
    if (!this.isDragging) return;
    this._updateDrag(this.direction === 'horizontal' ? e.clientX : e.clientY);
  }

  _onTouchMove(e) {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this._updateDrag(this.direction === 'horizontal' ? touch.clientX : touch.clientY);
  }

  _updateDrag(pos) {
    let newSize;

    if (this.direction === 'horizontal') {
      if (this.invert) {
        newSize = this.firstRect.right - pos + this.grabOffset;
      } else {
        newSize = pos - this.firstRect.left - this.grabOffset;
      }
    } else {
      if (this.invert) {
        newSize = this.firstRect.bottom - pos + this.grabOffset;
      } else {
        newSize = pos - this.firstRect.top - this.grabOffset;
      }
    }

    // Clamp between min and max bounds
    if (this.minFirst !== undefined && newSize < this.minFirst) {
      newSize = this.minFirst;
    }
    if (this.maxFirst !== undefined && newSize > this.maxFirst) {
      newSize = this.maxFirst;
    }

    // Apply strict sizing so Flexbox doesn't distort or drift
    newSize = Math.round(newSize);
    if (this.direction === 'horizontal') {
      this.firstEl.style.flex = `0 0 ${newSize}px`;
      this.firstEl.style.width = `${newSize}px`;
    } else {
      this.firstEl.style.flex = `0 0 ${newSize}px`;
      this.firstEl.style.height = `${newSize}px`;
    }

    this.onResize?.(newSize);
  }

  _onMouseUp() {
    this._endDrag();
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  _onTouchEnd() {
    this._endDrag();
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
  }

  _endDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    document.body.classList.remove('is-resizing', `resizing-${this.direction}`);
    this.gutter.classList.remove('active');
    this.onResize?.();
  }
}
