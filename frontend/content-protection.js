/**
 * Protected course surfaces: blocks context menu; ends session + tears down PDF
 * when inspect / capture shortcuts are used. Redirect is synchronous (no await on
 * network) so the tab leaves immediately on the first detected key.
 */
(function () {
  if (typeof window !== 'undefined' && window.__scholarsContentProtectionV1) return;
  if (typeof window !== 'undefined') window.__scholarsContentProtectionV1 = true;

  const STORAGE_KEY = 'contentProtectionRedirectMsg';
  const REDIRECT_URL = '/features/mycourses/mycourses.html';

  const MSG_INSPECT =
    'Developer tools and inspecting this material are not allowed. Your session was ended, streaming was stopped, and you must sign in again to access protected content.';
  const MSG_CAPTURE =
    'Screenshots and in-browser capture/recording shortcuts are not allowed here. Your session was ended, streaming was stopped, and you must sign in again to access protected content.';

  let redirecting = false;
  /** Prevents Print Screen from firing both keydown + keyup in one physical press. */
  let printScreenHandledAt = 0;

  function punishAndRedirect(userMessage, reason) {
    if (redirecting) return;
    redirecting = true;

    try {
      document.dispatchEvent(
        new CustomEvent('scholarsstack-protect-violation', {
          detail: { reason: reason || 'policy' },
        })
      );
    } catch (_) {}

    try {
      window.stop();
    } catch (_) {}

    try {
      document.documentElement.style.visibility = 'hidden';
      document.documentElement.style.pointerEvents = 'none';
    } catch (_) {}

    const base =
      typeof window !== 'undefined' && window.config && window.config.API_BASE
        ? window.config.API_BASE
        : '/api/v1';

    let token = null;
    try {
      token = localStorage.getItem('token');
    } catch (_) {}

    try {
      sessionStorage.setItem(STORAGE_KEY, userMessage);
    } catch (_) {}

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      fetch(`${base}/auth/revoke-protected-session`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ reason: reason || 'policy' }),
        keepalive: true,
      });
    } catch (_) {}

    try {
      if (window.authManager && typeof window.authManager.clearAuthData === 'function') {
        window.authManager.clearAuthData();
      } else {
        ['token', 'refreshToken', 'userProfile', 'user', 'cart', 'courses_cache'].forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        });
      }
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

  function isPrintScreenEvent(e) {
    return e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.key === 'Print Screen';
  }

  /**
   * macOS / Win capture shortcuts (not Print Screen — handled above).
   * Screen *recording* from OBS, QuickTime, phone cameras, etc. cannot be detected in a normal web page.
   * Here we only punish **browser-delivered** shortcuts (Snipping, macOS capture UI, Xbox Game Bar record/clip).
   */
  function isCaptureShortcutKeydown(e) {
    if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) return true;
    if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) return true;
    if (e.metaKey && e.altKey && (e.key === 'r' || e.key === 'R' || e.key === 'g' || e.key === 'G')) return true;
    return false;
  }

  function onKey(e) {
    if (redirecting) {
      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      e.stopPropagation();
      return;
    }

    if (e.type === 'keydown') {
      if (e.repeat) return;
      if (isInspectShortcut(e)) {
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();
        punishAndRedirect(MSG_INSPECT, 'inspect');
        return;
      }
      if (isPrintScreenEvent(e)) {
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();
        printScreenHandledAt = Date.now();
        punishAndRedirect(MSG_CAPTURE, 'capture');
        return;
      }
      if (isCaptureShortcutKeydown(e)) {
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();
        punishAndRedirect(MSG_CAPTURE, 'capture');
        return;
      }
    }

    if (e.type === 'keyup' && isPrintScreenEvent(e)) {
      if (Date.now() - printScreenHandledAt < 400) return;
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      e.preventDefault();
      e.stopPropagation();
      punishAndRedirect(MSG_CAPTURE, 'capture');
    }
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

  window.addEventListener(
    'contextmenu',
    function (e) {
      e.preventDefault();
      return false;
    },
    true
  );

  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
})();
