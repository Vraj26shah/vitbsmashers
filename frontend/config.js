// Frontend Configuration
// This file contains environment-specific settings for the frontend

const config = {
  // API Base URL - automatically determined based on environment
  get API_BASE() {
    // In development (localhost), use localhost backend
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🌐 Frontend Config: Detected localhost environment, using localhost API');
      return 'http://localhost:4000/api/v1';
    }

    // In production on Render (full-stack deployment)
    if (window.location.hostname.includes('onrender.com')) {
      // Since backend serves frontend, use relative URLs
      console.log('🌐 Frontend Config: Detected Render environment, using relative API URLs');
      return '/api/v1';
    }

    // For other platforms (Vercel, Netlify, etc.)
    if (window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('netlify.app')) {
      // Use the actual deployed Render backend URL
      console.log('🌐 Frontend Config: Detected Vercel/Netlify, using Render backend URL');
      return 'https://vitbsmashers.onrender.com/api/v1';
    }

    // Fallback - try to use same domain (for custom domains or unknown platforms)
    console.log('🌐 Frontend Config: Using fallback - same domain API URLs');
    return '/api/v1';
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

  // Marketplace API endpoints
  get MARKETPLACE_BASE() {
    return `${this.API_BASE}/marketplace`;
  },

  // Admin API endpoints
  get ADMIN_BASE() {
    return `${this.API_BASE}/admin`;
  }
};

// Make config globally available
window.config = config;

// Only export as module if in module context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}