(() => {
  'use strict';
  const areas = new WeakMap();
  const actions = new WeakMap();
  const nativeControl = 'a, button, input, textarea, select, summary, [role="button"], [role="link"]';
  const protectedContent = '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], input, textarea, select, .project-detail, .section-detail, [data-section-copy-status], [data-project-draft-status]';

  function sameDestination(candidate, control) {
    if (candidate === control) return true;
    if (control.hasAttribute('data-project-open')) {
      return candidate.dataset.projectOpen === control.dataset.projectOpen;
    }
    if (control.hasAttribute('data-section-open')) {
      return candidate.dataset.sectionOpen === control.dataset.sectionOpen
        && candidate.getAttribute('aria-controls') === control.getAttribute('aria-controls');
    }
    return control.matches('a[href]') && candidate.matches('a[href]')
      && candidate.href === control.href && candidate.target === control.target;
  }
  function register(element, control) {
    if (!element || !control) return;
    areas.set(element, control);
    actions.set(control, control);
    element.querySelectorAll('a, button').forEach(candidate => {
      if (sameDestination(candidate, control)) actions.set(candidate, control);
    });
    element.setAttribute('data-navigation-area', '');
    control.setAttribute('data-area-action', '');
  }
  register(document.querySelector('#mindset'), document.querySelector('#mindset > .mindset-overview-action button'));
  register(document.querySelector('.mindset-taste'), document.querySelector('.mindset-taste .section-open'));
  register(document.querySelector('#research'), document.querySelector('#research > .mindset-overview-action button'));
  document.querySelectorAll('.project-card').forEach(card => register(card, card.querySelector('[data-project-open-label]')));
  register(document.querySelector('.map-feature'), document.querySelector('#maps > .mindset-overview-action a'));
  document.querySelectorAll('.reading-row').forEach(row => register(row, row.querySelector('.reading-action')));

  // Hover and delegated clicks resolve the same nearest destination. Independent
  // links (such as Site guide) and nested areas never activate their parent action.
  function actionAt(target) {
    if (!(target instanceof Element) || target.closest(protectedContent)) return null;
    const direct = target.closest(nativeControl);
    return direct ? actions.get(direct) : areas.get(target.closest('[data-navigation-area]'));
  }
  let hoveredAction = null, pointer = null, hoverFrame = 0;
  function showHover(control) {
    control = control || null;
    if (hoveredAction === control) return;
    hoveredAction?.removeAttribute('data-area-hover');
    hoveredAction = control;
    hoveredAction?.setAttribute('data-area-hover', '');
  }
  function trackHover(event) {
    if (event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    showHover(actionAt(event.target));
  }
  function clearHover() {
    pointer = null;
    showHover(null);
  }
  function refreshHover() {
    if (!pointer || hoverFrame) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      if (pointer) showHover(actionAt(document.elementFromPoint(pointer.x, pointer.y)));
    });
  }
  document.addEventListener('pointerover', trackHover, { passive: true });
  document.addEventListener('pointerout', event => {
    if (event.pointerType === 'touch') return;
    if (!event.relatedTarget) clearHover();
    else showHover(actionAt(event.relatedTarget));
  }, { passive: true });
  // Recheck the element beneath a stationary mouse when either pane or the
  // project carousel scrolls, instead of leaving the previous card highlighted.
  document.addEventListener('scroll', refreshHover, { passive: true, capture: true });
  window.addEventListener('resize', refreshHover, { passive: true });
  window.addEventListener('blur', clearHover);

  let gesture = null;
  document.addEventListener('pointerdown', event => {
    gesture = { x: event.clientX, y: event.clientY, moved: false };
    if (event.pointerType === 'touch') clearHover();
  }, { passive: true, capture: true });
  document.addEventListener('pointermove', event => {
    if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true;
    trackHover(event);
  }, { passive: true, capture: true });
  document.addEventListener('pointercancel', () => { gesture = null; clearHover(); }, { passive: true });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const control = actionAt(target);
    if (!control || gesture?.moved || !getSelection()?.isCollapsed) return;
    // The existing editable text and embedded tools keep their own interactions.
    if (target.closest(nativeControl)) return;
    control.click();
  });
})();
