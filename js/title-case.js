(() => {
  'use strict';
  const minor = new Set('a an and as at but by for if in nor of on or per the to via vs'.split(' '));
  function titleCase(text) {
    const words = [...text.matchAll(/[A-Za-z][A-Za-z0-9]*(?:[’'][A-Za-z]+)?/g)];
    let index = 0;
    return text.replace(/[A-Za-z][A-Za-z0-9]*(?:[’'][A-Za-z]+)?/g, (word, offset) => {
      const first = index++ === 0;
      const last = index === words.length;
      const followsBreak = /[:—–]\s*$/.test(text.slice(0, offset));
      const compound = text[offset - 1] === '-' || text[offset + word.length] === '-';
      if (!first && !last && !followsBreak && !compound && minor.has(word.toLowerCase())) return word.toLowerCase();
      return word[0].toUpperCase() + word.slice(1);
    });
  }
  window.siteTitleCase = titleCase;
  document.querySelectorAll('h1:not(.site-name), h2, h3, h4, h5, h6, .research-questions dt').forEach(element => {
    if (!element.children.length && !element.closest('[data-preserve-title-case]')) element.textContent = titleCase(element.textContent);
  });
  const source = document.getElementById('bio-editor');
  const guideCase = text => text.replace(/^([<>\s]*)How to read this site/igm, '$1How to Read This Site');
  if (source) source.value = guideCase(source.value);

  // Update existing heading drafts once; later edits retain exactly what is typed.
  try {
    if (localStorage.getItem('gao-kexin.title-case.v1')) return;
    const sectionKey = 'gao-kexin.section-copy-drafts.v1';
    const sections = JSON.parse(localStorage.getItem(sectionKey) || '{}');
    for (const key of Object.keys(sections)) {
      if (/(?:\.title|Title)$/.test(key) && typeof sections[key] === 'string') sections[key] = titleCase(sections[key]);
    }
    localStorage.setItem(sectionKey, JSON.stringify(sections));
    const projectKey = 'gao-kexin.projects.copy-drafts.v1';
    const projects = JSON.parse(localStorage.getItem(projectKey) || '{}');
    for (const copy of Object.values(projects)) {
      if (!copy || typeof copy !== 'object') continue;
      for (const key of Object.keys(copy)) {
        if (/(?:\.title|\.demoTitle)$/.test(key) && typeof copy[key] === 'string') copy[key] = titleCase(copy[key]);
      }
    }
    localStorage.setItem(projectKey, JSON.stringify(projects));
    const bioKey = 'gao-kexin.home.bio-draft.v1';
    const blocksKey = 'gao-kexin.home.bio-blocks.v1';
    const bio = localStorage.getItem(bioKey);
    const snapshot = JSON.parse(localStorage.getItem(blocksKey) || 'null');
    if (snapshot?.text === bio && Array.isArray(snapshot.blocks)) {
      snapshot.blocks.forEach(block => { if (block.kind === 'guide-heading') block.text = titleCase(block.text); });
      snapshot.text = snapshot.blocks.map(block => block.text).join('\n\n');
      localStorage.setItem(bioKey, snapshot.text);
      localStorage.setItem(blocksKey, JSON.stringify(snapshot));
    } else if (bio !== null) localStorage.setItem(bioKey, guideCase(bio));
    localStorage.setItem('gao-kexin.title-case.v1', '1');
  } catch (_) {}
})();
