(() => {
  'use strict';
  const controls = ['email-open', 'wechat-open']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const status = document.getElementById('email-copy-status');
  const writeButton = document.getElementById('email-write');
  const composerOptions = document.getElementById('email-composer-options');
  const address = document.getElementById('email-address');
  function emailAddress() {
    return address.textContent.replace(/\s*\[at\]\s*/g, '@').replace(/\s*\[dot\]\s*/g, '.').trim();
  }
  document.querySelectorAll('[data-email-service]').forEach(button => {
    button.addEventListener('click', () => {
      const email = emailAddress();
      let url;
      if (button.dataset.emailService === 'gmail') {
        const compose = new URL('https://mail.google.com/mail/');
        compose.search = new URLSearchParams({ view: 'cm', fs: '1', to: email }).toString();
        url = new URL('https://accounts.google.com/AccountChooser/signinchooser');
        url.searchParams.set('continue', compose.href);
      } else {
        url = new URL('https://outlook.office.com/mail/deeplink/compose');
        url.searchParams.set('to', email);
      }
      window.open(url.href, '_blank', 'noopener,noreferrer');
    });
  });

  controls.forEach(control => {
    control.addEventListener('click', () => {
      const shouldOpen = control.getAttribute('aria-expanded') !== 'true';
      if (status) status.textContent = '';
      if (composerOptions) composerOptions.hidden = true;
      if (writeButton) writeButton.setAttribute('aria-expanded', 'false');
      controls.forEach(item => {
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        const open = item === control && shouldOpen;
        item.setAttribute('aria-expanded', String(open));
        if (panel) panel.hidden = !open;
      });
    });
  });

  if (writeButton && composerOptions) {
    writeButton.addEventListener('click', () => {
      const open = composerOptions.hidden;
      composerOptions.hidden = !open;
      writeButton.setAttribute('aria-expanded', String(open));
    });
  }

  const copyButton = document.getElementById('email-copy');
  if (!copyButton || !address || !status) return;

  copyButton.addEventListener('click', async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(emailAddress());
      copied = true;
    } catch {
      const buffer = document.createElement('textarea');
      buffer.value = emailAddress();
      buffer.setAttribute('readonly', '');
      buffer.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.append(buffer);
      buffer.select();
      try { copied = document.execCommand('copy'); } catch { /* Report below. */ }
      buffer.remove();
      copyButton.focus({ preventScroll: true });
    }
    status.textContent = copied ? 'Address copied.' : 'Replace [at] with @ and [dot] with .';
  });
})();
