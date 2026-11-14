(() => {
  'use strict';
  const releaseKey = 'gao-kexin.action-copy-release.2026-11-14.v1';
  const projectsKey = 'gao-kexin.projects.copy-drafts.v1';
  const sectionsKey = 'gao-kexin.section-copy-drafts.v1';
  const formatsKey = 'gao-kexin.copy-formatting.v1';
  const bodyKey = 'blog.taste.research-beauty.body';
  const referenceLabels = [
    { href: 'https://www.paulgraham.com/taste.html', from: 'Essay', to: 'Full text' },
    { href: 'https://arxiv.org/abs/math/0702396', from: 'Paper', to: 'Paper (arXiv)' },
    { href: 'https://developer.cloud.tencent.com/article/2531846', from: 'Reproduced English slides in a Chinese article', to: 'Reproduced slides', note: ' (Chinese article)' },
    { href: 'https://www.xiaoyuzhoufm.com/episode/69b77577f8b8079bfa8eb837', from: 'Episode', to: 'Podcast episode' }
  ];
  // Shift saved formatting ranges only where an approved label changed length.
  function replaceInFormat(format, from, to) {
    const start = format.text.lastIndexOf(from);
    if (start < 0) return false;
    const end = start + from.length, delta = to.length - from.length;
    const shift = position => position <= start ? position : position >= end ? position + delta : start + Math.min(position - start, to.length);
    format.text = format.text.slice(0, start) + to + format.text.slice(end);
    for (const kind of ['marks', 'headings']) {
      if (Array.isArray(format[kind])) format[kind] = format[kind].map(range => ({...range, start: shift(range.start), end: shift(range.end)})).filter(range => range.end > range.start);
    }
    return true;
  }
  function relabelReferences(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const changes = [];
    for (const rule of referenceLabels) {
      const link = [...template.content.querySelectorAll('a[href]')].find(anchor => anchor.getAttribute('href') === rule.href && anchor.textContent === rule.from);
      if (!link) continue;
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      let node, first = true;
      while ((node = walker.nextNode())) { node.data = first ? rule.to : ''; first = false; }
      if (first) link.textContent = rule.to;
      if (rule.note) link.after(document.createTextNode(rule.note));
      changes.push({ from: rule.from, to: rule.to + (rule.note || '') });
    }
    return { html: template.innerHTML, changes };
  }
  try {
    if (localStorage.getItem(releaseKey)) return;
    const original = Object.fromEntries([projectsKey, sectionsKey, formatsKey].map(key => [key, localStorage.getItem(key)]));
    const projects = JSON.parse(original[projectsKey] || '{}');
    const sections = JSON.parse(original[sectionsKey] || '{}');
    const formats = JSON.parse(original[formatsKey] || '{}');
    let changed = false;
    for (const project of ['mindmap', 'adhd', 'todo']) {
      const key = project + '.demoTitle', old = projects.en?.[key];
      if (typeof old !== 'string' || !/^Try the (Editor|Reader|List)( \(Simplified Version\))?$/i.test(old.trim())) continue;
      projects.en[key] = 'Interactive demo';
      const format = formats['project:en:' + key];
      if (format?.text === old) replaceInFormat(format, old, 'Interactive demo');
      changed = true;
    }
    const format = formats['section:' + bodyKey];
    if (typeof format?.html === 'string' && typeof format.text === 'string' &&
        (typeof sections[bodyKey] !== 'string' || sections[bodyKey] === format.text)) {
      const oldText = format.text;
      const result = relabelReferences(format.html);
      if (result.changes.length) {
        format.html = result.html;
        result.changes.forEach(change => replaceInFormat(format, change.from, change.to));
        if (sections[bodyKey] === oldText) sections[bodyKey] = format.text;
        changed = true;
      }
    } else if (typeof sections[bodyKey] === 'string') {
      const candidate = { text: sections[bodyKey] };
      referenceLabels.forEach(rule => replaceInFormat(candidate, rule.from, rule.to + (rule.note || '')));
      const source = document.querySelector('[data-copy-key="' + bodyKey + '"]');
      const normalize = text => text.replace(/\s+/g, ' ').trim();
      if (source && normalize(candidate.text) === normalize(source.textContent) && candidate.text !== sections[bodyKey]) {
        sections[bodyKey] = source.textContent;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(releaseKey + '.backup', JSON.stringify(original));
      localStorage.setItem(projectsKey, JSON.stringify(projects));
      localStorage.setItem(sectionsKey, JSON.stringify(sections));
      localStorage.setItem(formatsKey, JSON.stringify(formats));
    }
    localStorage.setItem(releaseKey, 'applied');
  } catch { /* Existing drafts remain available when storage is unavailable. */ }
})();
