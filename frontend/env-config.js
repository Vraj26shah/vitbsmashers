// LOCAL DEV FALLBACK — auto-overridden by the Express backend in production.
// Safe to commit only because SUPABASE_ANON_KEY is a publishable key by design,
// and GOOGLE_CLIENT_ID is a public OAuth identifier.
window.ENV = {
  SUPABASE_URL:      'https://gunogitcgaietobakvbl.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_2i0qvEuWXv5KQEzYZ2X1sA_rJLIyZF6',
  GOOGLE_CLIENT_ID:  '150852944049-1kljh7jhlubn7kpmrss0nccqkm61jv7u.apps.googleusercontent.com',
};
