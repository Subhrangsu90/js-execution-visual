/**
 * GuidedTour.js — Interactive Onboarding Spotlight & Concept Lessons
 *
 * Provides a guided spotlight tour of visualizer UI panels and interactive
 * concept lessons explaining JS runtime mechanics step-by-step.
 */
import { icons } from '../utils/icons.js';

export const CONCEPT_LESSONS = [
  {
    id: 'lesson-hoisting',
    title: 'Lesson 1: Creation Phase vs Execution Phase',
    description: 'Learn how JavaScript engines hoist variables and functions before executing a single line of code.',
    code: `console.log("Hoisted var:", myVar);
var myVar = "Hello World";
sayHello();

function sayHello() {
  console.log("Function executed!");
}`,
    steps: [
      {
        targetId: 'editor-section',
        title: 'Step 1: The JavaScript Source Code',
        content: 'Notice `myVar` is logged on line 1 before it is initialized on line 2. Click **Run** to parse the code and initialize the Global Execution Context.'
      },
      {
        targetId: 'execctx-panel',
        title: 'Step 2: Creation Phase (Hoisting)',
        content: 'Observe the Creation Phase tab in the Execution Context panel! `myVar` is allocated in the variable environment with value `undefined`. `sayHello` is fully hoisted with its function body.'
      },
      {
        targetId: 'callstack-panel',
        title: 'Step 3: Execution Phase & Call Stack',
        content: 'Step forward using `→`. When `sayHello()` is invoked, a new Function Execution Context frame is pushed onto the top of the Call Stack!'
      }
    ]
  },
  {
    id: 'lesson-memory',
    title: 'Lesson 2: Stack vs Heap Memory & Pointers',
    description: 'Understand how primitive values stay on the Call Stack while Objects and Arrays are stored on the Heap.',
    code: `let num = 42;
let person = { name: "Sarah", age: 25 };
let copy = person;
copy.age = 26;`,
    steps: [
      {
        targetId: 'memory-panel',
        title: 'Step 1: Primitive vs Reference Allocation',
        content: 'Look at the Memory Panel! `num = 42` is a primitive value stored directly on the Stack. `person` holds an SVG pointer address (`@0x101`) pointing to the object on the Heap.'
      },
      {
        targetId: 'memory-panel',
        title: 'Step 2: Pointer Copying',
        content: 'When `let copy = person` executes, the heap pointer `@0x101` is duplicated onto the stack. Both variables point to the exact same heap address!'
      }
    ]
  },
  {
    id: 'lesson-closures',
    title: 'Lesson 3: Closures & Lexical Scope Chains',
    description: 'Discover how inner functions capture outer scope variables even after parent call frames exit.',
    code: `function makeMultiplier(factor) {
  return function(number) {
    return number * factor;
  };
}
const double = makeMultiplier(2);
console.log(double(5));`,
    steps: [
      {
        targetId: 'scope-panel',
        title: 'Step 1: Outer Lexical Scope',
        content: 'When `makeMultiplier(2)` runs, `factor: 2` is stored in its function scope.'
      },
      {
        targetId: 'scope-panel',
        title: 'Step 2: Closure Retention',
        content: 'After `makeMultiplier(2)` finishes, its frame leaves the Call Stack, but `double()` retains a **Closure** reference over `factor: 2` in the Scope Chain panel!'
      }
    ]
  },
  {
    id: 'lesson-eventloop',
    title: 'Lesson 4: Event Loop & Microtask Priority',
    description: 'See how `Promise.then` microtasks get priority execution over `setTimeout` callback queues.',
    code: `console.log("Start");

setTimeout(() => {
  console.log("Timeout Callback");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise Microtask");
});

console.log("End");`,
    steps: [
      {
        targetId: 'eventloop-panel',
        title: 'Step 1: Web APIs & Task Queues',
        content: 'Step forward! `setTimeout` registers a timer in Web APIs, while `Promise.then` registers a Microtask.'
      },
      {
        targetId: 'eventloop-panel',
        title: 'Step 2: Microtask Queue Draining',
        content: 'After synchronous code finishes, the Event Loop checks the Microtask Queue first! Notice the Promise callback moves to the Call Stack before the setTimeout callback.'
      }
    ]
  }
];

export const UI_TOUR_STEPS = [
  {
    targetId: 'editor-section',
    title: '1. JavaScript Code Editor',
    content: 'Write or paste JavaScript code here. Features line numbers, syntax highlighting, active line indicators, and a preset scenario selector.'
  },
  {
    targetId: 'controls-bar',
    title: '2. Debugger Control Toolbar',
    content: 'Step forward (`→`), step backward (`←`), auto-play (`Space`), adjust playback speed, or reset execution back to frame 0.'
  },
  {
    targetId: 'callstack-panel',
    title: '3. Call Stack Panel',
    content: 'Visualizes active function execution frames entering (push) and returning (pop) from the stack.'
  },
  {
    targetId: 'execctx-panel',
    title: '4. Execution Context Inspector',
    content: 'Inspect Creation Phase (hoisting) vs Execution Phase, `this` binding, variable environments, and lexical environments.'
  },
  {
    targetId: 'memory-panel',
    title: '5. Stack & Heap Memory Model',
    content: 'Tracks primitive stack storage and dynamic heap allocations with SVG pointer arrows connecting variables to memory addresses.'
  },
  {
    targetId: 'scope-panel',
    title: '6. Scope Chain & Closures',
    content: 'Deeply inspect Global Scope, Function Scopes, Block Scopes, and persistent Closure chains.'
  },
  {
    targetId: 'eventloop-panel',
    title: '7. Event Loop & Async Queues',
    content: 'Live simulation of Web APIs, Microtask Queue (Promises), and Macrotask Callback Queue (`setTimeout`, `setInterval`).'
  }
];

export class GuidedTour {
  /**
   * @param {object} options
   * @param {(code: string) => void} options.onLoadCode
   * @param {() => void} options.onRunVerification
   */
  constructor(options = {}) {
    this.options = options;
    this.currentStepIdx = 0;
    this.currentLesson = null;
    this.activeTourType = null; // 'ui' | 'lesson'
    this.overlayEl = null;
    this.popoverEl = null;
    this.isOpen = false;
    this._initUI();
  }

  _initUI() {
    // Backdrop spotlight overlay
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'tour-spotlight-backdrop';
    this.overlayEl.className = 'tour-spotlight-backdrop hidden';

    // Popover card
    this.popoverEl = document.createElement('div');
    this.popoverEl.id = 'tour-popover-card';
    this.popoverEl.className = 'tour-popover-card glass-card hidden';

    document.body.appendChild(this.overlayEl);
    document.body.appendChild(this.popoverEl);

    // Modal menu for selecting lessons
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'lessons-modal-backdrop';
    this.modalEl.className = 'modal-backdrop glass-backdrop hidden';
    this.modalEl.innerHTML = `
      <div class="modal-card lesson-modal glass-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon text-accent">${icons.graduation(20)}</span>
            <h3>Guided Tour & Interactive Lessons</h3>
          </div>
          <button id="btn-close-lesson-modal" class="modal-close-btn" aria-label="Close Lessons">&times;</button>
        </div>
        <div class="modal-body lesson-modal-body">
          <div class="tour-quick-start">
            <div class="quick-start-card">
              <span class="qs-icon">${icons.sparkles(24)}</span>
              <div class="qs-text">
                <h4>Quick Interface Tour</h4>
                <p>Take a 2-minute spotlight walkthrough of all 7 visualizer panels.</p>
              </div>
              <button id="btn-start-ui-tour" class="btn btn-primary">Start UI Tour</button>
            </div>
          </div>

          <h4 class="section-subtitle">Interactive Concept Lessons</h4>
          <div id="lessons-grid" class="lessons-grid"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    this._bindEvents();
  }

  _bindEvents() {
    // Close modal cross button
    const closeBtn = this.modalEl.querySelector('#btn-close-lesson-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeLessonModal();
      });
    }

    // Modal backdrop click
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.closeLessonModal();
    });

    // Start UI tour button
    const startUiBtn = this.modalEl.querySelector('#btn-start-ui-tour');
    if (startUiBtn) {
      startUiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.modalEl.classList.add('hidden');
        this.startUITour();
      });
    }

    // Overlay backdrop click ends active tour
    this.overlayEl.addEventListener('click', () => this.endTour());
  }

  openLessonModal() {
    this.modalEl.classList.remove('hidden');
    this.renderLessonsGrid();
  }

  closeLessonModal() {
    this.modalEl.classList.add('hidden');
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) modeSelector.value = 'sandbox';
  }

  renderLessonsGrid() {
    const grid = this.modalEl.querySelector('#lessons-grid');
    if (!grid) return;
    grid.innerHTML = '';

    CONCEPT_LESSONS.forEach(lesson => {
      const card = document.createElement('div');
      card.className = 'lesson-card glass-card';
      card.innerHTML = `
        <div class="lesson-card-header">
          <span class="badge lesson-badge">${icons.graduation(12)} Lesson</span>
          <h4>${lesson.title}</h4>
        </div>
        <p class="lesson-desc">${lesson.description}</p>
        <div class="lesson-card-footer">
          <span class="step-count">${lesson.steps.length} guided steps</span>
          <button class="btn btn-secondary btn-sm btn-start-lesson">Start Lesson &rarr;</button>
        </div>
      `;

      card.querySelector('.btn-start-lesson').addEventListener('click', (e) => {
        e.stopPropagation();
        this.modalEl.classList.add('hidden');
        this.startLesson(lesson);
      });

      grid.appendChild(card);
    });
  }

  startUITour() {
    this.activeTourType = 'ui';
    this.currentStepIdx = 0;
    this.currentLesson = null;
    this._showStep();
  }

  startLesson(lesson) {
    this.activeTourType = 'lesson';
    this.currentLesson = lesson;
    this.currentStepIdx = 0;

    if (this.options.onLoadCode) {
      this.options.onLoadCode(lesson.code);
    }

    if (this.options.onRunVerification) {
      setTimeout(() => this.options.onRunVerification(), 150);
    }

    this._showStep();
  }

  _showStep() {
    const steps = this.activeTourType === 'ui' ? UI_TOUR_STEPS : this.currentLesson.steps;
    const step = steps[this.currentStepIdx];
    if (!step) {
      this.endTour();
      return;
    }

    this.isOpen = true;
    this.overlayEl.classList.remove('hidden');
    this.popoverEl.classList.remove('hidden');

    const targetEl = document.getElementById(step.targetId);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = targetEl.getBoundingClientRect();
      
      const popoverWidth = 360;
      const popoverHeight = 220;

      let top = rect.bottom + 12;
      if (top + popoverHeight > window.innerHeight) {
        top = rect.top - popoverHeight - 12;
      }
      top = Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16));
      let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
      left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));

      this.popoverEl.style.top = `${top}px`;
      this.popoverEl.style.left = `${left}px`;

      // Highlight target element with glowing ring
      this._clearSpotlight();
      targetEl.classList.add('tour-spotlight-active');
    }

    const total = steps.length;
    this.popoverEl.innerHTML = `
      <div class="popover-header">
        <span class="popover-badge">${icons.graduation(14)} ${this.activeTourType === 'ui' ? 'UI Tour' : this.currentLesson.title}</span>
        <button id="btn-close-tour" class="popover-close-btn" aria-label="Close Tour">&times;</button>
      </div>
      <div class="popover-body">
        <h4>${step.title}</h4>
        <p>${step.content}</p>
      </div>
      <div class="popover-footer">
        <span class="tour-step-counter">Step ${this.currentStepIdx + 1} of ${total}</span>
        <div class="popover-nav-btns">
          <button id="btn-tour-prev" class="btn btn-secondary btn-xs" ${this.currentStepIdx === 0 ? 'disabled' : ''}>&larr; Prev</button>
          <button id="btn-tour-next" class="btn btn-primary btn-xs">${this.currentStepIdx === total - 1 ? 'Finish 🎉' : 'Next &rarr;'}</button>
        </div>
      </div>
    `;

    this._bindPopoverEvents(steps);
  }

  _bindPopoverEvents(steps) {
    const closeBtn = this.popoverEl.querySelector('#btn-close-tour');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.endTour();
      });
    }

    const prevBtn = this.popoverEl.querySelector('#btn-tour-prev');
    const nextBtn = this.popoverEl.querySelector('#btn-tour-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentStepIdx > 0) {
          this._clearSpotlight();
          this.currentStepIdx--;
          this._showStep();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._clearSpotlight();
        if (this.currentStepIdx < steps.length - 1) {
          this.currentStepIdx++;
          this._showStep();
        } else {
          this.endTour();
        }
      });
    }
  }

  _clearSpotlight() {
    document.querySelectorAll('.tour-spotlight-active').forEach(el => el.classList.remove('tour-spotlight-active'));
  }

  endTour() {
    this.isOpen = false;
    this._clearSpotlight();
    this.overlayEl.classList.add('hidden');
    this.popoverEl.classList.add('hidden');
    this.modalEl.classList.add('hidden');
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) modeSelector.value = 'sandbox';
  }
}
