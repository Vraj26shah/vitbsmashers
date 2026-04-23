// Frontend Configuration
// This file contains environment-specific settings for the frontend

const config = {
  // Optional manual override (set from an inline script before config.js loads)
  // Example: window.__API_BASE__ = 'https://your-backend.example.com/api/v1'
  get API_BASE_OVERRIDE() {
    if (typeof window === 'undefined') return null;
    const custom = window.__API_BASE__;
    return (typeof custom === 'string' && custom.trim().length > 0) ? custom.trim().replace(/\/$/, '') : null;
  },

  // API Base URL - automatically determined based on environment
  get API_BASE() {
    if (this.API_BASE_OVERRIDE) {
      return this.API_BASE_OVERRIDE;
    }

    // In development (localhost), use localhost backend
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000/api/v1';
    }

    // In production on Render (full-stack deployment)
    if (window.location.hostname.includes('onrender.com')) {
      // Since backend serves frontend, use relative URLs
      return '/api/v1';
    }

    // For other platforms (Vercel, Netlify, etc.)
    if (window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('netlify.app')) {
      // Use the deployed Railway backend URL
      return 'https://zestful-recreation-production-cd2d.up.railway.app/api/v1';
    }

    // Fallback - try to use same domain (for custom domains or unknown platforms)
    return '/api/v1';
  },

  // API origin used to normalize legacy absolute paths like "/api/v1/..."
  // If API_BASE is relative ("/api/v1"), origin is empty and requests stay same-origin.
  get API_ORIGIN() {
    const base = this.API_BASE;
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return base.replace(/\/api\/v1\/?$/, '');
    }
    return '';
  },

  // Auth API endpoints
  get AUTH_BASE() {
    return `${this.API_BASE}/auth`;
  },

  // Profile API endpoints
  get PROFILE_BASE() {
    return `${this.API_BASE}/profile`;
  },

  // Payment API endpoints
  get PAYMENT_BASE() {
    return `${this.API_BASE}/payment`;
  },

  // Courses API endpoints
  get COURSES_BASE() {
    return `${this.API_BASE}/courses`;
  },

  // Events API endpoints
  get EVENTS_BASE() {
    return `${this.API_BASE}/events`;
  },

  // Faculty API endpoints
  get FACULTY_BASE() {
    return `${this.API_BASE}/faculty`;
  },

  // Clubs API endpoints
  get CLUBS_BASE() {
    return `${this.API_BASE}/clubs`;
  },

  // Marketplace API endpoints
  get MARKETPLACE_BASE() {
    return `${this.API_BASE}/marketplace`;
  },

  // Admin API endpoints
  get ADMIN_BASE() {
    return `${this.API_BASE}/admin`;
  },

  // Normalize URL for legacy fetch calls that still use "/api/v1/..."
  resolveApiUrl(inputUrl) {
    try {
      const parsed = new URL(inputUrl, window.location.origin);
      const isApiPath = parsed.pathname.startsWith('/api/');
      if (!isApiPath) return inputUrl;

      const apiOrigin = this.API_ORIGIN;
      if (!apiOrigin) return inputUrl;

      return `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (error) {
      return inputUrl;
    }
  }
};

// Make config globally available
window.config = config;

// Backward-compatible fetch patch:
// rewrites "/api/*" calls to the configured backend origin when frontend/backend are split.
if (typeof window !== 'undefined' && typeof window.fetch === 'function' && !window.__apiFetchPatched) {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function patchedFetch(input, init) {
    if (typeof input === 'string') {
      return nativeFetch(config.resolveApiUrl(input), init);
    }

    if (input instanceof Request) {
      const rewrittenUrl = config.resolveApiUrl(input.url);
      if (rewrittenUrl !== input.url) {
        return nativeFetch(new Request(rewrittenUrl, input), init);
      }
    }

    return nativeFetch(input, init);
  };

  window.__apiFetchPatched = true;
}

// Only export as module if in module context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}
