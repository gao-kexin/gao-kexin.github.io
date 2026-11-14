(() => {
  'use strict';
  const layout = document.querySelector('.split-layout');
  const right = document.querySelector('.split-panel-right');
  const details = [...document.querySelectorAll('.project-detail, .section-detail')];
  if (!layout || !right) return;
  const desktop = matchMedia('(min-width: 1000px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const positions = new WeakMap();
  let active = null, revision = 0, animation = null, closeTimer;

  function place() {
    details.forEach(element => {
      const slot = element.matches('.project-detail')
        ? document.getElementById('project-mobile-detail')
        : document.querySelector(`[data-section-mobile-detail="${element.dataset.sectionDetail}"]`);
      const parent = desktop.matches ? right : slot;
      if (parent && element.parentElement !== parent) {
        if (typeof parent.moveBefore === 'function') parent.moveBefore(element, null);
        else parent.append(element);
      }
      element.hidden = element !== active?.element;
    });
    document.querySelectorAll('[data-section-mobile-detail], #project-mobile-detail').forEach(slot => {
      slot.hidden = desktop.matches || ![...slot.children].some(element => !element.hidden);
    });
    right.classList.toggle('has-section-details', desktop.matches && active?.kind === 'section');
    right.classList.toggle('has-project-details', desktop.matches && active?.kind === 'project');
    right.inert = !desktop.matches || !active;
    right.setAttribute('aria-hidden', String(right.inert));
  }
  function expanded(element) {
    document.querySelectorAll('[data-section-open], [data-project-open]').forEach(button => {
      button.setAttribute('aria-expanded', String(!!element && button.getAttribute('aria-controls') === element.id));
    });
  }
  function fade(element, opacity, offset, duration, from) {
    const current = getComputedStyle(element);
    const start = from || { opacity: current.opacity, transform: current.transform };
    animation?.cancel();
    animation = element.animate([start, { opacity, transform: `translateY(${offset}px)` }], {
      duration: reduced.matches ? 0 : duration, easing: 'ease-out', fill: 'forwards'
    });
    return animation.finished.catch(() => {});
  }
  function remember() {
    if (active && desktop.matches) positions.set(active.element, right.scrollTop);
  }
  async function open(options) {
    const ticket = ++revision;
    clearTimeout(closeTimer);
    remember();
    expanded(options.element);
    document.dispatchEvent(new CustomEvent('site:select-section', { detail: { id: options.section } }));
    const switching = active && active.element !== options.element;
    if (switching) {
      active.element.inert = true;
      await fade(active.element, 0, -5, 110);
      if (ticket !== revision) return;
    }
    const reversing = active?.element === options.element && animation;
    const current = reversing ? getComputedStyle(options.element) : null;
    const from = current ? { opacity: current.opacity, transform: current.transform } : null;
    animation?.cancel();
    animation = null;
    active = options;
    place();
    options.element.inert = false;
    right.style.setProperty('--detail-section-bg', getComputedStyle(document.getElementById(options.section)).backgroundColor);
    right.style.setProperty('--detail-scrollbar-thumb', ['mindset', 'maps'].includes(options.section) ? '#ffffff66' : '#17171766');
    right.setAttribute('aria-label', `${options.label} details`);
    layout.dataset.detailsOpen = 'true';
    options.onReveal?.();
    requestAnimationFrame(() => {
      if (ticket !== revision) return;
      options.element.querySelectorAll('iframe[data-lazy-src]').forEach(frame => {
        if (!frame.hasAttribute('src')) frame.src = frame.dataset.lazySrc;
      });
    });
    const target = options.target || options.element;
    if (desktop.matches) {
      const top = target === options.element ? positions.get(options.element) || 0
        : right.scrollTop + target.getBoundingClientRect().top - right.getBoundingClientRect().top - 28;
      right.scrollTo({ top, behavior: 'instant' });
    } else if (!reversing) {
      target.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
    }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (switching || reversing || !desktop.matches) {
      await fade(options.element, 1, 0, 230, from || { opacity: 0, transform: 'translateY(7px)' });
      if (ticket === revision) { animation?.cancel(); animation = null; }
    }
  }
  function close() {
    if (!active) return;
    const ticket = ++revision;
    clearTimeout(closeTimer);
    remember();
    expanded(null);
    layout.dataset.detailsOpen = 'false';
    right.inert = true;
    right.setAttribute('aria-hidden', 'true');
    active.element.inert = true;
    const opener = active.opener;
    fade(active.element, 0, 0, 140);
    opener?.focus({ preventScroll: true });
    closeTimer = setTimeout(() => {
      if (ticket !== revision) return;
      animation?.cancel();
      animation = null;
      active = null;
      place();
      if (!desktop.matches) opener?.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' });
    }, reduced.matches ? 0 : 180);
  }
  document.querySelectorAll('[data-section-close], .project-close').forEach(button => button.addEventListener('click', close));
  desktop.addEventListener('change', () => {
    place();
    if (desktop.matches && active) right.scrollTop = positions.get(active.element) || 0;
  });
  window.siteDetails = { open, close };
  layout.dataset.detailsOpen = 'false';
  place();
})();
