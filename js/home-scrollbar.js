(() => {
  'use strict';
  const panel = document.querySelector('.split-panel-left');
  const layout = document.querySelector('.split-layout');
  if (!panel || !layout) return;
  if (!panel.id) panel.id = 'homepage-panel';
  const track = document.createElement('div');
  track.className = 'home-scrollbar';
  track.tabIndex = 0;
  track.setAttribute('role', 'scrollbar');
  track.setAttribute('aria-label', 'Scroll homepage');
  track.setAttribute('aria-orientation', 'vertical');
  track.setAttribute('aria-controls', panel.id);
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  const thumb = document.createElement('div');
  thumb.className = 'home-scrollbar-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  track.append(thumb);
  layout.append(track);
  const timeline = CSS.supports('animation-timeline: scroll()');
  let range = 0, travel = 0, dragging = null, resizeFrame;

  function position() {
    const progress = range ? panel.scrollTop / range : 0;
    track.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    if (!timeline) track.style.setProperty('--thumb-offset', `${travel * progress}px`);
  }
  function measure() {
    const height = panel.clientHeight;
    range = Math.max(0, panel.scrollHeight - height);
    const size = Math.min(height, Math.max(32, height * height / panel.scrollHeight));
    travel = height - size;
    track.style.setProperty('--thumb-height', `${size}px`);
    track.style.setProperty('--thumb-travel', `${travel}px`);
    track.hidden = range === 0;
    position();
  }
  function scheduleMeasure() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measure);
  }
  panel.addEventListener('scroll', position, { passive: true });
  new ResizeObserver(scheduleMeasure).observe(panel.querySelector('.editorial-surface'));
  new ResizeObserver(scheduleMeasure).observe(panel);
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  track.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !range) return;
    event.preventDefault();
    track.focus({ preventScroll: true });
    if (event.target === thumb) {
      dragging = { id: event.pointerId, y: event.clientY, top: panel.scrollTop };
      track.setPointerCapture(event.pointerId);
    } else {
      const direction = event.clientY < thumb.getBoundingClientRect().top ? -1 : 1;
      panel.scrollBy({ top: direction * panel.clientHeight * .9, behavior: 'instant' });
    }
  });
  track.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== dragging.id || !travel) return;
    panel.scrollTo({ top: dragging.top + (event.clientY - dragging.y) * range / travel, behavior: 'instant' });
  });
  function release(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    dragging = null;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  }
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('lostpointercapture', () => { dragging = null; });
  track.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? panel.clientHeight : 1;
    panel.scrollBy({ top: event.deltaY * unit, behavior: 'instant' });
  }, { passive: false });
  track.addEventListener('keydown', event => {
    const step = { ArrowUp: -40, ArrowDown: 40, PageUp: -panel.clientHeight * .9, PageDown: panel.clientHeight * .9 };
    let top;
    if (event.key === 'Home') top = 0;
    else if (event.key === 'End') top = range;
    else if (Object.hasOwn(step, event.key)) top = panel.scrollTop + step[event.key];
    else return;
    event.preventDefault();
    panel.scrollTo({ top, behavior: 'instant' });
  });
  measure();
})();
