(() => {
  const entry = document.querySelector('.research-loop-entry');
  const copy = entry?.querySelector('.research-summary');
  const cover = entry?.querySelector('.research-loop-cover');
  const diagram = cover?.querySelector('svg');
  if (!entry || !copy || !cover || !diagram) return;
  let frame = 0;
  let lastSignature = '';

  const fit = () => {
    frame = 0;
    if (matchMedia('(max-width: 848px)').matches) {
      entry.style.removeProperty('--research-image-column');
      lastSignature = '';
      return;
    }
    const styles = getComputedStyle(entry);
    const available = parseFloat(styles.width) - parseFloat(styles.columnGap);
    if (!available) return;
    const signature = [available, getComputedStyle(copy).font, copy.innerHTML].join('|');
    if (signature === lastSignature) return;
    lastSignature = signature;

    // Balance actual text wrapping against the diagram's natural proportions.
    // The title-to-paragraph gap stays fixed, even after the owner edits either.
    const probe = copy.cloneNode(true);
    for (const node of [probe, ...probe.querySelectorAll('*')]) {
      if (node.hasAttribute('data-copy-key')) node.style.whiteSpace = 'pre-wrap';
      for (const attr of ['id', 'data-copy-key', 'contenteditable', 'tabindex']) node.removeAttribute(attr);
    }
    probe.setAttribute('aria-hidden', 'true');
    probe.inert = true;
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;contain:layout;left:0;top:0;height:auto;min-height:0;max-height:none;';
    entry.append(probe);
    const coverStyles = getComputedStyle(cover);
    const paddingX = parseFloat(coverStyles.paddingLeft) + parseFloat(coverStyles.paddingRight);
    const paddingY = parseFloat(coverStyles.paddingTop) + parseFloat(coverStyles.paddingBottom);
    const ratio = diagram.viewBox.baseVal.height / diagram.viewBox.baseVal.width;
    const min = available * .52;
    const max = available * .63;
    const candidates = new Map();
    const measure = width => {
      width = Math.max(min, Math.min(max, width));
      const key = width.toFixed(2);
      if (candidates.has(key)) return;
      probe.style.width = `${available - width}px`;
      const textHeight = parseFloat(getComputedStyle(probe).height);
      const imageHeight = (width - paddingX) * ratio + paddingY;
      candidates.set(key, {width, textHeight, difference: imageHeight - textHeight});
    };
    try {
      for (let step = 0; step <= 24; step++) measure(min + (max - min) * step / 24);
      for (const candidate of [...candidates.values()]) measure((candidate.textHeight - paddingY) / ratio + paddingX);
      const score = item => Math.abs(item.difference) + Math.abs(item.width / available - .56) * .01;
      const best = [...candidates.values()].sort((a, b) => score(a) - score(b))[0];
      entry.style.setProperty('--research-image-column', `${best.width.toFixed(2)}px`);
    } finally {
      probe.remove();
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
  const resize = new ResizeObserver(schedule);
  resize.observe(entry);
  resize.observe(copy);
  new MutationObserver(schedule).observe(copy, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['style']});
  document.fonts.ready.then(() => { lastSignature = ''; schedule(); });
  schedule();
})();
