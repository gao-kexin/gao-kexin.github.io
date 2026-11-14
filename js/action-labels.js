(() => {
  'use strict';
  function syncLabels() {
    document.querySelectorAll('[data-project-open]').forEach(control => {
      const project = control.dataset.projectOpen;
      const title = document.querySelector('[data-project-text="' + project + '.title"]')?.textContent.trim();
      control.setAttribute('aria-controls', project + '-project-detail');
      if (title) control.setAttribute('aria-label', 'View project: ' + title);
    });
    document.querySelectorAll('[data-section-open]').forEach(control => {
      const detail = document.getElementById(control.getAttribute('aria-controls'));
      const title = detail?.querySelector('h2')?.textContent.trim();
      const action = control.dataset.sectionOpen === 'blogs' ? 'Read article' : 'Read more';
      if (title) control.setAttribute('aria-label', action + ': ' + title);
    });
    document.querySelectorAll('#maps .reading-row').forEach(row => {
      const title = row.querySelector('h3')?.textContent.trim();
      const link = row.querySelector('.reading-action');
      if (title && link) link.setAttribute('aria-label', 'View notes: ' + title);
    });
    document.querySelectorAll('a[href="./maps/Research-Map-EN.html"]').forEach(link => {
      link.setAttribute('aria-label', 'Open full map: AI Map (opens in a new tab)');
    });
    document.querySelectorAll('.project-close, .section-close').forEach(button => button.setAttribute('aria-label', 'Close'));
    document.querySelectorAll('.guide-return').forEach(link => link.setAttribute('aria-label', 'Site guide'));
  }
  syncLabels();
  let frame;
  document.addEventListener('input', event => {
    if (!event.target.closest('[data-copy-key], [data-project-text]')) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(syncLabels);
  });
})();
