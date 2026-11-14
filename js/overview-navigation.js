(() => {
  'use strict';
  const areas = new WeakMap();
  function register(element, control) {
    if (!element || !control) return;
    areas.set(element, control);
    element.setAttribute('data-navigation-area', '');
    control.setAttribute('data-area-action', '');
  }
  register(document.querySelector('#mindset'), document.querySelector('#mindset > .mindset-overview-action button'));
  register(document.querySelector('.mindset-taste'), document.querySelector('.mindset-taste .section-open'));
  register(document.querySelector('#research'), document.querySelector('#research > .mindset-overview-action button'));
  document.querySelectorAll('.project-card').forEach(card => register(card, card.querySelector('[data-project-open-label]')));
  register(document.querySelector('.map-feature'), document.querySelector('#maps > .mindset-overview-action a'));
  document.querySelectorAll('.reading-row').forEach(row => register(row, row.querySelector('.reading-action')));

  let gesture = null;
  document.addEventListener('pointerdown', event => {
    gesture = { x: event.clientX, y: event.clientY, moved: false };
  }, { passive: true, capture: true });
  document.addEventListener('pointermove', event => {
    if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true;
  }, { passive: true, capture: true });
  document.addEventListener('pointercancel', () => { gesture = null; }, { passive: true });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const area = target?.closest('[data-navigation-area]');
    const control = areas.get(area);
    if (!control || gesture?.moved || !getSelection()?.isCollapsed) return;
    // The existing editable text and embedded tools keep their own interactions.
    if (target.closest('a, button, input, textarea, select, [contenteditable="true"], .project-detail, .section-detail, [data-section-copy-status], [data-project-draft-status]')) return;
    control.click();
  });
})();
