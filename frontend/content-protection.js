/**
 * Best-effort protection for paid course surfaces. Browsers cannot block OS-level
 * screenshots or external recorders; this deters common shortcuts and redirects
 * when those are used, per product policy.
 */
(function () {
  const STORAGE_KEY = 'contentProtectionRedirectMsg';
  const REDIRECT_URL = '/features/mycourses/mycourses.html';

  const MSG_INSPECT =
    'Opening developer tools or inspecting protected course content is not allowed.';
  const MSG_CAPTURE =
    'Screenshots and screen recording are not allowed while viewing protected course material.';

  let redirecting = false;

  function redirect(msg) {
    if (redirecting) return;
    redirecting = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, msg);
    } catch (_) {}
    window.location.replace(REDIRECT_URL);
  }

  function isInspectShortcut(e) {
    if (e.key === 'F12') return true;
    const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
    if (e.ctrlKey && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) return true;
    if (e.metaKey && e.altKey && (k === 'i' || k === 'j' || k === 'c')) return true;
    if (e.ctrlKey && !e.shiftKey && k === 'u') return true;
    return false;
  }

  function isCaptureShortcut(e) {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') return true;
    if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) return true;
    if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) return true;
    if (e.metaKey && e.altKey && (e.key === 'r' || e.key === 'R')) return true;
    return false;
  }

  const style = document.createElement('style');
  style.textContent = `
    html.content-protected body {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    html.content-protected input,
    html.content-protected textarea {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.documentElement.classList.add('content-protected');
  document.head.appendChild(style);

  document.addEventListener(
    'contextmenu',
    function (e) {
      e.preventDefault();
      return false;
    },
    true
  );

  document.addEventListener(
    'keydown',
    function (e) {
      if (isInspectShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        redirect(MSG_INSPECT);
        return false;
      }
      if (isCaptureShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        redirect(MSG_CAPTURE);
        return false;
      }
    },
    true
  );

  document.addEventListener(
    'keyup',
    function (e) {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        redirect(MSG_CAPTURE);
      }
    },
    true
  );
})();
