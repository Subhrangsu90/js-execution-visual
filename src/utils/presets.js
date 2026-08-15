/**
 * Presets — Curated JavaScript execution scenarios for learning and debugging.
 */
export const PRESETS = [
  {
    id: 'default',
    title: '🚀 Default Overview',
    category: 'General',
    description: 'Overview of functions, loops, objects, arrays, and async timers.',
    code: `// 🚀 JavaScript Execution Visualizer
// Overview of functions, loops, memory, and async callbacks!

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
  console.log("⏱ Delayed callback executed!");
}, 1000);

console.log("Sum:", result);
`
  },
  {
    id: 'event-loop',
    title: '⚡ Event Loop & Microtasks',
    category: 'Async',
    description: 'Visualizes the order of execution between Sync code, Promises (Microtasks), and setTimeout (Macrotasks).',
    code: `// ⚡ Event Loop Race: Sync vs Microtasks vs Macrotasks
console.log("1. Synchronous start");

setTimeout(function macrotaskCallback() {
  console.log("5. setTimeout (Callback Queue - Macrotask)");
}, 0);

Promise.resolve().then(function microtask1() {
  console.log("3. Promise .then (Microtask Queue - Priority 1)");
}).then(function microtask2() {
  console.log("4. Chained Promise (Microtask Queue - Priority 2)");
});

console.log("2. Synchronous end");
`
  },
  {
    id: 'closures',
    title: '🔗 Closures & Scope Chaining',
    category: 'Scope',
    description: 'Demonstrates how inner functions retain access to their outer lexical environment.',
    code: `// 🔗 Closures: Retaining Lexical Environment
function createCounter(initial) {
  let count = initial; // Private variable enclosed

  function increment() {
    count += 1;
    console.log("Current count:", count);
    return count;
  }

  return increment;
}

let counterA = createCounter(10);
let counterB = createCounter(100);

counterA(); // count -> 11
counterA(); // count -> 12
counterB(); // count -> 101
counterA(); // count -> 13
`
  },
  {
    id: 'pass-by-ref',
    title: '🧠 Pass-by-Value vs Reference',
    category: 'Memory',
    description: 'Shows how primitives copy values on Stack while objects share pointers on Heap.',
    code: `// 🧠 Memory: Primitives (Stack) vs Objects (Heap)
// 1. Primitive: Pass by Value (Copy)
let num1 = 42;
let num2 = num1;
num2 = 99;
console.log("num1:", num1, "| num2:", num2); // num1 is unchanged (42)

// 2. Object: Pass by Reference (Shared Pointer)
let originalObj = { name: "Alice", score: 80 };
let aliasObj = originalObj; // Points to SAME heap memory

aliasObj.score = 95; // Mutating through alias
console.log("original score:", originalObj.score); // Mutated to 95!

// 3. Array Mutation
let list = [1, 2, 3];
let listRef = list;
listRef.push(4);
console.log("List length:", list.length);
`
  },
  {
    id: 'hoisting',
    title: '⚙️ Hoisting & Temporal Dead Zone',
    category: 'Engine',
    description: 'Visualizes the Creation Phase hoisting of var vs let/const.',
    code: `// ⚙️ Hoisting & Variable Lifecycle
console.log("var x before init:", typeof x, x); // undefined (hoisted)

var x = 10;
console.log("var x after init:", x); // 10

function calculateTotal(price, tax) {
  return price + tax;
}

let finalPrice = calculateTotal(100, 18);
console.log("Final Price:", finalPrice);
`
  },
  {
    id: 'recursion',
    title: '📚 Recursion & Call Stack Depth',
    category: 'Call Stack',
    description: 'Watch stack frames stack up during recursive calls and unwind on return.',
    code: `// 📚 Recursion: Call Stack Frames Building & Unwinding
function factorial(n) {
  if (n <= 1) {
    console.log("Base case reached: n =", n);
    return 1;
  }
  console.log("Pushing frame for n =", n);
  let result = n * factorial(n - 1);
  console.log("Unwinding frame: factorial(" + n + ") =", result);
  return result;
}

let answer = factorial(4);
console.log("Factorial(4) =", answer);
`
  },
  {
    id: 'console-suite',
    title: '📊 MDN Console Power Suite',
    category: 'Console',
    description: 'Demonstrates console.table, console.time, console.count, and console.trace.',
    code: `// 📊 Full MDN Console API Showcase
console.log("1. General logging with format: %s has %d points", "Hero", 150);

console.info("2. Informational badge");
console.warn("3. Warning badge");
console.error("4. Error badge");

// Table rendering
let employees = [
  { id: 1, name: "Sarah", role: "Engineer", active: true },
  { id: 2, name: "David", role: "Designer", active: false },
  { id: 3, name: "Maya", role: "Lead", active: true }
];
console.table(employees);

// Timers & Counters
console.time("Computation Timer");
console.count("User Action");
console.count("User Action");
console.timeEnd("Computation Timer");
`
  },
  {
    id: 'gc-demo',
    title: '♻️ Garbage Collection (Heap References)',
    category: 'Memory',
    description: 'Demonstrates objects becoming unreferenced candidates for Garbage Collection.',
    code: `// ♻️ Garbage Collection Demo
// Step 1: Allocate object on Heap
let activeUser = { id: 101, username: "dev_coder" };
console.log("User allocated:", activeUser.username);

// Step 2: Reassign variable (old object loses its reference!)
activeUser = { id: 202, username: "new_coder" };
console.log("New user assigned:", activeUser.username);

// Step 3: Clear reference completely
let temporaryData = [1, 2, 3, 4];
temporaryData = null; // [1,2,3,4] is now unreferenced on Heap!
console.log("Cleaned temporary data");
`
  }
];
