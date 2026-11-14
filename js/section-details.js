(() => {
  'use strict';
  const labels = { mindset: 'Mindset', research: 'Research', maps: 'Mind Maps', blogs: 'Blog' };
  document.querySelectorAll('[data-section-open]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.sectionOpen;
    const requested = document.getElementById(button.getAttribute('aria-controls'));
    const element = requested?.dataset.sectionDetail === id ? requested : document.querySelector(`[data-section-detail="${id}"]`);
    if (!element) return;
    const part = [...element.querySelectorAll('[data-detail-part]')].find(item => item.dataset.detailPart === button.dataset.sectionPart);
    window.siteDetails.open({
      element, section: id, kind: 'section', label: labels[id], opener: button,
      target: !part || button.dataset.sectionPart === 'learn' ? element : part
    });
  }));
})();
