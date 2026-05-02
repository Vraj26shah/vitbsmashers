-- Run this in Supabase Dashboard → SQL Editor
-- This grants the API roles access to your custom schemas.
-- After running, also go to Settings → API → Exposed schemas and add:
--   business, academic, content

-- Grant schema usage to PostgREST roles
GRANT USAGE ON SCHEMA business  TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA academic  TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA content   TO anon, authenticated, service_role;

-- Grant table access within each schema
GRANT ALL ON ALL TABLES    IN SCHEMA business  TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA business  TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA academic  TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA academic  TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA content   TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA content   TO anon, authenticated, service_role;

-- Apply the same grants to any future tables created in these schemas
ALTER DEFAULT PRIVILEGES IN SCHEMA business  GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA business  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA academic  GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA academic  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA content   GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA content   GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
