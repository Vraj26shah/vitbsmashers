# Database — Supabase PostgreSQL

**Project:** Scholarstack  
**Supabase URL:** https://gunogitcgaietobakvbl.supabase.co  
**Region:** Southeast Asia (Singapore)

---

## Schemas

| Schema     | Purpose                                      |
|------------|----------------------------------------------|
| `auth`     | Managed by Supabase — login, sessions, OAuth |
| `business` | Users, courses, purchases, payments, marketplace |
| `academic` | Timetable, attendance, CGPA                  |
| `content`  | Events, faculty, mess menu, notices          |

---

## Tables

### business schema

| Table                | Description                                      | Key Columns |
|----------------------|--------------------------------------------------|-------------|
| `business.users`     | User profiles linked to auth.users               | id (UUID FK → auth.users), email, username, role, branch, year, registration_number |
| `business.courses`   | Course catalog                                   | id, pid (e.g. CSE3001), title, price, category, status, featured |
| `business.course_modules` | PDF modules/PYQs per course              | id, course_id, type (module/pyq/reference), r2_key, module_no |
| `business.purchases` | Source of truth for course access               | user_id, course_id, razorpay_payment_id, amount_paid |
| `business.razorpay_orders` | Tracks payment attempts before completion | user_id, course_id, razorpay_order_id, status, expires_at |
| `business.marketplace_items` | Student-to-student marketplace         | seller_id, title, price, category, condition, is_available |

### academic schema

| Table                 | Description                   | Key Columns |
|-----------------------|-------------------------------|-------------|
| `academic.timetable`  | Weekly schedule per batch     | branch, year, batch, effective_from, schedule (JSONB) |
| `academic.attendance` | Per-subject attendance tracker | user_id, subject_code, total_classes, attended |
| `academic.cgpa`       | Semester-wise grades + GPA    | user_id, semester (1–8), grades (JSONB), sgpa, cgpa |

### content schema

| Table                        | Description              | Key Columns |
|------------------------------|--------------------------|-------------|
| `content.events`             | Campus events            | title, event_date, category, is_active, coordinators (JSONB) |
| `content.event_registrations`| Event sign-ups           | event_id, user_id |
| `content.mess_menu`          | Weekly mess menu         | week_start, menu (JSONB), mess_type |
| `content.faculty`            | Faculty directory        | name, department, designation, photo_r2_key |
| `content.notices`            | Announcements            | title, body, category, is_pinned, expires_at |

---

## RLS (Row Level Security) Rules

| Table                        | Who can read              | Who can write             |
|------------------------------|---------------------------|---------------------------|
| `business.users`             | Own row only (+ admin all)| Own row only              |
| `business.courses`           | Anyone (status=active)    | Admin only                |
| `business.course_modules`    | Only if course purchased  | Admin only                |
| `business.purchases`         | Own rows only             | Backend service key only  |
| `business.razorpay_orders`   | Own rows only             | Backend service key only  |
| `business.marketplace_items` | Anyone (is_available=true)| Own rows (seller)         |
| `academic.timetable`         | Any logged-in user        | Admin only                |
| `academic.attendance`        | Own rows only             | Own rows only             |
| `academic.cgpa`              | Own rows only             | Own rows only             |
| `content.events`             | Anyone (is_active=true)   | Admin only                |
| `content.event_registrations`| Own rows only             | Own rows only             |
| `content.mess_menu`          | Anyone                    | Admin only                |
| `content.faculty`            | Anyone (is_active=true)   | Admin only                |
| `content.notices`            | Anyone (not expired)      | Admin only                |

---

## Cloudflare R2 Bucket Structure

**Bucket name:** `vitbhopal-platform`

```
vitbhopal-platform/
├── courses/
│   ├── {course_uuid}/
│   │   ├── {module_uuid}.pdf      ← uploaded by admin
│   │   └── ...
├── faculty-photos/
│   └── {employee_id}.jpg
└── events/
    └── {event_id}.jpg
```

PDF access: **never public** — backend generates 5-minute signed URLs per request after verifying purchase.

---

## Environment Variables Required

| Variable               | Where to get it                                          | Status |
|------------------------|----------------------------------------------------------|--------|
| `SUPABASE_URL`         | Supabase → Settings → API → Project URL                 | ✅ Set  |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role secret         | ✅ Set  |
| `SUPABASE_ANON_KEY`    | Supabase → Settings → API → anon public                 | ❌ Missing |
| `CLOUDFLARE_ACCOUNT_ID`| Cloudflare dashboard → right sidebar                    | ❌ Missing |
| `R2_ACCESS_KEY_ID`     | Cloudflare → R2 → Manage API Tokens                     | ❌ Missing |
| `R2_SECRET_ACCESS_KEY` | Same token creation page (shown once)                   | ❌ Missing |
| `R2_BUCKET_NAME`       | `vitbhopal-platform` (already set)                      | ✅ Set  |
| `R2_ENDPOINT`          | `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`         | ❌ Missing |

---

## Phase 1 Completion Checklist

- [x] Supabase project created
- [x] Full SQL schema run (all tables created)
- [x] RLS policies applied
- [x] npm packages installed (`@supabase/supabase-js`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- [x] `backend/lib/supabase.js` created
- [x] `backend/lib/r2.js` created
- [x] MongoDB removed from codebase (`db.js`, `passport.js`, `authService.js` deleted)
- [x] `app.js` cleaned (no mongoose/passport/session)
- [x] Auth controller + middleware rewritten for Supabase
- [ ] `SUPABASE_ANON_KEY` added to `.env`
- [ ] Supabase Auth configured (email confirm + Google OAuth in dashboard)
- [ ] Cloudflare R2 bucket `vitbhopal-platform` created
- [ ] R2 API token created and vars added to `.env`

---

## Make a User Admin

After someone signs up, run this in Supabase SQL Editor to grant admin role:

```sql
UPDATE business.users
SET role = 'admin'
WHERE email = 'your-email@vitbhopal.ac.in';
```
