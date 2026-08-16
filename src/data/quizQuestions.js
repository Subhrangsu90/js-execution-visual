/**
 * quizQuestions.js — Dedicated Quiz Questions Database
 * 
 * You can easily add, edit, or remove questions here.
 * Each question object supports:
 * - id: unique string key
 * - category: topic area (e.g. 'Hoisting & Scope', 'Event Loop & Async')
 * - title: concise title
 * - question: main question text
 * - code: JavaScript snippet displayed in high-contrast code box
 * - options: array of 4 choices [A, B, C, D]
 * - correctIndex: 0-based index of correct option (0 = A, 1 = B, 2 = C, 3 = D)
 * - explanation: detailed breakdown of why the answer is correct
 * - hint: helpful tip
 */

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
  },
  {
    id: 'this-1',
    category: 'This & Execution Context',
    title: 'Implicit Binding vs Arrow Function Lexical this',
    question: 'What will be printed when obj.sayName() and obj.sayNameArrow() are executed?',
    code: `var name = "Global";
const obj = {
  name: "Local",
  sayName: function() {
    console.log(this.name);
  },
  sayNameArrow: () => {
    console.log(this.name);
  }
};
obj.sayName();
obj.sayNameArrow();`,
    options: [
      'Local, then Local',
      'Local, then Global (or undefined in module scope)',
      'Global, then Local',
      'undefined, then undefined'
    ],
    correctIndex: 1,
    explanation: '`sayName` is a regular function called as `obj.sayName()`, so `this` implicitly binds to `obj`. Arrow functions do NOT have their own `this`; `sayNameArrow` inherits `this` lexically from the surrounding Global execution context.',
    hint: 'Regular function `this` depends on HOW it is called. Arrow function `this` depends on WHERE it was created.'
  },
  {
    id: 'prototype-1',
    category: 'Prototypes & Inheritance',
    title: 'Prototype Shadowing & Property Lookup',
    question: 'What is logged to the console when accessing car1.wheels and car2.wheels after mutation?',
    code: `function Vehicle() {}
Vehicle.prototype.wheels = 4;

const car1 = new Vehicle();
const car2 = new Vehicle();

car1.wheels = 3;
console.log(car1.wheels, car2.wheels);`,
    options: [
      '4 4',
      '3 3',
      '3 4',
      'undefined 4'
    ],
    correctIndex: 2,
    explanation: 'Setting `car1.wheels = 3` creates an own property on `car1`, shadowing the prototype property. `car2` does not have an own `wheels` property, so the JS engine walks up `car2`\'s `[[Prototype]]` chain and finds `Vehicle.prototype.wheels`, which remains `4`.',
    hint: 'Does assigning a property to an instance mutate the constructor\'s prototype, or create an instance property?'
  },
  {
    id: 'async-1',
    category: 'Event Loop & Async',
    title: 'Async / Await vs Synchronous Execution',
    question: 'What will be logged to the console when start() is called?',
    code: `async function start() {
  console.log("A");
  await null;
  console.log("B");
}

console.log("C");
start();
console.log("D");`,
    options: [
      'C, A, B, D',
      'C, A, D, B',
      'A, B, C, D',
      'C, D, A, B'
    ],
    correctIndex: 1,
    explanation: 'Synchronous `console.log("C")` executes first. `start()` is invoked, running synchronous `console.log("A")` until `await null`. `await` pauses the async function, scheduling `console.log("B")` into the Microtask Queue. Synchronous `console.log("D")` executes next. Finally, the Microtask Queue drains, logging "B".',
    hint: 'Async functions execute synchronously until the first `await` expression is encountered!'
  },
  {
    id: 'scope-2',
    category: 'Scope & Event Loop',
    title: 'Var vs Let in Asynchronous Loops',
    question: 'What numbers will be logged by the setTimeout callbacks?',
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0);
}`,
    options: [
      '0, 1, 2, followed by 0, 1, 2',
      '3, 3, 3, followed by 0, 1, 2',
      '3, 3, 3, followed by 3, 3, 3',
      '0, 0, 0, followed by 0, 1, 2'
    ],
    correctIndex: 1,
    explanation: '`var i` is function/globally scoped, sharing a single variable binding across loop iterations. By the time `setTimeout` callbacks run, `i` has reached `3`. `let j` creates a fresh block-scoped binding for each iteration, preserving `0, 1, 2` in individual closure scope environments.',
    hint: 'How does block scoping (`let`) differ from function scoping (`var`) inside loop iterations?'
  },
  {
    id: 'coercion-1',
    category: 'JavaScript Engine & Types',
    title: 'Abstract vs Strict Equality & Coercion',
    question: 'What is the result of these 4 equality checks in JavaScript?',
    code: `console.log([] == false);
console.log([] == ![]);
console.log(null == undefined);
console.log(NaN === NaN);`,
    options: [
      'false, false, true, true',
      'true, true, true, false',
      'true, false, false, false',
      'false, true, true, false'
    ],
    correctIndex: 1,
    explanation: '1) `[] == false`: `[]` converts to `""` then `0`, `false` converts to `0` -> `true`.\n2) `[] == ![]`: `![]` evaluates to `false`, so `[] == false` -> `true`.\n3) `null == undefined`: Spec rule states `null` is loosely equal to `undefined` -> `true`.\n4) `NaN === NaN`: Spec rule states `NaN` is never equal to anything, including itself -> `false`.',
    hint: 'Remember: `![]` evaluates to a boolean first, and `NaN` is never equal to `NaN`!'
  }
];
