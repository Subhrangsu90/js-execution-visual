/**
 * ExecutionContextPanel — Persistent in-place DOM updates for execution contexts.
 * Preserves scroll positions, avoids DOM churn/rebuilding, and highlights changed values.
 */
import { icons } from '../utils/icons.js';

export class ExecutionContextPanel {
  constructor(bodyEl, counterEl) {
    this.body = bodyEl;
    this.counter = counterEl;
    this._cardMap = new Map(); // ctxKey -> { el, varElements, lastValues }
  }

  update(snapshot) {
    const contexts = snapshot.executionContexts || [];
    this.counter.textContent = `${contexts.length} context${contexts.length !== 1 ? 's' : ''}`;

    if (contexts.length === 0) {
      this._cardMap.clear();
      this.body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icons.context(28)}</div>
          <div>No execution contexts</div>
        </div>`;
      return;
    }

    // Remove empty-state if present
    const emptyState = this.body.querySelector('.empty-state');
    if (emptyState) {
      this.body.innerHTML = '';
      this._cardMap.clear();
    }

    const currentKeys = new Set();
    const BUILTINS = ['console', 'setTimeout', 'setInterval', 'Promise', 'undefined', 'NaN', 'Infinity', 'Math', 'Array', 'arguments', 'this'];

    // Render in reverse order (active/top context on top)
    const reversed = [...contexts].reverse();

    reversed.forEach((ctx, rIdx) => {
      const origIdx = contexts.length - 1 - rIdx;
      const key = `ctx_${origIdx}_${ctx.name}_${ctx.type}`;
      currentKeys.add(key);

      const isActive = origIdx === contexts.length - 1;
      const phaseClass = ctx.phase === 'creation' ? 'phase-creation' : 'phase-execution';
      const phaseLabel = ctx.phase === 'creation' ? 'Creation' : 'Execution';
      const vars = (ctx.variables || []).filter(v => !BUILTINS.includes(v.name));

      let cardData = this._cardMap.get(key);

      if (!cardData) {
        // Create new persistent card
        const el = document.createElement('div');
        el.className = `exec-context ${isActive ? 'active' : ''} exec-context-enter`;
        el.dataset.key = key;

        el.innerHTML = `
          <div class="exec-context-header">
            <span class="exec-context-name">${this._escapeHtml(ctx.name)}</span>
            <span class="exec-context-phase ${phaseClass}">${phaseLabel}</span>
          </div>
          <div class="exec-context-body">
            <div class="exec-context-row">
              <span class="ec-label">this</span>
              <span class="ec-this">${ctx.type === 'global' ? 'globalThis' : '{…}'}</span>
            </div>
            <div class="exec-context-vars"></div>
          </div>
        `;

        cardData = {
          el,
          headerEl: el.querySelector('.exec-context-header'),
          phaseEl: el.querySelector('.exec-context-phase'),
          varsContainer: el.querySelector('.exec-context-vars'),
          varRowMap: new Map(), // varName -> rowEl
          lastValues: new Map(),
        };

        this._cardMap.set(key, cardData);

        // Insert at correct position in DOM
        const existingChildren = Array.from(this.body.children);
        if (rIdx < existingChildren.length) {
          this.body.insertBefore(el, existingChildren[rIdx]);
        } else {
          this.body.appendChild(el);
        }
      } else {
        // Update active class
        if (isActive && !cardData.el.classList.contains('active')) {
          cardData.el.classList.add('active');
        } else if (!isActive && cardData.el.classList.contains('active')) {
          cardData.el.classList.remove('active');
        }

        // Update phase badge smoothly
        if (cardData.phaseEl.textContent !== phaseLabel) {
          cardData.phaseEl.className = `exec-context-phase ${phaseClass}`;
          cardData.phaseEl.textContent = phaseLabel;
        }

        // Ensure correct DOM ordering if contexts shifted
        const currentChild = this.body.children[rIdx];
        if (currentChild !== cardData.el) {
          this.body.insertBefore(cardData.el, currentChild || null);
        }
      }

      // In-place update of variables inside the card
      this._updateVariables(cardData, vars);
    });

    // Remove obsolete contexts that popped off
    for (const [key, cardData] of this._cardMap.entries()) {
      if (!currentKeys.has(key)) {
        cardData.el.remove();
        this._cardMap.delete(key);
      }
    }
  }

  _updateVariables(cardData, vars) {
    const { varsContainer, varRowMap, lastValues } = cardData;

    if (vars.length === 0) {
      if (varRowMap.size > 0 || varsContainer.children.length === 0) {
        varsContainer.innerHTML = '<div class="exec-context-row"><span class="ec-label" style="color: var(--text-dim); font-style: italic">— empty —</span></div>';
        varRowMap.clear();
        lastValues.clear();
      }
      return;
    }

    // Clear empty placeholder if present
    if (varsContainer.querySelector('span[style*="italic"]')) {
      varsContainer.innerHTML = '';
    }

    const currentVarNames = new Set();

    vars.slice(0, 15).forEach((v, idx) => {
      currentVarNames.add(v.name);
      const valStr = this._formatValue(v.value, v.name);
      const prevVal = lastValues.get(v.name);

      let row = varRowMap.get(v.name);
      if (!row) {
        // Create new variable row
        row = document.createElement('div');
        row.className = 'exec-context-row';
        row.innerHTML = `
          <span class="ec-label">${v.kind || 'let'}</span>
          <span class="ec-value">${this._escapeHtml(v.name)}: <span class="val-target">${valStr}</span></span>
        `;
        varsContainer.appendChild(row);
        varRowMap.set(v.name, row);
        lastValues.set(v.name, JSON.stringify(v.value));
      } else {
        // In-place update value without re-rendering row
        const currentValJson = JSON.stringify(v.value);
        if (prevVal !== currentValJson) {
          const valTarget = row.querySelector('.val-target');
          if (valTarget) {
            valTarget.innerHTML = valStr;
            valTarget.classList.remove('val-flash');
            void valTarget.offsetWidth; // Trigger reflow for animation restart
            valTarget.classList.add('val-flash');
          }
          lastValues.set(v.name, currentValJson);
        }
      }
    });

    // Remove variables no longer in scope
    for (const [varName, row] of varRowMap.entries()) {
      if (!currentVarNames.has(varName)) {
        row.remove();
        varRowMap.delete(varName);
        lastValues.delete(varName);
      }
    }
  }

  _formatValue(val, varName = '') {
    if (val === null) return '<span class="val-null">null</span>';
    if (val === undefined) return '<span class="val-undefined">undefined</span>';
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    if (typeof val === 'boolean') return `<span class="val-boolean">${val}</span>`;
    if (typeof val === 'string') {
      const short = val.length > 20 ? val.slice(0, 20) + '…' : val;
      return `<span class="val-string">"${this._escapeHtml(short)}"</span>`;
    }
    if (val && val.__isFn) {
      const fnTitle = val.name || varName || 'function';
      return `<span class="val-function val-inspectable" data-inspect="${this._escAttr(JSON.stringify(val))}" data-inspect-type="function" data-inspect-title="${this._escapeHtml(fnTitle)}">ƒ ${val.name || 'anonymous'}()</span>`;
    }
    if (typeof val === 'function') return `<span class="val-function">ƒ native</span>`;
    if (Array.isArray(val)) {
      return `<span class="val-array val-inspectable" data-inspect="${this._escAttr(JSON.stringify(val))}" data-inspect-type="array" data-inspect-title="${this._escapeHtml(varName || 'Array')}">Array(${val.length})</span>`;
    }
    if (typeof val === 'object') {
      return `<span class="val-object val-inspectable" data-inspect="${this._escAttr(JSON.stringify(val))}" data-inspect-type="object" data-inspect-title="${this._escapeHtml(varName || 'Object')}">{…}</span>`;
    }
    return String(val);
  }

  _escAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
