/**
 * MemoryPanel — Stack + Heap visualization with SVG reference arrows.
 *
 * Stack side (left): shows variable names with primitive values inline.
 * Heap side (right): shows objects, arrays, functions as structured cards.
 * SVG arrows connect stack references to their heap targets.
 */
import { icons } from '../utils/icons.js';

export class MemoryPanel {
  constructor(stackEl, heapEl, arrowsSvg) {
    this.stackEl = stackEl;
    this.heapEl = heapEl;
    this.arrowsSvg = arrowsSvg;
    this._refDots = new Map();  // heapId → stack dot element
    this._heapCards = new Map(); // heapId → heap card element
    this._lastStack = [];

    // Redraw arrows when scrolling inside stack, heap, or parent container
    const redraw = () => {
      if (this._lastStack && this._lastStack.length > 0) {
        this._drawArrows(this._lastStack);
      }
    };
    this.stackEl.addEventListener('scroll', redraw, { passive: true });
    this.heapEl.addEventListener('scroll', redraw, { passive: true });
    if (stackEl.parentElement) {
      stackEl.parentElement.addEventListener('scroll', redraw, { passive: true });
    }
  }

  update(snapshot) {
    const { stack, heap } = snapshot.memory || { stack: [], heap: {} };
    this._lastStack = stack || [];

    this._renderStack(stack);
    this._renderHeap(heap);

    // Draw arrows after a microtask to let layout settle
    requestAnimationFrame(() => this._drawArrows(stack));
  }

  _renderStack(entries) {
    // Keep the section label
    this.stackEl.innerHTML = '<div class="memory-section-label">Stack</div>';
    this._refDots.clear();

    // Filter out builtins
    const filtered = entries.filter(e =>
      !['console', 'setTimeout', 'setInterval', 'Promise', 'undefined', 'NaN', 'Infinity', 'Math', 'Array', 'arguments'].includes(e.name)
    );

    if (filtered.length === 0) {
      this.stackEl.innerHTML += `<div class="empty-state" style="padding:12px"><div class="empty-state-icon">${icons.memory(20)}</div><div>No variables</div></div>`;
      return;
    }

    for (const entry of filtered) {
      const el = document.createElement('div');
      el.className = 'mem-stack-entry';
      el.dataset.scope = entry.scope;

      if (entry.heapId) {
        // Reference type → show dot + type label
        el.innerHTML = `
          <span class="mem-var-name">${this._esc(entry.name)}</span>
          <span class="mem-var-value val-reference">${this._esc(entry.display)}</span>
          <span class="mem-ref-dot" data-heap="${entry.heapId}"></span>
        `;
        this._refDots.set(entry.heapId, el.querySelector('.mem-ref-dot'));
      } else {
        // Primitive → show value inline
        const valClass = `val-${entry.type}`;
        el.innerHTML = `
          <span class="mem-var-name">${this._esc(entry.name)}</span>
          <span class="mem-var-value ${valClass}">${this._esc(entry.display)}</span>
        `;
      }

      this.stackEl.appendChild(el);
    }
  }

  _renderHeap(heap) {
    this.heapEl.innerHTML = '<div class="memory-section-label">Heap</div>';
    this._heapCards.clear();

    const BUILTIN_NAMES = ['log', 'error', 'warn', 'resolve', 'floor', 'ceil', 'round', 'random', 'max', 'min', 'abs', 'pow', 'sqrt', 'isArray'];
    const entries = Object.values(heap).filter(h => {
      if (h.native) return false;
      // Skip built-in functions
      if (h.type === 'function' && (h.native || BUILTIN_NAMES.includes(h.name))) return false;
      // Skip built-in objects (console, Math, Promise, Array)
      if (h.type === 'object') {
        const props = Object.keys(h.properties || {});
        if (props.includes('log') && props.includes('error')) return false; // console
        if (props.includes('floor') && props.includes('ceil')) return false; // Math
        if (props.includes('resolve')) return false; // Promise
        if (props.includes('isArray')) return false; // Array
      }
      return true;
    });

    if (entries.length === 0) {
      this.heapEl.innerHTML += `<div class="empty-state" style="padding:12px"><div class="empty-state-icon">${icons.memory(20)}</div><div>Heap empty</div></div>`;
      return;
    }

    for (const obj of entries) {
      const el = document.createElement('div');
      el.className = 'mem-heap-object';
      el.dataset.heapId = obj.id;

      let contentHtml = '';

      if (obj.type === 'object') {
        const props = obj.properties || {};
        const keys = Object.keys(props);
        for (const key of keys.slice(0, 8)) {
          const p = props[key];
          const valClass = `val-${p.type}`;
          contentHtml += `
            <div class="mem-heap-prop">
              <span class="mem-prop-key">${this._esc(key)}:</span>
              <span class="mem-prop-value ${valClass}">${this._esc(p.display)}</span>
            </div>`;
        }
        if (keys.length > 8) {
          contentHtml += `<div class="mem-heap-prop"><span class="mem-prop-key" style="color:var(--text-dim)">…${keys.length - 8} more</span></div>`;
        }
      } else if (obj.type === 'array') {
        const elems = obj.elements || [];
        for (const item of elems.slice(0, 6)) {
          const valClass = `val-${item.type}`;
          contentHtml += `
            <div class="mem-heap-prop">
              <span class="mem-prop-key">[${item.index}]</span>
              <span class="mem-prop-value ${valClass}">${this._esc(item.display)}</span>
            </div>`;
        }
        if (elems.length > 6) {
          contentHtml += `<div class="mem-heap-prop"><span class="mem-prop-key" style="color:var(--text-dim)">…${elems.length - 6} more</span></div>`;
        }
      } else if (obj.type === 'function') {
        contentHtml = `
          <div class="mem-heap-prop">
            <span class="mem-prop-key">name:</span>
            <span class="mem-prop-value val-function">${this._esc(obj.name)}</span>
          </div>
          <div class="mem-heap-prop">
            <span class="mem-prop-key">params:</span>
            <span class="mem-prop-value val-string">(${(obj.params || []).join(', ')})</span>
          </div>
          ${obj.closureName ? `
          <div class="mem-heap-prop">
            <span class="mem-prop-key">closure:</span>
            <span class="mem-prop-value" style="color:var(--accent-fuchsia)">${this._esc(obj.closureName)}</span>
          </div>` : ''}
        `;
      }

      const typeClass = `type-${obj.type}`;
      el.innerHTML = `
        <div class="mem-heap-header">
          <span class="mem-heap-type ${typeClass}">${obj.type}</span>
          <span class="mem-heap-id">${obj.id}</span>
        </div>
        ${contentHtml}
      `;

      this.heapEl.appendChild(el);
      this._heapCards.set(obj.id, el);
    }
  }

  _drawArrows(stackEntries) {
    // Clear existing arrows
    this.arrowsSvg.innerHTML = '';

    const svgRect = this.arrowsSvg.getBoundingClientRect();
    if (!svgRect.width) return;

    for (const entry of stackEntries) {
      if (!entry.heapId) continue;
      const dot = this._refDots.get(entry.heapId);
      const card = this._heapCards.get(entry.heapId);
      if (!dot || !card) continue;

      const dotRect = dot.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      // Calculate positions relative to the SVG
      const x1 = dotRect.left + dotRect.width / 2 - svgRect.left;
      const y1 = dotRect.top + dotRect.height / 2 - svgRect.top;
      const x2 = cardRect.left - svgRect.left;
      const y2 = cardRect.top + cardRect.height / 2 - svgRect.top;

      // Create a curved path
      const midX = (x1 + x2) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
      path.classList.add('active');

      // Arrowhead
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      arrow.setAttribute('cx', x2);
      arrow.setAttribute('cy', y2);
      arrow.setAttribute('r', '3');
      arrow.setAttribute('fill', 'var(--color-reference)');

      this.arrowsSvg.appendChild(path);
      this.arrowsSvg.appendChild(arrow);
    }
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
