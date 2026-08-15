/**
 * FloatingBubbles3D — Ambient, floating, transparent 3D glass bubbles
 * rendered inside each visualization block/panel with realistic refraction,
 * specular highlights, gentle floating physics, and a global visibility toggle.
 */

const STORAGE_KEY = 'js_vis_floating_bubbles';

export class FloatingBubbles3D {
  constructor() {
    this.isVisible = localStorage.getItem(STORAGE_KEY) !== 'false'; // Default ON
    this._panels = [
      { id: 'editor-section', color: 'amber', count: 3 },
      { id: 'callstack-panel', color: 'indigo', count: 3 },
      { id: 'execctx-panel', color: 'violet', count: 3 },
      { id: 'memory-panel', color: 'cyan', count: 4 },
      { id: 'scope-panel', color: 'emerald', count: 3 },
      { id: 'eventloop-panel', color: 'amber', count: 3 },
      { id: 'console-section', color: 'sky', count: 3 },
    ];
    this._bubbleContainers = new Map();
    this._init();
  }

  _init() {
    this._panels.forEach(({ id, color, count }) => {
      const panel = document.getElementById(id);
      if (!panel) return;

      const container = document.createElement('div');
      container.className = `floating-3d-bubbles-layer bubble-theme-${color}`;
      
      for (let i = 0; i < count; i++) {
        const bubble = document.createElement('div');
        const size = Math.floor(Math.random() * 24) + 18; // 18px to 42px
        const left = Math.floor(Math.random() * 80) + 10;  // 10% to 90%
        const top = Math.floor(Math.random() * 70) + 15;   // 15% to 85%
        const animDuration = (Math.random() * 4 + 5).toFixed(1); // 5s to 9s
        const animDelay = (Math.random() * 3).toFixed(1);

        bubble.className = 'ambient-3d-bubble';
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}%`;
        bubble.style.top = `${top}%`;
        bubble.style.animationDuration = `${animDuration}s`;
        bubble.style.animationDelay = `-${animDelay}s`;

        bubble.innerHTML = `
          <div class="ambient-bubble-specular"></div>
          <div class="ambient-bubble-glow"></div>
        `;

        // Interactive spring bounce on click/hover
        bubble.addEventListener('click', (e) => {
          e.stopPropagation();
          bubble.classList.remove('bubble-pop-bounce');
          void bubble.offsetWidth; // Reflow
          bubble.classList.add('bubble-pop-bounce');
        });

        container.appendChild(bubble);
      }

      panel.appendChild(container);
      this._bubbleContainers.set(id, container);
    });

    this.applyVisibility(this.isVisible);
  }

  toggle() {
    this.isVisible = !this.isVisible;
    localStorage.setItem(STORAGE_KEY, String(this.isVisible));
    this.applyVisibility(this.isVisible);
    return this.isVisible;
  }

  applyVisibility(visible) {
    this.isVisible = visible;
    document.documentElement.setAttribute('data-floating-bubbles', visible ? 'true' : 'false');
    this._bubbleContainers.forEach((container) => {
      container.style.opacity = visible ? '1' : '0';
      container.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }
}
