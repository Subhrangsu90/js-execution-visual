/**
 * ValueInspector — Interactive hover & click tooltip inspector for complex JS values.
 * Reveals the inner properties of objects, arrays, functions, and references on hover/click.
 */
export class ValueInspector {
  constructor() {
    this.tooltipEl = null;
    this.pinnedTarget = null;
    this.hoverTarget = null;
    this.hideTimeout = null;

    this._init();
  }

  _init() {
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'value-inspector-popover';
    this.tooltipEl.style.display = 'none';
    document.body.appendChild(this.tooltipEl);

    // Global event delegation for inspectable values
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-inspect]');
      if (!target) return;
      if (this.pinnedTarget) return; // Don't switch if pinned

      clearTimeout(this.hideTimeout);
      this.hoverTarget = target;
      this.show(target);
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-inspect]');
      if (!target) return;
      if (this.pinnedTarget) return;

      this.hideTimeout = setTimeout(() => {
        if (!this.pinnedTarget) {
          this.hide();
        }
      }, 150);
    });

    // Keep tooltip open if mouse moves into the tooltip itself
    this.tooltipEl.addEventListener('mouseenter', () => {
      clearTimeout(this.hideTimeout);
    });

    this.tooltipEl.addEventListener('mouseleave', () => {
      if (!this.pinnedTarget) {
        this.hideTimeout = setTimeout(() => this.hide(), 150);
      }
    });

    // Click to pin/unpin inspection popover
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-inspect]');
      if (target) {
        e.stopPropagation();
        if (this.pinnedTarget === target) {
          this.unpin();
        } else {
          this.pin(target);
        }
        return;
      }

      // Clicking outside unpins
      if (!e.target.closest('.value-inspector-popover')) {
        this.unpin();
      }
    });
  }

  show(target) {
    const rawData = target.getAttribute('data-inspect');
    if (!rawData) return;

    let data;
    try {
      data = JSON.parse(rawData);
    } catch {
      data = rawData;
    }

    const title = target.getAttribute('data-inspect-title') || 'Value Inspector';
    const type = target.getAttribute('data-inspect-type') || (Array.isArray(data) ? 'array' : typeof data);

    this.tooltipEl.innerHTML = `
      <div class="inspector-header">
        <span class="inspector-type inspector-type-${type}">${type.toUpperCase()}</span>
        <span class="inspector-title">${this._esc(title)}</span>
        <button class="inspector-close" title="Close">✕</button>
      </div>
      <div class="inspector-body">
        ${this._renderContent(data, type)}
      </div>
    `;

    const closeBtn = this.tooltipEl.querySelector('.inspector-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.unpin();
      });
    }

    this.tooltipEl.style.display = 'block';
    this._position(target);
  }

  pin(target) {
    this.pinnedTarget = target;
    this.show(target);
    this.tooltipEl.classList.add('is-pinned');
  }

  unpin() {
    this.pinnedTarget = null;
    this.hoverTarget = null;
    this.tooltipEl.classList.remove('is-pinned');
    this.hide();
  }

  hide() {
    if (this.pinnedTarget) return;
    this.tooltipEl.style.display = 'none';
  }

  _position(target) {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();

    const padding = 8;
    let top = targetRect.bottom + padding;
    let left = targetRect.left;

    // Flip above if not enough room below
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = Math.max(10, targetRect.top - tooltipRect.height - padding);
    }

    // Keep within horizontal bounds
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - tooltipRect.width - 10);
    }

    this.tooltipEl.style.top = `${top}px`;
    this.tooltipEl.style.left = `${left}px`;
  }

  _renderContent(data, type) {
    if (data === null) return '<div class="inspector-row"><span class="val-null">null</span></div>';
    if (data === undefined) return '<div class="inspector-row"><span class="val-undefined">undefined</span></div>';

    if (Array.isArray(data)) {
      if (data.length === 0) return '<div class="inspector-empty">(empty array [])</div>';
      return `
        <div class="inspector-list">
          ${data.map((item, idx) => `
            <div class="inspector-row">
              <span class="inspector-key">[${idx}]:</span>
              <span class="inspector-val">${this._formatItem(item)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (typeof data === 'object') {
      const entries = Object.entries(data).filter(([k]) => !k.startsWith('__'));
      if (entries.length === 0) return '<div class="inspector-empty">(empty object {})</div>';
      return `
        <div class="inspector-list">
          ${entries.map(([k, v]) => `
            <div class="inspector-row">
              <span class="inspector-key">${this._esc(k)}:</span>
              <span class="inspector-val">${this._formatItem(v)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `<div class="inspector-row">${this._formatItem(data)}</div>`;
  }

  _formatItem(val) {
    if (val === null) return '<span class="val-null">null</span>';
    if (val === undefined) return '<span class="val-undefined">undefined</span>';
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    if (typeof val === 'boolean') return `<span class="val-boolean">${val}</span>`;
    if (typeof val === 'string') return `<span class="val-string">"${this._esc(val)}"</span>`;
    if (val && val.__isFn) return `<span class="val-function">ƒ ${this._esc(val.name || 'anonymous')}()</span>`;
    if (Array.isArray(val)) {
      const summary = val.length <= 3 ? `[${val.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]` : `Array(${val.length})`;
      return `<span class="val-array">${this._esc(summary)}</span>`;
    }
    if (typeof val === 'object') {
      const keys = Object.keys(val).filter(k => !k.startsWith('__'));
      const summary = `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}`;
      return `<span class="val-object">${this._esc(summary)}</span>`;
    }
    return String(val);
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }
}

// Export singleton instance
export const valueInspector = new ValueInspector();
