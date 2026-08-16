/**
 * MemoryModel — tracks objects on a simulated heap for visualization.
 *
 * Primitives live "on the stack" (inside Environment variables).
 * Objects, arrays, and functions are allocated on the heap and
 * referenced by a unique heap ID.
 *
 * We use a WeakMap keyed by actual JS objects to associate them
 * with heap IDs, so the interpreter can work with real objects
 * while we maintain a parallel visual model.
 */
export class MemoryModel {
  constructor() {
    /** @type {Map<string, object>} heapId → description */
    this.heap = new Map();
    /** @type {Map<object, string>} actual object → heapId */
    this.objectIds = new Map();
    this._nextId = 1;
  }

  /** Register an object on the heap. Returns its heap ID. */
  track(obj) {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
      return null; // primitives don't go on the heap
    }
    // Filter out runtime builtins (console, Promise shim, native functions)
    if (obj.__isBuiltin || obj.__isNative) {
      return null;
    }
    if (this.objectIds.has(obj)) {
      return this.objectIds.get(obj);
    }
    const id = `heap_${this._nextId++}`;
    this.objectIds.set(obj, id);
    // Store a description — we'll refresh it on snapshot
    this.heap.set(id, { id, type: this._typeOf(obj) });
    return id;
  }

  /** Get the heap ID for an already-tracked object. */
  getId(obj) {
    return this.objectIds.get(obj) || null;
  }

  /** Check if a value is a reference type (object/array/function). */
  isReference(val) {
    if (val === null) return false;
    if (val && (val.__isBuiltin || val.__isNative)) return false;
    return typeof val === 'object' || typeof val === 'function';
  }

  _typeOf(obj) {
    if (Array.isArray(obj)) return 'array';
    if (typeof obj === 'function') return 'function';
    if (obj && obj.__isFn) return 'function';
    return 'object';
  }

  /**
   * Describe a value for display.
   * Returns { type, value?, heapId?, display }
   */
  describeValue(val) {
    if (val === null)      return { type: 'null',      value: null,      display: 'null' };
    if (val === undefined) return { type: 'undefined', value: undefined, display: 'undefined' };

    switch (typeof val) {
      case 'number':  return { type: 'number',  value: val, display: String(val) };
      case 'string':  return { type: 'string',  value: val, display: `"${val}"` };
      case 'boolean': return { type: 'boolean', value: val, display: String(val) };
      default:
        break;
    }

    if (val && (val.__isBuiltin || val.__isNative)) {
      return { type: 'builtin', display: val.__name || val.name || 'native' };
    }

    // Reference type
    if (val && val.__isFn) {
      const id = this.track(val);
      return { type: 'function', heapId: id, display: `ƒ ${val.name || 'anonymous'}` };
    }

    if (typeof val === 'function') {
      const id = this.track(val);
      return { type: 'function', heapId: id, display: `ƒ ${val.name || 'native'}` };
    }

    const id = this.track(val);
    if (Array.isArray(val)) {
      return { type: 'array', heapId: id, display: `Array(${val.length})` };
    }
    if (val instanceof Map) {
      return { type: 'map', heapId: id, display: `Map(${val.size})` };
    }
    if (val instanceof Set) {
      return { type: 'set', heapId: id, display: `Set(${val.size})` };
    }
    if (val instanceof Date) {
      return { type: 'date', heapId: id, display: `Date(${val.toISOString()})` };
    }
    if (val instanceof RegExp) {
      return { type: 'regexp', heapId: id, display: String(val) };
    }
    if (val instanceof Error) {
      return { type: 'error', heapId: id, display: `${val.name}: ${val.message}` };
    }
    return { type: 'object', heapId: id, display: `{…}` };
  }

  /**
   * Produce a full snapshot of the heap for visualization.
   * Describes every tracked object's current properties.
   */
  heapSnapshot() {
    const snapshot = {};
    for (const [id, meta] of this.heap) {
      // Find the actual object by reverse lookup
      let actualObj = null;
      for (const [obj, oid] of this.objectIds) {
        if (oid === id) { actualObj = obj; break; }
      }
      if (!actualObj) continue;
      if (actualObj.__isBuiltin || actualObj.__isNative) continue;

      if (actualObj.__isFn) {
        snapshot[id] = {
          id,
          type: 'function',
          name: actualObj.name || 'anonymous',
          params: actualObj.params || [],
          closureName: actualObj.closure?.name || null,
        };
      } else if (typeof actualObj === 'function') {
        snapshot[id] = {
          id,
          type: 'function',
          name: actualObj.__name || actualObj.name || 'native',
          params: [],
          closureName: null,
          native: true,
        };
      } else if (Array.isArray(actualObj)) {
        snapshot[id] = {
          id,
          type: 'array',
          elements: actualObj.map((el, i) => ({
            index: i,
            ...this.describeValue(el),
          })),
        };
      } else if (actualObj instanceof Map) {
        const properties = {};
        for (const [k, v] of actualObj.entries()) {
          properties[String(k)] = this.describeValue(v);
        }
        snapshot[id] = { id, type: 'map', properties };
      } else if (actualObj instanceof Set) {
        const elements = Array.from(actualObj.values()).map(el => this.describeValue(el));
        snapshot[id] = { id, type: 'set', elements };
      } else {
        const properties = {};
        for (const key of Object.keys(actualObj)) {
          if (key.startsWith('__')) continue; // skip internal markers
          properties[key] = this.describeValue(actualObj[key]);
        }
        snapshot[id] = { id, type: 'object', properties };
      }
    }
    return snapshot;
  }

  /**
   * Produce a stack snapshot given a list of environments.
   * Shows which variables are primitives (inline) vs references (→ heap).
   */
  stackSnapshot(environments) {
    const entries = [];
    for (const env of environments) {
      if (!env || !env.variables) continue;

      const varEntries = env.variables instanceof Map
        ? Array.from(env.variables.entries())
        : Array.isArray(env.variables)
        ? env.variables.map(v => [v.name, v])
        : Object.entries(env.variables);

      for (const [name, entry] of varEntries) {
        if (!entry) continue;
        const desc = this.describeValue(entry.value);
        entries.push({
          name: name || entry.name,
          scope: env.name,
          scopeId: env.id,
          kind: entry.kind || 'let',
          ...desc,
          isRef: !!desc.heapId,
          refTarget: desc.heapId || null,
        });
      }
    }
    return entries;
  }
}
