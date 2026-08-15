/**
 * CallStackPanel — animated call stack visualization.
 * Frames slide in when pushed, slide out when popped.
 */
import { icons } from '../utils/icons.js';

export class CallStackPanel {
  constructor(bodyEl, counterEl) {
    this.body = bodyEl;
    this.counter = counterEl;
    this.prevFrames = [];
  }

  update(snapshot) {
    const frames = snapshot.callStack || [];
    this.counter.textContent = `${frames.length} frame${frames.length !== 1 ? 's' : ''}`;

    // Diff with previous state to animate additions/removals
    const newCount = frames.length;
    const oldCount = this.prevFrames.length;

    // Clear and re-render
    this.body.innerHTML = '';

    if (frames.length === 0) {
      this.body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icons.stack(28)}</div>
          <div>Call stack is empty</div>
        </div>`;
      this.prevFrames = [];
      return;
    }

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const el = document.createElement('div');
      el.className = `stack-frame ${i === frames.length - 1 ? 'active' : ''}`;
      // Stagger animation delay for new frames
      if (i >= oldCount) {
        el.style.animationDelay = `${(i - oldCount) * 60}ms`;
      } else {
        el.style.animation = 'none';
      }

      el.innerHTML = `
        <span class="stack-frame-badge ${frame.type === 'global' ? 'badge-global' : 'badge-function'}">
          ${frame.type === 'global' ? 'GEC' : 'FEC'}
        </span>
        <span class="stack-frame-name">${this._escapeHtml(frame.name)}</span>
        ${frame.line ? `<span class="stack-frame-location">:${frame.line}</span>` : ''}
      `;
      this.body.appendChild(el);
    }

    this.prevFrames = [...frames];
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
