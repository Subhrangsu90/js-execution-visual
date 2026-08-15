/**
 * EventLoopPanel — visualizes Web APIs, microtask queue,
 * and macrotask (callback) queue with clean SVG icons.
 */
import { icons } from '../utils/icons.js';

export class EventLoopPanel {
  constructor(webApisEl, microtaskEl, macrotaskEl) {
    this.webApisEl = webApisEl;
    this.microtaskEl = microtaskEl;
    this.macrotaskEl = macrotaskEl;
  }

  update(snapshot) {
    const el = snapshot.eventLoop || { webApis: [], microtaskQueue: [], macrotaskQueue: [] };
    this._renderSection(this.webApisEl, el.webApis, `${icons.timer(13)} Web APIs`, this._renderWebApiItem);
    this._renderSection(this.microtaskEl, el.microtaskQueue, `${icons.microtask(13)} Microtask Queue`, this._renderMicrotaskItem);
    this._renderSection(this.macrotaskEl, el.macrotaskQueue, `${icons.queue(13)} Callback Queue`, this._renderMacrotaskItem);
  }

  _renderSection(container, items, labelHtml, renderFn) {
    container.innerHTML = `<div class="el-section-label">${labelHtml}</div>`;
    if (!items || items.length === 0) {
      container.innerHTML += '<div class="el-empty">Empty</div>';
      return;
    }
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'el-items';
    for (let i = 0; i < items.length; i++) {
      const el = renderFn.call(this, items[i], i);
      itemsContainer.appendChild(el);
    }
    container.appendChild(itemsContainer);
  }

  _renderWebApiItem(item, index) {
    const el = document.createElement('div');
    el.className = 'el-item el-item-timer';
    el.style.animationDelay = `${index * 50}ms`;
    el.innerHTML = `
      <span class="btn-icon">${icons.timer(13)}</span>
      <span>${this._esc(item.label)}</span>
    `;
    return el;
  }

  _renderMicrotaskItem(item, index) {
    const el = document.createElement('div');
    el.className = 'el-item el-item-promise';
    el.style.animationDelay = `${index * 50}ms`;
    el.innerHTML = `
      <span class="btn-icon">${icons.microtask(13)}</span>
      <span>${this._esc(item.label)}</span>
    `;
    return el;
  }

  _renderMacrotaskItem(item, index) {
    const el = document.createElement('div');
    el.className = 'el-item el-item-callback';
    el.style.animationDelay = `${index * 50}ms`;
    el.innerHTML = `
      <span class="btn-icon">${icons.queue(13)}</span>
      <span>${this._esc(item.label)}</span>
    `;
    return el;
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }
}
