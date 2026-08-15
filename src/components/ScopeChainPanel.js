/**
 * ScopeChainPanel — visualizes the lexical scope chain
 * with closure badges, variable lookup paths, and SVG icons.
 */
import { icons } from '../utils/icons.js';

export class ScopeChainPanel {
  constructor(bodyEl) {
    this.body = bodyEl;
  }

  update(snapshot) {
    const chain = snapshot.scopeChain || [];
    this.body.innerHTML = '';

    if (chain.length === 0) {
      this.body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icons.scope(28)}</div>
          <div>No scope chain</div>
        </div>`;
      return;
    }

    for (let i = 0; i < chain.length; i++) {
      const scope = chain[i];

      // Connector arrow between scopes
      if (i > 0) {
        const connector = document.createElement('div');
        connector.className = 'scope-connector';
        connector.textContent = '↓ [[Outer]]';
        this.body.appendChild(connector);
      }

      const el = document.createElement('div');
      el.className = `scope-block ${i === 0 ? 'active' : ''}`;
      el.style.animationDelay = `${i * 60}ms`;

      const typeClass = scope.type === 'global' ? 'scope-global'
                      : scope.isClosure ? 'scope-closure'
                      : 'scope-local';
      const typeLabel = scope.type === 'global' ? 'Global'
                      : scope.isClosure ? 'Closure'
                      : scope.type === 'function' ? 'Local'
                      : 'Block';

      // Filter out builtins from global scope display
      const vars = (scope.variables || []).filter(v =>
        !['console', 'setTimeout', 'setInterval', 'Promise', 'undefined', 'NaN', 'Infinity', 'Math', 'Array', 'arguments'].includes(v.name)
      );

      let varsHtml = '';
      if (vars.length === 0) {
        varsHtml = '<div class="scope-var" style="color:var(--text-dim);font-style:italic">— empty —</div>';
      } else {
        for (const v of vars.slice(0, 10)) {
          const closureBadge = scope.isClosure ? '<span class="scope-closure-badge">closed</span>' : '';
          varsHtml += `
            <div class="scope-var">
              <span class="scope-var-name">${this._esc(v.name)}</span>
              ${closureBadge}
              <span class="scope-var-value">${this._formatVal(v.value)}</span>
            </div>`;
        }
        if (vars.length > 10) {
          varsHtml += `<div class="scope-var" style="color:var(--text-dim)">…${vars.length - 10} more</div>`;
        }
      }

      el.innerHTML = `
        <div class="scope-block-header">
          <span class="scope-block-name">${this._esc(scope.name)}</span>
          <span class="scope-block-type ${typeClass}">${typeLabel}</span>
        </div>
        <div class="scope-vars">
          ${varsHtml}
        </div>
      `;
      this.body.appendChild(el);
    }
  }

  _formatVal(val) {
    if (val === null) return '<span class="val-null">null</span>';
    if (val === undefined) return '<span class="val-undefined">undefined</span>';
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    if (typeof val === 'boolean') return `<span class="val-boolean">${val}</span>`;
    if (typeof val === 'string') {
      const s = val.length > 16 ? val.slice(0, 16) + '…' : val;
      return `<span class="val-string">"${this._esc(s)}"</span>`;
    }
    if (val && val.__isFn) return `<span class="val-function">ƒ ${val.name || '?'}</span>`;
    if (typeof val === 'function') return `<span class="val-function">ƒ</span>`;
    if (Array.isArray(val)) return `<span class="val-array">[${val.length}]</span>`;
    if (typeof val === 'object') return `<span class="val-object">{…}</span>`;
    return String(val);
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }
}
