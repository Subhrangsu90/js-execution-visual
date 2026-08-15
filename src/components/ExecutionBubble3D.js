/**
 * ExecutionBubble3D — 3D Glassmorphic & Volumetric Bubble Widget
 * Displays live 3D spherical counters for execution step, call stack depth,
 * heap memory objects, and event loop queue items with realistic physics,
 * specular highlights, and spring bounce animations.
 */
export class ExecutionBubble3D {
  constructor(container) {
    this.container = container;
    this.el = null;
    this._lastStep = -1;
    this._init();
  }

  _init() {
    this.el = document.createElement('div');
    this.el.className = 'exec-bubble-3d-container';
    this.el.innerHTML = `
      <div class="bubble-3d-wrapper" title="Interactive 3D Execution Status (Click to bounce)">
        <div class="bubble-3d-sphere" id="main-3d-orb">
          <div class="bubble-3d-specular"></div>
          <div class="bubble-3d-inner-glow"></div>
          <div class="bubble-3d-content">
            <span class="bubble-3d-label">STEP</span>
            <span class="bubble-3d-val" id="bubble-step-val">0</span>
          </div>
          <div class="bubble-3d-pulse-ring"></div>
        </div>
      </div>
      <div class="bubble-3d-stats">
        <div class="bubble-3d-pill pill-stack" title="Call Stack Depth">
          <span class="pill-dot dot-stack"></span>
          <span class="pill-label">Stack</span>
          <span class="pill-val" id="bubble-stack-count">0</span>
        </div>
        <div class="bubble-3d-pill pill-heap" title="Heap Objects Allocated">
          <span class="pill-dot dot-heap"></span>
          <span class="pill-label">Heap</span>
          <span class="pill-val" id="bubble-heap-count">0</span>
        </div>
        <div class="bubble-3d-pill pill-queue" title="Event Loop Queued Tasks">
          <span class="pill-dot dot-queue"></span>
          <span class="pill-label">Tasks</span>
          <span class="pill-val" id="bubble-queue-count">0</span>
        </div>
      </div>
    `;

    this.container.appendChild(this.el);

    // 3D tilt effect on mousemove
    const sphere = this.el.querySelector('#main-3d-orb');
    if (sphere) {
      sphere.addEventListener('mousemove', (e) => {
        const rect = sphere.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const tiltX = (y / (rect.height / 2)) * -18;
        const tiltY = (x / (rect.width / 2)) * 18;
        sphere.style.transform = `perspective(200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.08)`;
      });

      sphere.addEventListener('mouseleave', () => {
        sphere.style.transform = 'perspective(200px) rotateX(0deg) rotateY(0deg) scale(1)';
      });

      sphere.addEventListener('click', () => {
        sphere.classList.remove('sphere-bounce');
        void sphere.offsetWidth; // Reflow
        sphere.classList.add('sphere-bounce');
      });
    }
  }

  update(snapshot, totalSteps = 0) {
    if (!snapshot) {
      this._reset();
      return;
    }

    const stepNum = snapshot.step + 1;
    const stackFrames = snapshot.callStack ? snapshot.callStack.length : 0;
    const heapObjects = snapshot.memory && snapshot.memory.heap ? Object.keys(snapshot.memory.heap).length : 0;
    
    let queuedTasks = 0;
    if (snapshot.eventLoop) {
      queuedTasks = (snapshot.eventLoop.microtaskQueue?.length || 0) +
                    (snapshot.eventLoop.macrotaskQueue?.length || 0) +
                    (snapshot.eventLoop.webApis?.length || 0);
    }

    const stepEl = this.el.querySelector('#bubble-step-val');
    const stackEl = this.el.querySelector('#bubble-stack-count');
    const heapEl = this.el.querySelector('#bubble-heap-count');
    const queueEl = this.el.querySelector('#bubble-queue-count');
    const sphere = this.el.querySelector('#main-3d-orb');

    if (stepEl) {
      stepEl.textContent = `${stepNum}`;
      if (this._lastStep !== snapshot.step && sphere) {
        sphere.classList.remove('sphere-step-pulse');
        void sphere.offsetWidth;
        sphere.classList.add('sphere-step-pulse');
      }
    }

    if (stackEl) {
      this._updateVal(stackEl, stackFrames);
    }
    if (heapEl) {
      this._updateVal(heapEl, heapObjects);
    }
    if (queueEl) {
      this._updateVal(queueEl, queuedTasks);
    }

    this._lastStep = snapshot.step;
  }

  _updateVal(el, newVal) {
    const oldVal = parseInt(el.textContent, 10);
    el.textContent = newVal;
    if (oldVal !== newVal) {
      el.classList.remove('val-bump');
      void el.offsetWidth;
      el.classList.add('val-bump');
    }
  }

  _reset() {
    this._lastStep = -1;
    const stepEl = this.el.querySelector('#bubble-step-val');
    const stackEl = this.el.querySelector('#bubble-stack-count');
    const heapEl = this.el.querySelector('#bubble-heap-count');
    const queueEl = this.el.querySelector('#bubble-queue-count');

    if (stepEl) stepEl.textContent = '0';
    if (stackEl) stackEl.textContent = '0';
    if (heapEl) heapEl.textContent = '0';
    if (queueEl) queueEl.textContent = '0';
  }
}
