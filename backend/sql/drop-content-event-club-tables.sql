-- Run this in Supabase SQL editor if you want to fully remove Event/Club content tables
-- WARNING: This is destructive and permanently deletes table structures and data.

BEGIN;

DROP TABLE IF EXISTS content.event_registrations;
DROP TABLE IF EXISTS content.events;
DROP TABLE IF EXISTS content.club_update_requests;
DROP TABLE IF EXISTS content.clubs;

COMMIT;
