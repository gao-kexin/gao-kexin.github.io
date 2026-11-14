(() => {
  'use strict';
  const source = document.getElementById('bio-editor');
  const display = document.querySelector('.bio-display');
  const status = document.getElementById('bio-draft-status');
  if (!source || !display || !status) return;
  const draftKey = 'gao-kexin.home.bio-draft.v1';
  const editedKey = 'gao-kexin.home.bio-draft.edited';
  const blocksKey = 'gao-kexin.home.bio-blocks.v1';
  const guideHeading = /^\s*<?\s*How to read this site\s*[:：]?\s*>?\s*[:：]?\s*$/i;
  const sectionNames = /^\s*(Mindset|Research(?:\s*&\s*Projects?)?|Projects?|Mind maps|Maps|Blogs?)\b/i;
  let savedDraft = false;
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved !== null && (saved !== '' || localStorage.getItem(editedKey))) {
      source.value = saved;
      savedDraft = true;
    }
  } catch {}
  source.value = source.value.replace(/^Writing\b/gm, 'Blog');

  function parseText(text) {
    const paragraphs = text.split(/\n\s*\n/);
    const heading = paragraphs.findIndex(paragraph => guideHeading.test(paragraph));
    const end = heading < 0 ? -1 : Math.max(heading,
      paragraphs.findLastIndex((paragraph, index) => index > heading && sectionNames.test(paragraph)));
    return paragraphs.map((text, index) => ({
      kind: index === heading ? 'guide-heading' : heading >= 0 && index > heading && index <= end ? 'guide' : 'body',
      text: index === heading ? text.replace(/[<>]/g, '').trim() : text
    }));
  }
  let blocks = parseText(source.value);
  try {
    const saved = JSON.parse(localStorage.getItem(blocksKey) || 'null');
    if (saved?.text === source.value && Array.isArray(saved.blocks) && saved.blocks.length &&
        saved.blocks.every(block => ['body', 'guide', 'guide-heading'].includes(block.kind) && typeof block.text === 'string')) {
      blocks = saved.blocks;
    }
  } catch {}

  function appendText(element, text) {
    const links = {
      'HKUST': 'https://hkust.edu.hk/',
      'Pervasive Intelligence Lab': 'https://www.hkpeilab.com/',
      'Prof. Song Guo': 'https://cse.hkust.edu.hk/~songguo/'
    };
    let position = 0;
    for (const match of text.matchAll(/\b(?:kuh-sheen|HKUST|Pervasive Intelligence Lab|Prof\. Song Guo)\b/g)) {
      const href = links[match[0]];
      const inline = document.createElement(href ? 'a' : 'em');
      inline.textContent = match[0];
      if (href) {
        inline.href = href;
        inline.target = '_blank';
        inline.rel = 'noopener noreferrer';
        inline.className = 'guide-link bio-institution-link';
        inline.contentEditable = 'false';
      }
      element.append(text.slice(position, match.index), inline);
      position = match.index + match[0].length;
    }
    element.append(text.slice(position));
  }
  function paintBlock(element, block) {
    element.replaceChildren();
    const names = block.kind === 'guide' && block.text.match(sectionNames);
    if (!names) { appendText(element, block.text); window.copyFormatting.restore(element); return; }
    const lead = names[0];
    let position = 0;
    for (const match of lead.matchAll(/\b(Mindset|Research|Projects?|Mind maps|Maps|Blogs?)\b/gi)) {
      element.append(lead.slice(position, match.index));
      const link = document.createElement('a');
      const target = match[0].toLowerCase().replace(/^project$/, 'projects').replace(/^mind maps$/, 'maps').replace(/^blog$/, 'blogs');
      link.href = '#' + target;
      link.dataset.sectionLink = '';
      link.className = 'guide-link';
      link.contentEditable = 'false';
      link.textContent = target === 'maps' ? 'Mind Maps' : target === 'blogs' ? 'Blog' : match[0];
      element.append(link);
      position = match.index + match[0].length;
    }
    appendText(element, lead.slice(position) + block.text.slice(lead.length));
    window.copyFormatting.restore(element);
  }
  function save() {
    source.value = blocks.map(block => block.text).join('\n\n');
    try {
      window.copyFormatting.persist();
      localStorage.setItem(draftKey, source.value);
      localStorage.setItem(editedKey, 'true');
      localStorage.setItem(blocksKey, JSON.stringify({ text: source.value, blocks }));
      status.textContent = '草稿已保存 · 仅当前浏览器可见';
    } catch {
      status.textContent = '此浏览器无法保存草稿，请复制文字后再离开';
    }
  }
  const fragment = document.createDocumentFragment();
  const blockData = new WeakMap();
  const dirty = new WeakSet();
  let pointerLink = null;
  function refreshBlock(element) {
    if (!dirty.has(element)) return;
    paintBlock(element, blockData.get(element));
    dirty.delete(element);
  }
  let guide = null;
  for (const [index, block] of blocks.entries()) {
    const element = document.createElement(block.kind === 'guide-heading' ? 'h2' : 'p');
    element.dataset.bioBlock = block.kind;
    window.copyFormatting.enable(element, 'bio:' + index);
    element.spellcheck = true;
    element.setAttribute('aria-label', block.kind === 'guide-heading' ? 'Edit site guide heading' : 'Edit introduction paragraph');
    element.setAttribute('aria-multiline', 'true');
    element.dataset.placeholder = 'Click here to write…';
    if (block.kind === 'guide-heading') {
      guide = document.createElement('div');
      guide.className = 'bio-guide-paper';
      guide.setAttribute('role', 'group');
      guide.setAttribute('aria-labelledby', 'site-guide');
      element.id = 'site-guide';
      fragment.append(guide);
    }
    paintBlock(element, block);
    blockData.set(element, block);
    element.addEventListener('input', () => {
      block.text = window.copyFormatting.capture(element).text;
      dirty.add(element);
      save();
    });
    element.addEventListener('blur', event => {
      if (window.copyFormatting.ownsControl(event.relatedTarget)) return;
      // Reapply links and italics only after editing, keeping the caret steady while typing.
      // Keep a clicked link alive until its click has completed.
      if (!pointerLink || !element.contains(pointerLink)) refreshBlock(element);
    });
    ((block.kind === 'guide' || block.kind === 'guide-heading') && guide ? guide : fragment).append(element);
  }
  display.replaceChildren(fragment);
  display.id = guide ? 'bio-display' : 'site-guide';
  display.tabIndex = -1;
  display.addEventListener('pointerdown', event => { pointerLink = event.target.closest('a'); }, true);
  display.addEventListener('click', event => {
    const link = event.target.closest('a');
    pointerLink = null;
    if (!link) return;
    const block = link.closest('[data-bio-block]');
    if (block) setTimeout(() => refreshBlock(block), 0);
    if (!link.hasAttribute('data-section-link')) {
      event.preventDefault();
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  });
  source.hidden = true;
  display.hidden = false;
  status.textContent = savedDraft ? '草稿已保存 · 仅当前浏览器可见' : 'Click the text to edit · drafts save in this browser';
})();
