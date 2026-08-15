/**
 * EventLoopModel — simulates the JavaScript event loop for visualization.
 *
 * Tracks:
 *   - Web APIs (setTimeout timers, promise callbacks waiting)
 *   - Microtask queue (Promise .then callbacks)
 *   - Macrotask / callback queue (setTimeout callbacks)
 *
 * During synchronous execution, registered async work is stored here.
 * After synchronous code completes, the interpreter drains queues
 * (microtasks first, then one macrotask, repeating) and records steps.
 */
export class EventLoopModel {
  constructor() {
    /** @type {Array<{id: number, type: string, label: string, callback: object, delay: number}>} */
    this.webApis = [];
    /** @type {Array<{id: number, label: string, callback: object}>} */
    this.microtaskQueue = [];
    /** @type {Array<{id: number, label: string, callback: object}>} */
    this.macrotaskQueue = [];
    this._nextId = 1;
  }

  /**
   * Register a setTimeout.
   * The callback is kept in "Web APIs" until the timer "fires",
   * then it moves to the macrotask queue.
   */
  addTimer(callback, delay, label = '') {
    const id = this._nextId++;
    this.webApis.push({
      id,
      type: 'timer',
      label: label || `setTimeout(${delay}ms)`,
      callback,
      delay,
    });
    return id;
  }

  /**
   * Register a Promise microtask (.then callback).
   */
  addMicrotask(callback, label = '') {
    const id = this._nextId++;
    this.microtaskQueue.push({
      id,
      label: label || 'Promise.then',
      callback,
    });
    return id;
  }

  /**
   * Move all ready timers from Web APIs → macrotask queue.
   * In our simulation, all timers are "ready" once synchronous code finishes.
   */
  fireTimers() {
    const fired = [];
    const remaining = [];
    for (const entry of this.webApis) {
      if (entry.type === 'timer') {
        this.macrotaskQueue.push({
          id: entry.id,
          label: entry.label,
          callback: entry.callback,
        });
        fired.push(entry);
      } else {
        remaining.push(entry);
      }
    }
    this.webApis = remaining;
    return fired;
  }

  /** Dequeue one microtask (FIFO). */
  dequeueMicrotask() {
    return this.microtaskQueue.shift() || null;
  }

  /** Dequeue one macrotask (FIFO). */
  dequeueMacrotask() {
    return this.macrotaskQueue.shift() || null;
  }

  hasPendingWork() {
    return this.webApis.length > 0 ||
           this.microtaskQueue.length > 0 ||
           this.macrotaskQueue.length > 0;
  }

  snapshot() {
    return {
      webApis: this.webApis.map(e => ({
        id: e.id, type: e.type, label: e.label, delay: e.delay,
      })),
      microtaskQueue: this.microtaskQueue.map(e => ({
        id: e.id, label: e.label,
      })),
      macrotaskQueue: this.macrotaskQueue.map(e => ({
        id: e.id, label: e.label,
      })),
    };
  }
}
