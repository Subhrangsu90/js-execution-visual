/**
 * Editor — CodeMirror 6 wrapper with breakpoint gutter,
 * current-line highlighting, and dynamic light/dark theme switching.
 */
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorState, StateEffect, StateField, Compartment, RangeSet } from '@codemirror/state';
import { Decoration, WidgetType, gutter, GutterMarker } from '@codemirror/view';

const CODE_STORAGE_KEY = 'js_vis_editor_code';

/* ── 3D Live Execution Bubble Widget on Code Line ──────────────── */
class InlineExecutionBubbleWidget extends WidgetType {
  constructor(text, step) {
    super();
    this.text = text;
    this.step = step;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-3d-exec-bubble';
    span.innerHTML = `
      <span class="cm-3d-bubble-orb">
        <span class="cm-3d-orb-specular"></span>
        <span class="cm-3d-orb-num">${this.step || '▶'}</span>
      </span>
      <span class="cm-3d-bubble-text">${this._escape(this.text || '')}</span>
    `;
    return span;
  }

  _escape(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  eq(other) {
    return other.text === this.text && other.step === this.step;
  }
}

/* ── Custom line & expression highlight decoration ─────────────── */
const addHighlight = StateEffect.define();
const clearHighlight = StateEffect.define();

const highlightField = StateField.define({
  create: () => Decoration.none,
  update(decos, tr) {
    let current = decos;
    for (const e of tr.effects) {
      if (e.is(clearHighlight)) {
        current = Decoration.none;
      } else if (e.is(addHighlight)) {
        current = e.value;
      }
    }
    return current.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f),
});

/* ── Breakpoint gutter ────────────────────────────────────────── */
const toggleBreakpoint = StateEffect.define();

class BreakpointMarker extends GutterMarker {
  toDOM() {
    const dot = document.createElement('span');
    dot.className = 'cm-breakpoint-dot';
    dot.textContent = '●';
    return dot;
  }
}

const breakpointMarker = new BreakpointMarker();

const breakpointState = StateField.define({
  create() { return RangeSet.empty; },
  update(set, tr) {
    set = set.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(toggleBreakpoint)) {
        const line = e.value;
        let exists = false;
        const cursor = set.iter(line.from);
        if (cursor.value && cursor.from === line.from) {
          exists = true;
        }
        if (exists) {
          // Remove breakpoint at this line
          set = set.update({ filter: (from) => from !== line.from });
        } else {
          // Add breakpoint at this line
          set = set.update({ add: [breakpointMarker.range(line.from)] });
        }
      }
    }
    return set;
  },
});

const breakpointGutter = gutter({
  class: 'cm-breakpoint-gutter',
  markers: v => v.state.field(breakpointState),
  initialSpacer: () => breakpointMarker,
  domEventHandlers: {
    mousedown(view, line) {
      view.dispatch({
        effects: toggleBreakpoint.of(line),
      });
      return true;
    },
  },
});

const themeCompartment = new Compartment();

/* ── Monokai Dark Theme & Syntax Highlighting ────────────────── */
export const monokaiHighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.self, t.null, t.modifier], color: '#f92672', fontWeight: '600' },
  { tag: [t.operator, t.operatorKeyword, t.controlKeyword], color: '#f92672' },
  { tag: [t.string, t.special(t.string), t.character], color: '#e6db74' },
  { tag: [t.number, t.bool], color: '#ae81ff' },
  { tag: [t.standard(t.name), t.typeName, t.className, t.macroName, t.tagName], color: '#66d9ef', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#a6e22e' },
  { tag: [t.definition(t.function(t.variableName))], color: '#a6e22e', fontWeight: 'bold' },
  { tag: [t.propertyName, t.attributeName], color: '#fd971f' },
  { tag: [t.definition(t.propertyName)], color: '#fd971f' },
  { tag: [t.variableName, t.definition(t.variableName), t.name], color: '#f8f8f2' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#75715e', fontStyle: 'italic' },
  { tag: [t.punctuation, t.separator, t.bracket, t.paren, t.brace, t.derefOperator], color: '#f8f8f2' },
  { tag: [t.regexp, t.escape], color: '#ae81ff' },
  { tag: t.meta, color: '#75715e' },
  { tag: t.invalid, color: '#f92572', backgroundColor: '#56001a' },
]);

const monokaiDarkEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#272822',
    color: '#f8f8f2',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '13.5px',
    lineHeight: '1.7',
    caretColor: '#f8f8f0',
  },
  '.cm-cursor': {
    borderLeftColor: '#f8f8f0',
    borderLeftWidth: '2px',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1f1c',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#75715e',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#3e3d32',
    color: '#c0c0c0',
  },
  '.cm-activeLine': {
    backgroundColor: '#3e3d32',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#49483e !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#49483e !important',
  },
  '.cm-line': {
    padding: '0 8px',
  },
  '.cm-matchingBracket': {
    backgroundColor: '#3e3d32',
    outline: '1px solid #a6e22e',
    color: '#a6e22e !important',
  },
}, { dark: true });

const darkTheme = [
  monokaiDarkEditorTheme,
  syntaxHighlighting(monokaiHighlightStyle),
];

/* ── Monokai Light Theme & Syntax Highlighting ───────────────── */
export const monokaiLightHighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.self, t.null, t.modifier], color: '#d3125d', fontWeight: '600' },
  { tag: [t.operator, t.operatorKeyword, t.controlKeyword], color: '#d3125d' },
  { tag: [t.string, t.special(t.string), t.character], color: '#796b00' },
  { tag: [t.number, t.bool], color: '#6c3ec1' },
  { tag: [t.standard(t.name), t.typeName, t.className, t.macroName], color: '#007b99', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#387800' },
  { tag: [t.definition(t.function(t.variableName))], color: '#387800', fontWeight: 'bold' },
  { tag: [t.propertyName, t.attributeName], color: '#c35000' },
  { tag: [t.definition(t.propertyName)], color: '#c35000' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#24292e' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#6a737d', fontStyle: 'italic' },
  { tag: [t.punctuation, t.separator, t.bracket, t.paren, t.brace], color: '#24292e' },
  { tag: [t.regexp, t.escape], color: '#6c3ec1' },
]);

const monokaiLightEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#fafafa',
    color: '#24292e',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '13.5px',
    lineHeight: '1.7',
    caretColor: '#0284c7',
  },
  '.cm-cursor': {
    borderLeftColor: '#0284c7',
    borderLeftWidth: '2px',
  },
  '.cm-gutters': {
    backgroundColor: '#f0f0f0',
    borderRight: '1px solid rgba(0, 0, 0, 0.08)',
    color: '#959da5',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e1e4e8',
  },
  '.cm-activeLine': {
    backgroundColor: '#f1f3f5',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#c8e1ff !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#c8e1ff !important',
  },
  '.cm-line': {
    padding: '0 8px',
  },
}, { dark: false });

const lightTheme = [
  monokaiLightEditorTheme,
  syntaxHighlighting(monokaiLightHighlightStyle),
];

/* ── Default sample code ──────────────────────────────────────── */
const SAMPLE_CODE = `// 🚀 JavaScript Execution Visualizer
// Write code below and click Run to visualize!

let name = "JavaScript";
let counter = 0;

function greet(person) {
  let message = "Hello, " + person + "!";
  console.log(message);
  return message;
}

function sum(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    total += i;
  }
  return total;
}

let greeting = greet(name);
let result = sum(5);

let user = { name: "Alice", age: 25 };
let scores = [90, 85, 78];

setTimeout(function delayedLog() {
  console.log("⏱ Delayed callback!");
}, 1000);

console.log("Sum:", result);
`;

export class Editor {
  constructor(container, initialTheme = 'dark') {
    this.container = container;
    this.view = null;
    this.currentTheme = initialTheme;
    this._saveTimeout = null;
    this._init();
  }

  _init() {
    // Load saved code from localStorage, fallback to sample
    const savedCode = localStorage.getItem(CODE_STORAGE_KEY);
    const initialDoc = savedCode || SAMPLE_CODE;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        basicSetup,
        javascript(),
        themeCompartment.of(this.currentTheme === 'light' ? lightTheme : darkTheme),
        highlightField,
        breakpointState,
        breakpointGutter,
        EditorView.lineWrapping,
        // Auto-save to localStorage on code change (debounced)
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = setTimeout(() => {
              localStorage.setItem(CODE_STORAGE_KEY, update.state.doc.toString());
            }, 500);
          }
        }),
      ],
    });

    this.view = new EditorView({
      state,
      parent: this.container,
    });
  }

  /** Set dark or light theme dynamically */
  setTheme(theme) {
    this.currentTheme = theme;
    this.view.dispatch({
      effects: themeCompartment.reconfigure(theme === 'light' ? lightTheme : darkTheme),
    });
  }

  /** Get the current code from the editor. */
  getCode() {
    return this.view.state.doc.toString();
  }

  /** Set code content. */
  setCode(code) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: code },
    });
  }

  /** Get a Set of line numbers (1-indexed) that have breakpoints. */
  getBreakpoints() {
    const bps = new Set();
    const bpSet = this.view.state.field(breakpointState);
    const doc = this.view.state.doc;
    const cursor = bpSet.iter();
    while (cursor.value) {
      const line = doc.lineAt(cursor.from);
      bps.add(line.number);
      cursor.next();
    }
    return bps;
  }

  /** Check if a line (1-indexed) has a breakpoint. */
  hasBreakpoint(lineNumber) {
    return this.getBreakpoints().has(lineNumber);
  }

  /**
   * Highlight an AST node, block, or expression range and display 3D execution bubble.
   * @param {{ line?: number, endLine?: number, start?: number, end?: number, type?: string }} node
   * @param {string} [description]
   * @param {number} [step]
   */
  highlightNode(node, description = '', step = 0) {
    if (!node || (!node.line && typeof node.start !== 'number')) {
      this.clearHighlight();
      return;
    }

    try {
      const doc = this.view.state.doc;
      const totalLines = doc.lines;
      const startLineNum = Math.max(1, Math.min(totalLines, node.line || 1));

      // Don't highlight entire file if node is 'Program'
      const isProgram = node.type === 'Program';
      const endLineNum = isProgram
        ? startLineNum
        : Math.max(startLineNum, Math.min(totalLines, node.endLine || startLineNum));

      const decos = [];

      // 1. Line & Block decorations
      for (let l = startLineNum; l <= endLineNum; l++) {
        const line = doc.line(l);
        let lineClass = 'cm-active-exec-line';
        if (startLineNum === endLineNum) {
          lineClass += ' cm-exec-single-line';
        } else if (l === startLineNum) {
          lineClass += ' cm-exec-block-start';
        } else if (l === endLineNum) {
          lineClass += ' cm-exec-block-end';
        } else {
          lineClass += ' cm-exec-block-mid';
        }
        decos.push(Decoration.line({ class: lineClass }).range(line.from));
      }

      // 2. Inline token / expression highlight if offsets are within doc bounds
      if (!isProgram && typeof node.start === 'number' && typeof node.end === 'number') {
        const from = Math.max(0, Math.min(doc.length, node.start));
        const to = Math.max(from, Math.min(doc.length, node.end));
        if (to > from) {
          decos.push(Decoration.mark({ class: 'cm-active-exec-inline' }).range(from, to));
        }
      }

      // 3. 3D Live Execution Bubble Widget on the line
      if (description && !isProgram) {
        const targetLine = doc.line(startLineNum);
        decos.push(
          Decoration.widget({
            widget: new InlineExecutionBubbleWidget(description, step),
            side: 1,
          }).range(targetLine.to)
        );
      }

      // Sort decorations by start offset
      decos.sort((a, b) => a.from - b.from);

      const decoSet = Decoration.set(decos, true);
      this.view.dispatch({
        effects: [
          addHighlight.of(decoSet),
        ],
      });

      // Scroll active line into view smoothly
      const primaryLine = doc.line(startLineNum);
      this.view.dispatch({
        effects: EditorView.scrollIntoView(primaryLine.from, { y: 'center' }),
      });
    } catch (e) {
      console.warn('Highlight dispatch error:', e);
    }
  }

  /** Highlight a specific line (1-indexed). */
  highlightLine(lineNumber, description = '', step = 0) {
    this.highlightNode({ line: lineNumber, endLine: lineNumber }, description, step);
  }

  /** Clear all line highlights. */
  clearHighlight() {
    this.view.dispatch({
      effects: clearHighlight.of(null),
    });
  }

  /** Set editor to read-only or editable. */
  setReadOnly(readOnly) {
    this.view.dispatch({
      effects: StateEffect.reconfigure.of(
        readOnly
          ? [basicSetup, javascript(), themeCompartment.of(this.currentTheme === 'light' ? lightTheme : darkTheme), highlightField, breakpointState, breakpointGutter, EditorView.lineWrapping, EditorState.readOnly.of(true)]
          : [basicSetup, javascript(), themeCompartment.of(this.currentTheme === 'light' ? lightTheme : darkTheme), highlightField, breakpointState, breakpointGutter, EditorView.lineWrapping]
      ),
    });
  }
}
