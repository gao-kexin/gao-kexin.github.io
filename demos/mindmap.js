import { editorCommand } from './editor-command.mjs';
import { addNode, deleteNode, moveNode, reorderNode, visibleNodes, layoutTree, descendants, NODE_STYLE } from './vendor/mindmap/core.mjs';
import { treeConnector } from './vendor/mindmap/tree-connectors.mjs';
import { resolveNodeDrop } from './vendor/mindmap/node-drag.mjs';

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), world = $('world'), nodeLayer = $('nodes'), edges = $('edges');
  const copy = value => structuredClone(value);
  const messages = {
    en: {
      untitled: 'Untitled map', root: 'Start with an idea', question: 'Ask a good question', try: 'Try something', learn: 'Make it better',
      child: 'Child', sibling: 'Sibling', outline: 'Outline', showOutline: 'Show outline', hideOutline: 'Hide outline',
      undo: 'Undo', redo: 'Redo', edit: 'Edit node', remove: 'Delete branch', fit: 'Fit map', zoomIn: 'Zoom in', zoomOut: 'Zoom out', more: 'More node actions',
      dark: 'Dark mode', light: 'Light mode', font: 'Switch font', nodeText: 'Node text', empty: 'Untitled idea',
      selected: text => `Selected: ${text}`, added: 'New node. Type your idea.',
      removed: 'Branch deleted.', restored: 'Change undone.', redone: 'Change redone.',
      full: 'This map has reached its node or depth limit.', rootStays: 'The central idea stays. You can edit its text.', collapse: 'Collapse', expand: 'Expand',
      canvas: 'Interactive mind map', tree: 'Mind map nodes', actions: 'Selected node actions', language: 'Switch to Chinese',
    },
    zh: {
      untitled: '未命名导图', root: '从一个想法开始', question: '先问一个好问题', try: '动手试试看', learn: '让它更好一点',
      child: '子节点', sibling: '同级', outline: '大纲', showOutline: '打开大纲', hideOutline: '关闭大纲',
      undo: '撤销', redo: '重做', edit: '编辑节点', remove: '删除分支', fit: '适应画布', zoomIn: '放大', zoomOut: '缩小', more: '更多节点操作',
      dark: '深色模式', light: '浅色模式', font: '切换字体', nodeText: '节点文字', empty: '未命名想法',
      selected: text => `已选择：${text}`, added: '新节点，写下你的想法。',
      removed: '已删除分支。', restored: '已撤销。', redone: '已重做。',
      full: '导图已达到节点或层级上限。', rootStays: '中心想法会保留，可以修改它的文字。', collapse: '折叠', expand: '展开',
      canvas: '可交互的思维导图', tree: '导图节点', actions: '选中节点操作', language: 'Switch to English',
    },
  };
  const storageKey = 'gao-kexin.portfolio.mindmap-demo.session.v1';
  const maxStoredSize = 2000000;
  function validSnapshot(value) {
    if (!value || !value.nodes || Array.isArray(value.nodes) || typeof value.nodes !== 'object') return null;
    const entries = Object.entries(value.nodes);
    if (!entries.length || entries.length > 2000 || !Object.hasOwn(value.nodes, 'root')) return null;
    const clean = Object.create(null);
    for (const [id, node] of entries) {
      if (!/^[a-z][a-z0-9-]{0,79}$/.test(id) || ['constructor', 'prototype'].includes(id) || !node || node.id !== id || typeof node.text !== 'string' || node.text.length > 8000 || !Array.isArray(node.children) || node.children.length > 2000 || node.children.some(child => typeof child !== 'string' || !Object.hasOwn(value.nodes, child))) return null;
      clean[id] = { id, text: node.text, children: [...node.children], collapsed: node.collapsed === true };
      if (['root', 'question', 'try', 'learn'].includes(node.seedKey)) clean[id].seedKey = node.seedKey;
    }
    const seen = new Set(), pending = [['root', 0]];
    while (pending.length) {
      const [id, depth] = pending.pop();
      if (seen.has(id) || depth > 128) return null;
      seen.add(id); pending.push(...clean[id].children.map(child => [child, depth + 1]));
    }
    if (seen.size !== entries.length) return null;
    return { nodes: clean, selected: Object.hasOwn(clean, value.selected) ? value.selected : 'root' };
  }
  function readSession() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw || raw.length > maxStoredSize) return null;
      const value = JSON.parse(raw), current = validSnapshot(value);
      if (value.version !== 1 || !current) return null;
      const history = list => Array.isArray(list) ? list.slice(-100).map(validSnapshot).filter(Boolean) : [];
      const view = value.view && ['x', 'y', 'scale'].every(key => Number.isFinite(value.view[key])) && Math.abs(value.view.x) < 1000000 && Math.abs(value.view.y) < 1000000 && value.view.scale >= .05 && value.view.scale <= 2.5 ? value.view : null;
      return { ...current, past: history(value.past), future: history(value.future), view,
        language: value.language === 'zh' ? 'zh' : 'en', theme: value.theme === 'dark' ? 'dark' : 'light', font: value.font === 'sans' ? 'sans' : 'serif',
        outline: value.outline === true, serial: Number.isSafeInteger(value.serial) && value.serial > 0 && value.serial < 1000000000 ? value.serial : 4,
        canvasSize: value.canvasSize && ['width', 'height'].every(key => Number.isFinite(value.canvasSize[key]) && value.canvasSize[key] > 0) ? value.canvasSize : null };
    } catch (_) { return null; }
  }
  const savedSession = readSession();
  let language = savedSession?.language || (new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en');
  const t = () => messages[language];
  let serial = savedSession?.serial || 4, selected = savedSession?.selected || 'try', editing = null, past = savedSession?.past || [], future = savedSession?.future || [], boxes = new Map(), bounds = { width: 1, height: 1 };
  let view = { x: 0, y: 0, scale: 1 }, pan = null, drag = null, saveTimer, anchor = null, ignoreDragClick = false;
  const measureContext = document.createElement('canvas').getContext('2d');
  function seed() {
    return {
      root: { id: 'root', text: t().root, seedKey: 'root', children: ['question', 'try', 'learn'] },
      question: { id: 'question', text: t().question, seedKey: 'question', children: [] },
      try: { id: 'try', text: t().try, seedKey: 'try', children: [] },
      learn: { id: 'learn', text: t().learn, seedKey: 'learn', children: [] },
    };
  }
  let nodes = savedSession?.nodes || seed();
  function isSeedMap() {
    const original = Object.entries(seed());
    return Object.keys(nodes).length === original.length && original.every(([id, item]) => {
      const node = nodes[id];
      return node && !node.collapsed && node.text === item.text && node.children.length === item.children.length &&
        node.children.every((child, index) => child === item.children[index]);
    });
  }
  const canRestoreView = !!savedSession?.view && !isSeedMap();
  let needsInitialFit = !canRestoreView;
  let canvasSize = canRestoreView ? savedSession.canvasSize : null;
  if (canRestoreView) view = savedSession.view;
  const documentName = () => nodes.root.text.replace(/\s+/g, ' ').trim().slice(0, 200) || t().untitled;
  const documentModel = () => ({ format: 'inkmap', version: 1, id: 'portfolio-demo', title: documentName(), rootId: 'root', nodes });
  if (savedSession) {
    document.documentElement.dataset.theme = savedSession.theme;
    document.documentElement.dataset.font = savedSession.font;
    $('outline').hidden = !savedSession.outline;
    $('outline-toggle').setAttribute('aria-expanded', String(savedSession.outline));
    $('theme-toggle').querySelector('use').setAttribute('href', savedSession.theme === 'dark' ? '#i-sun' : '#i-moon');
  }
  function persistSession() {
    clearTimeout(saveTimer); saveTimer = null;
    try {
      const pendingEdit = editing && !editing.fresh && nodes[editing.id]?.text !== editing.original;
      const value = { version: 1, nodes, selected, serial, past: (pendingEdit ? [...past, editing.before] : past).slice(-100), future: pendingEdit ? [] : future,
        view: isSeedMap() ? null : view, language, theme: document.documentElement.dataset.theme, font: document.documentElement.dataset.font,
        outline: !$('outline').hidden, canvasSize };
      let text = JSON.stringify(value);
      while (text.length > maxStoredSize && (value.past.length || value.future.length)) {
        if (value.past.length) value.past.shift();
        if (value.future.length) value.future.shift();
        text = JSON.stringify(value);
      }
      if (text.length <= maxStoredSize) {
        try { sessionStorage.setItem(storageKey, text); }
        catch (_) { sessionStorage.setItem(storageKey, JSON.stringify({ ...value, past: [], future: [] })); }
      }
    } catch (_) { /* The editor remains usable when session storage is unavailable. */ }
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persistSession, 100); }
  window.addEventListener('pagehide', persistSession);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persistSession(); });
  const snapshot = () => ({ nodes: copy(nodes), selected });
  const announce = text => { $('announcement').textContent = text; };
  function remember(before = snapshot()) {
    past.push(before);
    if (past.length > 100) past.shift();
    future = [];
  }
  function parentOf(id) { return Object.values(nodes).find(node => node.children.includes(id)); }
  function traversal() { return visibleNodes(documentModel()); }
  function rememberAnchor() {
    const box = boxes.get(selected);
    if (box) anchor = { id: selected, x: box.x, y: box.y };
  }
  function layout() {
    measureContext.font = `${NODE_STYLE.fontSize}px ${getComputedStyle(canvas).fontFamily}`;
    const measure = text => text.split(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff00-\uffef])/u)
      .reduce((width, run) => width + measureContext.measureText(run).width, 0);
    const result = layoutTree(documentModel(), measure, editing ? { nodeId: editing.id, segment: 0 } : undefined);
    boxes = new Map(Object.entries(result.boxes));
    bounds = { width: result.width, height: result.height };
    if (anchor) {
      const box = boxes.get(anchor.id);
      if (box) { view.x += (anchor.x - box.x) * view.scale; view.y += (anchor.y - box.y) * view.scale; }
      anchor = null;
    }
    return traversal();
  }
  function connector(from, to, rootBranch) {
    return treeConnector({ x: from.x + from.width, y: from.y + from.height / 2 }, { x: to.x - 2, y: to.y + to.height / 2 }, rootBranch).path;
  }
  function render() {
    const ordered = layout(), keep = new Set(ordered.map(node => node.id));
    for (const element of [...nodeLayer.children]) if (!keep.has(element.dataset.id)) element.remove();
    for (const node of ordered) {
      const box = boxes.get(node.id);
      let element = nodeLayer.querySelector(`[data-id="${node.id}"]`);
      if (!element) {
        element = document.createElement('div'); element.className = 'mind-node node-enter'; element.dataset.id = node.id;
        element.setAttribute('role', 'treeitem'); nodeLayer.append(element);
        setTimeout(() => element.classList.remove('node-enter'), 180);
      }
      element.classList.toggle('selected', selected === node.id);
      element.classList.toggle('editing', editing?.id === node.id);
      element.setAttribute('aria-selected', String(selected === node.id));
      element.setAttribute('aria-level', String(box.depth + 1));
      element.setAttribute('aria-label', node.text || t().empty);
      if (node.children.length) element.setAttribute('aria-expanded', String(!node.collapsed)); else element.removeAttribute('aria-expanded');
      element.tabIndex = -1;
      Object.assign(element.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px` });
      if (editing?.id === node.id) {
        if (!element.querySelector('textarea')) {
          const textarea = document.createElement('textarea');
          textarea.className = 'node-editor'; textarea.maxLength = 8000; textarea.rows = 1;
          textarea.setAttribute('aria-label', t().nodeText); textarea.spellcheck = false; textarea.value = node.text;
          textarea.addEventListener('input', () => { rememberAnchor(); nodes[node.id].text = textarea.value; render(); revealSelection(); });
          textarea.addEventListener('blur', () => { if (editing?.id === node.id) finishEdit(false); });
          element.replaceChildren(textarea);
        }
      } else {
        let label = element.querySelector('.node-text');
        if (!label) { label = document.createElement('span'); label.className = 'node-text'; element.replaceChildren(label); }
        label.replaceChildren(...box.lines.map(line => { const row = document.createElement('span'); row.textContent = line || '\u00a0'; return row; }));
        if (node.children.length) {
          let toggle = element.querySelector('.node-fold');
          if (!toggle) { toggle = document.createElement('button'); toggle.className = 'node-fold'; toggle.type = 'button'; toggle.addEventListener('click', event => { event.stopPropagation(); toggleBranch(node.id); }); element.append(toggle); }
          toggle.textContent = node.collapsed ? String(descendants(documentModel(), node.id).length - 1) : '−';
          toggle.setAttribute('aria-label', `${node.collapsed ? t().expand : t().collapse} ${node.text || t().empty}`);
        } else element.querySelector('.node-fold')?.remove();
      }
    }
    renderEdges(ordered);
    $('connections').setAttribute('width', String(bounds.width + 40)); $('connections').setAttribute('height', String(bounds.height + 40));
    $('document-title').textContent = documentName(); $('document-title').title = documentName();
    $('undo').disabled = !past.length && !(editing && !editing.fresh && nodes[editing.id].text !== editing.original);
    $('redo').disabled = !future.length;
    updateNodeActions();
    renderOutline(ordered); applyView();
  }
  function renderEdges(ordered = traversal(), offset = { x: 0, y: 0 }, drop = null) {
    edges.replaceChildren();
    const moved = new Set(drag?.active ? descendants(drag.doc, drag.id) : []);
    const shifted = id => { const box = boxes.get(id); return moved.has(id) ? { ...box, x: box.x + offset.x, y: box.y + offset.y } : box; };
    ordered.forEach(node => (node.collapsed ? [] : node.children).forEach(child => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const destination = child === drag?.id && drop ? (drop.position === 'inside' ? drop.id : parentOf(drop.id)?.id) : null;
      path.setAttribute('d', connector(destination ? boxes.get(destination) : shifted(node.id), shifted(child), (destination || node.id) === 'root'));
      path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1'); path.setAttribute('marker-end', 'url(#arrow)');
      if (child === drag?.id && drag.active) path.setAttribute('stroke-dasharray', '4 4');
      edges.append(path);
    }));
  }
  function renderOutline(ordered = traversal()) {
    const list = $('outline-list'), keep = new Set(ordered.map(node => node.id));
    list.setAttribute('role', 'tree'); list.setAttribute('aria-label', t().outline);
    for (const row of [...list.children]) if (!keep.has(row.dataset.id)) row.remove();
    ordered.forEach((node, index) => {
      let row = list.querySelector(`[data-id="${node.id}"]`);
      if (!row) {
        row = document.createElement('div'); row.className = 'outline-row'; row.dataset.id = node.id;
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'outline-toggle';
        toggle.addEventListener('click', () => toggleBranch(node.id));
        const label = document.createElement('button'); label.type = 'button'; label.className = 'outline-label'; label.setAttribute('role', 'treeitem');
        label.addEventListener('click', () => { finishEdit(false); select(node.id, false); revealSelection(); });
        label.addEventListener('dblclick', () => beginEdit(node.id));
        row.append(toggle, label);
      }
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
      row.classList.toggle('selected', selected === node.id);
      row.style.paddingLeft = `${7 + Math.min(node.depth, 12) * 12}px`;
      const toggle = row.querySelector('.outline-toggle'), label = row.querySelector('.outline-label');
      toggle.disabled = !node.children.length; toggle.tabIndex = node.children.length ? 0 : -1;
      toggle.textContent = node.children.length ? (node.collapsed ? '›' : '⌄') : '·';
      toggle.setAttribute('aria-label', `${node.collapsed ? t().expand : t().collapse} ${node.text || t().empty}`);
      label.textContent = node.text || t().empty; label.title = label.textContent;
      label.setAttribute('aria-selected', String(selected === node.id)); label.setAttribute('aria-level', String(node.depth + 1));
      if (node.children.length) label.setAttribute('aria-expanded', String(!node.collapsed)); else label.removeAttribute('aria-expanded');
    });
  }
  function focusNode() { nodeLayer.querySelector(`[data-id="${selected}"]`)?.focus({ preventScroll: true }); }
  function select(id, focus = true) {
    if (!nodes[id]) return;
    if (editing && editing.id !== id) finishEdit(false);
    selected = id; closeNodeMenu();
    for (const element of nodeLayer.children) { const current = element.dataset.id === id; element.classList.toggle('selected', current); element.setAttribute('aria-selected', String(current)); }
    updateNodeActions(); renderOutline(); if (focus && !editing) focusNode(); scheduleSave();
  }
  function beginEdit(id = selected, fresh = false) {
    if (!nodes[id] || editing?.id === id) return;
    finishEdit(false); selected = id; rememberAnchor();
    editing = { id, original: nodes[id].text, before: snapshot(), fresh };
    render(); revealSelection();
    const editor = nodeLayer.querySelector(`[data-id="${id}"] textarea`);
    editor.focus({ preventScroll: true }); editor.select();
  }
  function finishEdit(focus = true, cancel = false) {
    if (!editing) return;
    rememberAnchor(); const edit = editing; editing = null;
    if (cancel) nodes[edit.id].text = edit.original;
    else if (nodes[edit.id].text !== edit.original) { if (!edit.fresh) remember(edit.before); delete nodes[edit.id].seedKey; }
    render(); if (focus) focusNode();
  }
  function acceptNodes(next) {
    for (const node of Object.values(next)) if (nodes[node.id]?.seedKey && nodes[node.id].text === node.text) node.seedKey = nodes[node.id].seedKey;
    nodes = next;
  }
  function add(kind) {
    finishEdit(false);
    try {
      const result = addNode(documentModel(), selected, kind);
      remember(); rememberAnchor(); acceptNodes(result.doc.nodes); selected = result.selectedId;
      render(); beginEdit(selected, true); announce(t().added);
    } catch (_) { announce(t().full); }
  }
  function remove() {
    if (selected === 'root') { announce(t().rootStays); return; }
    finishEdit(false);
    const result = deleteNode(documentModel(), selected);
    remember(); rememberAnchor(); acceptNodes(result.doc.nodes); selected = result.selectedId;
    render(); revealSelection(); focusNode(); announce(t().removed);
  }
  function toggleBranch(id = selected) {
    if (!nodes[id]?.children.length) return;
    finishEdit(false); remember(); rememberAnchor(); nodes[id].collapsed = !nodes[id].collapsed; selected = id;
    render(); revealSelection(); focusNode();
  }
  function reorder(direction) {
    const current = documentModel(), next = reorderNode(current, selected, direction);
    if (next === current) return;
    remember(); rememberAnchor(); acceptNodes(next.nodes); render(); revealSelection(); focusNode();
  }
  function undo(redo = false) {
    finishEdit(false);
    const from = redo ? future : past, to = redo ? past : future;
    if (!from.length) return;
    to.push(snapshot()); rememberAnchor(); const next = from.pop(); nodes = next.nodes; selected = next.selected;
    render(); revealSelection(); focusNode(); announce(redo ? t().redone : t().restored);
  }
  function applyView() {
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    $('zoom-value').textContent = `${Math.round(view.scale * 100)}%`;
    scheduleSave();
  }
  function fit() {
    const width = canvas.clientWidth, canvasHeight = canvas.clientHeight;
    if (!width || !canvasHeight) return;
    const height = Math.max(60, canvasHeight - 120);
    view.scale = Math.max(.05, Math.min(1, (width - 34) / bounds.width, (height - 30) / bounds.height));
    view.x = (width - bounds.width * view.scale) / 2;
    view.y = Math.max(12, (height - bounds.height * view.scale) / 2 + 8);
    applyView();
  }
  function revealSelection() {
    const box = boxes.get(selected), width = canvas.clientWidth, height = canvas.clientHeight;
    if (!box || !width || !height) return;
    const left = box.x * view.scale + view.x, top = box.y * view.scale + view.y;
    const right = left + box.width * view.scale, bottom = top + box.height * view.scale;
    if (left < 48) view.x += 48 - left; else if (right > width - 64) view.x -= right - width + 64;
    if (top < 50) view.y += 50 - top; else if (bottom > height - 120) view.y -= bottom - height + 120;
    applyView();
  }
  function syncCanvasView(opened = false) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const resized = canvasSize?.width !== width || canvasSize?.height !== height;
    canvasSize = { width, height };
    if (needsInitialFit || ((opened || resized) && isSeedMap())) {
      needsInitialFit = false;
      fit();
    } else if (resized) revealSelection();
  }
  function zoom(factor, point = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }) {
    if (drag?.active) return;
    const next = Math.max(.05, Math.min(2.5, view.scale * factor));
    view.x = point.x - (point.x - view.x) * next / view.scale;
    view.y = point.y - (point.y - view.y) * next / view.scale;
    view.scale = next; applyView();
  }
  function labelButton(id, label, title = label) { $(id).setAttribute('aria-label', label); $(id).title = title; }
  function updateNodeActions() {
    $('delete-node').disabled = selected === 'root';
    $('fold-node').disabled = !nodes[selected]?.children.length;
    const foldLabel = nodes[selected]?.collapsed ? t().expand : t().collapse;
    labelButton('fold-node', foldLabel, `${foldLabel} (Space)`);
  }
  function closeNodeMenu(restoreFocus = false) {
    $('node-menu').hidden = true; $('node-more').setAttribute('aria-expanded', 'false');
    if (restoreFocus) $('node-more').focus({ preventScroll: true });
  }
  function toggleNodeMenu() {
    if (!$('node-menu').hidden) { closeNodeMenu(true); return; }
    finishEdit(false); $('node-menu').hidden = false; $('node-more').setAttribute('aria-expanded', 'true');
    $('edit-node').focus({ preventScroll: true });
  }
  function setOutlineOpen(open) {
    finishEdit(false); closeNodeMenu(); $('outline').hidden = !open;
    $('outline-toggle').setAttribute('aria-expanded', String(open)); localize(); revealSelection();
  }
  function localize() {
    const labels = t(); document.documentElement.lang = language; document.title = language === 'zh' ? '体验 Mindmap' : 'Try Mindmap';
    $('outline-heading').textContent = labels.outline;
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = labels[element.dataset.i18n]; });
    for (const [id, key] of Object.entries({ undo: 'undo', redo: 'redo', 'edit-node': 'edit', 'delete-node': 'remove', 'node-more': 'more', 'outline-close': 'hideOutline', fit: 'fit', 'zoom-in': 'zoomIn', 'zoom-out': 'zoomOut', 'font-toggle': 'font' })) labelButton(id, labels[key]);
    labelButton('outline-toggle', $('outline').hidden ? labels.showOutline : labels.hideOutline);
    labelButton('theme-toggle', document.documentElement.dataset.theme === 'dark' ? labels.light : labels.dark);
    canvas.setAttribute('aria-label', labels.canvas); world.setAttribute('aria-label', labels.tree);
    document.querySelector('.selection-toolbar').setAttribute('aria-label', labels.actions);
    $('node-menu').setAttribute('aria-label', labels.more);
    $('outline').setAttribute('aria-label', labels.outline); render();
  }
  function changeLanguage(next) {
    if (!['en', 'zh'].includes(next) || next === language) return;
    finishEdit(false);
    const previous = t(); language = next;
    for (const node of Object.values(nodes)) if (node.seedKey && node.text === previous[node.seedKey]) node.text = t()[node.seedKey];
    rememberAnchor(); localize();
    if (isSeedMap()) fit(); else revealSelection();
  }
  function dropAt(event) {
    const rect = canvas.getBoundingClientRect();
    if (!drag || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return resolveNodeDrop(drag.doc, drag.boxes, drag.id, { x: (event.clientX - rect.left - drag.view.x) / drag.view.scale, y: (event.clientY - rect.top - drag.view.y) / drag.view.scale });
  }
  function cancelGestures() {
    const pointer = drag?.pointerId ?? pan?.pointerId; const wasDragging = !!drag?.active;
    drag = null; pan = null; canvas.classList.remove('panning', 'dragging');
    if (pointer !== undefined && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    for (const element of nodeLayer.children) element.classList.remove('drag-source', 'drop-inside', 'drop-before', 'drop-after');
    if (wasDragging) render(); persistSession();
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.target.closest('textarea, button, .selection-toolbar, .node-menu, .canvas-bottom')) return;
    const target = event.target.closest('.mind-node');
    if (target) {
      if (event.button !== 0) return;
      finishEdit(false); select(target.dataset.id); cancelGestures(); ignoreDragClick = false;
      drag = { id: target.dataset.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false, view: { ...view }, doc: copy(documentModel()), boxes: Object.fromEntries(boxes) };
      return;
    }
    if (event.button !== 0 && event.button !== 1) return;
    finishEdit(false); canvas.focus({ preventScroll: true });
    pan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, view: { ...view } };
    canvas.setPointerCapture(event.pointerId); canvas.classList.add('panning');
  });
  window.addEventListener('pointermove', event => {
    if (pan && event.pointerId === pan.pointerId) { view.x = pan.view.x + event.clientX - pan.x; view.y = pan.view.y + event.clientY - pan.y; applyView(); return; }
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
    event.preventDefault(); drag.active = true; canvas.classList.add('dragging');
    if (!canvas.hasPointerCapture(event.pointerId)) canvas.setPointerCapture(event.pointerId);
    const offset = { x: (event.clientX - drag.x) / drag.view.scale, y: (event.clientY - drag.y) / drag.view.scale }, moved = new Set(descendants(drag.doc, drag.id)), drop = dropAt(event);
    for (const element of nodeLayer.children) {
      const box = boxes.get(element.dataset.id), isMoved = moved.has(element.dataset.id);
      element.classList.toggle('drag-source', isMoved);
      for (const position of ['inside', 'before', 'after']) element.classList.toggle(`drop-${position}`, drop?.id === element.dataset.id && drop.position === position);
      element.style.left = `${box.x + (isMoved ? offset.x : 0)}px`; element.style.top = `${box.y + (isMoved ? offset.y : 0)}px`;
    }
    renderEdges(traversal(), offset, drop);
  });
  window.addEventListener('pointerup', event => {
    if (drag && drag.pointerId !== event.pointerId) return;
    if (drag?.active) {
      const current = drag, drop = dropAt(event); ignoreDragClick = true;
      if (current.id === 'root') { view.x = current.view.x + event.clientX - current.x; view.y = current.view.y + event.clientY - current.y; }
      else if (drop) {
        try { const next = moveNode(documentModel(), current.id, drop.id, drop.position); remember(); acceptNodes(next.nodes); selected = current.id; anchor = null; }
        catch (_) { announce(t().full); }
      }
    }
    cancelGestures();
  });
  window.addEventListener('pointercancel', cancelGestures);
  window.addEventListener('lostpointercapture', cancelGestures);
  window.addEventListener('blur', cancelGestures);
  window.addEventListener('resize', cancelGestures);
  canvas.addEventListener('click', event => { if (ignoreDragClick) { event.preventDefault(); event.stopPropagation(); ignoreDragClick = false; } }, true);
  canvas.addEventListener('dblclick', event => { if (event.target.closest('textarea, button')) return; const node = event.target.closest('.mind-node'); if (node) beginEdit(node.dataset.id); });
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); if (drag?.active) return;
    const rect = canvas.getBoundingClientRect();
    if (event.ctrlKey || event.metaKey) zoom(Math.exp(-event.deltaY * .00625), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    else { view.x -= event.shiftKey ? event.deltaY : event.deltaX; view.y -= event.shiftKey ? 0 : event.deltaY; applyView(); }
  }, { passive: false });
  window.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (!$('node-menu').hidden) {
      if (event.key === 'Escape') { event.preventDefault(); closeNodeMenu(true); return; }
      if (event.target.closest('#node-menu')) {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const items = [...$('node-menu').querySelectorAll('button:not(:disabled)')];
          const index = items.indexOf(document.activeElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus({ preventScroll: true });
        } else if (event.key === 'Tab') closeNodeMenu(true);
        return;
      }
    }
    if (drag) { if (event.key === 'Escape') { event.preventDefault(); ignoreDragClick = true; cancelGestures(); } if (drag?.active) return; }
    const modifier = event.ctrlKey || event.metaKey, key = event.key.toLowerCase();
    if (event.target.matches('textarea.node-editor')) {
      const action = editorCommand(event, event.target.value, selected === 'root');
      if (action === 'native') return;
      event.preventDefault();
      if (action === 'delete') remove();
      else if (action === 'child' || action === 'sibling') add(action);
      else if (action === 'finish') finishEdit();
      else if (action === 'cancel') finishEdit(true, true);
      return;
    }
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (event.target.closest('.appearance-controls')) return;
    if (event.target.closest('button:not(.outline-label)') && ['tab', 'enter', ' '].includes(key)) return;
    if (modifier && (key === 'z' || key === 'y')) { event.preventDefault(); undo(key === 'y' || event.shiftKey); return; }
    if (modifier && key === '0') { event.preventDefault(); fit(); return; }
    if (modifier && ['=', '+', '-'].includes(key)) { event.preventDefault(); zoom(key === '-' ? .85 : 1.18); return; }
    if (key === 'escape') { if (canvas.contains(event.target)) $('outline-toggle').focus(); return; }
    if (key === 'tab') { event.preventDefault(); add('child'); return; }
    if (key === 'enter') { event.preventDefault(); add('sibling'); return; }
    if (key === 'delete' || key === 'backspace') { event.preventDefault(); remove(); return; }
    if (key === 'f2') { event.preventDefault(); beginEdit(); return; }
    if (key === ' ') { event.preventDefault(); toggleBranch(); return; }
    if (key.startsWith('arrow')) {
      event.preventDefault(); let next;
      if (event.altKey && ['arrowup', 'arrowdown'].includes(key)) { reorder(key === 'arrowup' ? -1 : 1); return; }
      if (key === 'arrowleft') next = parentOf(selected)?.id;
      else if (key === 'arrowright') { if (nodes[selected].collapsed) { toggleBranch(); return; } next = nodes[selected].children[0]; }
      else {
        const peers = [...boxes.values()].filter(box => box.depth === boxes.get(selected)?.depth).sort((a, b) => a.y - b.y);
        next = peers[peers.findIndex(box => box.id === selected) + (key === 'arrowdown' ? 1 : -1)]?.id;
      }
      if (next) { select(next); revealSelection(); }
    }
  });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('#node-menu, #node-more')) closeNodeMenu(); }, true);
  document.querySelectorAll('.titlebar button, .toolbar button, .selection-toolbar button, .node-menu button, .panel-heading button, .zoom-controls button').forEach(button => button.addEventListener('pointerdown', event => event.preventDefault()));
  $('add-child').addEventListener('click', () => add('child')); $('add-sibling').addEventListener('click', () => add('sibling'));
  $('edit-node').addEventListener('click', () => { closeNodeMenu(); beginEdit(); }); $('delete-node').addEventListener('click', () => { closeNodeMenu(); remove(); });
  $('fold-node').addEventListener('click', () => toggleBranch()); $('node-more').addEventListener('click', toggleNodeMenu);
  $('undo').addEventListener('click', () => undo()); $('redo').addEventListener('click', () => undo(true));
  $('fit').addEventListener('click', fit); $('zoom-in').addEventListener('click', () => zoom(1.18)); $('zoom-out').addEventListener('click', () => zoom(.85)); $('zoom-value').addEventListener('click', () => zoom(1 / view.scale));
  $('outline-toggle').addEventListener('click', () => setOutlineOpen($('outline').hidden));
  $('outline-close').addEventListener('click', () => { setOutlineOpen(false); $('outline-toggle').focus({ preventScroll: true }); });
  $('theme-toggle').addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('theme-toggle').querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon'); localize(); });
  $('font-toggle').addEventListener('click', async () => {
    finishEdit(false);
    const sans = document.documentElement.dataset.font !== 'sans';
    document.documentElement.dataset.font = sans ? 'sans' : 'serif';
    await document.fonts.load(`14px "${sans ? 'NeverMind' : 'URW Classico'}"`);
    rememberAnchor(); render();
    if (isSeedMap()) fit(); else revealSelection();
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'mindmap-demo-language') changeLanguage(event.data.language);
    if (event.data?.type === 'mindmap-demo-open') syncCanvasView(true);
  });
  let resizeFrame;
  localize();
  syncCanvasView();
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => syncCanvasView());
  }).observe(canvas);
  document.fonts.ready.then(() => {
    rememberAnchor(); render();
    if (isSeedMap()) fit();
  });
})();
