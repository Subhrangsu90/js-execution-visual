/**
 * ScopeChainPanel — persistent in-place DOM updates for lexical scope chain.
 * Preserves scroll positions, avoids rebuilding cards on every tick, and pulses updated variables.
 */
import { icons } from '../utils/icons.js';

export class ScopeChainPanel {
  constructor(bodyEl) {
    this.body = bodyEl;
    this._scopeMap = new Map(); // scopeKey -> { el, connectorEl, varRowMap, lastValues }
  }

  update(snapshot) {
    const chain = snapshot.scopeChain || [];

    if (chain.length === 0) {
      this._scopeMap.clear();
      this.body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icons.scope(28)}</div>
          <div>No scope chain</div>
        </div>`;
      return;
    }

    // Remove empty state
    const emptyState = this.body.querySelector('.empty-state');
    if (emptyState) {
      this.body.innerHTML = '';
      this._scopeMap.clear();
    }

    const currentKeys = new Set();
    const BUILTINS = ['console', 'setTimeout', 'setInterval', 'Promise', 'undefined', 'NaN', 'Infinity', 'Math', 'Array', 'arguments'];

    chain.forEach((scope, i) => {
      const key = `scope_${i}_${scope.name}_${scope.type}`;
      currentKeys.add(key);

      const isActive = i === 0;
      const typeClass = scope.type === 'global' ? 'scope-global'
                      : scope.isClosure ? 'scope-closure'
                      : 'scope-local';
      const typeLabel = scope.type === 'global' ? 'Global'
                      : scope.isClosure ? 'Closure'
                      : scope.type === 'function' ? 'Local'
                      : 'Block';

      const vars = (scope.variables || []).filter(v => !BUILTINS.includes(v.name));

      let scopeData = this._scopeMap.get(key);

      if (!scopeData) {
        // Connector before this scope (if not the first scope)
        let connectorEl = null;
        if (i > 0) {
          connectorEl = document.createElement('div');
          connectorEl.className = 'scope-connector';
          connectorEl.textContent = '↓ [[Outer]]';
          this.body.appendChild(connectorEl);
        }

        const el = document.createElement('div');
        el.className = `scope-block ${isActive ? 'active' : ''} scope-block-enter`;
        el.innerHTML = `
          <div class="scope-block-header">
            <span class="scope-block-name">${this._escapeHtml(scope.name)}</span>
            <span class="scope-block-type ${typeClass}">${typeLabel}</span>
          </div>
          <div class="scope-vars"></div>
        `;
        this.body.appendChild(el);

        scopeData = {
          el,
          connectorEl,
          varsContainer: el.querySelector('.scope-vars'),
          varRowMap: new Map(),
          lastValues: new Map(),
        };

        this._scopeMap.set(key, scopeData);
      } else {
        // Update active class
        if (isActive && !scopeData.el.classList.contains('active')) {
          scopeData.el.classList.add('active');
        } else if (!isActive && scopeData.el.classList.contains('active')) {
          scopeData.el.classList.remove('active');
        }
      }

      // In-place variable updates
      this._updateScopeVars(scopeData, vars, scope.isClosure);
    });

    // Remove defunct scopes
    for (const [key, scopeData] of this._scopeMap.entries()) {
      if (!currentKeys.has(key)) {
        if (scopeData.connectorEl) scopeData.connectorEl.remove();
        scopeData.el.remove();
        this._scopeMap.delete(key);
      }
    }
  }

  _updateScopeVars(scopeData, vars, isClosure) {
    const { varsContainer, varRowMap, lastValues } = scopeData;

    if (vars.length === 0) {
      if (varRowMap.size > 0 || varsContainer.children.length === 0) {
        varsContainer.innerHTML = '<div class="scope-var" style="color:var(--text-dim);font-style:italic">— empty —</div>';
        varRowMap.clear();
        lastValues.clear();
      }
      return;
    }

    if (varsContainer.querySelector('div[style*="italic"]')) {
      varsContainer.innerHTML = '';
    }

    const currentVarNames = new Set();

    vars.slice(0, 15).forEach((v) => {
      currentVarNames.add(v.name);
      const valStr = this._formatValue(v.value, v.name);
      const currentValJson = JSON.stringify(v.value);
      const prevVal = lastValues.get(v.name);

      let row = varRowMap.get(v.name);
      if (!row) {
        row = document.createElement('div');
        row.className = 'scope-var';
        const closureBadge = isClosure ? '<span class="scope-closure-badge">closed</span>' : '';
        row.innerHTML = `
          <span class="scope-var-name">${this._escapeHtml(v.name)}</span>
          ${closureBadge}
          <span class="scope-var-value val-target">${valStr}</span>
        `;
        varsContainer.appendChild(row);
        varRowMap.set(v.name, row);
        lastValues.set(v.name, currentValJson);
      } else {
        if (prevVal !== currentValJson) {
          const valTarget = row.querySelector('.val-target');
          if (valTarget) {
            valTarget.innerHTML = valStr;
            valTarget.classList.remove('val-flash');
            void valTarget.offsetWidth;
            valTarget.classList.add('val-flash');
          }
          lastValues.set(v.name, currentValJson);
        }
      }
    });

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

    const refId = val?.heapId || val?.__heapId || null;
    const dotHtml = refId ? `<span class="mem-ref-dot" data-ref="${refId}"></span>` : '';

    if (val && val.__isFn) {
      const fnTitle = val.name || varName || 'function';
      return `<span class="val-function val-inspectable" data-inspect="${this._escAttr(JSON.stringify(val))}" data-inspect-type="function" data-inspect-title="${this._escapeHtml(fnTitle)}">ƒ ${val.name || 'anonymous'}()</span> ${dotHtml}`;
    }
    if (typeof val === 'function') return `<span class="val-function">ƒ native</span>`;
    if (Array.isArray(val)) {
      return `<span class="val-array val-inspectable" data-inspect="${this._escAttr(JSON.stringify(val))}" data-inspect-type="array" data-inspect-title="${this._escapeHtml(varName || 'Array')}">[Array(${val.length})]</span> ${dotHtml}`;
    }
    if (typeof val === 'object') {
      return `<span class="val-object val-inspectable" data-inspect="${this._escAttr(JSON.stringify(val))}" data-inspect-type="object" data-inspect-title="${this._escapeHtml(varName || 'Object')}">{…}</span> ${dotHtml}`;
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
