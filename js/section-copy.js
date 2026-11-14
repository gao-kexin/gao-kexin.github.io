(() => {
  'use strict';
  // Editable copy for Mindset and Research. Drafts stay in this browser.
  const draftKey = 'gao-kexin.section-copy-drafts.v1';
  const languageKey = 'gao-kexin.projects.language.v1';
  const fields = [...document.querySelectorAll('[data-copy-key]')];
  const statuses = [...document.querySelectorAll('[data-section-copy-status]')];
  const emphasis = /\b(top-down|bottom-up)\b/gi;
  const richSources = new WeakMap(fields.filter(element => element.hasAttribute('data-copy-rich'))
    .map(element => [element, { text: element.textContent, html: element.innerHTML }]));
  let drafts = {};
  let language = 'en';
  try { drafts = JSON.parse(localStorage.getItem(draftKey) || '{}') || {}; } catch (_) {}
  try { language = localStorage.getItem(languageKey) === 'zh' ? 'zh' : 'en'; } catch (_) {}

  // Carry over heading drafts from the retired page-wide editor.
  try {
    const previous = JSON.parse(localStorage.getItem('gao-kexin.page-copy-drafts.v1') || '{}');
    for (const element of fields.filter(item => item.dataset.copyKey.startsWith('section.'))) {
      if (typeof drafts[element.dataset.copyKey] === 'string') continue;
      const prefix = 'text:#' + element.id + ':0:';
      const oldKey = Object.keys(previous).find(key => key.startsWith(prefix));
      if (oldKey && typeof previous[oldKey] === 'string') drafts[element.dataset.copyKey] = window.siteTitleCase(previous[oldKey]);
    }
  } catch (_) {}

  const messages = {
    en: { idle: 'Click the text to edit · drafts save in this browser', saved: 'Draft saved · in this browser', failed: 'Draft could not be saved. Please copy your text.' },
    zh: { idle: '点击文字即可修改 · 自动保存为当前浏览器草稿', saved: '草稿已保存 · 仅当前浏览器', failed: '无法保存草稿，请先复制文字。' },
  };
  function showStatus(kind) {
    statuses.forEach(element => { element.textContent = messages[language][kind]; });
  }

  // Preserve published article structure and safe inline formatting across edits.
  function restoreRich(element, html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const allowed = new Set(['P', 'DIV', 'H3', 'OL', 'UL', 'LI', 'EM', 'I', 'STRONG', 'B', 'SPAN', 'SUP', 'A', 'BR']);
    template.content.querySelectorAll('script, style, iframe, object, embed').forEach(node => node.remove());
    template.content.querySelectorAll('*').forEach(node => {
      if (!allowed.has(node.tagName)) { node.replaceWith(...node.childNodes); return; }
      const href = node.getAttribute('href');
      const id = node.id;
      // Chromium's native formatting edit may keep the CSS but omit data attributes.
      const cssSize = node.style.fontSize;
      const size = node.dataset.copySize || cssSize.match(/^calc\(([\d.]+)px\s*\//)?.[1] ||
        cssSize.match(/^([\d.]+)px$/)?.[1] || (cssSize === 'var(--copy-base-size)' ? 'default' : undefined);
      const weight = node.style.fontWeight;
      const italic = node.style.fontStyle;
      const referenceList = node.tagName === 'OL' && node.classList.contains('article-references');
      [...node.attributes].forEach(attribute => node.removeAttribute(attribute.name));
      if (/^taste-reference-[1-6]$/.test(id)) node.id = id;
      if (referenceList) node.className = 'article-references';
      if (node.tagName === 'A' && /^(https?:\/\/|#taste-reference-[1-6]$)/.test(href || '')) {
        node.setAttribute('href', href);
        node.contentEditable = 'false';
        if (!href.startsWith('#')) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
        else node.setAttribute('aria-label', 'Reference ' + href.split('-').at(-1));
      }
      if (size === 'default' || /^\d+(\.\d+)?$/.test(size || '') && Number(size) >= 8 && Number(size) <= 72) {
        node.dataset.copySize = size;
        node.style.fontSize = size === 'default' ? 'var(--copy-base-size)' : 'calc(' + size + 'px / var(--copy-display-scale, 1))';
        node.style.lineHeight = 'var(--copy-base-leading, 1.5)';
      }
      if (/^(normal|bold|[1-9]00)$/.test(weight)) node.style.fontWeight = weight;
      if (/^(normal|italic)$/.test(italic)) node.style.fontStyle = italic;
    });
    element.replaceChildren(template.content);
  }

  // In the thesis sentence, italicize the first use of each method term.
  // Keep automatic italics alongside the author's saved formatting.
  function setText(element, text) {
    if (element.hasAttribute('data-copy-rich')) {
      const format = window.copyFormatting.get(element);
      const source = richSources.get(element);
      const html = format?.text === text && typeof format.html === 'string' ? format.html : source?.text === text ? source.html : null;
      if (html !== null) { restoreRich(element, html); return; }
    }
    element.textContent = '';
    if (element.hasAttribute('data-copy-article')) {
      const format = window.copyFormatting.get(element);
      const matching = format?.text === text;
      const headings = matching ? format.headings : [];
      let position = 0;
      const detected = [];
      for (const match of text.matchAll(/[^\n]+/g)) {
        if (!match[0].trim()) continue;
        const start = match.index, end = start + match[0].length;
        const explicitHeading = headings?.some(item => item.start <= start && item.end >= end);
        const oldSizedHeading = matching && !headings && match[0].length < 160 &&
          (format.marks || []).some(mark => typeof mark.size === 'number' && mark.size >= 20 &&
            mark.start <= start + match[0].search(/\S/) && mark.end >= end);
        const block = document.createElement(explicitHeading || oldSizedHeading ? 'h3' : 'p');
        if (block.tagName === 'H3') detected.push({ start, end });
        block.textContent = match[0];
        element.append(text.slice(position, start), block);
        position = end;
      }
      element.append(text.slice(position));
      if (matching) format.headings = detected;
      window.copyFormatting.normalizeSize(element);
      window.copyFormatting.restore(element);
      return;
    }
    if (!element.hasAttribute('data-copy-emphasis')) {
      element.textContent = text;
      window.copyFormatting.restore(element);
      return;
    }
    const emphasized = new Set();
    let position = 0;
    for (const match of text.matchAll(emphasis)) {
      const term = match[0].toLowerCase();
      if (emphasized.has(term)) continue;
      emphasized.add(term);
      const italic = document.createElement('em');
      italic.textContent = match[0];
      element.append(text.slice(position, match.index), italic);
      position = match.index + match[0].length;
    }
    element.append(text.slice(position));
    window.copyFormatting.restore(element);
  }

  fields.forEach(element => {
    const key = element.dataset.copyKey;
    window.copyFormatting.enable(element, 'section:' + key);
    setText(element, typeof drafts[key] === 'string' ? drafts[key] : element.textContent);
    element.spellcheck = true;
    element.addEventListener('input', () => {
      drafts[key] = window.copyFormatting.capture(element).text;
      fields.filter(other => other !== element && other.dataset.copyKey === key)
        .forEach(other => setText(other, drafts[key]));
      try {
        window.copyFormatting.persist();
        localStorage.setItem(draftKey, JSON.stringify(drafts));
        showStatus('saved');
      } catch (_) {
        showStatus('failed');
      }
    });
    element.addEventListener('blur', event => {
      if (window.copyFormatting.ownsControl(event.relatedTarget)) return;
      if (element.hasAttribute('data-copy-article')) {
        const format = window.copyFormatting.capture(element);
        drafts[key] = format.text;
        setText(element, format.text);
        try { window.copyFormatting.persist(); localStorage.setItem(draftKey, JSON.stringify(drafts)); } catch (_) {}
        return;
      }
      if (element.hasAttribute('data-copy-emphasis')) setText(element, element.innerText);
    });
  });
  showStatus('idle');
})();
