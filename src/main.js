/**
 * main.js — App bootstrap.
 *
 * Wires together the Editor, Interpreter, Controls, all
 * visualization panels, and interactive resizable splitters.
 */
import './styles/index.css';
import { icons } from './utils/icons.js';
import { ResizableSplitter } from './utils/Resizable.js';
import { Editor } from './components/Editor.js';
import { CallStackPanel } from './components/CallStackPanel.js';
import { ExecutionContextPanel } from './components/ExecutionContextPanel.js';
import { MemoryPanel } from './components/MemoryPanel.js';
import { ScopeChainPanel } from './components/ScopeChainPanel.js';
import { EventLoopPanel } from './components/EventLoopPanel.js';
import { ConsolePanel } from './components/ConsolePanel.js';
import { Controls } from './components/Controls.js';
import { Interpreter } from './interpreter/Interpreter.js';
import { ExecutionBubble3D } from './components/ExecutionBubble3D.js';
import { FloatingBubbles3D } from './components/FloatingBubbles3D.js';
import './utils/ValueInspector.js';
import { InfoPopup } from './utils/InfoPopup.js';
import { ShortcutsModal } from './utils/ShortcutsModal.js';
import { PRESETS } from './utils/presets.js';

// ─── THEME MANAGEMENT ───────────────────────────────────────────
const THEME_KEY = 'js_vis_theme';
let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);

const btnThemeToggle = document.getElementById('btn-theme-toggle');

function updateThemeUI() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem(THEME_KEY, currentTheme);
  btnThemeToggle.innerHTML = currentTheme === 'dark' ? icons.sun(16) : icons.moon(16);
  btnThemeToggle.title = currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
  editor?.setTheme(currentTheme);
}

btnThemeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  updateThemeUI();
});

// ─── KEYBOARD SHORTCUTS MODAL ───────────────────────────────────
const shortcutsModal = new ShortcutsModal();
const btnShortcuts = document.getElementById('btn-shortcuts');
if (btnShortcuts) {
  btnShortcuts.innerHTML = icons.keyboard(16);
  btnShortcuts.addEventListener('click', () => shortcutsModal.toggle());
}

// ─── POPULATE STATIC SVG ICONS ───────────────────────────────────
document.getElementById('logo-icon').innerHTML = icons.lightning(22);
document.getElementById('icon-editor').innerHTML = icons.code(16);
document.getElementById('icon-run').innerHTML = icons.play(14);
document.getElementById('icon-stack').innerHTML = icons.stack(16);
document.getElementById('icon-ctx').innerHTML = icons.context(16);
document.getElementById('icon-mem').innerHTML = icons.memory(16);
document.getElementById('icon-scope').innerHTML = icons.scope(16);
document.getElementById('icon-loop').innerHTML = icons.eventLoop(16);
document.getElementById('icon-console').innerHTML = icons.console(16);
document.getElementById('btn-clear-console').innerHTML = `${icons.trash(13)} <span>Clear</span>`;

// ─── DOM REFERENCES ─────────────────────────────────────────────
const editorMount = document.getElementById('editor-mount');
const btnRun = document.getElementById('btn-run');
const btnRunText = document.getElementById('btn-run-text');
const stepDescEl = document.getElementById('step-description');
const controlsBar = document.getElementById('controls-bar');
const btnClearConsole = document.getElementById('btn-clear-console');
const presetSelector = document.getElementById('preset-selector');

// Panel bodies
const callstackBody = document.getElementById('callstack-body');
const callstackCount = document.getElementById('callstack-count');
const execctxBody = document.getElementById('execctx-body');
const execctxCount = document.getElementById('execctx-count');
const memoryStack = document.getElementById('memory-stack');
const memoryHeap = document.getElementById('memory-heap');
const memoryArrows = document.getElementById('memory-arrows');
const scopeBody = document.getElementById('scope-body');
const elWebApis = document.getElementById('el-webapis');
const elMicrotask = document.getElementById('el-microtask');
const elMacrotask = document.getElementById('el-macrotask');
const consoleBody = document.getElementById('console-body');

// ─── COMPONENTS ─────────────────────────────────────────────────
const editor = new Editor(editorMount, currentTheme);
const callStackPanel = new CallStackPanel(callstackBody, callstackCount, {
  onFrameSelect: (frame) => {
    if (frame && frame.line) {
      editor.highlightLine(frame.line);
      stepDescEl.innerHTML = `
        <span class="step-3d-tag">Stack Frame</span>
        <span class="step-3d-text">Inspecting: <strong>${frame.name}</strong> (line ${frame.line})</span>
      `;
    }
  }
});
const execCtxPanel = new ExecutionContextPanel(execctxBody, execctxCount);
const memoryPanel = new MemoryPanel(memoryStack, memoryHeap, memoryArrows);
const scopePanel = new ScopeChainPanel(scopeBody);
const eventLoopPanel = new EventLoopPanel(elWebApis, elMicrotask, elMacrotask);
const consolePanel = new ConsolePanel(consoleBody);

// Initialize theme button icon
updateThemeUI();

// ─── POPULATE PRESETS DROPDOWN ──────────────────────────────────
if (presetSelector) {
  PRESETS.forEach(preset => {
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = `${preset.title} (${preset.category})`;
    presetSelector.appendChild(opt);
  });

  presetSelector.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    const preset = PRESETS.find(p => p.id === selectedId);
    if (preset) {
      editor.setCode(preset.code.trim());
      runCode();
    }
  });
}

// ─── RESIZABLE SPLITTERS ─────────────────────────────────────────
function triggerRedrawMemory() {
  if (currentStep >= 0 && steps[currentStep]) {
    memoryPanel.update(steps[currentStep]);
  }
}

// 1. Editor vs Viz section
new ResizableSplitter({
  gutter: document.getElementById('gutter-editor-viz'),
  firstEl: document.getElementById('editor-section'),
  direction: 'horizontal',
  minFirst: 200,
  maxFirst: 900,
  onResize: triggerRedrawMemory,
});

// 2. Call Stack vs Execution Context
new ResizableSplitter({
  gutter: document.getElementById('gutter-stack-ctx'),
  firstEl: document.getElementById('callstack-panel'),
  direction: 'horizontal',
  minFirst: 120,
  maxFirst: 700,
});

// 3. Row 1 vs Row 2
new ResizableSplitter({
  gutter: document.getElementById('gutter-row1-row2'),
  firstEl: document.getElementById('viz-row-1'),
  direction: 'vertical',
  minFirst: 70,
  maxFirst: 450,
  onResize: triggerRedrawMemory,
});

// 4. Memory Stack vs Memory Heap
new ResizableSplitter({
  gutter: document.getElementById('gutter-stack-heap'),
  firstEl: document.getElementById('memory-stack'),
  direction: 'horizontal',
  minFirst: 100,
  maxFirst: 600,
  onResize: triggerRedrawMemory,
});

// 5. Row 2 vs Row 3
new ResizableSplitter({
  gutter: document.getElementById('gutter-row2-row3'),
  firstEl: document.getElementById('viz-row-2'),
  direction: 'vertical',
  minFirst: 80,
  maxFirst: 500,
  onResize: triggerRedrawMemory,
});

// 6. Scope Chain vs Event Loop
new ResizableSplitter({
  gutter: document.getElementById('gutter-scope-loop'),
  firstEl: document.getElementById('scope-panel'),
  direction: 'horizontal',
  minFirst: 120,
  maxFirst: 700,
});

// 7. Main Area vs Console (Bottom)
new ResizableSplitter({
  gutter: document.getElementById('gutter-main-console'),
  firstEl: document.getElementById('console-section'),
  direction: 'vertical',
  invert: true,
  minFirst: 40,
  maxFirst: 400,
  onResize: triggerRedrawMemory,
});

// ─── STATE ──────────────────────────────────────────────────────
let steps = [];
let currentStep = -1;
let isPlaying = false;
let playTimer = null;
let speed = 1; // multiplier

// ─── 3D EXECUTION BUBBLE & AMBIENT BUBBLES ──────────────────────
const bubbleMount = document.getElementById('header-bubble-mount');
const bubble3D = bubbleMount ? new ExecutionBubble3D(bubbleMount) : null;
const floatingBubbles = new FloatingBubbles3D();

// ─── CONTROLS ───────────────────────────────────────────────────
const controls = new Controls(controlsBar, {
  onStepBack: () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  },
  onStepForward: () => {
    if (currentStep < steps.length - 1) goToStep(currentStep + 1);
  },
  onPlay: () => startPlayback(),
  onPause: () => stopPlayback(),
  onReset: () => resetExecution(),
  onStepEnd: () => {
    if (steps.length > 0) goToStep(steps.length - 1);
  },
  onSpeedChange: (s) => {
    speed = s;
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  },
});

// ─── RUN ────────────────────────────────────────────────────────
function runCode() {
  // Reset state
  resetExecution();

  const code = editor.getCode();
  if (!code.trim()) return;

  // Run interpreter
  const interpreter = new Interpreter(code);
  steps = interpreter.run();

  if (steps.length === 0) return;

  // Show first step in paused state (ready for manual stepping or play)
  goToStep(0);

  // Update run button
  document.getElementById('icon-run').innerHTML = icons.reset(14);
  btnRunText.textContent = 'Re-run';
}

function goToStep(index) {
  if (index < 0 || index >= steps.length) return;
  currentStep = index;
  const snapshot = steps[currentStep];

  // Update all panels
  callStackPanel.update(snapshot);
  execCtxPanel.update(snapshot);
  memoryPanel.update(snapshot);
  scopePanel.update(snapshot);
  eventLoopPanel.update(snapshot);
  consolePanel.update(snapshot);

  // Update 3D Bubble
  if (bubble3D) {
    bubble3D.update(snapshot, steps.length);
  }

  // Update editor highlight (line, block, expression, AND floating 3D line execution bubble!)
  if (snapshot.node) {
    editor.highlightNode(snapshot.node, snapshot.description, snapshot.step + 1);
  } else if (snapshot.callStack && snapshot.callStack.length > 0) {
    const topFrame = snapshot.callStack[snapshot.callStack.length - 1];
    editor.highlightLine(topFrame.line, snapshot.description, snapshot.step + 1);
  } else {
    editor.clearHighlight();
  }

  // Highlight whichever panel is currently executing
  highlightActivePanel(snapshot);

  // Step description with 3D status badge
  stepDescEl.innerHTML = `
    <span class="step-3d-tag">Step ${snapshot.step + 1}</span>
    <span class="step-3d-text">${snapshot.description || ''}</span>
  `;

  // Controls state
  controls.updateState(currentStep, steps.length, isPlaying);
}

function highlightActivePanel(snapshot) {
  const panelIds = ['callstack-panel', 'execctx-panel', 'memory-panel', 'scope-panel', 'eventloop-panel', 'console-section'];
  panelIds.forEach(id => document.getElementById(id)?.classList.remove('panel-active-executing'));

  if (!snapshot || !snapshot.description) return;
  const desc = snapshot.description.toLowerCase();

  let targetId = null;
  if (desc.includes('call') || desc.includes('return') || desc.includes('stack')) {
    targetId = 'callstack-panel';
  } else if (desc.includes('context') || desc.includes('creation') || desc.includes('gec') || desc.includes('fec')) {
    targetId = 'execctx-panel';
  } else if (desc.includes('object') || desc.includes('array') || desc.includes('heap') || desc.includes('alloc') || desc.includes('let ') || desc.includes('const ') || desc.includes('var ')) {
    targetId = 'memory-panel';
  } else if (desc.includes('scope') || desc.includes('closure') || desc.includes('lookup')) {
    targetId = 'scope-panel';
  } else if (desc.includes('timer') || desc.includes('timeout') || desc.includes('interval') || desc.includes('promise') || desc.includes('microtask') || desc.includes('queue')) {
    targetId = 'eventloop-panel';
  } else if (desc.includes('console') || desc.includes('log') || desc.includes('table') || desc.includes('warn') || desc.includes('error')) {
    targetId = 'console-section';
  }

  if (targetId) {
    document.getElementById(targetId)?.classList.add('panel-active-executing');
  }
}

// ─── PLAYBACK ENGINE ────────────────────────────────────
function startPlayback() {
  if (currentStep >= steps.length - 1) {
    goToStep(0); // restart from beginning
  }
  isPlaying = true;
  controls.updateState(currentStep, steps.length, true);

  const interval = Math.max(80, 600 / speed);
  playTimer = setInterval(() => {
    if (currentStep >= steps.length - 1) {
      stopPlayback();
      return;
    }
    goToStep(currentStep + 1);
  }, interval);
}

function stopPlayback() {
  isPlaying = false;
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  controls.updateState(currentStep, steps.length, false);
}

function resetExecution() {
  stopPlayback();
  steps = [];
  currentStep = -1;
  editor.clearHighlight();
  stepDescEl.textContent = '';
  if (bubble3D) bubble3D.update(null);
  highlightActivePanel(null);

  // Clear all panels with SVG icons
  callstackBody.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icons.stack(28)}</div><div>Call stack is empty</div></div>`;
  execctxBody.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icons.context(28)}</div><div>No execution contexts</div></div>`;
  memoryStack.innerHTML = `<div class="memory-section-label">Stack</div><div class="empty-state" style="padding:12px"><div class="empty-state-icon" style="font-size:18px">${icons.memory(20)}</div><div>No variables</div></div>`;
  memoryHeap.innerHTML = `<div class="memory-section-label">Heap</div><div class="empty-state" style="padding:12px"><div class="empty-state-icon" style="font-size:18px">${icons.memory(20)}</div><div>Heap empty</div></div>`;
  memoryArrows.innerHTML = '';
  scopeBody.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icons.scope(28)}</div><div>No scope chain</div></div>`;
  elWebApis.innerHTML = `<div class="el-section-label">${icons.timer(13)} Web APIs</div><div class="el-empty">Empty</div>`;
  elMicrotask.innerHTML = `<div class="el-section-label">${icons.microtask(13)} Microtask Queue</div><div class="el-empty">Empty</div>`;
  elMacrotask.innerHTML = `<div class="el-section-label">${icons.queue(13)} Callback Queue</div><div class="el-empty">Empty</div>`;
  consolePanel.clear();

  controls.updateState(-1, 0, false);
  document.getElementById('icon-run').innerHTML = icons.play(14);
  btnRunText.textContent = 'Run';
}

// ─── EVENT LISTENERS ────────────────────────────────────────────
btnRun.addEventListener('click', runCode);

btnClearConsole.addEventListener('click', () => {
  consolePanel.clear();
});

// Global Keyboard Shortcut: Ctrl+Enter to run code
// (All other shortcuts are handled by Controls.js)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
});

// Window resize → redraw memory arrows
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    triggerRedrawMemory();
  }, 150);
});

// ─── INITIAL STATE ──────────────────────────────────────────────
const infoPopup = new InfoPopup();
infoPopup.attachToHeaders();

console.log('%c⚡ JS Execution Visualizer loaded', 'color: #f59e0b; font-weight: bold; font-size: 14px');
