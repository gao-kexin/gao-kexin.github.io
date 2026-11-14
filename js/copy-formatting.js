(() => {
  'use strict';
  const readingMode = document.documentElement.dataset.readingMode === 'true';
  const storageKey = 'gao-kexin.copy-formatting.v1';
  let formats = {};
  try { formats = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) {}
  // Headings follow their semantic role. Retire the old cumulative +/- size migrations.
  const hierarchyKey = 'gao-kexin.semantic-heading-scale.v1';
  let normalizedHeadings = new Set();
  try { normalizedHeadings = new Set(JSON.parse(localStorage.getItem(hierarchyKey) || '[]')); } catch (_) {}
  function normalizeSize(element) {
    const key = element.dataset.copyFormat;
    const article = element.hasAttribute('data-copy-article');
    if (!key || key.startsWith('bio:') || normalizedHeadings.has(key) ||
        !element.matches('h2, h3') && !article) return;
    const format = formats[key];
    // The article parser identifies legacy headings before their old size is removed.
    if (article && format && !Array.isArray(format.headings)) return;
    try {
      if (format?.marks?.length) {
        const ranges = article ? format.headings : [{ start: 0, end: format.text.length }];
        const before = JSON.stringify(format);
        format.marks = format.marks.flatMap(mark => {
          if (!validSize(mark.size)) return [mark];
          const boundaries = new Set([mark.start, mark.end]);
          ranges.forEach(range => {
            if (range.start > mark.start && range.start < mark.end) boundaries.add(range.start);
            if (range.end > mark.start && range.end < mark.end) boundaries.add(range.end);
          });
          const points = [...boundaries].sort((a, b) => a - b);
          return points.slice(0, -1).map((start, index) => {
            const end = points[index + 1];
            const heading = ranges.some(range => range.start < end && range.end > start);
            return { ...mark, start, end, size: heading ? null : mark.size };
          }).filter(mark => typeof mark.bold === 'boolean' || validSize(mark.size));
        });
        if (before !== JSON.stringify(format)) {
          const backupKey = 'gao-kexin.before-semantic-heading-scale.v1';
          const backup = JSON.parse(localStorage.getItem(backupKey) || '{}');
          if (!Object.hasOwn(backup, key)) backup[key] = JSON.parse(before);
          localStorage.setItem(backupKey, JSON.stringify(backup));
          persist();
        }
      }
      normalizedHeadings.add(key);
      localStorage.setItem(hierarchyKey, JSON.stringify([...normalizedHeadings]));
    } catch (_) {}
  }
  const bodyScaleKey = 'gao-kexin.detail-body-defaults.v1';
  let normalizedBodies = new Set();
  try { normalizedBodies = new Set(JSON.parse(localStorage.getItem(bodyScaleKey) || '[]')); } catch (_) {}
  function normalizeBodySize(element) {
    const key = element.dataset.copyFormat;
    if (!key || normalizedBodies.has(key) ||
        !element.matches('.project-detail p[data-project-text], .section-detail p[data-copy-key], .section-detail [data-copy-article]')) return;
    const format = formats[key];
    try {
      // Old body-sized spans should follow the new body token, including later responsive changes.
      if (format?.marks?.some(mark => mark.size === 18)) {
        const backupKey = 'gao-kexin.before-detail-body-defaults.v1';
        const backup = JSON.parse(localStorage.getItem(backupKey) || '{}');
        if (!Object.hasOwn(backup, key)) backup[key] = JSON.parse(JSON.stringify(format));
        localStorage.setItem(backupKey, JSON.stringify(backup));
        format.marks = format.marks.map(mark => mark.size === 18 ? { ...mark, size: null } : mark)
          .filter(mark => typeof mark.bold === 'boolean' || validSize(mark.size));
        persist();
      }
      normalizedBodies.add(key);
      localStorage.setItem(bodyScaleKey, JSON.stringify([...normalizedBodies]));
    } catch (_) {}
  }
  const enabled = new WeakSet();
  const fields = new Set();
  const toolbar = document.createElement('div');
  toolbar.className = 'copy-format-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Text formatting');
  toolbar.hidden = true;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-bold-button';
  button.setAttribute('aria-label', 'Bold');
  button.setAttribute('aria-pressed', 'false');
  button.title = '加粗 / 取消加粗 (Ctrl+B · ⌘B)';
  const symbol = document.createElement('b');
  symbol.textContent = 'B';
  const label = document.createElement('span');
  label.textContent = 'Bold';
  button.append(symbol, label);
  const sizeSelect = document.createElement('select');
  sizeSelect.className = 'copy-size-select';
  sizeSelect.setAttribute('aria-label', 'Font size');
  sizeSelect.title = '字号（px）';
  const defaultOption = new Option('Default', 'default');
  const mixedOption = new Option('Mixed sizes', 'mixed');
  mixedOption.disabled = true;
  mixedOption.hidden = true;
  sizeSelect.append(defaultOption, mixedOption);
  const sizes = [12, 14, 16, 18, 20, 22, 24, 25, 28, 32, 36, 40, 48];
  sizes.forEach(size => sizeSelect.append(new Option(size + ' px', String(size))));
  const currentOption = new Option('', 'current');
  currentOption.hidden = true;
  sizeSelect.append(currentOption);
  function stepButton(text, name, delta) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'copy-size-step';
    control.textContent = text;
    control.setAttribute('aria-label', name);
    control.title = name;
    control.addEventListener('pointerdown', event => event.preventDefault());
    control.addEventListener('click', () => {
      if (selected) applySize(Math.max(8, Math.min(72, selected.size + delta)));
    });
    return control;
  }
  toolbar.append(button, sizeSelect, stepButton('A−', 'Decrease font size', -2), stepButton('A+', 'Increase font size', 2));
  document.body.append(toolbar);
  let selected = null, frame = 0, composing = false, holding = false;

  function fieldOf(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return element?.closest('[data-copy-format]') || null;
  }
  function explicitWeight(node, root) {
    for (let parent = node.parentElement; parent && parent !== root; parent = parent.parentElement) {
      const weight = parent.style.fontWeight;
      if (weight) return weight === 'bold' || Number(weight) >= 600 ? true : false;
      if (parent.matches('b, strong')) return true;
    }
    return null;
  }
  function explicitSize(node, root) {
    for (let parent = node.parentElement; parent && parent !== root; parent = parent.parentElement) {
      if (parent.dataset.copySize === 'default') return 'default';
      if (parent.dataset.copySize && Number.isFinite(Number(parent.dataset.copySize))) return Number(parent.dataset.copySize);
      const scaledSize = parent.style.fontSize.match(/^calc\(([\d.]+)px\s*\//);
      if (scaledSize) return Number(scaledSize[1]);
      if (/^\d+(\.\d+)?px$/.test(parent.style.fontSize)) return Number.parseFloat(parent.style.fontSize);
    }
    return null;
  }
  function validSize(size) { return size === 'default' || typeof size === 'number' && Number.isFinite(size) && size >= 8 && size <= 72; }
  function displayScale(element) {
    if (element.dataset.copyFormat?.startsWith('bio:')) return 1;
    const surface = element.closest('.editorial-surface');
    return surface ? Number.parseFloat(getComputedStyle(surface).zoom) || 1 : 1;
  }
  function refreshBase(element) {
    if (!element.isConnected) return;
    const style = getComputedStyle(element), size = Number.parseFloat(style.fontSize);
    element.style.setProperty('--copy-base-size', style.fontSize);
    element.style.setProperty('--copy-base-leading', String(Number.parseFloat(style.lineHeight) / size || 1.5));
    element.style.setProperty('--copy-display-scale', String(displayScale(element)));
  }
  function styleSize(element, size) {
    element.dataset.copySize = String(size);
    element.style.fontSize = size === 'default' ? 'var(--copy-base-size)' : 'calc(' + size + 'px / var(--copy-display-scale, 1))';
    element.style.lineHeight = 'var(--copy-base-leading, 1.5)';
    element.style.whiteSpace = 'pre-wrap';
  }
  function capture(element) {
    const text = element.innerText.replace(/\r\n/g, '\n');
    const marks = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node, cursor = 0;
    while ((node = walker.nextNode())) {
      if (!node.data) continue;
      const start = text.indexOf(node.data, cursor);
      if (start < 0) continue;
      const end = start + node.data.length;
      cursor = end;
      const bold = explicitWeight(node, element);
      const size = explicitSize(node, element);
      if (bold === null && size === null) continue;
      const last = marks.at(-1);
      if (last && last.end === start && last.bold === bold && last.size === size) last.end = end;
      else marks.push({ start, end, bold, size });
    }
    const headings = [];
    if (element.hasAttribute('data-copy-article')) {
      let position = 0;
      element.querySelectorAll('h3').forEach(heading => {
        const value = heading.innerText;
        const start = text.indexOf(value, position);
        if (start >= 0 && value.trim()) { headings.push({ start, end: start + value.length }); position = start + value.length; }
      });
    }
    const format = { text, marks, ...(element.hasAttribute('data-copy-article') ? { headings } : {}),
      ...(element.hasAttribute('data-copy-rich') ? { html: element.innerHTML } : {}) };
    formats[element.dataset.copyFormat] = format;
    return format;
  }
  function persist() { localStorage.setItem(storageKey, JSON.stringify(formats)); }
  function restore(element) {
    normalizeSize(element);
    normalizeBodySize(element);
    const format = formats[element.dataset.copyFormat];
    if (!format || format.text !== element.textContent || !Array.isArray(format.marks)) return;
    const marks = format.marks.filter(mark => Number.isInteger(mark.start) && Number.isInteger(mark.end) &&
      mark.start >= 0 && mark.end > mark.start && mark.end <= format.text.length &&
      (typeof mark.bold === 'boolean' || validSize(mark.size)));
    if (!marks.length) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node, offset = 0;
    while ((node = walker.nextNode())) {
      nodes.push({ node, start: offset, end: offset + node.data.length });
      offset += node.data.length;
    }
    for (const item of nodes) {
      const overlaps = marks.filter(mark => mark.start < item.end && mark.end > item.start);
      if (!overlaps.length) continue;
      const fragment = document.createDocumentFragment();
      let position = item.start;
      for (const mark of overlaps) {
        const start = Math.max(mark.start, item.start, position), end = Math.min(mark.end, item.end);
        if (start >= end) continue;
        fragment.append(item.node.data.slice(position - item.start, start - item.start));
        const span = document.createElement(mark.bold === true ? 'strong' : 'span');
        if (mark.bold === false) span.style.fontWeight = '400';
        if (validSize(mark.size)) styleSize(span, mark.size);
        span.textContent = item.node.data.slice(start - item.start, end - item.start);
        fragment.append(span);
        position = end;
      }
      fragment.append(item.node.data.slice(position - item.start));
      item.node.replaceWith(fragment);
    }
  }
  function enable(element, key) {
    element.dataset.copyFormat = key;
    if (!element.hasAttribute('data-copy-article')) normalizeSize(element);
    element.contentEditable = readingMode ? 'false' : 'true';
    fields.add(element);
    requestAnimationFrame(() => refreshBase(element));
    if (readingMode) return;
    if (enabled.has(element)) return;
    enabled.add(element);
    element.addEventListener('paste', event => {
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    });
    element.addEventListener('drop', event => event.preventDefault());
    element.addEventListener('compositionstart', () => { composing = true; toolbar.hidden = true; });
    element.addEventListener('compositionend', () => { composing = false; schedule(); });
  }
  function update() {
    frame = 0;
    if (readingMode) { toolbar.hidden = true; selected = null; return; }
    if (composing) return;
    if ((holding || toolbar.contains(document.activeElement)) && selected) return;
    const selection = getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) { toolbar.hidden = true; selected = null; return; }
    const range = selection.getRangeAt(0);
    const field = fieldOf(range.startContainer);
    if (!field || field !== fieldOf(range.endContainer) || field.closest('[hidden], [inert]')) {
      toolbar.hidden = true; selected = null; return;
    }
    const rect = range.getBoundingClientRect();
    if (!rect.width || rect.bottom < 0 || rect.top > innerHeight) { toolbar.hidden = true; return; }
    refreshBase(field);
    const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
    const selectedSizes = new Set(), explicit = new Set();
    let node;
    while ((node = walker.nextNode())) {
      if (!node.data || !range.intersectsNode(node)) continue;
      if (node === range.startContainer && range.startOffset === node.data.length || node === range.endContainer && range.endOffset === 0) continue;
      selectedSizes.add(Math.round(Number.parseFloat(getComputedStyle(node.parentElement).fontSize) * displayScale(field) * 100) / 100);
      explicit.add(explicitSize(node, field) ?? 'default');
    }
    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const baseElement = field.hasAttribute('data-copy-article') ? startElement.closest('h3, p') || field : field;
    const baseSize = Math.round(Number.parseFloat(getComputedStyle(baseElement).fontSize) * displayScale(field) * 100) / 100;
    const size = selectedSizes.values().next().value || baseSize;
    defaultOption.textContent = 'Default · ' + baseSize + ' px';
    currentOption.hidden = true;
    if (explicit.size === 1 && explicit.has('default')) sizeSelect.value = 'default';
    else if (selectedSizes.size > 1) sizeSelect.value = 'mixed';
    else if (sizes.includes(size)) sizeSelect.value = String(size);
    else { currentOption.textContent = size + ' px'; currentOption.value = String(size); currentOption.hidden = false; sizeSelect.value = String(size); }
    selected = { field, range: range.cloneRange(), size };
    button.setAttribute('aria-pressed', String(document.queryCommandState('bold')));
    toolbar.hidden = false;
    const width = toolbar.offsetWidth, height = toolbar.offsetHeight;
    toolbar.style.left = Math.max(8, Math.min(innerWidth - width - 8, rect.left + (rect.width - width) / 2)) + 'px';
    toolbar.style.top = Math.max(8, Math.min(innerHeight - height - 8, rect.top > height + 16 ? rect.top - height - 8 : rect.bottom + 8)) + 'px';
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function selectOffsets(field, start, end) {
    const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node, offset = 0, started = false;
    while ((node = walker.nextNode())) {
      const next = offset + node.data.length;
      if (!started && start <= next) { range.setStart(node, Math.max(0, start - offset)); started = true; }
      if (started && end <= next) { range.setEnd(node, Math.max(0, end - offset)); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); return; }
      offset = next;
    }
  }
  function applySize(size) {
    if (!selected || !selected.field.isConnected || !validSize(size)) return;
    const { field, range } = selected;
    refreshBase(field);
    const beforeText = field.innerText;
    const prefix = document.createRange();
    prefix.selectNodeContents(field);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length, end = start + range.toString().length;
    if (start === end) return;
    const sourceWalker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT), sourceStyles = [];
    let source;
    while ((source = sourceWalker.nextNode())) {
      if (!source.data || !range.intersectsNode(source)) continue;
      if (source === range.startContainer && range.startOffset === source.data.length || source === range.endContainer && range.endOffset === 0) continue;
      sourceStyles.push({ bold: explicitWeight(source, field), italic: getComputedStyle(source.parentElement).fontStyle });
    }
    const fragment = range.cloneContents();
    // Replace sizing inside the selected fragment while preserving its links and emphasis.
    fragment.querySelectorAll('[style], [data-copy-size]').forEach(element => {
      element.style.removeProperty('font-size');
      element.style.removeProperty('line-height');
      element.removeAttribute('data-copy-size');
    });
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT), nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (const [index, text] of nodes.entries()) {
      const span = document.createElement('span');
      styleSize(span, size);
      const original = sourceStyles[index];
      if (original?.bold !== null && original?.bold !== undefined) span.style.fontWeight = original.bold ? '700' : '400';
      if (original) span.style.fontStyle = original.italic;
      text.replaceWith(span);
      span.append(text);
    }
    const container = document.createElement('div');
    container.append(fragment);
    holding = false;
    field.focus({ preventScroll: true });
    const selection = getSelection();
    selection.removeAllRanges(); selection.addRange(range);
    let inputFired = false;
    const onInput = () => { inputFired = true; };
    field.addEventListener('input', onInput, { once: true });
    // A native edit keeps Ctrl+Z / Ctrl+Y working for the whole size change.
    const changed = document.execCommand('insertHTML', false, container.innerHTML);
    field.removeEventListener('input', onInput);
    // Chromium can append a caret placeholder after resizing a paragraph with a noneditable link.
    const extraBreak = changed && field.lastChild?.nodeName === 'BR' && field.innerText === beforeText + '\n';
    if (extraBreak) field.lastChild.remove();
    if (changed && (!inputFired || extraBreak)) field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatFontSize' }));
    selectOffsets(field, start, end);
    if (selection.rangeCount) selected = { field, range: selection.getRangeAt(0).cloneRange(), size: size === 'default' ? Number.parseFloat(getComputedStyle(field).fontSize) : size };
    schedule();
  }
  function toggle() {
    if (!selected || !selected.field.isConnected) return;
    const { field, range } = selected;
    field.focus({ preventScroll: true });
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    let inputFired = false;
    const onInput = () => { inputFired = true; };
    field.addEventListener('input', onInput, { once: true });
    const changed = document.execCommand('bold');
    field.removeEventListener('input', onInput);
    if (changed && !inputFired) field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatBold' }));
    if (selection.rangeCount) selected = { ...selected, field, range: selection.getRangeAt(0).cloneRange() };
    schedule();
  }
  // Keep the text selection alive when the floating button is pressed.
  button.addEventListener('pointerdown', event => event.preventDefault());
  button.addEventListener('click', toggle);
  sizeSelect.addEventListener('pointerdown', () => { holding = true; });
  sizeSelect.addEventListener('change', () => applySize(sizeSelect.value === 'default' ? 'default' : Number(sizeSelect.value)));
  sizeSelect.addEventListener('blur', () => { holding = false; schedule(); });
  document.addEventListener('pointerdown', event => { if (!toolbar.contains(event.target)) holding = false; }, true);
  document.addEventListener('selectionchange', schedule);
  document.addEventListener('pointerup', schedule);
  document.addEventListener('input', schedule);
  document.addEventListener('scroll', schedule, true);
  // Refresh after the sheet has applied its zoom, not before its resize frame.
  document.addEventListener('editorial:layout', () => { fields.forEach(refreshBase); schedule(); });
  window.addEventListener('resize', schedule);
  document.addEventListener('keydown', event => {
    if (readingMode) return;
    if (event.isComposing) return;
    if (event.key === 'Escape') { toolbar.hidden = true; return; }
    const field = fieldOf(event.target);
    if (!field || !(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'b') return;
    event.preventDefault();
    const selection = getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (fieldOf(range.startContainer) !== field || fieldOf(range.endContainer) !== field) return;
    selected = { field, range: range.cloneRange() };
    toggle();
  });
  window.copyFormatting = { enable, capture, restore, persist, normalizeSize, get: element => formats[element.dataset.copyFormat], ownsControl: element => holding || !!element && toolbar.contains(element) };
})();
