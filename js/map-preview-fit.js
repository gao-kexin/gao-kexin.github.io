(() => {
  const feature = document.querySelector('.map-feature');
  const preview = feature?.querySelector('.map-preview');
  const copy = feature?.querySelector('.map-feature-copy');
  if (!feature || !preview || !copy) return;
  let frame = 0;
  let lastSignature = '';
  const fit = () => {
    frame = 0;
    preview.style.removeProperty('width');
    if (matchMedia('(max-width: 848px)').matches) {
      feature.style.removeProperty('--map-image-column');
      lastSignature = '';
      return;
    }
    const style = getComputedStyle(feature);
    const available = Number.parseFloat(style.width) - Number.parseFloat(style.columnGap);
    if (!available) return;
    const signature = [available, getComputedStyle(copy).font, copy.innerHTML].join('|');
    if (signature === lastSignature) return;
    lastSignature = signature;

    // Measure the text at its new width, not at the old fixed grid track.
    // The image column and the text column always consume the entire row.
    const probe = copy.cloneNode(true);
    for (const node of [probe, ...probe.querySelectorAll('*')]) {
      if (node.hasAttribute('data-copy-key')) node.style.whiteSpace = 'pre-wrap';
      for (const attr of ['id', 'data-copy-key', 'contenteditable', 'tabindex']) node.removeAttribute(attr);
    }
    probe.setAttribute('aria-hidden', 'true');
    probe.inert = true;
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;contain:layout;left:0;top:0;height:auto;min-height:0;max-height:none;';
    feature.append(probe);
    const min = available * .24;
    const max = available * .58;
    const ratio = 580 / 1000;
    const measured = new Map();
    const measure = width => {
      width = Math.max(min, Math.min(max, width));
      const key = width.toFixed(2);
      if (measured.has(key)) return measured.get(key);
      probe.style.width = `${available - width}px`;
      const textHeight = Number.parseFloat(getComputedStyle(probe).height);
      const imageHeight = (width - 2) * ratio + 2;
      const result = {width, textHeight, imageHeight, difference: imageHeight - textHeight};
      measured.set(key, result);
      return result;
    };
    try {
      // Text wraps in steps. Sample the range, then test the exact width for
      // each observed text height instead of oscillating between two layouts.
      for (let i = 0; i <= 20; i++) measure(min + (max - min) * i / 20);
      for (const candidate of [...measured.values()]) measure((candidate.textHeight - 2) / ratio + 2);
      const score = item => Math.abs(item.difference) + Math.abs(item.width / available - .4) * .01;
      const best = [...measured.values()].sort((a, b) => score(a) - score(b))[0];
      feature.style.setProperty('--map-image-column', `${best.width.toFixed(2)}px`);
    } finally {
      probe.remove();
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
  const observer = new ResizeObserver(schedule);
  observer.observe(feature);
  observer.observe(copy);
  new MutationObserver(schedule).observe(copy, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['style']});
  document.fonts.ready.then(() => { lastSignature = ''; schedule(); });
  schedule();
})();
