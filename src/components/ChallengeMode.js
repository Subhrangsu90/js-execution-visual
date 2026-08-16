/**
 * ChallengeMode.js — Dedicated Full Page JavaScript Engine Quiz & Challenge System
 *
 * Provides a full separate page view for JavaScript runtime challenges:
 * Hoisting, Closures, Stack vs Heap, Event Loop priority, etc.
 * Features question stepper pills, score dashboard, and visualizer engine testing!
 */
import { icons } from '../utils/icons.js';
import { QUIZ_QUESTIONS } from '../data/quizQuestions.js';

export { QUIZ_QUESTIONS };

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
    this.setupKeyboardNavigation();
  }

  _initUI() {
    this.container = document.getElementById('quiz-page-container');
    if (!this.container) {
      this.container = document.createElement('main');
      this.container.id = 'quiz-page-container';
      this.container.className = 'quiz-page-container hidden';
      document.getElementById('app').appendChild(this.container);
    }

    this.container.innerHTML = `
      <div class="quiz-page-wrapper">
        <!-- Top Bar -->
        <div class="quiz-page-topbar">
          <div class="quiz-topbar-left">
            <span class="quiz-page-icon text-accent">${icons.target(24)}</span>
            <div>
              <h2 class="quiz-page-title">JavaScript Engine Challenges & Quiz</h2>
              <p class="quiz-page-sub">Test & master JS execution, hoisting, closures, memory, and async event loop mechanics</p>
            </div>
          </div>
          <div class="quiz-topbar-right">
            <span class="stat-badge streak-badge" title="Current Streak">${icons.sparkles(14)} Streak: <strong id="quiz-streak">0</strong></span>
            <span class="stat-badge score-badge" title="Total Score">${icons.check(14)} Score: <strong id="quiz-score">0</strong></span>
            <button id="btn-back-sandbox" class="btn btn-secondary btn-sm">Back to Playground &rarr;</button>
          </div>
        </div>

        <!-- Question Stepper Pills Bar -->
        <div class="quiz-navigation-bar">
          <div id="quiz-stepper-pills" class="quiz-stepper-pills"></div>
        </div>

        <!-- Active Question Main Area -->
        <div id="quiz-active-view" class="quiz-main-grid">
          <!-- Left Column: Question & Code -->
          <div class="quiz-left-column glass-panel">
            <div class="challenge-meta">
              <span id="quiz-category" class="badge category-badge">Category</span>
              <span id="quiz-question-num" class="quiz-step-num">Question 1 of ${QUIZ_QUESTIONS.length}</span>
            </div>

            <h3 id="quiz-title" class="quiz-title">Title</h3>
            <p id="quiz-question" class="quiz-question-text">Question</p>

            <div class="quiz-code-box">
              <div class="code-box-header"><span>JavaScript Source Code</span></div>
              <pre><code id="quiz-code-display">code</code></pre>
            </div>

            <div id="quiz-hint-box" class="quiz-hint-box hidden">
              <span class="hint-title">${icons.lightbulb(14)} Hint:</span>
              <span id="quiz-hint-text"></span>
            </div>
          </div>

          <!-- Right Column: Choices & Feedback -->
          <div class="quiz-right-column glass-panel">
            <div class="column-header">
              <h4>Select Your Answer:</h4>
              <button id="btn-quiz-hint" class="btn btn-secondary btn-xs">${icons.lightbulb(14)} Show Hint</button>
            </div>

            <div id="quiz-options-container" class="quiz-options-grid"></div>

            <div id="quiz-feedback-box" class="quiz-feedback-box hidden"></div>

            <div class="quiz-action-toolbar">
              <button id="btn-quiz-verify" class="btn btn-accent verify-btn">
                ${icons.play(14)} <span>Test Code in Visualizer Engine</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Summary Dashboard Screen -->
        <div id="quiz-summary-view" class="quiz-summary-page hidden">
          <div class="summary-card text-center">
            <div class="summary-icon-badge">${icons.sparkles(42)}</div>
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

        <!-- Bottom Navigation Bar -->
        <div class="quiz-bottom-bar">
          <button id="btn-quiz-prev" class="btn btn-secondary" disabled>&larr; Previous Question</button>
          <div class="bottom-bar-center">
            <div class="challenge-progress-bar">
              <div id="quiz-progress-fill" class="progress-fill" style="width: 20%"></div>
            </div>
          </div>
          <button id="btn-quiz-next" class="btn btn-primary">Next Question &rarr;</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('#btn-back-sandbox').addEventListener('click', () => this.close());

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

  open(updateRoute = true) {
    this.isOpen = true;

    // Hide playground layout
    const mainArea = document.getElementById('main-area');
    const gutterConsole = document.getElementById('gutter-main-console');
    const consoleSection = document.getElementById('console-section');
    if (mainArea) mainArea.classList.add('hidden');
    if (gutterConsole) gutterConsole.classList.add('hidden');
    if (consoleSection) consoleSection.classList.add('hidden');

    // Show dedicated Quiz page container
    this.container.classList.remove('hidden');

    if (updateRoute && window.location.hash !== '#quiz') {
      history.pushState(null, '', '#quiz');
    }
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) modeSelector.value = 'quiz';

    if (this.isCompleted) {
      this._showSummaryScreen();
    } else {
      this.renderCurrentQuestion();
    }
  }

  close(updateRoute = true) {
    this.isOpen = false;

    // Show playground layout
    const mainArea = document.getElementById('main-area');
    const gutterConsole = document.getElementById('gutter-main-console');
    const consoleSection = document.getElementById('console-section');
    if (mainArea) mainArea.classList.remove('hidden');
    if (gutterConsole) gutterConsole.classList.remove('hidden');
    if (consoleSection) consoleSection.classList.remove('hidden');

    // Hide dedicated Quiz page container
    this.container.classList.add('hidden');

    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) modeSelector.value = 'sandbox';
    if (updateRoute && window.location.hash === '#quiz') {
      history.pushState(null, '', window.location.pathname);
    }
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

  _renderStepperPills() {
    const pillsContainer = this.container.querySelector('#quiz-stepper-pills');
    if (!pillsContainer) return;
    pillsContainer.innerHTML = '';

    QUIZ_QUESTIONS.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = `quiz-step-pill ${idx === this.currentIndex ? 'active' : ''}`;
      const isAnswered = this.userAnswers[q.id] !== undefined;
      const isCorrect = isAnswered && this.userAnswers[q.id] === q.correctIndex;

      if (isAnswered) {
        btn.classList.add(isCorrect ? 'pill-correct' : 'pill-wrong');
      }

      btn.innerHTML = `
        <span class="pill-num">${idx + 1}</span>
        <span class="pill-title">${q.title}</span>
        ${isAnswered ? `<span class="pill-icon">${isCorrect ? icons.check(12) : '&times;'}</span>` : ''}
      `;

      btn.addEventListener('click', () => {
        if (this.isCompleted) this.isCompleted = false;
        this.currentIndex = idx;
        this.renderCurrentQuestion();
      });

      pillsContainer.appendChild(btn);
    });
  }

  renderCurrentQuestion() {
    const activeView = this.container.querySelector('#quiz-active-view');
    const summaryView = this.container.querySelector('#quiz-summary-view');
    const hintBtn = this.container.querySelector('#btn-quiz-hint');
    const verifyBtn = this.container.querySelector('#btn-quiz-verify');

    activeView.classList.remove('hidden');
    summaryView.classList.add('hidden');
    if (hintBtn) hintBtn.classList.remove('hidden');
    if (verifyBtn) verifyBtn.classList.remove('hidden');

    this._renderStepperPills();

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
      nextBtn.innerHTML = `Submit & Finish Quiz 🎉`;
      nextBtn.className = 'btn btn-accent';
    } else {
      nextBtn.innerHTML = `Next Question &rarr;`;
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
    if (hintBtn) hintBtn.classList.add('hidden');
    if (verifyBtn) verifyBtn.classList.add('hidden');

    const correctCount = this._getCorrectCount();
    const total = QUIZ_QUESTIONS.length;

    this.container.querySelector('#sum-score').textContent = this.score;
    this.container.querySelector('#sum-correct').textContent = `${correctCount} / ${total}`;
    this.container.querySelector('#sum-streak').textContent = this.maxStreak;

    const badgeBox = this.container.querySelector('#summary-badge-box');
    if (correctCount === total) {
      badgeBox.innerHTML = `<span class="mastery-level-badge level-gold">🏆 JS Engine Master (100% Perfect Score!)</span>`;
    } else if (correctCount >= 7) {
      badgeBox.innerHTML = `<span class="mastery-level-badge level-silver">🚀 Senior Runtime Developer (${Math.round((correctCount/total)*100)}% Mastery)</span>`;
    } else if (correctCount >= 4) {
      badgeBox.innerHTML = `<span class="mastery-level-badge level-bronze">⚡ JS Intermediate Developer (${Math.round((correctCount/total)*100)}% Mastery)</span>`;
    } else {
      badgeBox.innerHTML = `<span class="mastery-level-badge level-bronze">📚 JavaScript Engine Apprentice</span>`;
    }

    const prevBtn = this.container.querySelector('#btn-quiz-prev');
    const nextBtn = this.container.querySelector('#btn-quiz-next');
    prevBtn.disabled = false;
    nextBtn.innerHTML = `🔄 Restart Quiz`;
    nextBtn.className = 'btn btn-primary';

    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', () => {
      this.restartQuiz();
    });
  }

  restartQuiz() {
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.userAnswers = {};
    this.isCompleted = false;

    const activeView = this.container.querySelector('#quiz-active-view');
    const summaryView = this.container.querySelector('#quiz-summary-view');
    const hintBtn = this.container.querySelector('#btn-quiz-hint');
    const verifyBtn = this.container.querySelector('#btn-quiz-verify');

    activeView.classList.remove('hidden');
    summaryView.classList.add('hidden');
    if (hintBtn) hintBtn.classList.remove('hidden');
    if (verifyBtn) verifyBtn.classList.remove('hidden');

    this.renderCurrentQuestion();
  }

  setupKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || this.isCompleted) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.closest('.cm-editor')) return;

      const key = e.key.toUpperCase();
      const q = QUIZ_QUESTIONS[this.currentIndex];
      const answeredIdx = this.userAnswers[q.id];

      if (answeredIdx === undefined) {
        if (key === '1' || key === 'A') this.handleAnswerSelect(0);
        else if (key === '2' || key === 'B') this.handleAnswerSelect(1);
        else if (key === '3' || key === 'C') this.handleAnswerSelect(2);
        else if (key === '4' || key === 'D') this.handleAnswerSelect(3);
      }

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (answeredIdx !== undefined) {
          this.nextQuestion();
        }
      } else if (e.key === 'ArrowLeft' && this.currentIndex > 0) {
        this.prevQuestion();
      }
    });
  }
}
