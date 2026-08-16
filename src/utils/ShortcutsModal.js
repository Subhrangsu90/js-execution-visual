/**
 * ShortcutsModal — Sleek HUD Modal displaying keyboard shortcuts.
 */

export class ShortcutsModal {
  constructor() {
    this._overlayEl = null;
    this._isOpen = false;
    this._init();
  }

  _init() {
    this._overlayEl = document.createElement('div');
    this._overlayEl.className = 'shortcuts-overlay';
    this._overlayEl.style.display = 'none';
    this._overlayEl.addEventListener('click', (e) => {
      if (e.target === this._overlayEl) this.close();
    });

    this._overlayEl.innerHTML = `
      <div class="shortcuts-modal">
        <div class="shortcuts-header">
          <div class="shortcuts-title-group">
            <span class="shortcuts-icon">⌨️</span>
            <h2>Keyboard Shortcuts</h2>
          </div>
          <button class="shortcuts-close" title="Close (Esc)">✕</button>
        </div>
        <div class="shortcuts-body">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
              </div>
              <span class="shortcut-desc">Run / Re-run Code</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>→</kbd> or <kbd>F11</kbd>
              </div>
              <span class="shortcut-desc">Step Into / Forward</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>F10</kbd> or <kbd>O</kbd>
              </div>
              <span class="shortcut-desc">Step Over Function</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Shift</kbd> + <kbd>F11</kbd> or <kbd>U</kbd>
              </div>
              <span class="shortcut-desc">Step Out of Function</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>←</kbd>
              </div>
              <span class="shortcut-desc">Step Back</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Space</kbd> or <kbd>F8</kbd>
              </div>
              <span class="shortcut-desc">Play / Pause Execution</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>R</kbd>
              </div>
              <span class="shortcut-desc">Reset Execution</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>?</kbd> or <kbd>Shift</kbd> + <kbd>/</kbd>
              </div>
              <span class="shortcut-desc">Toggle Shortcuts Help</span>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Esc</kbd>
              </div>
              <span class="shortcut-desc">Close any Open Modal</span>
            </div>
          </div>
        </div>
        <div class="shortcuts-footer">
          <span>ProTip: Click any Call Stack frame to inspect its local scope!</span>
        </div>
      </div>
    `;

    document.body.appendChild(this._overlayEl);

    const closeBtn = this._overlayEl.querySelector('.shortcuts-close');
    closeBtn.addEventListener('click', () => this.close());

    // Global keyboard listener
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in code editor or input
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) ||
                      document.activeElement?.closest('.cm-editor');

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        if (!isInput) {
          e.preventDefault();
          this.toggle();
        }
      } else if (e.key === 'Escape' && this._isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this._overlayEl.style.display = 'flex';
    this._isOpen = true;
    requestAnimationFrame(() => {
      this._overlayEl.classList.add('is-visible');
    });
  }

  close() {
    this._overlayEl.classList.remove('is-visible');
    this._isOpen = false;
    setTimeout(() => {
      this._overlayEl.style.display = 'none';
    }, 200);
  }
}
