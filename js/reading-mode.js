(() => {
  'use strict';
  if (document.documentElement.dataset.readingMode !== 'true') return;
  document.querySelectorAll('[data-copy-format], [data-copy-key], [data-project-text], [data-bio-block]').forEach(element => {
    element.contentEditable = 'false';
    element.removeAttribute('aria-multiline');
    if (element.getAttribute('role') === 'textbox') element.removeAttribute('role');
    if (/^(Edit\b|编辑)/.test(element.getAttribute('aria-label') || '')) element.removeAttribute('aria-label');
    if (element.getAttribute('tabindex') === '0') element.removeAttribute('tabindex');
    element.spellcheck = false;
  });
  document.querySelectorAll('[data-project-draft-status], [data-section-copy-status], .bio-draft-status, .copy-format-toolbar, #bio-edit-toggle, #bio-editor').forEach(element => { element.hidden = true; });
})();
