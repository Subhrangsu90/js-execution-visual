# ⚡ JS Execution Visualizer — Runtime Debugger

An interactive, real-time JavaScript runtime visualizer and educational debugger built from the ground up. Step through JavaScript code execution and observe changes in the **Call Stack**, **Execution Contexts**, **Stack & Heap Memory**, **Scope Chain**, and the **Asynchronous Event Loop** (Web APIs, Microtask Queue, Callback Queue) frame by frame.

---

## ✨ Features

- **Interactive Code Editor**: Integrated CodeMirror 6 editor with syntax highlighting, active line execution markers, line wrapping, and dynamic theme switching.
- **Call Stack Visualization**: Visualizes active call frames entering and exiting the stack as functions execute and return.
- **Execution Context Inspector**: Shows Creation Phase (Hoisting) vs Execution Phase, `this` binding, lexical environments, and variable environments.
- **Memory Model (Stack & Heap)**:
  - Primitive types stored on the stack (numbers, strings, booleans, null, undefined).
  - Reference types allocated in heap memory (Objects, Arrays, Functions) with dynamic pointer arrows connecting stack references to heap addresses.
  - Interactive memory type badge indicators and hover effects.
- **Scope Chain Inspection**: Deep view into Global Scope, Block Scopes, Function Scopes, and Closure chains.
- **Event Loop & Concurrency Model**:
  - Live simulation of `setTimeout`, `Promise.then` / Microtasks, and DOM/Web APIs.
  - Real-time migration of callbacks from Web APIs $\rightarrow$ Microtask / Callback queues $\rightarrow$ Call Stack.
- **Execution Control Bar**:
  - Step Forward ($\rightarrow$), Step Backward ($\leftarrow$), Go to End.
  - Play / Pause (Space) with adjustable playback speed slider ($0.25\times$ to $4.0\times$).
  - Instant Reset ($R$) and Step-by-Step description banner.
- **Custom AST Interpreter**: Lightweight Acorn-based AST interpreter executing ES6+ code safely in sandbox step-snapshots without blocking browser UI.
- **Dual Themes & Glassmorphism Design**: High-contrast modern dark mode with sleek glassmorphism panels, alongside a clean light theme.
- **Interactive Resizable Panels**: Every panel and divider is draggable and resizable to customize your workspace layout.

---

## 📸 Overview & Architecture

```
                               ┌─────────────────────────┐
                               │  JavaScript Source Code │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ Acorn AST Parser Engine │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ Step Snapshot Generator │
                               └────────────┬────────────┘
                                            │
       ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
       ▼                  ▼                 ▼                 ▼                  ▼
┌──────────────┐   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ┌──────────────┐
│  Call Stack  │   │  Execution   │  │    Memory    │  │ Scope Chain  │   │  Event Loop  │
│    Frames    │   │   Contexts   │  │ Stack & Heap │  │  & Closures  │   │ Web APIs/Q's │
└──────────────┘   └──────────────┘  └──────────────┘  └──────────────┘   └──────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (version 18+ recommended) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd js-execution-visual
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000` (or the URL shown in your terminal).

---

## 🛠️ Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server with hot module replacement (HMR) |
| `npm run build` | Bundles and minifies application for production in `dist/` |
| `npm run preview` | Locally previews the production build |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run code & start visualization |
| `Space` | Play / Pause playback |
| `→` (Right Arrow) | Step forward 1 frame |
| `←` (Left Arrow) | Step backward 1 frame |
| `R` | Reset execution to beginning |

---

## 🧩 Tech Stack

- **Runtime & Bundler**: [Vite](https://vitejs.dev/)
- **Code Editor**: [CodeMirror 6](https://codemirror.net/) (`@codemirror/lang-javascript`, `@codemirror/theme-one-dark`)
- **AST Parsing**: [Acorn](https://github.com/acornjs/acorn) & `acorn-walk`
- **Styling**: Vanilla CSS (CSS Variables, Flexbox, CSS Grid, Glassmorphism, Responsive layout)
- **Typography**: Inter & JetBrains Mono

---

## 📂 Project Structure

```
js-execution-visual/
├── index.html                  # HTML entry point and panel layout
├── package.json                # Dependencies and project scripts
├── vite.config.js              # Vite configuration
├── .gitignore                  # Git ignore rules
├── README.md                   # Project documentation
└── src/
    ├── main.js                 # App bootstrap and state orchestration
    ├── components/
    │   ├── CallStackPanel.js   # Call stack visualization component
    │   ├── ConsolePanel.js     # Virtual console output panel
    │   ├── Controls.js         # Debugger playback toolbar & shortcuts
    │   ├── Editor.js           # CodeMirror editor wrapper
    │   ├── EventLoopPanel.js   # Web APIs, microtask, and macrotask queues
    │   ├── ExecutionBubble3D.js # 3D execution status orb & stats
    │   ├── ExecutionContextPanel.js # Context phases & variable environments
    │   ├── FloatingBubbles3D.js # Ambient 3D floating glass bubbles
    │   ├── MemoryPanel.js      # Stack & Heap memory with SVG pointers
    │   └── ScopeChainPanel.js  # Scope resolution hierarchy
    ├── interpreter/
    │   ├── Environment.js      # Lexical environment & scope model
    │   ├── EventLoopModel.js   # Event loop task scheduler
    │   ├── Interpreter.js      # Step-by-step AST execution engine
    │   └── MemoryModel.js      # Memory allocation & pointer tracker
    ├── styles/
    │   └── index.css           # Global theme variables & UI styling
    └── utils/
        ├── InfoPopup.js        # Educational "What is this?" modals
        ├── Resizable.js        # Split-pane drag resizers
        ├── ShortcutsModal.js   # Keyboard shortcuts HUD modal
        ├── ValueInspector.js   # Interactive value inspection popover
        ├── icons.js            # SVG icons library
        └── presets.js          # Curated learning scenario presets
```

---

## 📄 License

MIT
