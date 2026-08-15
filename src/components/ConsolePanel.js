/**
 * ConsolePanel — Full-featured MDN-spec DevTools Web Console.
 * Supports: log, info, warn, error, table, assert, count, time, dir, trace, group, clear,
 * and string format substitutions (%s, %d, %i, %f, %c, %o, %O).
 */
export class ConsolePanel {
  constructor(bodyEl) {
    this.body = bodyEl;
    this._renderedCount = 0;
  }

  update(snapshot) {
    const entries = snapshot.console || [];

    // If step went backwards or was reset
    if (entries.length < this._renderedCount) {
      this.body.innerHTML = '';
      this._renderedCount = 0;
    }

    if (entries.length === 0) {
      this.body.innerHTML = '<div class="console-empty">Console is empty</div>';
      this._renderedCount = 0;
      return;
    }

    // Remove empty placeholder if present
    const emptyEl = this.body.querySelector('.console-empty');
    if (emptyEl) {
      emptyEl.remove();
    }

    // Track group indentation level
    let groupIndent = 0;

    // Render new entries
    for (let i = this._renderedCount; i < entries.length; i++) {
      const entry = entries[i];

      if (entry.type === 'clear') {
        this.body.innerHTML = '<div class="console-entry console-entry-info"><span class="console-prefix">ℹ</span><span class="console-content" style="font-style:italic">Console was cleared</span></div>';
        continue;
      }

      if (entry.type === 'group' || entry.type === 'groupCollapsed') {
        const el = document.createElement('div');
        el.className = 'console-entry console-group-header';
        el.style.paddingLeft = `${groupIndent * 16 + 8}px`;
        el.innerHTML = `<span class="console-prefix">▼</span><strong>${this._esc(entry.label || 'console.group')}</strong>`;
        this.body.appendChild(el);
        groupIndent++;
        continue;
      }

      if (entry.type === 'groupEnd') {
        groupIndent = Math.max(0, groupIndent - 1);
        continue;
      }

      const el = document.createElement('div');
      el.className = `console-entry console-entry-${entry.type || 'log'}`;
      if (groupIndent > 0) {
        el.style.paddingLeft = `${groupIndent * 16 + 8}px`;
      }

      // Render Table
      if (entry.type === 'table') {
        el.innerHTML = `
          <span class="console-prefix">⊞</span>
          <div class="console-table-wrapper">${this._renderTable(entry.data, entry.columns)}</div>
        `;
        this.body.appendChild(el);
        continue;
      }

      // Render Stack Trace
      if (entry.type === 'trace') {
        const stackList = (entry.stack || []).map(f => `
          <div class="console-trace-frame">
            <span class="trace-fn">${this._esc(f.name || 'anonymous')}</span>
            <span class="trace-loc">:${f.line || '?'}</span>
          </div>
        `).join('');

        el.innerHTML = `
          <div class="console-trace">
            <div class="console-trace-header">
              <span class="console-prefix">⚑</span>
              <span class="console-content">${(entry.args || []).map(a => this._formatTopArg(a)).join(' ')}</span>
            </div>
            <div class="console-trace-stack">${stackList}</div>
          </div>
        `;
        this.body.appendChild(el);
        continue;
      }

      // Render Dir
      if (entry.type === 'dir') {
        el.innerHTML = `
          <span class="console-prefix">▾</span>
          <div class="console-dir-content">${this._formatDir(entry.args[0])}</div>
        `;
        this.body.appendChild(el);
        continue;
      }

      // Standard Log / Info / Warn / Error
      const prefix = entry.type === 'error' ? '✖'
                   : entry.type === 'warn' ? '⚠'
                   : entry.type === 'info' ? 'ℹ'
                   : '›';

      // Format args with string substitution support (%s, %d, %o, %c)
      const formattedContent = this._formatMessage(entry.args || []);

      el.innerHTML = `
        <span class="console-prefix">${prefix}</span>
        <span class="console-content">${formattedContent}</span>
      `;
      this.body.appendChild(el);
    }

    this._renderedCount = entries.length;

    // Auto-scroll to bottom
    this.body.scrollTop = this.body.scrollHeight;
  }

  clear() {
    this.body.innerHTML = '<div class="console-empty">Console is empty</div>';
    this._renderedCount = 0;
  }

  _formatMessage(args) {
    if (!args || args.length === 0) return '';

    const first = args[0];
    if (typeof first === 'string' && /%[sdifocO]/.test(first)) {
      // String format substitution
      let argIdx = 1;
      const formatted = first.replace(/%([sdifocO])/g, (match, spec) => {
        if (argIdx >= args.length) return match;
        const val = args[argIdx++];
        switch (spec) {
          case 's': return String(val);
          case 'd':
          case 'i': return `<span class="val-number">${parseInt(val, 10)}</span>`;
          case 'f': return `<span class="val-number">${parseFloat(val)}</span>`;
          case 'o':
          case 'O': return this._formatValue(val, 0);
          case 'c': return ''; // CSS style marker
          default: return match;
        }
      });

      const remainingArgs = args.slice(argIdx).map(a => this._formatTopArg(a));
      return [formatted, ...remainingArgs].join(' ');
    }

    return args.map(a => this._formatTopArg(a)).join(' ');
  }

  _formatTopArg(arg) {
    if (typeof arg === 'string') {
      return `<span class="console-text">${this._esc(arg)}</span>`;
    }
    return this._formatValue(arg, 0);
  }

  _formatValue(val, depth = 0) {
    if (val === null) return '<span class="val-null">null</span>';
    if (val === undefined) return '<span class="val-undefined">undefined</span>';
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    if (typeof val === 'boolean') return `<span class="val-boolean">${val}</span>`;
    if (typeof val === 'string') return `<span class="val-string">"${this._esc(val)}"</span>`;

    if (val && val.__isFn) {
      return `<span class="val-function">ƒ ${this._esc(val.name || 'anonymous')}()</span>`;
    }

    if (Array.isArray(val)) {
      if (depth > 2) return `<span class="val-array">[Array(${val.length})]</span>`;
      if (val.length === 0) return `<span class="val-array">[]</span>`;

      const items = val.map(item => this._formatValue(item, depth + 1));
      return `<span class="val-array">[</span>${items.join(', ')}<span class="val-array">]</span>`;
    }

    if (typeof val === 'object') {
      if (depth > 2) return `<span class="val-object">{…}</span>`;
      const entries = Object.entries(val).filter(([k]) => !k.startsWith('__'));
      if (entries.length === 0) return `<span class="val-object">{}</span>`;

      const props = entries.map(([k, v]) => {
        return `<span class="mem-prop-key">${this._esc(k)}:</span> ${this._formatValue(v, depth + 1)}`;
      });
      return `<span class="val-object">{</span> ${props.join(', ')} <span class="val-object">}</span>`;
    }

    return `<span class="console-text">${this._esc(String(val))}</span>`;
  }

  _renderTable(data, selectedColumns) {
    if (!data) return '<span style="color:var(--text-dim)">[Empty Table]</span>';

    let rows = [];
    let headers = [];

    if (Array.isArray(data)) {
      if (data.length === 0) return '<span style="color:var(--text-dim)">[Empty Array Table]</span>';

      const isArrayOfObjects = typeof data[0] === 'object' && data[0] !== null;
      if (isArrayOfObjects) {
        // Collect all unique keys
        const keySet = new Set();
        data.forEach(item => {
          if (item && typeof item === 'object') {
            Object.keys(item).forEach(k => {
              if (!k.startsWith('__')) keySet.add(k);
            });
          }
        });
        headers = selectedColumns && Array.isArray(selectedColumns)
          ? selectedColumns
          : Array.from(keySet);

        rows = data.map((item, idx) => {
          const cells = headers.map(h => this._formatValue(item ? item[h] : undefined, 1));
          return { index: idx, cells };
        });
      } else {
        // Simple array of primitives
        headers = ['Values'];
        rows = data.map((val, idx) => ({
          index: idx,
          cells: [this._formatValue(val, 1)],
        }));
      }
    } else if (typeof data === 'object') {
      headers = ['Value'];
      rows = Object.entries(data).filter(([k]) => !k.startsWith('__')).map(([k, v]) => ({
        index: k,
        cells: [this._formatValue(v, 1)],
      }));
    }

    const headerHtml = `
      <thead>
        <tr>
          <th class="table-idx-col">(index)</th>
          ${headers.map(h => `<th>${this._esc(h)}</th>`).join('')}
        </tr>
      </thead>
    `;

    const bodyHtml = `
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="table-idx-col">${this._esc(r.index)}</td>
            ${r.cells.map(c => `<td>${c}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    `;

    return `<table class="console-table">${headerHtml}${bodyHtml}</table>`;
  }

  _formatDir(obj) {
    if (!obj || typeof obj !== 'object') {
      return this._formatValue(obj, 0);
    }
    const entries = Object.entries(obj).filter(([k]) => !k.startsWith('__'));
    if (entries.length === 0) return '{}';

    return `
      <div class="console-dir-tree">
        ${entries.map(([k, v]) => `
          <div class="dir-prop">
            <span class="dir-key">${this._esc(k)}:</span>
            <span class="dir-val">${this._formatValue(v, 1)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }
}
