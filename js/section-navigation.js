(() => {
  'use strict';
  const panel = document.querySelector('.split-panel-left');
  const split = matchMedia('(min-width: 1000px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!panel) return;

  const sections = [...panel.querySelectorAll('.page > section')];
  let activeSection, lockedSection, scrollFrame, unlockTimer;
  let interactionTop = null;

  function verticalScrollTop() {
    return split.matches ? panel.scrollTop : window.scrollY;
  }

  function setActive(section) {
    if (!section || section === activeSection) return;
    activeSection = section;
    document.documentElement.style.setProperty('--active-section-bg', getComputedStyle(section).backgroundColor);
    document.documentElement.dataset.activeSection = section.id;
    document.dispatchEvent(new CustomEvent('site:section-change', { detail: { id: section.id } }));
  }

  function followScroll() {
    if (lockedSection) return;
    if (interactionTop !== null) {
      // Keep the selected section through horizontal gestures and small vertical drift.
      if (Math.abs(verticalScrollTop() - interactionTop) < 8) return;
      interactionTop = null;
    }
    const bounds = panel.getBoundingClientRect();
    const readingLine = (split.matches ? bounds.top : 0) + Math.min(72, (split.matches ? panel.clientHeight : innerHeight) * .14);
    let section = sections[0];
    for (const candidate of sections) {
      if (candidate.getBoundingClientRect().top <= readingLine) section = candidate;
      else break;
    }
    setActive(section);
  }

  function scheduleFollow() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(followScroll);
  }

  function releaseSelection() {
    clearTimeout(unlockTimer);
    lockedSection = null;
    scheduleFollow();
  }

  function selectSection(section) {
    if (!section) return;
    if (lockedSection) {
      clearTimeout(unlockTimer);
      lockedSection = null;
      // An explicit click takes over from an unfinished guide-link scroll.
      const scroller = split.matches ? panel : window;
      scroller.scrollTo({ top: verticalScrollTop(), behavior: 'instant' });
    }
    interactionTop = verticalScrollTop();
    setActive(section);
  }

  document.addEventListener('site:select-section', event => {
    const section = sections.find(section => section.id === event.detail?.id);
    selectSection(section);
  });

  function scrollToSection(id, behavior) {
    if (id === 'writing') id = 'blogs';
    const target = document.getElementById(id);
    if (!target || !panel.contains(target)) return false;
    const section = target.closest('.page > section');
    interactionTop = null;
    lockedSection = section;
    clearTimeout(unlockTimer);
    setActive(section);
    // Keep the chosen color while smooth scrolling passes other sections.
    unlockTimer = setTimeout(releaseSelection, behavior === 'smooth' ? 1800 : 100);
    const heading = target.matches('h2') ? target : target.querySelector('h2') || target;
    heading.focus({ preventScroll: true });
    const top = target.getBoundingClientRect().top;
    const gap = 20;
    if (split.matches) {
      panel.scrollTo({
        top: Math.max(0, panel.scrollTop + top - panel.getBoundingClientRect().top - panel.clientTop - gap),
        behavior,
      });
    } else {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - gap), behavior });
    }
    return true;
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-section-link]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const id = link.hash.slice(1);
    if (!document.getElementById(id)) return;
    event.preventDefault();
    if (scrollToSection(id, reducedMotion.matches ? 'auto' : 'smooth') && location.hash !== link.hash) {
      history.pushState(null, '', link.hash);
    }
  });

  function restoreAnchor() {
    const id = location.hash.slice(1);
    if (id) scrollToSection(id, 'auto');
  }
  window.addEventListener('popstate', restoreAnchor);
  window.addEventListener('hashchange', restoreAnchor);
  panel.addEventListener('scroll', scheduleFollow, { passive: true });
  window.addEventListener('scroll', scheduleFollow, { passive: true });
  panel.addEventListener('scrollend', releaseSelection);
  window.addEventListener('scrollend', releaseSelection);
  panel.addEventListener('click', event => {
    if (!event.target.closest('a[data-section-link]')) selectSection(event.target.closest('.page > section'));
  });
  window.addEventListener('resize', scheduleFollow, { passive: true });
  new ResizeObserver(scheduleFollow).observe(panel.querySelector('.page'));
  // A fresh visit starts at the top; navigation within the page still uses anchors.
  let hasInteracted = false;
  for (const type of ['pointerdown', 'wheel', 'touchstart', 'keydown']) {
    window.addEventListener(type, () => { hasInteracted = true; }, { once: true, passive: true, capture: true });
  }
  function startAtTop() {
    if (hasInteracted) return;
    panel.scrollTo({ top: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, behavior: 'instant' });
    setActive(sections[0]);
  }
  startAtTop();
  window.addEventListener('load', () => document.fonts.ready.then(() => requestAnimationFrame(startAtTop)));
  followScroll();
})();
