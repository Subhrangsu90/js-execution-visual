/**
 * Controls — debugger toolbar with SVG icons for step/play/pause/speed controls.
 * Renders into the header's #controls-bar element.
 */
import { icons } from '../utils/icons.js';

export class Controls {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks; // { onStepBack, onStepForward, onPlay, onPause, onReset, onSpeedChange }
    this.isPlaying = false;
    this.currentStep = 0;
    this.totalSteps = 0;
    this.speed = 1;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="control-group">
        <button class="control-btn" id="ctrl-reset" title="Reset (R)">${icons.reset(14)}</button>
        <button class="control-btn" id="ctrl-step-back" title="Step Back (←)" disabled>${icons.stepBack(14)}</button>
        <button class="control-btn" id="ctrl-play" title="Play / Pause (Space / F8)">${icons.play(14)}</button>
        <button class="control-btn" id="ctrl-step-fwd" title="Step Into (→ / F11)" disabled>${icons.stepForward(14)}</button>
        <button class="control-btn" id="ctrl-step-over" title="Step Over (F10)" disabled>${icons.stepOver(14)}</button>
        <button class="control-btn" id="ctrl-step-out" title="Step Out (Shift+F11)" disabled>${icons.stepOut(14)}</button>
        <button class="control-btn" id="ctrl-step-end" title="Go to End">${icons.stepEnd(14)}</button>
      </div>
      <div class="speed-control">
        <span>Speed</span>
        <input type="range" class="speed-slider" id="ctrl-speed" min="0.25" max="4" step="0.25" value="1" />
        <span id="ctrl-speed-label">1×</span>
      </div>
      <div class="step-info" id="ctrl-step-info">—</div>
    `;

    // Bind events
    this._btn('ctrl-reset').addEventListener('click', () => this.callbacks.onReset?.());
    this._btn('ctrl-step-back').addEventListener('click', () => this.callbacks.onStepBack?.());
    this._btn('ctrl-play').addEventListener('click', () => this._togglePlay());
    this._btn('ctrl-step-fwd').addEventListener('click', () => this.callbacks.onStepForward?.());
    this._btn('ctrl-step-over').addEventListener('click', () => this.callbacks.onStepOver?.());
    this._btn('ctrl-step-out').addEventListener('click', () => this.callbacks.onStepOut?.());
    this._btn('ctrl-step-end').addEventListener('click', () => this.callbacks.onStepEnd?.());

    const speedSlider = this._btn('ctrl-speed');
    speedSlider.addEventListener('input', (e) => {
      this.speed = parseFloat(e.target.value);
      this._btn('ctrl-speed-label').textContent = `${this.speed}×`;
      this.callbacks.onSpeedChange?.(this.speed);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.target.closest('.cm-editor')) return;

      if (e.key === 'F10') {
        e.preventDefault();
        this.callbacks.onStepOver?.();
        return;
      }

      if (e.key === 'F11') {
        e.preventDefault();
        if (e.shiftKey) {
          this.callbacks.onStepOut?.();
        } else {
          this.callbacks.onStepForward?.();
        }
        return;
      }

      switch (e.key) {
        case ' ':
        case 'F8':
          e.preventDefault();
          this._togglePlay();
          break;
        case 'ArrowRight':
        case 'n':
        case 'N':
          e.preventDefault();
          this.callbacks.onStepForward?.();
          break;
        case 'ArrowLeft':
        case 'p':
        case 'P':
          e.preventDefault();
          this.callbacks.onStepBack?.();
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          this.callbacks.onStepOver?.();
          break;
        case 'u':
        case 'U':
          e.preventDefault();
          this.callbacks.onStepOut?.();
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.callbacks.onReset?.();
          }
          break;
      }
    });
  }

  _togglePlay() {
    if (this.isPlaying) {
      this.callbacks.onPause?.();
    } else {
      this.callbacks.onPlay?.();
    }
  }

  updateState(step, total, playing) {
    this.currentStep = step;
    this.totalSteps = total;
    this.isPlaying = playing;

    const playBtn = this._btn('ctrl-play');
    playBtn.innerHTML = playing ? icons.pause(14) : icons.play(14);
    playBtn.classList.toggle('active', playing);

    const isAtEnd = step >= total - 1 || total === 0;
    const isAtStart = step <= 0;

    this._btn('ctrl-step-back').disabled = isAtStart;
    this._btn('ctrl-step-fwd').disabled = isAtEnd;
    this._btn('ctrl-step-over').disabled = isAtEnd;
    this._btn('ctrl-step-out').disabled = isAtEnd;
    this._btn('ctrl-step-end').disabled = isAtEnd;

    this._btn('ctrl-step-info').textContent = total > 0
      ? `${step + 1} / ${total}`
      : '—';
  }

  _btn(id) {
    return this.container.querySelector(`#${id}`) || document.getElementById(id);
  }
}
