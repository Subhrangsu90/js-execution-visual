/**
 * Interpreter — AST tree-walking JavaScript interpreter.
 *
 * Parses code with Acorn, then executes it step by step,
 * recording a full state snapshot at each interesting operation.
 * The resulting array of snapshots drives the visualization UI.
 *
 * Supports: var/let/const, functions, closures, objects, arrays,
 * if/else, for, while, ternary, arrow functions, template literals,
 * console.log, setTimeout, and basic Promise.
 */
import * as acorn from 'acorn';
import { Environment } from './Environment.js';
import { MemoryModel } from './MemoryModel.js';
import { EventLoopModel } from './EventLoopModel.js';

const MAX_STEPS = 5000;

export class Interpreter {
  constructor(code) {
    this.code = code;
    this.ast = null;
    this.globalEnv = null;
    this.memory = new MemoryModel();
    this.eventLoop = new EventLoopModel();
    /** @type {Array<{name: string, type: string, line: number}>} */
    this.callStack = [];
    this.consoleOutput = [];
    /** @type {Array<object>} All recorded snapshots */
    this.steps = [];
    this.currentEnv = null;
    this.error = null;
    this._stepCount = 0;
    this._currentNode = null;
  }

  /** Parse and execute, returning all recorded steps. */
  run() {
    try {
      this.ast = acorn.parse(this.code, {
        ecmaVersion: 2022,
        sourceType: 'script',
        locations: true,
      });
    } catch (err) {
      this.error = `SyntaxError: ${err.message}`;
      this.consoleOutput.push({ type: 'error', args: [this.error] });
      this._recordStep(null, this.error);
      return this.steps;
    }

    // Set up global environment with built-ins
    this.globalEnv = new Environment('Global', null, 'global');
    this.currentEnv = this.globalEnv;
    this._setupBuiltins();

    // Push global execution context
    this.callStack.push({ name: 'Global', type: 'global', line: 1 });
    this._recordStep(this.ast, 'Program start — Global Execution Context created');

    try {
      // Phase 1: Hoisting
      this._hoist(this.ast.body, this.globalEnv);

      // Phase 2: Execute
      this._execStatements(this.ast.body, this.globalEnv);

      // Pop Global frame after main script synchronous execution finishes
      if (this.callStack.length > 0 && this.callStack[this.callStack.length - 1].type === 'global') {
        this.callStack.pop();
      }

      // Phase 3: Drain event loop
      this._drainEventLoop();

      // Done
      this._recordStep(null, 'Program execution complete');
    } catch (err) {
      if (err.message === '__MAX_STEPS__') {
        this._recordStep(this._currentNode || null, `⚠ Execution stopped — exceeded ${MAX_STEPS} steps`);
      } else {
        this.error = err.message || String(err);
        this.consoleOutput.push({ type: 'error', args: [this.error] });
        this._recordStep(this._currentNode || null, `Runtime Error: ${this.error}`);
      }
    }

    return this.steps;
  }

  // ─── BUILT-INS ────────────────────────────────────────────────

  _setupBuiltins() {
    // State for console counters & timers
    this._consoleCounters = new Map();
    this._consoleTimers = new Map();

    // Comprehensive MDN console API implementation
    const consoleObj = {
      log: (...args) => {
        this.consoleOutput.push({ type: 'log', args: args.map(a => this._cloneForConsole(a)) });
      },
      info: (...args) => {
        this.consoleOutput.push({ type: 'info', args: args.map(a => this._cloneForConsole(a)) });
      },
      warn: (...args) => {
        this.consoleOutput.push({ type: 'warn', args: args.map(a => this._cloneForConsole(a)) });
      },
      error: (...args) => {
        this.consoleOutput.push({ type: 'error', args: args.map(a => this._cloneForConsole(a)) });
      },
      debug: (...args) => {
        this.consoleOutput.push({ type: 'log', args: args.map(a => this._cloneForConsole(a)) });
      },
      table: (tabularData, properties) => {
        this.consoleOutput.push({
          type: 'table',
          data: this._cloneForConsole(tabularData),
          columns: properties,
        });
      },
      assert: (assertion, ...args) => {
        if (!assertion) {
          const messageArgs = args.length > 0 ? args.map(a => this._cloneForConsole(a)) : ['console.assert'];
          this.consoleOutput.push({
            type: 'error',
            args: ['Assertion failed:', ...messageArgs],
          });
        }
      },
      count: (label = 'default') => {
        const strLabel = String(label);
        const current = (this._consoleCounters.get(strLabel) || 0) + 1;
        this._consoleCounters.set(strLabel, current);
        this.consoleOutput.push({
          type: 'log',
          args: [`${strLabel}: ${current}`],
        });
      },
      countReset: (label = 'default') => {
        const strLabel = String(label);
        if (this._consoleCounters.has(strLabel)) {
          this._consoleCounters.set(strLabel, 0);
        } else {
          this.consoleOutput.push({
            type: 'warn',
            args: [`Count for '${strLabel}' does not exist`],
          });
        }
      },
      time: (label = 'default') => {
        const strLabel = String(label);
        if (this._consoleTimers.has(strLabel)) {
          this.consoleOutput.push({
            type: 'warn',
            args: [`Timer '${strLabel}' already exists`],
          });
        } else {
          this._consoleTimers.set(strLabel, Date.now());
        }
      },
      timeLog: (label = 'default', ...args) => {
        const strLabel = String(label);
        if (this._consoleTimers.has(strLabel)) {
          const elapsed = (Date.now() - this._consoleTimers.get(strLabel));
          const extra = args.map(a => this._cloneForConsole(a));
          this.consoleOutput.push({
            type: 'log',
            args: [`${strLabel}: ${elapsed.toFixed(2)} ms`, ...extra],
          });
        } else {
          this.consoleOutput.push({
            type: 'warn',
            args: [`Timer '${strLabel}' does not exist`],
          });
        }
      },
      timeEnd: (label = 'default') => {
        const strLabel = String(label);
        if (this._consoleTimers.has(strLabel)) {
          const elapsed = (Date.now() - this._consoleTimers.get(strLabel));
          this._consoleTimers.delete(strLabel);
          this.consoleOutput.push({
            type: 'info',
            args: [`${strLabel}: ${elapsed.toFixed(2)} ms - timer ended`],
          });
        } else {
          this.consoleOutput.push({
            type: 'warn',
            args: [`Timer '${strLabel}' does not exist`],
          });
        }
      },
      dir: (item) => {
        this.consoleOutput.push({
          type: 'dir',
          args: [this._cloneForConsole(item)],
        });
      },
      trace: (...args) => {
        const stackSnapshot = this.callStack.map(f => ({ name: f.name, line: f.line }));
        this.consoleOutput.push({
          type: 'trace',
          args: args.length > 0 ? args.map(a => this._cloneForConsole(a)) : ['console.trace'],
          stack: stackSnapshot,
        });
      },
      group: (label = 'console.group') => {
        this.consoleOutput.push({ type: 'group', label: String(label) });
      },
      groupCollapsed: (label = 'console.group') => {
        this.consoleOutput.push({ type: 'group', label: String(label) });
      },
      groupEnd: () => {
        this.consoleOutput.push({ type: 'groupEnd' });
      },
      clear: () => {
        this.consoleOutput.push({ type: 'clear' });
      },
    };
    consoleObj.__isBuiltin = true;
    this.globalEnv.define('console', consoleObj, 'const');

    // setTimeout
    const self = this;
    const stFn = function setTimeout(callback, delay) {
      const label = callback?.__isFn ? callback.name : 'anonymous';
      self.eventLoop.addTimer(callback, delay || 0, `setTimeout(${label}, ${delay || 0})`);
    };
    stFn.__isNative = true;
    stFn.__name = 'setTimeout';
    this.globalEnv.define('setTimeout', stFn, 'const');

    // setInterval (simplified — runs once for visualization)
    const siFn = function setInterval(callback, delay) {
      const label = callback?.__isFn ? callback.name : 'anonymous';
      self.eventLoop.addTimer(callback, delay || 0, `setInterval(${label}, ${delay || 0})`);
    };
    siFn.__isNative = true;
    siFn.__name = 'setInterval';
    this.globalEnv.define('setInterval', siFn, 'const');

    // Basic Promise support
    const PromiseShim = {
      resolve: (val) => {
        return {
          __isPromise: true,
          value: val,
          then: (cb) => {
            self.eventLoop.addMicrotask({ __isFn: true, name: 'then', params: ['value'], body: null, callback: cb, resolvedValue: val, closure: self.currentEnv }, 'Promise.then');
            return PromiseShim.resolve(undefined);
          },
        };
      },
    };
    PromiseShim.__isBuiltin = true;
    this.globalEnv.define('Promise', PromiseShim, 'const');

    // undefined, null, NaN, Infinity
    this.globalEnv.define('undefined', undefined, 'const');
    this.globalEnv.define('NaN', NaN, 'const');
    this.globalEnv.define('Infinity', Infinity, 'const');
    this.globalEnv.define('parseInt', parseInt, 'const');
    this.globalEnv.define('parseFloat', parseFloat, 'const');
    this.globalEnv.define('isNaN', isNaN, 'const');
    this.globalEnv.define('isFinite', isFinite, 'const');

    // Math
    const mathObj = {
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      trunc: Math.trunc,
      random: Math.random,
      max: Math.max,
      min: Math.min,
      abs: Math.abs,
      pow: Math.pow,
      sqrt: Math.sqrt,
      sign: Math.sign,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      log: Math.log,
      log10: Math.log10,
      exp: Math.exp,
      PI: Math.PI,
      E: Math.E,
      SQRT2: Math.SQRT2,
    };
    mathObj.__isBuiltin = true;
    this.globalEnv.define('Math', mathObj, 'const');

    // Array
    const arrayObj = { isArray: Array.isArray, from: Array.from, of: Array.of };
    arrayObj.__isBuiltin = true;
    this.globalEnv.define('Array', arrayObj, 'const');

    // Object
    const objectObj = { keys: Object.keys, values: Object.values, entries: Object.entries, assign: Object.assign };
    objectObj.__isBuiltin = true;
    this.globalEnv.define('Object', objectObj, 'const');

    // JSON
    const jsonObj = { parse: JSON.parse, stringify: JSON.stringify };
    jsonObj.__isBuiltin = true;
    this.globalEnv.define('JSON', jsonObj, 'const');

    // structuredClone
    if (typeof globalThis.structuredClone === 'function') {
      this.globalEnv.define('structuredClone', globalThis.structuredClone, 'const');
    } else {
      this.globalEnv.define('structuredClone', (val) => JSON.parse(JSON.stringify(val)), 'const');
    }

    // Native Constructors & Built-in Functions
    const nativeGlobals = [
      'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'BigInt',
      'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
      'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
      'atob', 'btoa', 'URL', 'URLSearchParams'
    ];
    for (const name of nativeGlobals) {
      if (typeof globalThis[name] !== 'undefined') {
        this.globalEnv.define(name, globalThis[name], 'const');
      }
    }
  }

  // ─── HOISTING ─────────────────────────────────────────────────

  _hoist(body, env) {
    for (const node of body) {
      if (node.type === 'FunctionDeclaration') {
        const fn = this._createFunction(node, env);
        env.define(node.id.name, fn, 'var');
        this._recordStep(node, `Hoisted function "${node.id.name}"`, 'creation');
      } else if (node.type === 'ClassDeclaration') {
        // Classes are NOT hoisted like functions (TDZ), but we note them
      } else if (node.type === 'VariableDeclaration' && node.kind === 'var') {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier') {
            env.define(decl.id.name, undefined, 'var');
          }
        }
      }
    }
  }

  // ─── STATEMENT EXECUTION ──────────────────────────────────────

  _execStatements(body, env) {
    for (const stmt of body) {
      const result = this._exec(stmt, env);
      if (result && result.__signal) return result;
    }
    return undefined;
  }

  _exec(node, env) {
    this._checkStepLimit();

    if (!node) return undefined;
    this._currentNode = node;

    switch (node.type) {
      case 'Program':
        return this._execStatements(node.body, env);

      case 'ExpressionStatement':
        return this._execExpr(node.expression, env);

      case 'VariableDeclaration':
        return this._execVarDecl(node, env);

      case 'FunctionDeclaration':
        // Already hoisted — just record step
        this._recordStep(node, `Function "${node.id.name}" (already hoisted)`);
        return undefined;

      case 'ClassDeclaration':
        return this._execClass(node, env);

      case 'ReturnStatement': {
        const val = node.argument ? this._execExpr(node.argument, env) : undefined;
        this._recordStep(node, `return ${this._displayValue(val)}`);
        return { __signal: 'return', value: val };
      }

      case 'IfStatement':
        return this._execIf(node, env);

      case 'WhileStatement':
        return this._execWhile(node, env);

      case 'DoWhileStatement':
        return this._execDoWhile(node, env);

      case 'ForStatement':
        return this._execFor(node, env);

      case 'ForInStatement':
        return this._execForIn(node, env);

      case 'ForOfStatement':
        return this._execForOf(node, env);

      case 'BlockStatement':
        return this._execBlock(node, env);

      case 'BreakStatement':
        return { __signal: 'break' };

      case 'ContinueStatement':
        return { __signal: 'continue' };

      case 'ThrowStatement': {
        const val = this._execExpr(node.argument, env);
        throw new Error(this._displayValue(val));
      }

      case 'TryStatement':
        return this._execTry(node, env);

      case 'SwitchStatement':
        return this._execSwitch(node, env);

      case 'EmptyStatement':
        return undefined;

      default:
        // Treat as expression
        return this._execExpr(node, env);
    }
  }

  _execVarDecl(node, env) {
    for (const decl of node.declarations) {
      let value = undefined;
      if (decl.init) {
        value = this._execExpr(decl.init, env);
      }

      // Destructuring patterns
      if (decl.id.type === 'ObjectPattern' || decl.id.type === 'ArrayPattern') {
        this._destructure(decl.id, value, env, node.kind);
        this._recordStep(node, `${node.kind} ${this._patternStr(decl.id)} = ${this._displayValue(value)}`);
      } else {
        const name = decl.id.type === 'Identifier' ? decl.id.name : '?';
        if (node.kind === 'var' && env.variables.has(name)) {
          // Already hoisted, just assign the value
          env.set(name, value);
        } else {
          env.define(name, value, node.kind);
        }

        if (this.memory.isReference(value)) {
          this.memory.track(value);
        }

        this._recordStep(node, `${node.kind} ${name} = ${this._displayValue(value)}`);
      }
    }
    return undefined;
  }

  _execIf(node, env) {
    const test = this._execExpr(node.test, env);
    this._recordStep(node, `if (${this._displayValue(test)}) → ${test ? 'true branch' : 'false branch'}`);
    if (test) {
      return this._exec(node.consequent, env);
    } else if (node.alternate) {
      return this._exec(node.alternate, env);
    }
    return undefined;
  }

  _execWhile(node, env) {
    let iteration = 0;
    while (true) {
      this._checkStepLimit();
      const test = this._execExpr(node.test, env);
      if (!test) {
        this._recordStep(node, `while — condition false, exiting loop`);
        break;
      }
      iteration++;
      this._recordStep(node, `while — iteration ${iteration}`);
      const result = this._exec(node.body, env);
      if (result && result.__signal === 'break') break;
      if (result && result.__signal === 'return') return result;
    }
    return undefined;
  }

  _execDoWhile(node, env) {
    let iteration = 0;
    while (true) {
      this._checkStepLimit();
      iteration++;
      this._recordStep(node, `do...while — iteration ${iteration}`);
      const result = this._exec(node.body, env);
      if (result && result.__signal === 'break') break;
      if (result && result.__signal === 'return') return result;
      const test = this._execExpr(node.test, env);
      if (!test) {
        this._recordStep(node, `do...while — condition false, exiting loop`);
        break;
      }
    }
    return undefined;
  }

  _execFor(node, env) {
    const loopEnv = new Environment('for-loop', env, 'block');
    if (node.init) {
      if (node.init.type === 'VariableDeclaration') {
        this._execVarDecl(node.init, loopEnv);
      } else {
        this._execExpr(node.init, loopEnv);
      }
    }
    let iteration = 0;
    while (true) {
      this._checkStepLimit();
      if (node.test) {
        const test = this._execExpr(node.test, loopEnv);
        if (!test) {
          this._recordStep(node, `for — condition false, exiting loop`);
          break;
        }
      }
      iteration++;
      this._recordStep(node, `for — iteration ${iteration}`);
      const result = this._exec(node.body, loopEnv);
      if (result && result.__signal === 'break') break;
      if (result && result.__signal === 'return') return result;
      if (node.update) {
        this._execExpr(node.update, loopEnv);
      }
    }
    return undefined;
  }

  _execForIn(node, env) {
    const obj = this._execExpr(node.right, env);
    const keys = obj != null ? Object.keys(obj).filter(k => !k.startsWith('__')) : [];
    let iteration = 0;
    for (const key of keys) {
      this._checkStepLimit();
      iteration++;
      const iterationEnv = new Environment('for-in', env, 'block');
      if (node.left.type === 'VariableDeclaration') {
        const decl = node.left.declarations[0];
        if (decl.id.type === 'ObjectPattern' || decl.id.type === 'ArrayPattern') {
          this._destructure(decl.id, key, iterationEnv, node.left.kind);
        } else {
          const varName = decl.id.type === 'Identifier' ? decl.id.name : '?';
          iterationEnv.define(varName, key, node.left.kind);
        }
      } else if (node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern') {
        this._destructure(node.left, key, env, 'let');
      } else {
        const varName = node.left.name;
        env.set(varName, key);
      }
      this._recordStep(node, `for...in — "${key}" (iteration ${iteration})`);
      const result = this._exec(node.body, iterationEnv);
      if (result && result.__signal === 'break') break;
      if (result && result.__signal === 'return') return result;
    }
    return undefined;
  }

  _execForOf(node, env) {
    const iterable = this._execExpr(node.right, env);
    let items = null;
    if (Array.isArray(iterable)) {
      items = iterable;
    } else if (typeof iterable === 'string') {
      items = [...iterable];
    } else if (iterable instanceof Set) {
      items = Array.from(iterable.values());
    } else if (iterable instanceof Map) {
      items = Array.from(iterable.entries());
    } else if (iterable && typeof iterable[Symbol.iterator] === 'function') {
      try { items = Array.from(iterable); } catch {}
    }

    if (!items) {
      throw new TypeError(`${this._displayValue(iterable)} is not iterable`);
    }

    let iteration = 0;
    for (const item of items) {
      this._checkStepLimit();
      iteration++;
      const iterationEnv = new Environment('for-of', env, 'block');
      if (node.left.type === 'VariableDeclaration') {
        const decl = node.left.declarations[0];
        if (decl.id.type === 'ObjectPattern' || decl.id.type === 'ArrayPattern') {
          this._destructure(decl.id, item, iterationEnv, node.left.kind);
        } else {
          const varName = decl.id.type === 'Identifier' ? decl.id.name : '?';
          iterationEnv.define(varName, item, node.left.kind);
        }
      } else if (node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern') {
        this._destructure(node.left, item, env, 'let');
      } else {
        const varName = node.left.name;
        env.set(varName, item);
      }
      this._recordStep(node, `for...of — ${this._displayValue(item)} (iteration ${iteration})`);
      const result = this._exec(node.body, iterationEnv);
      if (result && result.__signal === 'break') break;
      if (result && result.__signal === 'return') return result;
    }
    return undefined;
  }

  _execBlock(node, env) {
    const blockEnv = new Environment('block', env, 'block');
    for (const stmt of node.body) {
      const result = this._exec(stmt, blockEnv);
      if (result && result.__signal) return result;
    }
    return undefined;
  }

  _execTry(node, env) {
    try {
      const result = this._exec(node.block, env);
      if (result && result.__signal) return result;
    } catch (err) {
      if (node.handler) {
        const catchEnv = new Environment('catch', env, 'block');
        if (node.handler.param) {
          catchEnv.define(node.handler.param.name, err.message || String(err), 'let');
        }
        this._recordStep(node.handler, `catch — caught error: ${err.message}`);
        const result = this._exec(node.handler.body, catchEnv);
        if (result && result.__signal) return result;
      }
    } finally {
      if (node.finalizer) {
        this._exec(node.finalizer, env);
      }
    }
    return undefined;
  }

  _execSwitch(node, env) {
    const disc = this._execExpr(node.discriminant, env);
    let matched = false;
    for (const cs of node.cases) {
      if (!matched && cs.test) {
        const testVal = this._execExpr(cs.test, env);
        if (disc !== testVal) continue;
      }
      matched = true;
      for (const stmt of cs.consequent) {
        const result = this._exec(stmt, env);
        if (result && result.__signal === 'break') return undefined;
        if (result && result.__signal) return result;
      }
    }
    return undefined;
  }

  // ─── EXPRESSION EXECUTION ─────────────────────────────────────

  _execExpr(node, env) {
    if (!node) return undefined;
    this._checkStepLimit();

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        return env.get(node.name);

      case 'TemplateLiteral':
        return this._execTemplateLiteral(node, env);

      case 'BinaryExpression':
        return this._execBinary(node, env);

      case 'LogicalExpression':
        return this._execLogical(node, env);

      case 'UnaryExpression':
        return this._execUnary(node, env);

      case 'UpdateExpression':
        return this._execUpdate(node, env);

      case 'AssignmentExpression':
        return this._execAssignment(node, env);

      case 'CallExpression':
        return this._execCall(node, env);

      case 'MemberExpression':
        return this._execMember(node, env);

      case 'ObjectExpression':
        return this._execObjectExpr(node, env);

      case 'ArrayExpression':
        return this._execArrayExpr(node, env);

      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return this._createFunction(node, env);

      case 'ClassExpression':
        return this._execClassExpr(node, env);

      case 'ConditionalExpression': {
        const test = this._execExpr(node.test, env);
        return test ? this._execExpr(node.consequent, env) : this._execExpr(node.alternate, env);
      }

      case 'SequenceExpression': {
        let result;
        for (const expr of node.expressions) {
          result = this._execExpr(expr, env);
        }
        return result;
      }

      case 'ThisExpression':
        return env.get('this') || undefined;

      case 'NewExpression':
        return this._execNew(node, env);

      case 'SpreadElement':
        return this._execExpr(node.argument, env);

      default:
        return undefined;
    }
  }

  _execBinary(node, env) {
    const left = this._execExpr(node.left, env);
    const right = this._execExpr(node.right, env);
    switch (node.operator) {
      case '+':   return left + right;
      case '-':   return left - right;
      case '*':   return left * right;
      case '/':   return left / right;
      case '%':   return left % right;
      case '**':  return left ** right;
      case '==':  return left == right;
      case '===': return left === right;
      case '!=':  return left != right;
      case '!==': return left !== right;
      case '<':   return left < right;
      case '>':   return left > right;
      case '<=':  return left <= right;
      case '>=':  return left >= right;
      case '&':   return left & right;
      case '|':   return left | right;
      case '^':   return left ^ right;
      case '<<':  return left << right;
      case '>>':  return left >> right;
      case '>>>': return left >>> right;
      case 'instanceof': return false; // simplified
      case 'in': return left in right;
      default:    return undefined;
    }
  }

  _execLogical(node, env) {
    const left = this._execExpr(node.left, env);
    if (node.operator === '&&') return left ? this._execExpr(node.right, env) : left;
    if (node.operator === '||') return left ? left : this._execExpr(node.right, env);
    if (node.operator === '??') return left != null ? left : this._execExpr(node.right, env);
    return undefined;
  }

  _execUnary(node, env) {
    if (node.operator === 'typeof') {
      if (node.argument.type === 'Identifier' && !env.has(node.argument.name)) {
        return 'undefined';
      }
      const val = this._execExpr(node.argument, env);
      if (val && val.__isFn) return 'function';
      return typeof val;
    }
    const val = this._execExpr(node.argument, env);
    switch (node.operator) {
      case '-':  return -val;
      case '+':  return +val;
      case '!':  return !val;
      case '~':  return ~val;
      case 'void': return undefined;
      default:   return undefined;
    }
  }

  _execUpdate(node, env) {
    const name = node.argument.name;
    let val = env.get(name);
    const oldVal = val;
    if (node.operator === '++') val++;
    else if (node.operator === '--') val--;
    env.set(name, val);
    this._recordStep(node, `${name}${node.operator} → ${val}`);
    return node.prefix ? val : oldVal;
  }

  _execAssignment(node, env) {
    const value = this._execExpr(node.right, env);

    if (node.left.type === 'Identifier') {
      const name = node.left.name;
      let finalVal = value;
      if (node.operator !== '=') {
        const current = env.get(name);
        finalVal = this._applyCompoundOp(node.operator, current, value);
      }
      env.set(name, finalVal);
      if (this.memory.isReference(finalVal)) this.memory.track(finalVal);
      this._recordStep(node, `${name} ${node.operator} ${this._displayValue(value)}`);
      return finalVal;
    }

    if (node.left.type === 'MemberExpression') {
      const obj = this._execExpr(node.left.object, env);
      const prop = node.left.computed
        ? this._execExpr(node.left.property, env)
        : node.left.property.name;
      let finalVal = value;
      if (node.operator !== '=') {
        finalVal = this._applyCompoundOp(node.operator, obj[prop], value);
      }
      obj[prop] = finalVal;
      this._recordStep(node, `${this._memberStr(node.left)} ${node.operator} ${this._displayValue(value)}`);
      return finalVal;
    }

    return value;
  }

  _applyCompoundOp(op, current, value) {
    switch (op) {
      case '+=': return current + value;
      case '-=': return current - value;
      case '*=': return current * value;
      case '/=': return current / value;
      case '%=': return current % value;
      default:   return value;
    }
  }

  _execCall(node, env) {
    let callee, thisArg = undefined, calleeName = 'anonymous';

    if (node.callee.type === 'MemberExpression') {
      const obj = this._execExpr(node.callee.object, env);
      const prop = node.callee.computed
        ? this._execExpr(node.callee.property, env)
        : node.callee.property.name;
      callee = obj ? obj[prop] : undefined;
      thisArg = obj;
      calleeName = this._memberStr(node.callee);

      // Handle built-in array methods
      if (Array.isArray(obj) && typeof callee === 'function') {
        const args = node.arguments.map(a => this._execExpr(a, env));
        // For array methods that take callbacks (map, filter, forEach, etc.)
        // we need to handle interpreter functions
        if (['map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce'].includes(prop)) {
          return this._execArrayMethod(obj, prop, args, env, node);
        }
        const result = callee.apply(obj, args);
        this._recordStep(node, `${calleeName}(${args.map(a => this._displayValue(a)).join(', ')})`);
        return result;
      }

      // console.log, Math.floor, etc.
      if (obj && obj.__isBuiltin && typeof callee === 'function') {
        const args = node.arguments.map(a => this._execExpr(a, env));
        const result = callee.apply(obj, args);
        this._recordStep(node, `${calleeName}(${args.map(a => this._displayValue(a)).join(', ')})`);
        return result;
      }

      // Promise.resolve
      if (obj && obj.__isPromise && prop === 'then') {
        const args = node.arguments.map(a => this._execExpr(a, env));
        return callee.call(obj, args[0]);
      }

      if (obj && prop === 'resolve' && typeof callee === 'function') {
        const args = node.arguments.map(a => this._execExpr(a, env));
        return callee(...args);
      }
    } else {
      callee = this._execExpr(node.callee, env);
      if (node.callee.type === 'Identifier') {
        calleeName = node.callee.name;
      }
    }

    const args = node.arguments.map(a => this._execExpr(a, env));

    if (!callee) {
      throw new Error(`${calleeName} is not a function`);
    }

    // Native function (setTimeout, Math.floor, etc.)
    if (typeof callee === 'function' && !callee.__isFn) {
      const result = callee.apply(thisArg, args);
      this._recordStep(node, `${calleeName}(${args.map(a => this._displayValue(a)).join(', ')})`);
      return result;
    }

    // Interpreter function
    if (callee.__isFn) {
      return this._callFunction(callee, args, calleeName, node, env);
    }

    return undefined;
  }

  _callFunction(fn, args, calleeName, node, callerEnv) {
    const funcEnv = new Environment(fn.name || calleeName, fn.closure, 'function');

    // Bind parameters (with destructuring support)
    this._bindParams(fn, args, funcEnv);

    // Bind arguments object
    funcEnv.define('arguments', [...args], 'const');

    // Push call stack
    const line = node.loc ? node.loc.start.line : 0;
    this.callStack.push({ name: fn.name || calleeName, type: 'function', line });
    const prevEnv = this.currentEnv;
    this.currentEnv = funcEnv;

    this._recordStep(node, `→ Call ${fn.name || calleeName}(${args.map(a => this._displayValue(a)).join(', ')})`);

    // Hoist inside function
    if (fn.body.type === 'BlockStatement') {
      this._hoist(fn.body.body, funcEnv);
    }

    // Execute body
    let returnValue = undefined;
    try {
      if (fn.body.type === 'BlockStatement') {
        const result = this._execStatements(fn.body.body, funcEnv);
        if (result && result.__signal === 'return') {
          returnValue = result.value;
        }
      } else {
        // Arrow function with expression body
        returnValue = this._execExpr(fn.body, funcEnv);
        this._recordStep(node, `return ${this._displayValue(returnValue)}`);
      }
    } finally {
      // Pop call stack and restore env
      this.callStack.pop();
      this.currentEnv = prevEnv;
      this._recordStep(node, `← ${fn.name || calleeName} returned ${this._displayValue(returnValue)}`);
    }

    return returnValue;
  }

  /**
   * Bind function parameters, with support for destructuring, defaults, and rest.
   */
  _bindParams(fn, args, funcEnv) {
    const paramNodes = fn.paramNodes || [];
    for (let i = 0; i < paramNodes.length; i++) {
      const p = paramNodes[i];
      if (p.type === 'Identifier') {
        funcEnv.define(p.name, i < args.length ? args[i] : undefined, 'let');
      } else if (p.type === 'AssignmentPattern') {
        // Default parameter
        let val = i < args.length ? args[i] : undefined;
        if (val === undefined) val = this._execExpr(p.right, funcEnv);
        const target = p.left;
        if (target.type === 'Identifier') {
          funcEnv.define(target.name, val, 'let');
        } else {
          this._destructure(target, val, funcEnv, 'let');
        }
      } else if (p.type === 'RestElement') {
        const restArr = args.slice(i);
        this.memory.track(restArr);
        funcEnv.define(p.argument.name, restArr, 'let');
        break;
      } else if (p.type === 'ObjectPattern' || p.type === 'ArrayPattern') {
        this._destructure(p, i < args.length ? args[i] : undefined, funcEnv, 'let');
      } else {
        // fallback: use the string param name from fn.params
        funcEnv.define(fn.params[i] || `_arg${i}`, i < args.length ? args[i] : undefined, 'let');
      }
    }
    // If no paramNodes, fall back to string params
    if (paramNodes.length === 0 && fn.params) {
      for (let i = 0; i < fn.params.length; i++) {
        if (typeof fn.params[i] === 'string') {
          funcEnv.define(fn.params[i], i < args.length ? args[i] : undefined, 'let');
        }
      }
    }
  }

  _execArrayMethod(arr, method, args, env, node) {
    const callback = args[0];
    if (!callback || !callback.__isFn) {
      // fallback to native
      const result = arr[method](...args);
      this._recordStep(node, `${method}() called`);
      return result;
    }
    // Execute the callback through interpreter for each element
    switch (method) {
      case 'forEach': {
        for (let i = 0; i < arr.length; i++) {
          this._callFunction(callback, [arr[i], i, arr], `${method} callback`, node, env);
        }
        return undefined;
      }
      case 'map': {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(this._callFunction(callback, [arr[i], i, arr], `${method} callback`, node, env));
        }
        return result;
      }
      case 'filter': {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
          if (this._callFunction(callback, [arr[i], i, arr], `${method} callback`, node, env)) {
            result.push(arr[i]);
          }
        }
        return result;
      }
      case 'find': {
        for (let i = 0; i < arr.length; i++) {
          if (this._callFunction(callback, [arr[i], i, arr], `${method} callback`, node, env)) {
            return arr[i];
          }
        }
        return undefined;
      }
      case 'some': {
        for (let i = 0; i < arr.length; i++) {
          if (this._callFunction(callback, [arr[i], i, arr], `${method} callback`, node, env)) return true;
        }
        return false;
      }
      case 'every': {
        for (let i = 0; i < arr.length; i++) {
          if (!this._callFunction(callback, [arr[i], i, arr], `${method} callback`, node, env)) return false;
        }
        return true;
      }
      case 'reduce': {
        let acc = args.length > 1 ? args[1] : arr[0];
        const start = args.length > 1 ? 0 : 1;
        for (let i = start; i < arr.length; i++) {
          acc = this._callFunction(callback, [acc, arr[i], i, arr], `${method} callback`, node, env);
        }
        return acc;
      }
      default:
        return arr[method](...args);
    }
  }

  _execMember(node, env) {
    const obj = this._execExpr(node.object, env);
    if (obj === null || obj === undefined) {
      throw new Error(`Cannot read properties of ${obj} (reading '${node.property.name || node.property.value}')`);
    }
    const prop = node.computed
      ? this._execExpr(node.property, env)
      : node.property.name;
    // Handle string/array .length etc.
    const val = obj[prop];
    if (typeof val === 'function' && !val.__isFn) {
      // Return bound native method
      return val;
    }
    return val;
  }

  _execObjectExpr(node, env) {
    const obj = {};
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement') {
        const spread = this._execExpr(prop.argument, env);
        Object.assign(obj, spread);
      } else {
        const key = prop.key.type === 'Identifier' ? prop.key.name :
                    prop.key.type === 'Literal' ? prop.key.value : String(prop.key);
        const value = this._execExpr(prop.value, env);
        obj[key] = value;
      }
    }
    this.memory.track(obj);
    this._recordStep(node, `Created object {${Object.keys(obj).join(', ')}}`);
    return obj;
  }

  _execArrayExpr(node, env) {
    const arr = [];
    for (const el of node.elements) {
      if (!el) {
        arr.push(undefined);
      } else if (el.type === 'SpreadElement') {
        const spread = this._execExpr(el.argument, env);
        if (Array.isArray(spread)) arr.push(...spread);
      } else {
        arr.push(this._execExpr(el, env));
      }
    }
    this.memory.track(arr);
    this._recordStep(node, `Created array [${arr.length} elements]`);
    return arr;
  }

  _execTemplateLiteral(node, env) {
    let result = '';
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.cooked;
      if (i < node.expressions.length) {
        result += String(this._execExpr(node.expressions[i], env));
      }
    }
    return result;
  }

  _execNew(node, env) {
    const constructor = this._execExpr(node.callee, env);
    const args = node.arguments.map(a => this._execExpr(a, env));

    // Handle native constructors (Map, Set, Date, RegExp, Error, etc.)
    if (typeof constructor === 'function' && !constructor.__isFn) {
      const instance = new constructor(...args);
      this.memory.track(instance);
      const name = constructor.name || 'Object';
      this._recordStep(node, `new ${name}(${args.map(a => this._displayValue(a)).join(', ')})`);
      return instance;
    }

    const obj = {};
    if (constructor && constructor.__isFn) {
      // If class has superClass, copy its methods first
      if (constructor.__isClass && constructor.superClass) {
        const superCls = constructor.superClass;
        if (superCls.methods) {
          for (const m of superCls.methods) {
            if (!m.static) {
              obj[m.name] = this._createFunction(m.node, constructor.closure);
              obj[m.name].__isMethod = true;
            }
          }
        }
      }

      // Attach own class methods
      if (constructor.__isClass && constructor.methods) {
        for (const m of constructor.methods) {
          if (!m.static) {
            obj[m.name] = this._createFunction(m.node, constructor.closure);
            obj[m.name].__isMethod = true;
          }
        }
      }

      const funcEnv = new Environment(constructor.name || 'constructor', constructor.closure, 'function');
      funcEnv.define('this', obj, 'const');

      // Bind parameters (with destructuring support)
      this._bindParams(constructor, args, funcEnv);

      // Push call stack for constructor
      const line = node.loc ? node.loc.start.line : 0;
      this.callStack.push({ name: `new ${constructor.name || 'Object'}`, type: 'function', line });
      const prevEnv = this.currentEnv;
      this.currentEnv = funcEnv;
      this._recordStep(node, `→ new ${constructor.name || 'Object'}(${args.map(a => this._displayValue(a)).join(', ')})`);

      if (constructor.body.type === 'BlockStatement') {
        this._hoist(constructor.body.body, funcEnv);
        this._execStatements(constructor.body.body, funcEnv);
      }

      this.callStack.pop();
      this.currentEnv = prevEnv;
      this._recordStep(node, `← ${constructor.name || 'Object'} instance created`);
    }
    this.memory.track(obj);
    return obj;
  }

  // ─── FUNCTION CREATION ────────────────────────────────────────

  _createFunction(node, env) {
    const fn = {
      __isFn: true,
      name: node.id ? node.id.name : (node.type === 'ArrowFunctionExpression' ? '(arrow)' : 'anonymous'),
      params: node.params.map(p => {
        if (p.type === 'Identifier') return p.name;
        if (p.type === 'AssignmentPattern') return p.left.name;
        if (p.type === 'RestElement') return '...' + (p.argument.name || '?');
        if (p.type === 'ObjectPattern') return '{…}';
        if (p.type === 'ArrayPattern') return '[…]';
        return '?';
      }),
      paramNodes: node.params,
      body: node.body,
      closure: env,
      node: node,
    };
    this.memory.track(fn);
    return fn;
  }

  // ─── DESTRUCTURING ──────────────────────────────────────────────

  _destructure(pattern, value, env, kind) {
    if (pattern.type === 'ObjectPattern') {
      for (const prop of pattern.properties) {
        if (prop.type === 'RestElement') {
          // const { a, ...rest } = obj
          const usedKeys = pattern.properties
            .filter(p => p.type !== 'RestElement')
            .map(p => p.key.name || p.key.value);
          const rest = {};
          if (value && typeof value === 'object') {
            for (const k of Object.keys(value)) {
              if (!usedKeys.includes(k) && !k.startsWith('__')) rest[k] = value[k];
            }
          }
          this.memory.track(rest);
          const restName = prop.argument.name;
          env.define(restName, rest, kind);
          continue;
        }
        const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
        let val = value != null ? value[key] : undefined;
        // Handle default values
        if (val === undefined && prop.value && prop.value.type === 'AssignmentPattern') {
          val = this._execExpr(prop.value.right, env);
          const target = prop.value.left;
          if (target.type === 'Identifier') {
            env.define(target.name, val, kind);
          } else {
            this._destructure(target, val, env, kind);
          }
          continue;
        }
        // Nested destructuring
        if (prop.value && (prop.value.type === 'ObjectPattern' || prop.value.type === 'ArrayPattern')) {
          this._destructure(prop.value, val, env, kind);
        } else {
          const varName = prop.value ? (prop.value.type === 'Identifier' ? prop.value.name : key) : key;
          env.define(varName, val, kind);
          if (this.memory.isReference(val)) this.memory.track(val);
        }
      }
    } else if (pattern.type === 'ArrayPattern') {
      const arr = Array.isArray(value) ? value : [];
      for (let i = 0; i < pattern.elements.length; i++) {
        const el = pattern.elements[i];
        if (!el) continue;
        if (el.type === 'RestElement') {
          const restArr = arr.slice(i);
          this.memory.track(restArr);
          env.define(el.argument.name, restArr, kind);
          break;
        }
        let val = i < arr.length ? arr[i] : undefined;
        if (el.type === 'AssignmentPattern') {
          if (val === undefined) val = this._execExpr(el.right, env);
          const target = el.left;
          if (target.type === 'Identifier') {
            env.define(target.name, val, kind);
          } else {
            this._destructure(target, val, env, kind);
          }
        } else if (el.type === 'ObjectPattern' || el.type === 'ArrayPattern') {
          this._destructure(el, val, env, kind);
        } else if (el.type === 'Identifier') {
          env.define(el.name, val, kind);
          if (this.memory.isReference(val)) this.memory.track(val);
        }
      }
    }
  }

  _patternStr(pattern) {
    if (pattern.type === 'ObjectPattern') {
      const keys = pattern.properties.map(p => {
        if (p.type === 'RestElement') return `...${p.argument.name}`;
        return p.key?.name || p.key?.value || '?';
      });
      return `{ ${keys.join(', ')} }`;
    }
    if (pattern.type === 'ArrayPattern') {
      const items = pattern.elements.map(el => {
        if (!el) return ',';
        if (el.type === 'RestElement') return `...${el.argument.name}`;
        if (el.type === 'Identifier') return el.name;
        if (el.type === 'AssignmentPattern') return `${el.left.name} = …`;
        return '?';
      });
      return `[ ${items.join(', ')} ]`;
    }
    return '?';
  }

  // ─── CLASS SUPPORT ──────────────────────────────────────────────

  _execClass(node, env) {
    const cls = this._buildClass(node, env);
    env.define(node.id.name, cls, 'let');
    this.memory.track(cls);
    this._recordStep(node, `class ${node.id.name} defined`);
    return undefined;
  }

  _execClassExpr(node, env) {
    const cls = this._buildClass(node, env);
    this.memory.track(cls);
    this._recordStep(node, `class expression ${node.id?.name || '(anonymous)'} created`);
    return cls;
  }

  _buildClass(node, env) {
    let superClass = null;
    if (node.superClass) {
      superClass = this._execExpr(node.superClass, env);
    }

    // Find constructor and methods
    let constructorNode = null;
    const methods = [];
    for (const item of node.body.body) {
      if (item.type === 'MethodDefinition') {
        if (item.kind === 'constructor') {
          constructorNode = item.value;
        } else {
          methods.push({ name: item.key.name || item.key.value, node: item.value, static: item.static });
        }
      }
    }

    // Build the class as an interpreter function
    const className = node.id?.name || 'AnonymousClass';
    const cls = {
      __isFn: true,
      __isClass: true,
      name: className,
      params: constructorNode
        ? constructorNode.params.map(p => p.type === 'Identifier' ? p.name : '?')
        : [],
      paramNodes: constructorNode ? constructorNode.params : [],
      body: constructorNode ? constructorNode.body : { type: 'BlockStatement', body: [] },
      closure: env,
      node: constructorNode || node,
      superClass,
      methods,
    };

    return cls;
  }

  // ─── EVENT LOOP DRAINING ──────────────────────────────────────

  _drainEventLoop() {
    if (!this.eventLoop.hasPendingWork()) return;

    this._recordStep(null, '♻ Synchronous code done — Event loop starts');

    // Fire all timers → macrotask queue
    const fired = this.eventLoop.fireTimers();
    for (const f of fired) {
      this._recordStep(null, `⏱ Timer fired: ${f.label} → Callback Queue`);
    }

    // Drain: microtasks first, then one macrotask, repeat
    let safety = 200;
    while (this.eventLoop.hasPendingWork() && safety-- > 0) {
      // Drain all microtasks
      let micro;
      while ((micro = this.eventLoop.dequeueMicrotask())) {
        this._recordStep(null, `⚡ Microtask: ${micro.label}`);
        if (micro.callback && micro.callback.__isFn) {
          if (micro.callback.callback) {
            // Promise.then callback — call with resolved value
            const cb = micro.callback.callback;
            if (cb.__isFn) {
              this._callFunction(cb, [micro.callback.resolvedValue], micro.label, { loc: null }, this.globalEnv);
            }
          } else {
            this._callFunction(micro.callback, [], micro.label, { loc: null }, this.globalEnv);
          }
        }
      }

      // One macrotask
      const macro = this.eventLoop.dequeueMacrotask();
      if (macro) {
        this._recordStep(null, `📥 Macrotask: ${macro.label} → Call Stack`);
        if (macro.callback && macro.callback.__isFn) {
          this._callFunction(macro.callback, [], macro.label, { loc: null }, this.globalEnv);
        }
      }

      // Fire any new timers that were added during callbacks
      this.eventLoop.fireTimers();
    }

    this._recordStep(null, '♻ Event loop — all queues empty');
  }

  // ─── SNAPSHOT RECORDING ───────────────────────────────────────

  _recordStep(node, description, phase = 'execution') {
    // Gather all environments in the current scope chain
    const envChain = [];
    let e = this.currentEnv || this.globalEnv;
    while (e) {
      envChain.push(e);
      e = e.parent;
    }

    const snapshot = {
      step: this.steps.length,
      description,
      phase,
      node: node ? {
        type: node.type,
        start: node.start,
        end: node.end,
        line: node.loc?.start?.line || 0,
        endLine: node.loc?.end?.line || 0,
      } : null,
      callStack: this.callStack.map(f => ({ ...f })),
      executionContexts: this.callStack.map((f, i) => ({
        name: f.name,
        type: f.type,
        phase: phase,
        variables: this._getEnvForFrame(i)?.snapshot()?.variables || [],
      })),
      memory: {
        stack: this.memory.stackSnapshot(envChain.slice().reverse()),
        heap: this.memory.heapSnapshot(),
      },
      scopeChain: envChain.map(env => ({
        ...env.snapshot(),
        isClosure: env.type === 'function' && env.parent && env.parent.type === 'function',
      })),
      eventLoop: this.eventLoop.snapshot(),
      console: [...this.consoleOutput],
    };

    this.steps.push(snapshot);
  }

  _getEnvForFrame(index) {
    // Walk from current env up, matching by frame index
    // This is approximate — we match the global env for frame 0
    let env = this.currentEnv || this.globalEnv;
    const depth = this.callStack.length - 1 - index;
    let chain = [];
    while (env) {
      if (env.type === 'function' || env.type === 'global') {
        chain.push(env);
      }
      env = env.parent;
    }
    return chain[depth] || chain[chain.length - 1] || this.globalEnv;
  }

  // ─── HELPERS ──────────────────────────────────────────────────

  _cloneForConsole(val, depth = 0) {
    if (depth > 5) return '{…}';
    if (val === null || val === undefined) return val;
    if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') return val;
    if (val && val.__isFn) return { __isFn: true, name: val.name || 'anonymous' };
    if (typeof val === 'function') return { __isFn: true, name: val.__name || val.name || 'native' };
    if (Array.isArray(val)) {
      return val.map(item => this._cloneForConsole(item, depth + 1));
    }
    if (typeof val === 'object') {
      const copy = {};
      for (const [k, v] of Object.entries(val)) {
        if (!k.startsWith('__')) {
          copy[k] = this._cloneForConsole(v, depth + 1);
        }
      }
      return copy;
    }
    return String(val);
  }

  _displayValue(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return `"${val.length > 50 ? val.slice(0, 50) + '…' : val}"`;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (val && val.__isFn) return `ƒ ${val.name || 'anonymous'}`;
    if (typeof val === 'function') return `ƒ ${val.__name || val.name || 'native'}`;
    if (Array.isArray(val)) return `[${val.length} items]`;
    if (typeof val === 'object') {
      const keys = Object.keys(val).filter(k => !k.startsWith('__'));
      return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}`;
    }
    return String(val);
  }

  _memberStr(node) {
    if (node.object.type === 'Identifier') {
      return node.computed
        ? `${node.object.name}[${node.property.type === 'Literal' ? JSON.stringify(node.property.value) : node.property.name}]`
        : `${node.object.name}.${node.property.name}`;
    }
    return node.property.name || '?';
  }

  _checkStepLimit() {
    if (++this._stepCount > MAX_STEPS) {
      throw new Error('__MAX_STEPS__');
    }
  }
}
