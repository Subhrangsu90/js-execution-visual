/**
 * Environment — manages variable bindings and lexical scoping.
 *
 * Each Environment represents a scope (global, function, or block).
 * Variable lookup walks the scope chain (parent links) to resolve
 * identifiers, exactly mirroring how JS lexical scoping works.
 */
export class Environment {
  /**
   * @param {string} name       Human-readable scope name (e.g. "Global", "foo")
   * @param {Environment|null} parent  Enclosing scope
   * @param {'global'|'function'|'block'} type
   */
  constructor(name, parent = null, type = 'block') {
    this.name = name;
    this.parent = parent;
    this.type = type;
    /** @type {Map<string, {value: any, kind: 'var'|'let'|'const', mutable: boolean}>} */
    this.variables = new Map();
    this.id = Environment._nextId++;
  }

  static _nextId = 1;

  /** Define a new variable in *this* scope. */
  define(name, value, kind = 'let') {
    this.variables.set(name, {
      value,
      kind,
      mutable: kind !== 'const',
    });
  }

  /** Look up a variable, walking the scope chain. */
  get(name) {
    if (this.variables.has(name)) {
      return this.variables.get(name).value;
    }
    if (this.parent) return this.parent.get(name);
    if (typeof globalThis !== 'undefined' && name in globalThis) {
      return globalThis[name];
    }
    return undefined; // behaves like `undefined` for undeclared identifiers
  }

  /** Check if a variable is defined anywhere in the scope chain. */
  has(name) {
    if (this.variables.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    if (typeof globalThis !== 'undefined' && name in globalThis) return true;
    return false;
  }

  /** Set an existing variable's value (assignment). */
  set(name, value) {
    if (this.variables.has(name)) {
      const entry = this.variables.get(name);
      if (!entry.mutable) {
        throw new TypeError(`Assignment to constant variable '${name}'`);
      }
      entry.value = value;
      return;
    }
    if (this.parent) {
      this.parent.set(name, value);
      return;
    }
    // Implicit global (var-like behavior for undeclared assignments)
    this.variables.set(name, { value, kind: 'var', mutable: true });
  }

  /** Find which environment in the chain owns a variable. */
  resolve(name) {
    if (this.variables.has(name)) return this;
    if (this.parent) return this.parent.resolve(name);
    return null;
  }

  /**
   * Produce a snapshot of this scope (for visualization).
   * Only includes variables defined directly in this scope.
   */
  snapshot() {
    const vars = [];
    for (const [name, entry] of this.variables) {
      vars.push({
        name,
        value: entry.value,
        kind: entry.kind,
      });
    }
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      variables: vars,
    };
  }

  /**
   * Produce the full scope chain as an array of snapshots
   * (innermost scope first).
   */
  chainSnapshot() {
    const chain = [];
    let env = this;
    while (env) {
      chain.push(env.snapshot());
      env = env.parent;
    }
    return chain;
  }
}
