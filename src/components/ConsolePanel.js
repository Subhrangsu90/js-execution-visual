/**
 * ConsolePanel — displays console.log/error/warn output with styling.
 */
export class ConsolePanel {
  constructor(bodyEl) {
    this.body = bodyEl;
    this._prevCount = 0;
  }

  update(snapshot) {
    const entries = snapshot.console || [];

    // Only render new entries since last update
    if (entries.length === this._prevCount) return;

    // If entries were reset (new run), clear
    if (entries.length < this._prevCount) {
      this.body.innerHTML = '';
      this._prevCount = 0;
    }

    for (let i = this._prevCount; i < entries.length; i++) {
      const entry = entries[i];
      const el = document.createElement('div');
      el.className = `console-entry console-entry-${entry.type}`;

      const prefix = entry.type === 'error' ? '✖'
                   : entry.type === 'warn' ? '⚠'
                   : '›';

      el.innerHTML = `
        <span class="console-prefix">${prefix}</span>
        <span class="console-content">${entry.args.map(a => this._esc(String(a))).join(' ')}</span>
      `;
      this.body.appendChild(el);
    }

    this._prevCount = entries.length;

    // Auto-scroll to bottom
    this.body.scrollTop = this.body.scrollHeight;
  }

  clear() {
    this.body.innerHTML = '';
    this._prevCount = 0;
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}
