/**
 * InfoPopup — Educational "What is this?" popup for each panel.
 * Adds an ℹ info icon button to panel headers that opens a
 * glassmorphic modal explaining the JS concept.
 */

const PANEL_INFO = {
  'callstack': {
    title: 'Call Stack',
    emoji: '📚',
    description: `The <strong>Call Stack</strong> is a LIFO (Last In, First Out) data structure that keeps track of function invocations. When a function is called, a new <em>stack frame</em> is pushed onto the stack. When a function returns, its frame is popped off.`,
    keyPoints: [
      'JavaScript is <strong>single-threaded</strong> — it has only ONE call stack',
      'Each frame stores the function name, arguments, and return address',
      'A "Stack Overflow" happens when the stack gets too deep (infinite recursion)',
      'The bottom frame is always the <strong>Global Execution Context (GEC)</strong>',
    ],
    example: `function greet(name) {\n  return "Hello " + name;\n}\ngreet("Alice");\n\n// Stack: [GEC] → [GEC, greet] → [GEC]`,
  },
  'execctx': {
    title: 'Execution Context',
    emoji: '⚙️',
    description: `An <strong>Execution Context</strong> is the environment in which JavaScript code runs. Every time a function is invoked or the script starts, a new execution context is created with two phases:`,
    keyPoints: [
      '<strong>Creation Phase</strong>: Variables are hoisted (set to <code>undefined</code>), functions are stored in memory, <code>this</code> binding is set',
      '<strong>Execution Phase</strong>: Code runs line by line, variables get their actual values',
      'The <strong>Global Execution Context (GEC)</strong> is created when the script first loads',
      'Each function call creates a new <strong>Function Execution Context (FEC)</strong>',
      'Execution contexts are stacked on the Call Stack',
    ],
    example: `let x = 10;\nfunction add(a, b) {\n  return a + b;\n}\nadd(x, 20);\n\n// Creation: x = undefined, add = fn\n// Execution: x = 10, add(10, 20)`,
  },
  'memory': {
    title: 'Memory (Stack & Heap)',
    emoji: '🧠',
    description: `JavaScript uses two memory regions: the <strong>Stack</strong> for primitives and references, and the <strong>Heap</strong> for objects, arrays, and functions.`,
    keyPoints: [
      '<strong>Stack Memory</strong>: Stores primitives (numbers, strings, booleans) and <em>references</em> (pointers) to heap objects',
      '<strong>Heap Memory</strong>: Stores objects, arrays, and functions — dynamically allocated',
      'Variables hold the <em>value</em> for primitives, but a <em>reference pointer</em> for objects',
      'This is why mutating an object through one variable affects all references to it',
      'Arrows show reference connections from Stack → Heap',
    ],
    example: `let a = 42;       // Stack: a = 42\nlet obj = {x: 1}; // Stack: obj → heap_1\nlet ref = obj;    // Stack: ref → heap_1\n\nref.x = 99;       // obj.x is also 99!`,
  },
  'scope': {
    title: 'Scope Chain',
    emoji: '🔗',
    description: `The <strong>Scope Chain</strong> determines variable accessibility. When code references a variable, the engine searches from the current scope outward through parent scopes until it finds it (or reaches the Global scope).`,
    keyPoints: [
      '<strong>Global Scope</strong>: Variables declared outside any function',
      '<strong>Function Scope</strong>: Variables declared inside a function with <code>var</code>',
      '<strong>Block Scope</strong>: Variables declared with <code>let</code> / <code>const</code> inside <code>{}</code>',
      '<strong>Lexical Scoping</strong>: Scope is determined by where functions are <em>written</em>, not where they are called',
      '<strong>Closures</strong>: Inner functions retain access to outer scope variables even after the outer function returns',
    ],
    example: `let global = "G";\nfunction outer() {\n  let x = 10;\n  function inner() {\n    console.log(x); // Finds x via scope chain\n  }\n  inner();\n}\n// Chain: inner → outer → Global`,
  },
  'eventloop': {
    title: 'Event Loop',
    emoji: '🔄',
    description: `The <strong>Event Loop</strong> enables JavaScript's asynchronous behavior despite being single-threaded. It continuously checks if the Call Stack is empty, then processes queued callbacks.`,
    keyPoints: [
      '<strong>Web APIs</strong>: Browser APIs (setTimeout, fetch, DOM events) run asynchronously outside the main thread',
      '<strong>Microtask Queue</strong>: Promises (<code>.then</code>, <code>async/await</code>) — processed <em>before</em> macrotasks',
      '<strong>Callback Queue (Macrotask)</strong>: setTimeout, setInterval, I/O — processed <em>after</em> microtasks',
      'The event loop only dequeues a task when the <strong>Call Stack is empty</strong>',
      'Microtasks have <strong>higher priority</strong> than macrotasks',
    ],
    example: `console.log("1");        // → Stack (immediate)\nsetTimeout(() => {\n  console.log("2");      // → Callback Queue\n}, 0);\nPromise.resolve().then(() => {\n  console.log("3");      // → Microtask Queue\n});\nconsole.log("4");\n// Output: 1, 4, 3, 2`,
  },
  'console': {
    title: 'Console',
    emoji: '💻',
    description: `The <strong>Console</strong> panel displays output from <code>console.log()</code> and other console methods, mimicking the browser's DevTools console.`,
    keyPoints: [
      '<code>console.log()</code> — General output',
      '<code>console.warn()</code> — Warning messages (amber)',
      '<code>console.error()</code> — Error messages (red)',
      '<code>console.table()</code> — Tabular data display',
      '<code>console.time()</code> / <code>timeEnd()</code> — Measure execution duration',
      '<code>console.trace()</code> — Print call stack snapshot',
    ],
    example: `console.log("Hello", 42);\nconsole.table([{a:1}, {a:2}]);\nconsole.time("op");\n// ...code...\nconsole.timeEnd("op");`,
  },
};

export class InfoPopup {
  constructor() {
    this._overlayEl = null;
    this._popupEl = null;
    this._isOpen = false;
    this._init();
  }

  _init() {
    // Create overlay
    this._overlayEl = document.createElement('div');
    this._overlayEl.className = 'info-popup-overlay';
    this._overlayEl.style.display = 'none';
    this._overlayEl.addEventListener('click', (e) => {
      if (e.target === this._overlayEl) this.close();
    });

    // Create popup container
    this._popupEl = document.createElement('div');
    this._popupEl.className = 'info-popup-modal';
    this._overlayEl.appendChild(this._popupEl);

    document.body.appendChild(this._overlayEl);

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) this.close();
    });
  }

  /**
   * Attach ℹ️ info buttons to all panel headers.
   */
  attachToHeaders() {
    const panelMap = {
      'callstack-panel': 'callstack',
      'execctx-panel': 'execctx',
      'memory-panel': 'memory',
      'scope-panel': 'scope',
      'eventloop-panel': 'eventloop',
      'console-section': 'console',
    };

    for (const [panelId, infoKey] of Object.entries(panelMap)) {
      const panelEl = document.getElementById(panelId);
      if (!panelEl) continue;

      const header = panelEl.querySelector('.panel-header');
      if (!header) continue;

      // Don't double-attach
      if (header.querySelector('.info-btn')) continue;

      const btn = document.createElement('button');
      btn.className = 'info-btn';
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
      btn.title = `What is ${PANEL_INFO[infoKey]?.title || infoKey}?`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.open(infoKey);
      });

      // Insert info button into the panel-title div
      const titleDiv = header.querySelector('.panel-title');
      if (titleDiv) {
        titleDiv.appendChild(btn);
      }
    }
  }

  open(infoKey) {
    const info = PANEL_INFO[infoKey];
    if (!info) return;

    this._popupEl.innerHTML = `
      <div class="info-popup-header">
        <span class="info-popup-emoji">${info.emoji}</span>
        <h2 class="info-popup-title">${info.title}</h2>
        <button class="info-popup-close" title="Close (Esc)">✕</button>
      </div>
      <div class="info-popup-body">
        <p class="info-popup-desc">${info.description}</p>
        <div class="info-popup-section">
          <h3>Key Points</h3>
          <ul class="info-popup-points">
            ${info.keyPoints.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
        <div class="info-popup-section">
          <h3>Example</h3>
          <pre class="info-popup-code"><code>${this._escapeHtml(info.example)}</code></pre>
        </div>
      </div>
    `;

    const closeBtn = this._popupEl.querySelector('.info-popup-close');
    closeBtn.addEventListener('click', () => this.close());

    this._overlayEl.style.display = 'flex';
    this._isOpen = true;

    // Trigger animation
    requestAnimationFrame(() => {
      this._overlayEl.classList.add('is-visible');
      this._popupEl.classList.add('is-visible');
    });
  }

  close() {
    this._overlayEl.classList.remove('is-visible');
    this._popupEl.classList.remove('is-visible');
    this._isOpen = false;

    setTimeout(() => {
      this._overlayEl.style.display = 'none';
    }, 200);
  }

  _escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}
