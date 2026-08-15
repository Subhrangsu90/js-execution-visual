/**
 * ExecutionContextPanel — shows the execution context stack
 * with variable environments, this bindings, and creation/execution phases.
 */
import { icons } from '../utils/icons.js';

export class ExecutionContextPanel {
  constructor(bodyEl, counterEl) {
    this.body = bodyEl;
    this.counter = counterEl;
  }

  update(snapshot) {
    const contexts = snapshot.executionContexts || [];
    this.counter.textContent = `${contexts.length} context${contexts.length !== 1 ? 's' : ''}`;

    this.body.innerHTML = '';

    if (contexts.length === 0) {
      this.body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icons.context(28)}</div>
          <div>No execution contexts</div>
        </div>`;
      return;
    }

    // Render in reverse so the active (top) context is first
    for (let i = contexts.length - 1; i >= 0; i--) {
      const ctx = contexts[i];
      const isActive = i === contexts.length - 1;
      const el = document.createElement('div');
      el.className = `exec-context ${isActive ? 'active' : ''}`;
      el.style.animationDelay = `${(contexts.length - 1 - i) * 50}ms`;

      const phaseClass = ctx.phase === 'creation' ? 'phase-creation' : 'phase-execution';
      const phaseLabel = ctx.phase === 'creation' ? 'Creation' : 'Execution';

      let varsHtml = '';
      const BUILTINS = ['console', 'setTimeout', 'setInterval', 'Promise', 'undefined', 'NaN', 'Infinity', 'Math', 'Array', 'arguments', 'this'];
      const vars = (ctx.variables || []).filter(v => !BUILTINS.includes(v.name));
      if (vars.length === 0) {
        varsHtml = '<div class="exec-context-row"><span class="ec-label" style="color: var(--text-dim); font-style: italic">— empty —</span></div>';
      } else {
        for (const v of vars.slice(0, 12)) {
          varsHtml += `
            <div class="exec-context-row">
              <span class="ec-label">${v.kind || 'let'}</span>
              <span class="ec-value">${this._escapeHtml(v.name)}: ${this._formatValue(v.value)}</span>
            </div>`;
        }
      }

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
          ${varsHtml}
        </div>
      `;
      this.body.appendChild(el);
    }
  }

  _formatValue(val) {
    if (val === null) return '<span class="val-null">null</span>';
    if (val === undefined) return '<span class="val-undefined">undefined</span>';
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    if (typeof val === 'boolean') return `<span class="val-boolean">${val}</span>`;
    if (typeof val === 'string') {
      const short = val.length > 20 ? val.slice(0, 20) + '…' : val;
      return `<span class="val-string">"${this._escapeHtml(short)}"</span>`;
    }
    if (val && val.__isFn) return `<span class="val-function">ƒ ${val.name || 'anonymous'}</span>`;
    if (typeof val === 'function') return `<span class="val-function">ƒ native</span>`;
    if (Array.isArray(val)) return `<span class="val-array">Array(${val.length})</span>`;
    if (typeof val === 'object') return `<span class="val-object">{…}</span>`;
    return String(val);
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
