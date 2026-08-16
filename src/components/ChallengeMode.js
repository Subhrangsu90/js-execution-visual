/**
 * ChallengeMode.js — Interactive JS Engine Quiz & Challenge System
 *
 * Allows users to test their understanding of JavaScript execution mechanics:
 * Hoisting, Closures, Stack vs Heap, Event Loop priority, etc.
 * Features instant "Verify in Visualizer" execution testing and final submission score summary!
 */
import { icons } from '../utils/icons.js';

export const QUIZ_QUESTIONS = [
  {
    id: 'hoist-1',
    category: 'Hoisting & Scope',
    title: 'Temporal Dead Zone & Hoisting',
    question: 'What will be logged to the console when this script executes?',
    code: `console.log(a);
var a = 10;
console.log(b);
let b = 20;`,
    options: [
      'undefined, then 20',
      'undefined, then ReferenceError (Cannot access b before initialization)',
      'ReferenceError for a, then 20',
      '10, then 20'
    ],
    correctIndex: 1,
    explanation: '`var a` is hoisted and initialized with `undefined` in the Creation Phase. `let b` is hoisted but remains uninitialized in the Temporal Dead Zone (TDZ), throwing a ReferenceError when accessed before declaration.',
    hint: 'Think about how `var` and `let` behave differently during the Execution Context creation phase.'
  },
  {
    id: 'mem-1',
    category: 'Stack vs Heap Memory',
    title: 'Object Mutation vs Variable Assignment',
    question: 'What is logged at the end of execution?',
    code: `let obj1 = { name: "Alice" };
let obj2 = obj1;
obj2.name = "Bob";
console.log(obj1.name);`,
    options: [
      'Alice',
      'Bob',
      'undefined',
      'TypeError'
    ],
    correctIndex: 1,
    explanation: '`obj1` holds a stack reference pointing to a heap object `{ name: "Alice" }`. `obj2 = obj1` copies the memory pointer, so both variables point to the exact same object in heap memory. Mutating `obj2.name` modifies the shared heap object!',
    hint: 'Are primitive values copied by value or reference? What about objects?'
  },
  {
    id: 'loop-1',
    category: 'Event Loop & Async',
    title: 'Microtask vs Macrotask Order',
    question: 'In what exact order will the numbers 1, 2, 3, 4 be logged?',
    code: `console.log(1);

setTimeout(() => {
  console.log(2);
}, 0);

Promise.resolve().then(() => {
  console.log(3);
});

console.log(4);`,
    options: [
      '1, 2, 3, 4',
      '1, 4, 2, 3',
      '1, 4, 3, 2',
      '4, 1, 3, 2'
    ],
    correctIndex: 2,
    explanation: '1 and 4 log synchronously on the Call Stack. `Promise.then` callback enters the Microtask Queue. `setTimeout` callback enters the Callback (Macrotask) Queue. Microtask Queue has higher priority and empties before Macrotasks!',
    hint: 'Synchronous code runs first, followed by Microtasks (Promises), then Macrotasks (setTimeout).'
  },
  {
    id: 'closure-1',
    category: 'Closures & Scope',
    title: 'Lexical Environment Preservation',
    question: 'What is the return value of calling `counter()` twice in sequence?',
    code: `function createCounter() {
  let count = 0;
  return function() {
    count++;
    return count;
  };
}
const counter = createCounter();
console.log(counter());
console.log(counter());`,
    options: [
      '0, then 1',
      '1, then 1',
      '1, then 2',
      'undefined, then undefined'
    ],
    correctIndex: 2,
    explanation: '`counter` holds a closure over `count` inside `createCounter`\'s Lexical Environment. Even after `createCounter` returns and its call frame is popped off the Call Stack, `count` stays alive in heap closure memory!',
    hint: 'Does the inner function maintain access to variables in its parent function scope?'
  },
  {
    id: 'stack-1',
    category: 'Call Stack & Recursion',
    title: 'Maximum Stack Depth',
    question: 'How many call stack frames exist at the peak depth during `factorial(3)`?',
    code: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
factorial(3);`,
    options: [
      '3 frames (Global + factorial(3) + factorial(2))',
      '4 frames (Global + factorial(3) + factorial(2) + factorial(1))',
      '1 frame',
      '5 frames'
    ],
    correctIndex: 1,
    explanation: 'The Call Stack starts with 1 Global frame. Calling `factorial(3)` pushes frame #2, `factorial(2)` pushes frame #3, and base case `factorial(1)` pushes frame #4 before stack unwinding begins.',
    hint: 'Don\'t forget the initial Global Execution Context frame!'
  }
];

export class ChallengeMode {
  /**
   * @param {object} options
   * @param {(code: string) => void} options.onLoadCode
   * @param {() => void} options.onRunVerification
   */
  constructor(options = {}) {
    this.options = options;
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.userAnswers = {};
    this.isCompleted = false;
    this.isOpen = false;
    this.container = null;
    this._initUI();
  }

  _initUI() {
    this.container = document.createElement('div');
    this.container.id = 'challenge-modal-backdrop';
    this.container.className = 'modal-backdrop glass-backdrop hidden';
    this.container.innerHTML = `
      <div class="modal-card challenge-modal glass-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon text-accent">${icons.target(20)}</span>
            <h3>JS Engine Quiz & Challenges</h3>
          </div>
          <div class="challenge-stats">
            <span class="stat-badge streak-badge" title="Current Streak">${icons.sparkles(14)} Streak: <strong id="quiz-streak">0</strong></span>
            <span class="stat-badge score-badge" title="Total Score">${icons.check(14)} Score: <strong id="quiz-score">0</strong></span>
          </div>
          <button id="btn-close-challenge" class="modal-close-btn" aria-label="Close Quiz">&times;</button>
        </div>

        <div id="quiz-active-view" class="modal-body challenge-body">
          <div class="challenge-progress-bar">
            <div id="quiz-progress-fill" class="progress-fill" style="width: 20%"></div>
          </div>

          <div class="challenge-meta">
            <span id="quiz-category" class="badge category-badge">Category</span>
            <span id="quiz-question-num" class="quiz-step-num">Question 1 of ${QUIZ_QUESTIONS.length}</span>
          </div>

          <h4 id="quiz-title" class="quiz-title">Title</h4>
          <p id="quiz-question" class="quiz-question-text">Question</p>

          <div class="quiz-code-box">
            <div class="code-box-header"><span>JavaScript Snippet</span></div>
            <pre><code id="quiz-code-display">code</code></pre>
          </div>

          <div id="quiz-options-container" class="quiz-options-grid"></div>

          <div id="quiz-feedback-box" class="quiz-feedback-box hidden"></div>

          <div id="quiz-hint-box" class="quiz-hint-box hidden">
            <span class="hint-title">${icons.lightbulb(14)} Hint:</span>
            <span id="quiz-hint-text"></span>
          </div>
        </div>

        <div id="quiz-summary-view" class="modal-body quiz-summary-body hidden">
          <div class="summary-card text-center">
            <div class="summary-icon-badge">${icons.sparkles(36)}</div>
            <h3 class="summary-title">Quiz Completed!</h3>
            <p class="summary-subtitle">Here is your JavaScript Engine mastery breakdown:</p>
            
            <div class="summary-metrics-grid">
              <div class="metric-box">
                <span class="metric-val" id="sum-score">0</span>
                <span class="metric-lbl">Total Score</span>
              </div>
              <div class="metric-box">
                <span class="metric-val" id="sum-correct">0 / 5</span>
                <span class="metric-lbl">Correct Answers</span>
              </div>
              <div class="metric-box">
                <span class="metric-val" id="sum-streak">0</span>
                <span class="metric-lbl">Best Streak</span>
              </div>
            </div>

            <div id="summary-badge-box" class="summary-badge-box">
              <span class="mastery-level-badge">🏆 JS Engine Master</span>
            </div>
          </div>
        </div>

        <div class="modal-footer challenge-footer">
          <button id="btn-quiz-hint" class="btn btn-secondary hint-btn">
            ${icons.lightbulb(14)} <span>Show Hint</span>
          </button>
          <button id="btn-quiz-verify" class="btn btn-accent verify-btn">
            ${icons.play(14)} <span>Verify in Visualizer</span>
          </button>
          <div class="footer-nav">
            <button id="btn-quiz-prev" class="btn btn-secondary" disabled>&larr; Prev</button>
            <button id="btn-quiz-next" class="btn btn-primary">Next &rarr;</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('#btn-close-challenge').addEventListener('click', () => this.close());
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });

    this.container.querySelector('#btn-quiz-prev').addEventListener('click', () => {
      if (this.isCompleted) {
        this.isCompleted = false;
        this.renderCurrentQuestion();
        return;
      }
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.renderCurrentQuestion();
      }
    });

    this.container.querySelector('#btn-quiz-next').addEventListener('click', () => {
      if (this.currentIndex === QUIZ_QUESTIONS.length - 1) {
        this._showSummaryScreen();
      } else if (this.currentIndex < QUIZ_QUESTIONS.length - 1) {
        this.currentIndex++;
        this.renderCurrentQuestion();
      }
    });

    this.container.querySelector('#btn-quiz-hint').addEventListener('click', () => {
      const hintBox = this.container.querySelector('#quiz-hint-box');
      hintBox.classList.toggle('hidden');
    });

    this.container.querySelector('#btn-quiz-verify').addEventListener('click', () => {
      const q = QUIZ_QUESTIONS[this.currentIndex];
      if (this.options.onLoadCode) {
        this.options.onLoadCode(q.code);
      }
      this.close();
      if (this.options.onRunVerification) {
        setTimeout(() => this.options.onRunVerification(), 150);
      }
    });
  }

  open() {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    if (this.isCompleted) {
      this._showSummaryScreen();
    } else {
      this.renderCurrentQuestion();
    }
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) modeSelector.value = 'sandbox';
  }

  restartQuiz() {
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.userAnswers = {};
    this.isCompleted = false;
    this.renderCurrentQuestion();
  }

  renderCurrentQuestion() {
    const activeView = this.container.querySelector('#quiz-active-view');
    const summaryView = this.container.querySelector('#quiz-summary-view');
    const hintBtn = this.container.querySelector('#btn-quiz-hint');
    const verifyBtn = this.container.querySelector('#btn-quiz-verify');

    activeView.classList.remove('hidden');
    summaryView.classList.add('hidden');
    hintBtn.classList.remove('hidden');
    verifyBtn.classList.remove('hidden');

    const q = QUIZ_QUESTIONS[this.currentIndex];
    const total = QUIZ_QUESTIONS.length;

    this.container.querySelector('#quiz-streak').textContent = this.streak;
    this.container.querySelector('#quiz-score').textContent = this.score;
    this.container.querySelector('#quiz-progress-fill').style.width = `${((this.currentIndex + 1) / total) * 100}%`;
    this.container.querySelector('#quiz-category').textContent = q.category;
    this.container.querySelector('#quiz-question-num').textContent = `Question ${this.currentIndex + 1} of ${total}`;
    this.container.querySelector('#quiz-title').textContent = q.title;
    this.container.querySelector('#quiz-question').textContent = q.question;
    this.container.querySelector('#quiz-code-display').textContent = q.code;
    this.container.querySelector('#quiz-hint-text').textContent = q.hint;
    this.container.querySelector('#quiz-hint-box').classList.add('hidden');

    const prevBtn = this.container.querySelector('#btn-quiz-prev');
    const nextBtn = this.container.querySelector('#btn-quiz-next');

    prevBtn.disabled = this.currentIndex === 0;

    if (this.currentIndex === total - 1) {
      nextBtn.innerHTML = `Submit & Finish 🎉`;
      nextBtn.className = 'btn btn-accent';
    } else {
      nextBtn.innerHTML = `Next &rarr;`;
      nextBtn.className = 'btn btn-primary';
    }

    const optionsGrid = this.container.querySelector('#quiz-options-container');
    const feedbackBox = this.container.querySelector('#quiz-feedback-box');
    optionsGrid.innerHTML = '';
    feedbackBox.className = 'quiz-feedback-box hidden';
    feedbackBox.innerHTML = '';

    const answeredIdx = this.userAnswers[q.id];

    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      if (answeredIdx !== undefined) {
        btn.disabled = true;
        if (idx === q.correctIndex) {
          btn.classList.add('correct');
        } else if (idx === answeredIdx) {
          btn.classList.add('wrong');
        }
      }
      btn.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + idx)}</span> <span class="opt-text">${optText}</span>`;
      btn.addEventListener('click', () => this.handleAnswerSelect(idx));
      optionsGrid.appendChild(btn);
    });

    if (answeredIdx !== undefined) {
      this._showFeedback(answeredIdx === q.correctIndex, q.explanation);
    }
  }

  handleAnswerSelect(selectedIdx) {
    const q = QUIZ_QUESTIONS[this.currentIndex];
    if (this.userAnswers[q.id] !== undefined) return;

    this.userAnswers[q.id] = selectedIdx;
    const isCorrect = selectedIdx === q.correctIndex;

    if (isCorrect) {
      this.score += 100;
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
    } else {
      this.streak = 0;
    }

    this.renderCurrentQuestion();
  }

  _showFeedback(isCorrect, explanation) {
    const feedbackBox = this.container.querySelector('#quiz-feedback-box');
    feedbackBox.classList.remove('hidden');
    feedbackBox.className = `quiz-feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
    feedbackBox.innerHTML = `
      <div class="feedback-header">
        <strong>${isCorrect ? '🎉 Correct!' : '❌ Incorrect'}</strong>
      </div>
      <p class="feedback-text">${explanation}</p>
    `;
  }

  _getCorrectCount() {
    let count = 0;
    QUIZ_QUESTIONS.forEach(q => {
      if (this.userAnswers[q.id] === q.correctIndex) {
        count++;
      }
    });
    return count;
  }

  _showSummaryScreen() {
    this.isCompleted = true;
    const activeView = this.container.querySelector('#quiz-active-view');
    const summaryView = this.container.querySelector('#quiz-summary-view');
    const hintBtn = this.container.querySelector('#btn-quiz-hint');
    const verifyBtn = this.container.querySelector('#btn-quiz-verify');

    activeView.classList.add('hidden');
    summaryView.classList.remove('hidden');
    hintBtn.classList.add('hidden');
    verifyBtn.classList.add('hidden');

    const correctCount = this._getCorrectCount();
    const total = QUIZ_QUESTIONS.length;

    this.container.querySelector('#sum-score').textContent = this.score;
    this.container.querySelector('#sum-correct').textContent = `${correctCount} / ${total}`;
    this.container.querySelector('#sum-streak').textContent = this.maxStreak;

    const badgeBox = this.container.querySelector('#summary-badge-box');
    if (correctCount === total) {
      badgeBox.innerHTML = `<span class="mastery-level-badge level-gold">🏆 JS Engine Master (100% Perfect!)</span>`;
    } else if (correctCount >= 3) {
      badgeBox.innerHTML = `<span class="mastery-level-badge level-silver">🚀 Senior Runtime Developer</span>`;
    } else {
      badgeBox.innerHTML = `<span class="mastery-level-badge level-bronze">📚 JavaScript Explorer</span>`;
    }

    const prevBtn = this.container.querySelector('#btn-quiz-prev');
    const nextBtn = this.container.querySelector('#btn-quiz-next');
    prevBtn.disabled = false;
    nextBtn.innerHTML = `🔄 Restart Quiz`;
    nextBtn.className = 'btn btn-primary';

    // Replace nextBtn handler temporarily to restart
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', () => {
      this.restartQuiz();
    });
  }
}
