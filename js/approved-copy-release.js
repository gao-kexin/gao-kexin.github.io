(() => {
  'use strict';
  const releaseKey = 'gao-kexin.approved-copy-release.2026-11-15.v4';
  const draftKey = 'gao-kexin.home.bio-draft.v1';
  const blocksKey = 'gao-kexin.home.bio-blocks.v1';
  const sectionsKey = 'gao-kexin.section-copy-drafts.v1';
  const formatsKey = 'gao-kexin.copy-formatting.v1';
  const approved = {
  "bioBaselines": [
    "Hi! I'm GAO Kexin (pronounced kuh-sheen), a computer science undergraduate at HKUST.  Previously, I built AI agents at a fundraising advisory firm to find promising startups in embodied AI and match them with the right investors.\n\nI work on embodied intelligence: how intelligent systems understand their environments, make decisions, and learn through interaction.\n\nI built this website to connect with you, so feel free to reach out:)\n\nHow to Read This Site\n\nMindset is the most important part of me. It covers how I define, approach and reflect on a problem & how I learn a new field. Take Mindset away, what’s left wouldn’t be me.\n\nResearch & Projects show that mindset at work: tools and prototypes built from problems I ran into myself, each tested through real use.\n\nMind Maps holds my knowledge maps, including Research Map, which organizes AI research from problems down to mechanisms and open limitations.\n\nBlog is where I think in public: how a question takes shape and how new information changes an earlier view.",
    "Hi! I'm GAO Kexin, a computer science undergraduate at HKUST. I work on embodied intelligence: how intelligent systems understand their environments, make decisions, and learn through interaction. \r\n\r\nHow to Read This Site:\r\n\r\nMindset is the most important part of me. It covers how I define, approach and reflect on a problem & how I learn a new field. Take Mindset away, what’s left wouldn’t be me.\r\n\r\nResearch & Projects show that mindset at work: tools and prototypes built from problems I ran into myself, each tested through real use.\r\n\r\nMaps holds my knowledge maps, including Research Map, which organizes AI research from problems down to mechanisms and open limitations.\r\n\r\nBlogs is where I think in public: how a question takes shape and how new information changes an earlier view.\r\n\r\nFeel free to reach out :)"
  ],
  "oldBioBlocks": [
    "Hi! I'm GAO Kexin (pronounced kuh-sheen), a computer science undergraduate at HKUST.  Previously, I built AI agents at a fundraising advisory firm to find promising startups in embodied AI and match them with the right investors.",
    "I work on embodied intelligence: how intelligent systems understand their environments, make decisions, and learn through interaction.",
    "I built this website to connect with you, so feel free to reach out:)",
    "How to Read This Site",
    "Mindset is the most important part of me. It covers how I define, approach and reflect on a problem & how I learn a new field. Take Mindset away, what’s left wouldn’t be me.",
    "Research & Projects show that mindset at work: tools and prototypes built from problems I ran into myself, each tested through real use.",
    "Mind Maps holds my knowledge maps, including Research Map, which organizes AI research from problems down to mechanisms and open limitations.",
    "Blog is where I think in public: how a question takes shape and how new information changes an earlier view."
  ],
  "newBioBlocks": [
    "Hi! I'm GAO Kexin (pronounced kuh-sheen), a computer science undergraduate at HKUST. I’m currently a UROP student in the Pervasive Intelligence Lab, led by Prof. Song Guo.",
    "I’m interested in embodied intelligence: how intelligent systems understand their environments and act within them. I’m currently exploring how to evaluate vision-language-action models and world action models—which capabilities a test measures, and what its results actually establish.",
    "Previously, during an internship at a fundraising advisory firm, I built AI agents to identify embodied-AI startups and match them with investors. I also build tools for my own learning and everyday work, refining them through use.",
    "I built this website to connect with you, so feel free to reach out:)",
    "How to Read This Site",
    "Mindset — how I connect top-down structure with bottom-up understanding, approach problems, and recognize my limits. Take Mindset away, what’s left wouldn’t be me.",
    "Research — my ongoing exploration of how to evaluate VLA models and world action models.",
    "Projects — tools I built for problems I kept running into, with interactive demos.",
    "Mind Maps — how I learn: mapping the big picture, connecting ideas, and making gaps in my understanding visible.",
    "Blog — a place to think in writing, explore questions, and revisit my views as I learn."
  ],
  "sectionCorrections": {
    "mindset.taste.teaser": {
      "from": ["I wrote a blog about my thoughts on taste."],
      "to": "I wrote a blog post about my thoughts on taste."
    },
    "blog.second.body": {
      "from": ["Strong execution is valuable, but it compounds linearly: it makes the current plan go faster."],
      "to": "Strong execution helps move a plan forward.",
      "partial": true
    },
    "mindset.limits.title": {
      "from": ["My Limits"],
      "to": "My Current Limits"
    },
    "research.dimensions.title": {
      "from": [
        "A Survery: Evaluation Dimensions for VLAs and World Action Models (In Progress)"
      ],
      "to": "A Survey: Evaluation Dimensions for VLAs and World Action Models (In Progress)"
    },
    "maps.research.title": {
      "from": [
        "Research Map"
      ],
      "to": "AI Map"
    }
  }
};
  // The introduction renderer expanded these historical section names on screen.
  const normalize = text => text.replace(/\r\n/g, '\n')
    .replace(/^Maps\b/gm, 'Mind Maps').replace(/^Blogs\b/gm, 'Blog').trim();
  try {
    if (localStorage.getItem(releaseKey)) return;
    const original = Object.fromEntries([draftKey, blocksKey, sectionsKey, formatsKey]
      .map(key => [key, localStorage.getItem(key)]));
    const writes = new Map();
    const savedBio = original[draftKey];
    if (typeof savedBio === 'string' && approved.bioBaselines.some(text => normalize(text) === normalize(savedBio))) {
      const text = document.getElementById('bio-editor').value;
      writes.set(draftKey, text);
      writes.set(blocksKey, JSON.stringify({ text, blocks: approved.newBioBlocks.map((text, index) => ({
        text, kind: index < 4 ? 'body' : index === 4 ? 'guide-heading' : 'guide'
      })) }));
      const formats = JSON.parse(original[formatsKey] || '{}');
      const oldFormats = { ...formats };
      approved.oldBioBlocks.forEach((_, index) => { delete formats['bio:' + index]; });
      approved.newBioBlocks.forEach((text, index) => {
        const oldIndex = approved.oldBioBlocks.indexOf(text);
        const format = oldFormats['bio:' + oldIndex];
        if (oldIndex >= 0 && format?.text === text) formats['bio:' + index] = format;
      });
      writes.set(formatsKey, JSON.stringify(formats));
    }
    const sections = JSON.parse(original[sectionsKey] || '{}');
    const formats = JSON.parse(writes.get(formatsKey) || original[formatsKey] || '{}');
    let corrected = false;
    let formatted = false;
    for (const [key, correction] of Object.entries(approved.sectionCorrections)) {
      const before = sections[key];
      if (typeof before !== 'string') continue;
      const from = correction.from.find(text => correction.partial ? before.includes(text) : before === text);
      if (from === undefined) continue;
      const start = before.indexOf(from), end = start + from.length;
      const after = before.slice(0, start) + correction.to + before.slice(end);
      sections[key] = after;
      corrected = true;
      const format = formats['section:' + key];
      if (format?.text === before) {
        const delta = correction.to.length - from.length;
        const shift = position => position <= start ? position : position >= end ? position + delta : start + Math.min(position - start, correction.to.length);
        format.text = after;
        for (const kind of ['marks', 'headings']) {
          if (Array.isArray(format[kind])) format[kind] = format[kind]
            .map(range => ({ ...range, start: shift(range.start), end: shift(range.end) }))
            .filter(range => range.end > range.start);
        }
        if (typeof format.html === 'string') {
          if (format.html.includes(from)) format.html = format.html.replace(from, correction.to);
          // Split inline spans fall back to the preserved heading and emphasis ranges.
          else delete format.html;
        }
        formatted = true;
      }
    }
    if (corrected) writes.set(sectionsKey, JSON.stringify(sections));
    if (formatted) writes.set(formatsKey, JSON.stringify(formats));
    if (writes.size) {
      localStorage.setItem(releaseKey + '.backup', JSON.stringify(original));
      for (const [key, value] of writes) localStorage.setItem(key, value);
    }
    localStorage.setItem(releaseKey, 'applied');
  } catch { /* Keep local drafts usable if storage is unavailable. */ }
})();
