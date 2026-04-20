import rateLimit from 'express-rate-limit';

/**
 * Trust first proxy hop (Render, Vercel, etc.) so rate limits use real client IP.
 */
export function trustProxyIfNeeded(app) {
  if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many authentication attempts. Try again later.' },
});

export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many attempts. Try again in a few minutes.' },
});
