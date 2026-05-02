-- ============================================================
-- RESET FOR TESTING
-- Run in: Supabase Dashboard → SQL Editor
--
-- WHAT THIS CLEARS:
--   ✓ All user accounts (auth + profiles)
--   ✓ Purchases, payments, marketplace listings
--   ✓ Attendance, CGPA, timetable records
--   ✓ Event registrations, club update requests
--
-- WHAT THIS KEEPS (static/admin content):
--   ✓ business.courses         (course catalog)
--   ✓ business.course_modules  (notes/PDFs)
--   ✓ content.mess_menu        (mess schedule)
--
-- ⚠  This is irreversible. Make a backup first if needed.
-- ============================================================

BEGIN;

-- ── 1. Clear leaf / dependent tables first ─────────────────

-- Academic records
DELETE FROM academic.attendance;
DELETE FROM academic.cgpa;
DELETE FROM academic.timetable;

-- Marketplace listings (depends on users)
DELETE FROM business.marketplace_items;

-- Payment records (depends on users + courses)
DELETE FROM business.purchases;
DELETE FROM business.razorpay_orders;

-- ── 2. Clear user profiles ──────────────────────────────────
DELETE FROM business.users;

-- ── 3. Clear Supabase auth users ───────────────────────────
-- This lets you re-register with the same email from scratch.
DELETE FROM auth.users;

COMMIT;

-- ============================================================
-- SINGLE-USER DELETE (use this instead if you only want to
-- remove your own account without touching everyone else)
-- ============================================================
-- Replace 'you@vitbhopal.ac.in' with your actual email.
--
-- BEGIN;
-- DELETE FROM auth.users WHERE email = 'you@vitbhopal.ac.in';
-- COMMIT;
--
-- (Cascades automatically clean up business.users and related
--  tables if FK cascade deletes are set — otherwise also run:)
-- BEGIN;
-- DELETE FROM business.users WHERE email = 'you@vitbhopal.ac.in';
-- DELETE FROM auth.users    WHERE email = 'you@vitbhopal.ac.in';
-- COMMIT;
-- ============================================================
