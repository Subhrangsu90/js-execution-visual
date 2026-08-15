/**
 * Editor — CodeMirror 6 wrapper with breakpoint gutter,
 * current-line highlighting, and dynamic light/dark theme switching.
 */
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState, StateEffect, StateField, Compartment } from '@codemirror/state';
import { Decoration } from '@codemirror/view';

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

const themeCompartment = new Compartment();

/* ── Dark Theme Extension ─────────────────────────────────────── */
const darkTheme = [
  oneDark,
  EditorView.theme({
    '&': {
      backgroundColor: '#0a0a0c',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: '13px',
      lineHeight: '1.7',
      caretColor: '#f59e0b',
    },
    '.cm-cursor': {
      borderLeftColor: '#f59e0b',
    },
    '.cm-gutters': {
      backgroundColor: '#070709',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      color: '#52525b',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(255, 255, 255, 0.15) !important',
    },
    '.cm-line': {
      padding: '0 8px',
    },
  }, { dark: true })
];

/* ── Light Theme Extension ────────────────────────────────────── */
const lightTheme = [
  EditorView.theme({
    '&': {
      backgroundColor: '#ffffff',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: '13px',
      lineHeight: '1.7',
      caretColor: '#0284c7',
      color: '#0f172a',
    },
    '.cm-cursor': {
      borderLeftColor: '#0284c7',
    },
    '.cm-gutters': {
      backgroundColor: '#f8fafc',
      borderRight: '1px solid rgba(0, 0, 0, 0.08)',
      color: '#94a3b8',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(2, 132, 199, 0.15) !important',
    },
    '.cm-line': {
      padding: '0 8px',
    },
  }, { dark: false })
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
    this._init();
  }

  _init() {
    const state = EditorState.create({
      doc: SAMPLE_CODE,
      extensions: [
        basicSetup,
        javascript(),
        themeCompartment.of(this.currentTheme === 'light' ? lightTheme : darkTheme),
        highlightField,
        EditorView.lineWrapping,
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

  /**
   * Highlight an AST node, block, or expression range.
   * @param {{ line?: number, endLine?: number, start?: number, end?: number, type?: string }} node
   */
  highlightNode(node) {
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
  highlightLine(lineNumber) {
    this.highlightNode({ line: lineNumber, endLine: lineNumber });
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
          ? [basicSetup, javascript(), themeCompartment.of(this.currentTheme === 'light' ? lightTheme : darkTheme), highlightField, EditorView.lineWrapping, EditorState.readOnly.of(true)]
          : [basicSetup, javascript(), themeCompartment.of(this.currentTheme === 'light' ? lightTheme : darkTheme), highlightField, EditorView.lineWrapping]
      ),
    });
  }
}
