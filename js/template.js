(() => {
  'use strict';
  const metrics = JSON.parse(document.getElementById('layout-metrics').textContent);
  const slots = [...document.querySelectorAll('[data-copy]')];
  const mobile = window.matchMedia('(max-width: 848px)');
  const splitView = window.matchMedia('(min-width: 1000px)');
  const leftPanel = document.querySelector('.split-panel-left');
  const editorialSurface = document.querySelector('.editorial-surface');
  const fixed = new Set([0, 1, 2, 3]);

  function wrapWords(words, width, character, space) {
    const rows = [];
    let current = 0;
    for (const length of words) {
      let word = length * character;
      if (current && current + space + word > width) {
        rows.push(current);
        current = 0;
      }
      while (word > width) {
        rows.push(width);
        word -= width;
      }
      current += (current ? space : 0) + word;
    }
    if (current || !rows.length) rows.push(current || width * .62);
    return rows;
  }

  function renderSlot(slot) {
    const index = Number(slot.dataset.copy);
    const record = metrics[index];
    const reference = mobile.matches ? record.mobile : record.desktop;
    const isLink = slot.parentElement.classList.contains('placeholder-link');
    const isHeading = record.tag === 'h1' || record.tag === 'h3';
    const isSection = record.tag === 'h2';
    const isFooter = index >= 66;
    if (isLink || isSection) slot.style.width = `${record.desktop.width}px`;
    // Use layout pixels so fitting the sheet into a panel does not rewrap it.
    const width = Math.max(1, slot.clientWidth);
    const font = index === 4 ? (mobile.matches ? 24 : 32) : reference.font;
    const leading = index === 4 ? (mobile.matches ? 32 : 40)
      : isSection ? 16 : isFooter ? 16.5 : reference.line;
    const character = font === 13 ? 8.25 : isFooter ? 7.15 : font * .45;
    let lines = wrapWords(record.words, width, character, character);
    if (Math.abs(width - reference.width) <= 2 && !fixed.has(index) && !isSection && !isLink && !isFooter) {
      const count = Math.max(1, Math.round(reference.height / leading));
      if (lines.length !== count) {
        const end = Math.min(width * .92, Math.max(width * .34, lines.at(-1)));
        lines = Array.from({length: count}, (_, i) => i === count - 1 ? end : width * .96);
      }
    }
    if (fixed.has(index) || isSection || isLink || isFooter) {
      const contentWidth = isFooter ? record.words.reduce((a,b) => a + b, record.words.length - 1) * character : width;
      lines = [Math.min(width, contentWidth)];
    }
    slot.style.setProperty('--slot-leading', `${index === 3 ? 11 : leading}px`);
    slot.style.setProperty('--slot-ink', `${index === 4 ? font * .58 : isHeading ? 17 : isFooter ? 6 : 7}px`);
    const fragment = document.createDocumentFragment();
    lines.forEach(lineWidth => {
      const line = document.createElement('span');
      line.className = 'copy-line';
      line.style.setProperty('--line-width', `${Math.min(width, Math.max(1,lineWidth))}px`);
      fragment.append(line);
    });
    slot.replaceChildren(fragment);
  }

  let resizeFrame, lastScale;
  function layout() { slots.forEach(renderSlot); }
  function fitEditorialPanel() {
    const scale = Number(getComputedStyle(editorialSurface).getPropertyValue('--editorial-scale')) || 1;
    if (splitView.matches && scale === lastScale) return;
    lastScale = scale;
    layout();
    document.dispatchEvent(new Event('editorial:layout'));
  }
  function scheduleLayout() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(fitEditorialPanel);
  }
  fitEditorialPanel();
  window.addEventListener('resize', scheduleLayout, {passive: true});
  mobile.addEventListener('change', scheduleLayout);
  splitView.addEventListener('change', scheduleLayout);
  new ResizeObserver(scheduleLayout).observe(leftPanel);

  // The reference ends in a 56px TV-static texture. Draw it locally;
  // suspend animation offscreen and respect reduced-motion preferences.
  const canvas = document.getElementById('static');
  if (!canvas || getComputedStyle(canvas).visibility === 'hidden') return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let pixels, frame = 0, previous = 0, visible = false;
  function sizeCanvas() {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth));
    canvas.height = 56;
    pixels = context.createImageData(canvas.width, canvas.height);
    draw();
  }
  function draw() {
    const buffer = new Uint32Array(pixels.data.buffer);
    for (let i = 0; i < buffer.length; i++) buffer[i] = Math.random() < .5 ? 0xff000000 : 0xffffffff;
    context.putImageData(pixels, 0, 0);
  }
  function animate(time) {
    if (!visible || reduceMotion.matches || document.hidden) { frame = 0; return; }
    if (time - previous > 80) { draw(); previous = time; }
    frame = requestAnimationFrame(animate);
  }
  function startOrStop() {
    if (visible && !reduceMotion.matches && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    startOrStop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', startOrStop);
  reduceMotion.addEventListener('change', startOrStop);
  window.addEventListener('resize', sizeCanvas, {passive: true});
  sizeCanvas();
})();
