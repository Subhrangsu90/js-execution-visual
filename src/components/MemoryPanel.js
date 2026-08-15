/**
 * MemoryPanel — Stack + Heap visualization with SVG reference arrows.
 * Uses in-place DOM updates so cards and rows persist without rebuilding jitter.
 */
import { icons } from '../utils/icons.js';

export class MemoryPanel {
  constructor(stackEl, heapEl, arrowsSvg) {
    this.stackEl = stackEl;
    this.heapEl = heapEl;
    this.arrowsSvg = arrowsSvg;
    this._refDots = new Map();   // heapId → stack dot element
    this._heapCards = new Map(); // heapId → heap card element
    this._stackRows = new Map(); // varName → { el, valTarget, lastVal }
    this._heapMap = new Map();   // heapId → { el, lastPropsJson }
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
    this._refDots.clear();

    // Filter out builtins
    const filtered = entries.filter(e =>
      !['console', 'setTimeout', 'setInterval', 'Promise', 'undefined', 'NaN', 'Infinity', 'Math', 'Array', 'arguments'].includes(e.name)
    );

    const emptyState = this.stackEl.querySelector('.empty-state');

    if (filtered.length === 0) {
      if (!emptyState || this._stackRows.size > 0) {
        this.stackEl.innerHTML = `
          <div class="memory-section-label">Stack</div>
          <div class="empty-state" style="padding:12px">
            <div class="empty-state-icon">${icons.memory(20)}</div>
            <div>No variables</div>
          </div>`;
        this._stackRows.clear();
      }
      return;
    }

    if (emptyState) {
      emptyState.remove();
    }

    // Ensure section label exists
    if (!this.stackEl.querySelector('.memory-section-label')) {
      const lbl = document.createElement('div');
      lbl.className = 'memory-section-label';
      lbl.textContent = 'Stack';
      this.stackEl.prepend(lbl);
    }

    const currentNames = new Set();

    filtered.forEach(entry => {
      currentNames.add(entry.name);
      const isRef = entry.isRef;
      const refTarget = entry.refTarget;
      const valStr = isRef
        ? `<span class="val-reference">${entry.value}</span>`
        : this._formatPrimitive(entry.value);

      let rowData = this._stackRows.get(entry.name);

      if (!rowData) {
        const el = document.createElement('div');
        el.className = 'mem-stack-entry mem-entry-enter';
        el.dataset.varName = entry.name;

        el.innerHTML = `
          <span class="mem-var-name">${this._escapeHtml(entry.name)}</span>
          <span class="mem-var-value val-target">${valStr}</span>
          ${isRef ? `<span class="mem-ref-dot" data-ref="${refTarget}"></span>` : ''}
        `;

        this.stackEl.appendChild(el);

        rowData = {
          el,
          valTarget: el.querySelector('.val-target'),
          dotEl: el.querySelector('.mem-ref-dot'),
          lastVal: JSON.stringify(entry.value),
          isRef,
          refTarget,
        };

        this._stackRows.set(entry.name, rowData);
      } else {
        // In-place update value without rebuilding
        const currentValJson = JSON.stringify(entry.value);
        if (rowData.lastVal !== currentValJson || rowData.isRef !== isRef || rowData.refTarget !== refTarget) {
          rowData.valTarget.innerHTML = valStr;
          rowData.valTarget.classList.remove('val-flash');
          void rowData.valTarget.offsetWidth;
          rowData.valTarget.classList.add('val-flash');

          // Handle ref dot update
          if (isRef && !rowData.dotEl) {
            const dot = document.createElement('span');
            dot.className = 'mem-ref-dot';
            dot.dataset.ref = refTarget;
            rowData.el.appendChild(dot);
            rowData.dotEl = dot;
          } else if (!isRef && rowData.dotEl) {
            rowData.dotEl.remove();
            rowData.dotEl = null;
          } else if (isRef && rowData.dotEl) {
            rowData.dotEl.dataset.ref = refTarget;
          }

          rowData.lastVal = currentValJson;
          rowData.isRef = isRef;
          rowData.refTarget = refTarget;
        }
      }

      if (isRef && rowData.dotEl) {
        this._refDots.set(refTarget, rowData.dotEl);
      }
    });

    // Remove deleted variables
    for (const [name, rowData] of this._stackRows.entries()) {
      if (!currentNames.has(name)) {
        rowData.el.remove();
        this._stackRows.delete(name);
      }
    }
  }

  _renderHeap(heap) {
    this._heapCards.clear();
    const heapIds = Object.keys(heap);
    const emptyState = this.heapEl.querySelector('.empty-state');

    if (heapIds.length === 0) {
      if (!emptyState || this._heapMap.size > 0) {
        this.heapEl.innerHTML = `
          <div class="memory-section-label">Heap</div>
          <div class="empty-state" style="padding:12px">
            <div class="empty-state-icon">${icons.memory(20)}</div>
            <div>Heap empty</div>
          </div>`;
        this._heapMap.clear();
      }
      return;
    }

    if (emptyState) {
      emptyState.remove();
    }

    if (!this.heapEl.querySelector('.memory-section-label')) {
      const lbl = document.createElement('div');
      lbl.className = 'memory-section-label';
      lbl.textContent = 'Heap';
      this.heapEl.prepend(lbl);
    }

    const currentHeapIds = new Set(heapIds);

    heapIds.forEach(id => {
      const obj = heap[id];
      const typeClass = `type-${obj.type}`;
      const typeLabel = obj.type.toUpperCase();
      const propsJson = JSON.stringify(obj.properties || obj.value || {});

      let heapData = this._heapMap.get(id);

      if (!heapData) {
        const el = document.createElement('div');
        el.className = 'mem-heap-object mem-entry-enter';
        el.dataset.heapId = id;

        el.innerHTML = `
          <div class="mem-heap-header">
            <span class="mem-heap-type ${typeClass}">${typeLabel}</span>
            <span class="mem-heap-id">${id}</span>
          </div>
          <div class="mem-heap-body">
            ${this._buildHeapPropsHtml(obj)}
          </div>
        `;

        this.heapEl.appendChild(el);

        heapData = {
          el,
          bodyEl: el.querySelector('.mem-heap-body'),
          lastPropsJson: propsJson,
        };

        this._heapMap.set(id, heapData);
      } else {
        // In-place update if properties changed
        if (heapData.lastPropsJson !== propsJson) {
          heapData.bodyEl.innerHTML = this._buildHeapPropsHtml(obj);
          heapData.lastPropsJson = propsJson;
          heapData.el.classList.remove('val-flash');
          void heapData.el.offsetWidth;
          heapData.el.classList.add('val-flash');
        }
      }

      this._heapCards.set(id, heapData.el);
    });

    // Remove deallocated heap objects
    for (const [id, heapData] of this._heapMap.entries()) {
      if (!currentHeapIds.has(id)) {
        heapData.el.classList.add('mem-dealloc');
        setTimeout(() => heapData.el.remove(), 250);
        this._heapMap.delete(id);
      }
    }
  }

  _buildHeapPropsHtml(obj) {
    let propsHtml = '';
    if (obj.type === 'object') {
      const props = Object.entries(obj.properties || {});
      if (props.length === 0) {
        propsHtml = '<div style="color:var(--text-dim);font-style:italic">— empty object —</div>';
      } else {
        for (const [k, v] of props) {
          propsHtml += `
            <div class="mem-heap-prop">
              <span class="mem-prop-key">${this._escapeHtml(k)}:</span>
              <span class="mem-prop-value">${this._formatPrimitive(v)}</span>
            </div>`;
        }
      }
    } else if (obj.type === 'array') {
      const items = obj.properties || [];
      if (items.length === 0) {
        propsHtml = '<div style="color:var(--text-dim);font-style:italic">— empty array —</div>';
      } else {
        for (let idx = 0; idx < Math.min(items.length, 10); idx++) {
          propsHtml += `
            <div class="mem-heap-prop">
              <span class="mem-prop-key">[${idx}]:</span>
              <span class="mem-prop-value">${this._formatPrimitive(items[idx])}</span>
            </div>`;
        }
        if (items.length > 10) {
          propsHtml += `<div class="mem-heap-prop" style="color:var(--text-dim)">… +${items.length - 10} more</div>`;
        }
      }
    } else if (obj.type === 'function') {
      propsHtml = `
        <div class="mem-heap-prop">
          <span class="mem-prop-key">name:</span>
          <span class="mem-prop-value" style="color:var(--color-function)">${this._escapeHtml(obj.name || 'anonymous')}</span>
        </div>
        <div class="mem-heap-prop">
          <span class="mem-prop-key">params:</span>
          <span class="mem-prop-value">(${obj.params ? obj.params.join(', ') : ''})</span>
        </div>
        <div class="mem-heap-prop">
          <span class="mem-prop-key">closure:</span>
          <span class="mem-prop-value" style="color:var(--accent-fuchsia)">${obj.scope ? obj.scope.name : 'Global'}</span>
        </div>
      `;
    }
    return propsHtml;
  }

  _drawArrows(stackEntries) {
    this.arrowsSvg.innerHTML = '';
    const containerRect = this.arrowsSvg.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    for (const [heapId, dotEl] of this._refDots.entries()) {
      const cardEl = this._heapCards.get(heapId);
      if (!dotEl || !cardEl) continue;

      const dotRect = dotEl.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();

      const startX = dotRect.right - containerRect.left;
      const startY = dotRect.top + dotRect.height / 2 - containerRect.top;

      const endX = cardRect.left - containerRect.left;
      const endY = cardRect.top + 20 - containerRect.top;

      const dx = endX - startX;
      const cx1 = startX + dx * 0.5;
      const cy1 = startY;
      const cx2 = startX + dx * 0.5;
      const cy2 = endY;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`);
      path.setAttribute('class', 'active');
      this.arrowsSvg.appendChild(path);
    }
  }

  _formatPrimitive(val) {
    if (val === null) return '<span class="val-null">null</span>';
    if (val === undefined) return '<span class="val-undefined">undefined</span>';
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    if (typeof val === 'boolean') return `<span class="val-boolean">${val}</span>`;
    if (typeof val === 'string') {
      const short = val.length > 16 ? val.slice(0, 16) + '…' : val;
      return `<span class="val-string">"${this._escapeHtml(short)}"</span>`;
    }
    if (val && val.__isFn) return `<span class="val-function">ƒ ${val.name || 'anonymous'}</span>`;
    if (typeof val === 'function') return `<span class="val-function">ƒ native</span>`;
    if (Array.isArray(val)) return `<span class="val-array">[Array(${val.length})]</span>`;
    if (typeof val === 'object') return `<span class="val-object">{…}</span>`;
    return String(val);
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
