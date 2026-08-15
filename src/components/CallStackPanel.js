/**
 * CallStackPanel — persistent in-place stack frame visualization.
 * Preserves existing frames without DOM rebuilding or flicker.
 */
import { icons } from '../utils/icons.js';

export class CallStackPanel {
  constructor(bodyEl, counterEl, options = {}) {
    this.body = bodyEl;
    this.counter = counterEl;
    this.onFrameSelect = options.onFrameSelect || null;
    this._frameElements = []; // Array of frame elements from bottom (0) to top
    this._selectedFrameIndex = -1;
    this._currentFrames = [];
  }

  update(snapshot) {
    const frames = snapshot.callStack || [];
    this._currentFrames = frames;
    this.counter.textContent = `${frames.length} frame${frames.length !== 1 ? 's' : ''}`;

    if (frames.length === 0) {
      this._frameElements = [];
      this._selectedFrameIndex = -1;
      this.body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icons.stack(28)}</div>
          <div>Call stack is empty</div>
        </div>`;
      return;
    }

    // Remove empty-state if present
    const emptyState = this.body.querySelector('.empty-state');
    if (emptyState) {
      this.body.innerHTML = '';
      this._frameElements = [];
    }

    // 1. Remove popped frames
    while (this._frameElements.length > frames.length) {
      const popped = this._frameElements.pop();
      popped.remove();
    }

    // 2. Update existing frames in-place (line numbers, active state)
    for (let i = 0; i < this._frameElements.length; i++) {
      const el = this._frameElements[i];
      const frame = frames[i];
      const isActive = i === frames.length - 1;

      if (isActive && !el.classList.contains('active')) {
        el.classList.add('active');
      } else if (!isActive && el.classList.contains('active')) {
        el.classList.remove('active');
      }

      // Update line location if changed
      const locEl = el.querySelector('.stack-frame-location');
      const expectedLoc = frame.line ? `:${frame.line}` : '';
      if (locEl) {
        if (locEl.textContent !== expectedLoc) {
          locEl.textContent = expectedLoc;
        }
      } else if (expectedLoc) {
        const newLoc = document.createElement('span');
        newLoc.className = 'stack-frame-location';
        newLoc.textContent = expectedLoc;
        el.appendChild(newLoc);
      }
    }

    // 3. Push new frames
    for (let i = this._frameElements.length; i < frames.length; i++) {
      const frame = frames[i];
      const frameIndex = i;
      const isActive = i === frames.length - 1;
      const el = document.createElement('div');
      el.className = `stack-frame ${isActive ? 'active' : ''} stack-frame-enter`;
      el.title = `Click to inspect frame ${frame.name} (line ${frame.line})`;

      el.innerHTML = `
        <span class="stack-frame-badge ${frame.type === 'global' ? 'badge-global' : 'badge-function'}">
          ${frame.type === 'global' ? 'GEC' : 'FEC'}
        </span>
        <span class="stack-frame-name">${this._escapeHtml(frame.name)}</span>
        ${frame.line ? `<span class="stack-frame-location">:${frame.line}</span>` : ''}
      `;

      // Click to inspect stack frame
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectFrame(frameIndex);
      });

      // With flex-direction: column-reverse, appending places it on top of stack visually
      this.body.appendChild(el);
      this._frameElements.push(el);
    }
  }

  _selectFrame(index) {
    if (index < 0 || index >= this._frameElements.length) return;
    this._selectedFrameIndex = index;

    this._frameElements.forEach((el, i) => {
      el.classList.toggle('stack-frame-selected', i === index);
    });

    const frame = this._currentFrames[index];
    if (this.onFrameSelect && frame) {
      this.onFrameSelect(frame, index, this._currentFrames);
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
