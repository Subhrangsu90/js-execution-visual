/**
 * ASTInspector.js — Abstract Syntax Tree (AST) & V8 Pseudo-Bytecode Inspector
 *
 * Visualizes Acorn AST nodes in a tree hierarchy and displays V8-style register
 * bytecode instructions. Synchronizes active AST nodes with step execution.
 */
import { icons } from '../utils/icons.js';

export class ASTInspector {
  /**
   * @param {object} options
   * @param {(loc: {start: number, end: number, line?: number}) => void} options.onHighlightNode
   */
  constructor(options = {}) {
    this.options = options;
    this.ast = null;
    this.activeTab = 'ast'; // 'ast' | 'bytecode'
    this.activeNode = null;
    this.container = null;
    this.isOpen = false;
    this._initUI();
  }

  _initUI() {
    this.container = document.createElement('div');
    this.container.id = 'ast-modal-backdrop';
    this.container.className = 'modal-backdrop glass-backdrop hidden';
    this.container.innerHTML = `
      <div class="modal-card ast-modal glass-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon text-accent">${icons.tree(20)}</span>
            <h3>AST & V8 Bytecode Inspector</h3>
          </div>
          <div class="ast-tab-pills">
            <button id="tab-ast" class="tab-pill active">${icons.tree(14)} AST Tree</button>
            <button id="tab-bytecode" class="tab-pill">${icons.cpu(14)} V8 Bytecode</button>
          </div>
          <button id="btn-close-ast" class="modal-close-btn" aria-label="Close AST Inspector">&times;</button>
        </div>

        <div class="modal-body ast-body">
          <div id="ast-view-panel" class="ast-panel-content">
            <div class="ast-toolbar">
              <span class="ast-info-label">Interactive Acorn AST Node Explorer (Click nodes to highlight in Editor)</span>
              <button id="btn-expand-all" class="btn btn-secondary btn-xs">Expand All</button>
            </div>
            <div id="ast-tree-container" class="ast-tree-view"></div>
          </div>

          <div id="bytecode-view-panel" class="bytecode-panel-content hidden">
            <div class="bytecode-toolbar">
              <span class="ast-info-label">V8 Ignition Pseudo-Bytecode Instructions</span>
            </div>
            <div id="bytecode-container" class="bytecode-view"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('#btn-close-ast').addEventListener('click', () => this.close());
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });

    const tabAst = this.container.querySelector('#tab-ast');
    const tabBytecode = this.container.querySelector('#tab-bytecode');
    const panelAst = this.container.querySelector('#ast-view-panel');
    const panelBytecode = this.container.querySelector('#bytecode-view-panel');

    tabAst.addEventListener('click', () => {
      this.activeTab = 'ast';
      tabAst.classList.add('active');
      tabBytecode.classList.remove('active');
      panelAst.classList.remove('hidden');
      panelBytecode.classList.add('hidden');
    });

    tabBytecode.addEventListener('click', () => {
      this.activeTab = 'bytecode';
      tabBytecode.classList.add('active');
      tabAst.classList.remove('active');
      panelBytecode.classList.remove('hidden');
      panelAst.classList.add('hidden');
      this.renderBytecode();
    });

    this.container.querySelector('#btn-expand-all').addEventListener('click', () => {
      const detailsEls = this.container.querySelectorAll('.ast-tree-view details');
      detailsEls.forEach(el => el.open = true);
    });
  }

  setAST(ast) {
    this.ast = ast;
    if (this.isOpen) {
      this.render();
    }
  }

  setActiveNode(node) {
    this.activeNode = node;
    if (this.isOpen && this.activeTab === 'ast') {
      this._highlightActiveNodeInTree();
    }
  }

  open(updateRoute = true) {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    if (updateRoute && window.location.hash !== '#ast') {
      history.pushState(null, '', '#ast');
    }
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) modeSelector.value = 'ast';
    this.render();
  }

  close(updateRoute = true) {
    this.isOpen = false;
    this.container.classList.add('hidden');
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) modeSelector.value = 'sandbox';
    if (updateRoute && window.location.hash === '#ast') {
      history.pushState(null, '', window.location.pathname);
    }
  }

  render() {
    const treeContainer = this.container.querySelector('#ast-tree-container');
    if (!this.ast) {
      treeContainer.innerHTML = `<div class="ast-empty">No AST available. Run code to parse AST.</div>`;
      return;
    }
    treeContainer.innerHTML = '';
    const rootEl = this._renderASTNode(this.ast, 'Program');
    treeContainer.appendChild(rootEl);
    this._highlightActiveNodeInTree();
    if (this.activeTab === 'bytecode') {
      this.renderBytecode();
    }
  }

  _renderASTNode(node, label = '') {
    if (!node || typeof node !== 'object') {
      const valSpan = document.createElement('span');
      valSpan.className = 'ast-literal-val';
      valSpan.textContent = JSON.stringify(node);
      return valSpan;
    }

    if (Array.isArray(node)) {
      const details = document.createElement('details');
      details.open = true;
      details.className = 'ast-array-node';
      const summary = document.createElement('summary');
      summary.innerHTML = `<span class="ast-key">${label}</span> <span class="ast-badge array-badge">[${node.length}]</span>`;
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'ast-node-body';
      node.forEach((item, idx) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'ast-node-row';
        const itemKey = document.createElement('span');
        itemKey.className = 'ast-index';
        itemKey.textContent = `[${idx}]`;
        itemRow.appendChild(itemKey);
        itemRow.appendChild(this._renderASTNode(item, `[${idx}]`));
        body.appendChild(itemRow);
      });
      details.appendChild(body);
      return details;
    }

    const type = node.type || label || 'Node';
    const details = document.createElement('details');
    details.open = true;
    details.className = 'ast-object-node';
    if (this.activeNode && (this.activeNode === node || (this.activeNode.start === node.start && this.activeNode.end === node.end))) {
      details.classList.add('active-ast-node');
    }

    const summary = document.createElement('summary');
    const lineInfo = node.loc ? `L${node.loc.start.line}:${node.loc.start.column}` : '';
    summary.innerHTML = `
      <span class="ast-type-badge">${type}</span>
      ${label && label !== type ? `<span class="ast-key">${label}</span>` : ''}
      ${lineInfo ? `<span class="ast-loc">${lineInfo}</span>` : ''}
    `;

    summary.addEventListener('click', (e) => {
      e.stopPropagation();
      if (node.loc && this.options.onHighlightNode) {
        this.options.onHighlightNode({
          start: node.start,
          end: node.end,
          line: node.loc.start.line
        });
      }
    });

    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'ast-node-body';

    Object.keys(node).forEach(key => {
      if (['loc', 'range', 'start', 'end'].includes(key)) return;
      const val = node[key];
      if (val === null || val === undefined) return;

      const row = document.createElement('div');
      row.className = 'ast-node-row';
      const keySpan = document.createElement('span');
      keySpan.className = 'ast-prop-name';
      keySpan.textContent = `${key}: `;
      row.appendChild(keySpan);

      if (typeof val === 'object') {
        row.appendChild(this._renderASTNode(val, key));
      } else {
        const valSpan = document.createElement('span');
        valSpan.className = typeof val === 'string' ? 'ast-str-val' : 'ast-num-val';
        valSpan.textContent = JSON.stringify(val);
        row.appendChild(valSpan);
      }
      body.appendChild(row);
    });

    details.appendChild(body);
    return details;
  }

  _highlightActiveNodeInTree() {
    const allNodes = this.container.querySelectorAll('.ast-object-node');
    allNodes.forEach(el => el.classList.remove('active-ast-node'));

    if (this.activeNode) {
      // Find element with matching location
      const lineStr = this.activeNode.loc ? `L${this.activeNode.loc.start.line}:` : '';
      allNodes.forEach(el => {
        const locSpan = el.querySelector('.ast-loc');
        if (locSpan && lineStr && locSpan.textContent.startsWith(lineStr)) {
          el.classList.add('active-ast-node');
          el.open = true;
        }
      });
    }
  }

  renderBytecode() {
    const bytecodeContainer = this.container.querySelector('#bytecode-container');
    if (!this.ast) {
      bytecodeContainer.innerHTML = `<div class="ast-empty">No code parsed. Run code first.</div>`;
      return;
    }

    const instructions = this._generatePseudoBytecode(this.ast);
    let html = `
      <div class="bytecode-header-info">
        <span>V8 Register Machine Bytecode (Ignition Engine Format)</span>
        <span class="bytecode-count">${instructions.length} instructions</span>
      </div>
      <table class="bytecode-table">
        <thead>
          <tr>
            <th>Offset</th>
            <th>Instruction Opcode</th>
            <th>Operands</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
    `;

    instructions.forEach((ins, idx) => {
      html += `
        <tr class="bytecode-row">
          <td class="bc-offset">0x${(idx * 4).toString(16).padStart(4, '0')}</td>
          <td class="bc-opcode"><strong>${ins.opcode}</strong></td>
          <td class="bc-operands"><code>${ins.operands}</code></td>
          <td class="bc-comment">${ins.comment}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    bytecodeContainer.innerHTML = html;
  }

  _generatePseudoBytecode(ast) {
    const instrs = [];
    instrs.push({ opcode: 'LdaConstant', operands: '[0] (Global Context)', comment: 'Load global environment' });
    instrs.push({ opcode: 'Star', operands: 'r0', comment: 'Store context in register r0' });

    if (ast && ast.body) {
      ast.body.forEach((stmt) => {
        if (stmt.type === 'VariableDeclaration') {
          stmt.declarations.forEach(decl => {
            const name = decl.id.name || 'var';
            const initVal = decl.init ? (decl.init.value !== undefined ? decl.init.value : 'Expr') : 'undefined';
            instrs.push({ opcode: 'LdaSmi', operands: `[${initVal}]`, comment: `Load constant value ${initVal}` });
            instrs.push({ opcode: 'Star', operands: `r${name}`, comment: `Bind register r${name} (${stmt.kind} ${name})` });
          });
        } else if (stmt.type === 'FunctionDeclaration') {
          const fnName = stmt.id ? stmt.id.name : 'anonymous';
          instrs.push({ opcode: 'CreateClosure', operands: `[${fnName}]`, comment: `Allocate function closure object for ${fnName}` });
          instrs.push({ opcode: 'Star', operands: `r_${fnName}`, comment: `Store closure pointer` });
        } else if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
          const callee = stmt.expression.callee;
          const calleeName = callee.object ? `${callee.object.name}.${callee.property.name}` : callee.name;
          instrs.push({ opcode: 'LdaGlobal', operands: `[${calleeName || 'func'}]`, comment: `Resolve function call target` });
          instrs.push({ opcode: 'CallProperty', operands: `r0, [${stmt.expression.arguments.length} args]`, comment: `Execute function frame` });
        }
      });
    }

    instrs.push({ opcode: 'LdaUndefined', operands: '', comment: 'Load return accumulator' });
    instrs.push({ opcode: 'Return', operands: '', comment: 'Return to caller frame' });
    return instrs;
  }
}
