(() => {
  'use strict';
  const section = document.getElementById('projects');
  const track = document.getElementById('project-track');
  const details = {
    mindmap: document.getElementById('mindmap-project-detail'),
    adhd: document.getElementById('adhd-project-detail'),
    todo: document.getElementById('todo-project-detail')
  };
  const detailNames = { mindmap: 'Mindmap', adhd: 'ADHD Reader', todo: 'To-do' };
  const right = document.querySelector('.split-panel-right');
  const mobileSlot = document.getElementById('project-mobile-detail');
  if (!section || !track || Object.values(details).some(detail => !detail) || !right || !mobileSlot) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const draftKey = 'gao-kexin.projects.copy-drafts.v1';
  const languageKey = 'gao-kexin.projects.language.v1';
  const defaults = {
    en: {
      "mindmap.title": "Kexin's Mindmap",
      "mindmap.card": "I was paying 700+ CNY for XMind every year. Then I built my own, to my taste and my workflow, polished by the pickiest user I know: myself. Hundreds of maps later, it’s still the first thing I open when I need to think.",
      "adhd.title": "ADHD Reader",
      "adhd.note": "Reading the same paragraph for the third time felt like a feature nobody had asked for. So I built a reader that locks onto one line at a time and keeps me there. The paper is still hard, but at least now I’m the one reading it.\n",
      "todo.title": "Kexin's To-Do",
      "todo.note": "I kept losing the thought I was about to write down. So I built a small to-do window that lives on my desktop and outsourced my prefrontal cortex to it. Life got a lot easier.\n",
      "mindmap.story": "I’m a heavy mind-map user. I build the big picture one branch at a time, and every branch is a small win, so I’m completely hooked. That loop is the whole point, so the app is built to keep it fast: I can add branches without leaving the keyboard. And because a map is only useful if it feeds the rest of my learning, maps stay on my machine and export to PDF and Markdown.",
      "mindmap.demoTitle": "Interactive demo",
      "mindmap.hint": "Select a node. Enter adds a sibling; Tab adds a child. Double-click to edit. Backspace to delete. You can also use the buttons below.",
      "adhd.story": "I wanted a reader that helps me stay with the text without taking away the rest of the page. Click a line to move the guide, or use the arrow keys to keep reading. Select text to highlight, underline, comment, or look up a word. Annotations save back into the PDF, so I can open them in other PDF readers too. There is a Chrome version for everyday reading and a companion add-on for Zotero.",
      "adhd.demoTitle": "Interactive demo",
      "adhd.hint": "Click a line, then use ↑, ↓ or Enter to follow the text. Select words to annotate. ",
      "todo.story": "Tasks live in colored topic columns, and links get their own Watching list. It’s a Windows app that saves everything as local Markdown and can collapse to a floating circle when it’s in the way.\n",
      "todo.demoTitle": "Interactive demo",
      "todo.hint": "Type in a card and press Enter for another. Click the circle to complete it or drag its handle to move it. Scroll sideways to see more topics.",
      "mindmap.versionNote": "Simplified browser version",
      "adhd.versionNote": "Simplified browser version",
      "todo.versionNote": "Simplified browser version"
    },
    zh: {
      'mindmap.versionNote': '浏览器简化版', 'adhd.versionNote': '浏览器简化版', 'todo.versionNote': '浏览器简化版',
      'mindmap.title': 'Mindmap',
      'mindmap.card': '被 XMind 七百多一年的订阅费劝退后，我选了个非常“省事”的办法：自己搓一个。审美自己定，细节自己磨。几百张导图用下来，最挑剔的用户一直是我。',
      'mindmap.story': '我用思维导图建立一个领域的全景，再把问题、概念和它们的关系逐层展开。用得多，对工具的意见也就多。于是，我做了一个合自己审美、也合自己习惯的编辑器。现在已经用它画了几百张导图。反馈流程非常短：发现哪里不顺手，就转头去找开发者。开发者也是我。',
      'mindmap.demoTitle': '交互演示',
      'mindmap.hint': '选中节点，Enter 添加同级，Tab 添加子节点，双击编辑文字。也可以用下方的按钮操作。',
      'adhd.title': 'ADHD Reader', "adhd.note": "同一段读到第三遍，我开始觉得需要升级的也许不只是意志力。于是做了一个逐行引导的 PDF 阅读器：当前这一行清楚一点，旁边的文字安静一点。顺手做的标注，也能跟着 PDF 一起走。", "adhd.story": "我想要一个能帮我跟住文字、又不把整页内容藏起来的阅读器。点击哪一行，引导就停在哪里；上下键和 Enter 接着往下读。划词后可以高亮、加下划线、写评论或查中文释义，标注还能保存回 PDF，在别的阅读器里继续看。日常阅读用 Chrome 版本，论文工作流里则有配套的 Zotero 插件。", "adhd.demoTitle": "交互演示", "adhd.hint": "点击一行，再用 ↑、↓ 或 Enter 逐行阅读；选中文字可以标注。这里放了 OpenVLA，也可以打开你自己的 PDF。",
      'todo.title': 'To-do',
      'todo.note': '一款放在 Windows 桌面上的小清单。想到什么就直接写进色块，换个主题就拖过去，做完点一下圆圈。',
      'todo.story': '我想给那些转眼就会忘的念头找个地方。To-do 用不同颜色的主题列整理待办，给想看的东西留了一列 Watching list。Windows 版把清单存成 Markdown，也可以收成一个桌面浮球。',
      'todo.demoTitle': '交互演示',
      'todo.hint': '直接点卡片输入，回车加一条。点圆圈完成事项，拖动右侧把手可移动卡片。横向滑动查看更多主题。'
    }
  };
  let drafts = {}, language = 'en';
  try { drafts = JSON.parse(localStorage.getItem(draftKey) || '{}') || {}; } catch (_) {}
  try { language = localStorage.getItem(languageKey) === 'zh' ? 'zh' : 'en'; } catch (_) {}
  const fields = [...document.querySelectorAll('[data-project-text]')];
  const cards = [...track.querySelectorAll('.project-card')];
  const frame = document.getElementById('mindmap-demo-frame');
  const readerFrame = document.getElementById('adhd-demo-frame');
  const todoFrame = document.getElementById('todo-demo-frame');
  const readerURL = new URL('./demos/adhd-reader/', location.href);
  readerURL.searchParams.set('v', 'instant-pages');
  readerURL.searchParams.set('url', new URL('./demos/adhd-reader/openvla.pdf', location.href).href);

  function status(saved = false, failed = false) {
    const text = failed ? (language === 'zh' ? '无法保存草稿，请先复制文字。' : 'Draft could not be saved. Please copy your text.')
      : saved ? (language === 'zh' ? '草稿已保存 · 仅当前浏览器' : 'Draft saved · in this browser')
      : (language === 'zh' ? '点击文字即可修改 · 自动保存为当前浏览器草稿' : 'Click the text to edit · drafts save in this browser');
    document.querySelectorAll('[data-project-draft-status]').forEach(el => { el.textContent = text; });
  }
  function applyLanguage() {
    section.lang = language === 'zh' ? 'zh-CN' : 'en';
    Object.values(details).forEach(detail => { detail.lang = section.lang; });
    fields.forEach(el => {
      const key = el.dataset.projectText;
      window.copyFormatting.enable(el, 'project:' + language + ':' + key);
      const fallback = el.matches('h2, h3') && !el.hasAttribute('data-preserve-title-case') ? window.siteTitleCase(defaults[language][key]) : defaults[language][key];
      el.textContent = typeof drafts[language]?.[key] === 'string' ? drafts[language][key] : fallback;
      window.copyFormatting.restore(el);
      el.setAttribute('aria-label', (language === 'zh' ? '编辑：' : 'Edit: ') + defaults[language][key].slice(0, 50));
    });
    const openLabels = { mindmap: '查看项目', adhd: '查看项目', todo: '查看项目' };
    document.querySelectorAll('[data-project-open-label]').forEach(el => { el.textContent = language === 'zh' ? openLabels[el.dataset.projectOpen] : 'View project'; });
    document.querySelectorAll('.project-close').forEach(el => { el.textContent = language === 'zh' ? '关闭 ×' : 'Close ×'; });
    status();
    if (frame.hasAttribute('src')) frame.contentWindow?.postMessage({ type: 'mindmap-demo-language', language }, location.origin);
  }
  fields.forEach(el => {
    el.spellcheck = true;
    el.setAttribute('role', 'textbox');
    el.setAttribute('aria-multiline', 'true');
    el.addEventListener('input', () => {
      const key = el.dataset.projectText;
      const value = window.copyFormatting.capture(el).text;
      if (!drafts[language] || typeof drafts[language] !== 'object') drafts[language] = {};
      drafts[language][key] = value;
      fields.filter(other => other !== el && other.dataset.projectText === key).forEach(other => { other.textContent = value; window.copyFormatting.restore(other); });
      try { window.copyFormatting.persist(); localStorage.setItem(draftKey, JSON.stringify(drafts)); status(true); }
      catch (_) { status(false, true); }
    });
  });
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const max = track.scrollWidth - track.clientWidth;
    const positions = cards.map(card => Math.min(max, card.offsetLeft - cards[0].offsetLeft));
    const left = track.scrollLeft;
    const next = event.key === 'ArrowRight'
      ? positions.find(position => position > left + 1)
      : positions.findLast(position => position < left - 1);
    if (next !== undefined) track.scrollTo({ left: next, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  let drag = null, suppressClick = false;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    // A partially visible button should not scroll into view when pressed with the mouse.
    if (event.target.closest('button')) event.preventDefault();
    if (event.target.closest('[contenteditable], a, .project-card-links') || track.scrollWidth <= track.clientWidth) return;
    drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
  });
  track.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.scale = track.getBoundingClientRect().width / track.offsetWidth || 1;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
      document.dispatchEvent(new CustomEvent('site:select-section', { detail: { id: 'projects' } }));
    }
    event.preventDefault();
    const max = track.scrollWidth - track.clientWidth;
    drag.left = Math.max(0, Math.min(max, drag.left - delta / drag.scale));
    drag.x = event.clientX;
    track.scrollLeft = drag.left;
  });
  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    suppressClick = drag.moved;
    drag = null;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove('is-dragging');
    setTimeout(() => { suppressClick = false; }, 0);
  }
  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('lostpointercapture', finishDrag);
  track.addEventListener('pointerleave', event => {
    if (drag && !drag.moved && drag.id === event.pointerId) drag = null;
  });
  track.addEventListener('click', event => {
    if (!suppressClick) return;
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);

  document.querySelectorAll('[data-project-open]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.projectOpen;
    if (!details[key]) return;
    window.siteDetails.open({
      element: details[key], section: 'projects', kind: 'project', label: detailNames[key], opener: button,
      onReveal() {
        if (key === 'mindmap') {
          if (!frame.hasAttribute('src')) frame.src = `./demos/mindmap.html?lang=${language}&v=centered-seed`;
          else frame.contentWindow?.postMessage({ type: 'mindmap-demo-open' }, location.origin);
        }
        if (key === 'adhd' && !readerFrame.hasAttribute('src')) readerFrame.src = readerURL.href;
        if (key === 'todo' && !todoFrame.hasAttribute('src')) todoFrame.src = './demos/todo.html?v=parent-glass';
      }
    });
  }));
  frame.addEventListener('load', () => frame.contentWindow?.postMessage({ type: 'mindmap-demo-language', language }, location.origin));
  applyLanguage();
})();
