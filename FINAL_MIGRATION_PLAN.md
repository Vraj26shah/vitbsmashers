# VIT Bhopal Scholars Stack — Final Migration Plan
# MongoDB + Google Drive → Supabase + Cloudflare R2

> **Written:** 2026-04-19  
> **Based on:** Full codebase audit of current implementation  
> **Goal:** Complete, working website with Supabase + R2. Zero MongoDB. Zero Google Drive in the hot path.  
> **Estimated total time:** 3–4 weeks working consistently

---

## Current State vs Target State

```
CURRENT (what exists now)            TARGET (what we're building)
─────────────────────────────        ─────────────────────────────
MongoDB             → Supabase PostgreSQL
Custom JWT + OTP    → Supabase Auth (built-in email + Google)
Google Drive PDFs   → Cloudflare R2
Mongoose models     → SQL tables + RLS policies
Hardcoded courses   → Database-driven course catalog
Stub controllers    → Fully implemented (timetable, attendance, GPA, mess)
Node.js Express     → STAYS (not replacing backend)
Vanilla HTML/JS     → STAYS (not replacing frontend)
```

---

## Files That Get Deleted Completely

```
backend/models/user.model.js          → Replaced by Supabase Auth + business.users table
backend/models/course.model.js        → Replaced by business.courses + academic.* tables
backend/models/event.model.js         → Replaced by content.events table
backend/models/faculty.model.js       → Replaced by content.faculty table
backend/models/orderModel.js          → Replaced by business.razorpay_orders table
backend/models/marketplaceItem.model.js → Replaced by business.marketplace_items table
backend/models/pendingEventUpdate.model.js   → Replaced by Supabase RLS workflow
backend/models/pendingFacultyUpdate.model.js → Replaced by Supabase RLS workflow
backend/config/passport.js            → Supabase Auth handles Google OAuth
backend/utils/migrateToSupabase.js    → Replace with migrateToR2.js
```

---

## Phase Overview

```
Phase 1 — Infrastructure Setup          (Day 1-2)
Phase 2 — Authentication               (Day 3-5)
Phase 3 — Profile System               (Day 6-7)
Phase 4 — Course Catalog               (Day 8-10)
Phase 5 — PDF Storage + Secure Access  (Day 11-14)
Phase 6 — Payment System               (Day 15-17)
Phase 7 — Content Features             (Day 18-20)
Phase 8 — Academic Tools               (Day 21-23)
Phase 9 — Student Marketplace          (Day 24-25)
Phase 10 — Cleanup + Deployment        (Day 26-28)
```

---

## Phase 1 — Infrastructure Setup

**Goal:** Supabase project live, all tables created, R2 bucket ready, .env updated.  
**Nothing in the app changes yet. Backend still runs on MongoDB.**

---

### Step 1.1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `vitbhopal-platform`
3. Region: `Southeast Asia (Singapore)` — closest to India
4. Save the database password securely

From **Settings → API** copy:
- `Project URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_KEY`

---

### Step 1.2 — Run the Full SQL Schema

Go to **SQL Editor** in Supabase dashboard and run this entire block:

```sql
-- ════════════════════════════════════════
-- EXTENSIONS
-- ════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════
-- BUSINESS SCHEMA
-- ════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS business;
CREATE SCHEMA IF NOT EXISTS academic;
CREATE SCHEMA IF NOT EXISTS content;

-- ── business.users ──────────────────────
-- Mirror of auth.users with VIT-specific profile data
CREATE TABLE business.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT UNIQUE NOT NULL,
  username            TEXT UNIQUE NOT NULL,
  full_name           TEXT,
  phone               TEXT,
  registration_number TEXT,              -- '23BCE00001'
  branch              TEXT,              -- 'CSE', 'ECE', 'MECH', 'CIVIL', 'IT'
  year                INT,               -- 1 to 4
  profile_picture     TEXT,              -- URL
  role                TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_verified         BOOLEAN DEFAULT false,
  profile_completed   BOOLEAN DEFAULT false,
  is_banned           BOOLEAN DEFAULT false,
  ban_reason          TEXT,
  last_profile_update DATE,
  profile_update_count INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ── business.courses ────────────────────
CREATE TABLE business.courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid             TEXT UNIQUE NOT NULL,         -- 'CSE3001', 'MAT2001'
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,                -- 'Computer Science', 'Mathematics', etc.
  subcategory     TEXT,
  level           TEXT DEFAULT 'Intermediate'
                    CHECK (level IN ('Beginner','Intermediate','Advanced','All Levels')),
  instructor      TEXT,
  language        TEXT DEFAULT 'English',
  price           DECIMAL(10,2) NOT NULL,
  original_price  DECIMAL(10,2),
  discount        INT DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
  image           TEXT NOT NULL,
  thumbnail       TEXT,
  tags            TEXT[],
  rating          DECIMAL(3,2) DEFAULT 0,
  review_count    INT DEFAULT 0,
  access_duration TEXT DEFAULT 'Lifetime'
                    CHECK (access_duration IN ('Lifetime','1 Year','6 Months','3 Months','1 Month')),
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active','inactive','draft','archived')),
  featured        BOOLEAN DEFAULT false,
  bestseller      BOOLEAN DEFAULT false,
  new_arrival     BOOLEAN DEFAULT false,
  modules_count   INT DEFAULT 0,
  notes_count     INT DEFAULT 0,
  hours           DECIMAL(5,2) DEFAULT 0,
  created_by      UUID REFERENCES business.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── business.course_modules ─────────────
-- Each module/PYQ that has a PDF attached to it
CREATE TABLE business.course_modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES business.courses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('module','pyq','reference')),
  title         TEXT NOT NULL,
  topics        TEXT,
  duration      TEXT,
  module_no     INT,          -- 1..5 for modules, null for pyq/reference
  academic_year TEXT,         -- '2023', '2023-24' for PYQs
  r2_key        TEXT,         -- 'cse3001/module-1-er-model.pdf'
  display_order INT DEFAULT 1,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── business.purchases ──────────────────
-- Source of truth: if a row exists → user has access
CREATE TABLE business.purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES business.users(id),
  course_id           UUID NOT NULL REFERENCES business.courses(id),
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id   TEXT,
  amount_paid         DECIMAL(10,2) NOT NULL,
  payment_status      TEXT DEFAULT 'completed'
                        CHECK (payment_status IN ('completed','refunded','disputed')),
  purchased_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, course_id)
);

-- ── business.razorpay_orders ────────────
-- Tracks payment attempts before completion
CREATE TABLE business.razorpay_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES business.users(id),
  course_id         UUID NOT NULL REFERENCES business.courses(id),
  razorpay_order_id TEXT UNIQUE NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  status            TEXT DEFAULT 'created'
                      CHECK (status IN ('created','paid','failed','expired')),
  created_at        TIMESTAMPTZ DEFAULT now(),
  expires_at        TIMESTAMPTZ DEFAULT now() + INTERVAL '15 minutes'
);

-- ── business.marketplace_items ──────────
-- Student-to-student marketplace (separate from course marketplace)
CREATE TABLE business.marketplace_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    UUID NOT NULL REFERENCES business.users(id),
  title        TEXT NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL,
  category     TEXT CHECK (category IN ('Notes','Books','Electronics','Stationery','Other')),
  subject      TEXT,
  course       TEXT,
  images       TEXT[],
  condition    TEXT CHECK (condition IN ('New','Like New','Good','Fair','Poor')),
  location     TEXT,
  contact_info TEXT,
  tags         TEXT[],
  is_available BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════
-- ACADEMIC SCHEMA
-- ════════════════════════════════════════

-- ── academic.timetable ──────────────────
CREATE TABLE academic.timetable (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus         TEXT NOT NULL DEFAULT 'vit-bhopal',
  branch         TEXT NOT NULL,
  year           INT NOT NULL,   -- 1 to 4
  batch          TEXT NOT NULL,  -- 'A1', 'A2', 'B1', 'B2'
  effective_from DATE NOT NULL,
  effective_to   DATE,
  schedule       JSONB NOT NULL,
  created_by     UUID REFERENCES business.users(id),
  updated_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(campus, branch, year, batch, effective_from)
);

-- ── academic.attendance ─────────────────
CREATE TABLE academic.attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES business.users(id),
  subject_code   TEXT NOT NULL,
  subject_name   TEXT NOT NULL,
  total_classes  INT NOT NULL DEFAULT 0,
  attended       INT NOT NULL DEFAULT 0,
  last_updated   TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, subject_code),
  CHECK (attended <= total_classes),
  CHECK (total_classes >= 0),
  CHECK (attended >= 0)
);

-- ── academic.cgpa ───────────────────────
CREATE TABLE academic.cgpa (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES business.users(id),
  semester       INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  grades         JSONB NOT NULL DEFAULT '{}',
  sgpa           DECIMAL(4,2),
  cgpa           DECIMAL(4,2),
  credits_earned INT DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, semester)
);

-- ════════════════════════════════════════
-- CONTENT SCHEMA
-- ════════════════════════════════════════

-- ── content.events ──────────────────────
CREATE TABLE content.events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT,
  event_date            DATE NOT NULL,
  event_time            TIME,
  location              TEXT,
  category              TEXT CHECK (category IN
                          ('Academic','Cultural','Sports','Technical','Workshop','Seminar','Other')),
  organizer             TEXT,
  contact_email         TEXT,
  image                 TEXT,         -- R2 key or URL
  capacity              INT,
  registration_deadline DATE,
  registration_link     TEXT,
  is_registration_open  BOOLEAN DEFAULT true,
  prizes                JSONB,        -- ["₹10,000 first prize"]
  coordinators          JSONB,        -- [{name, phone, email}]
  is_active             BOOLEAN DEFAULT true,
  created_by            UUID REFERENCES business.users(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ── content.event_registrations ─────────
CREATE TABLE content.event_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES content.events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES business.users(id),
  registered_at TIMESTAMPTZ DEFAULT now(),
  extra_data    JSONB,

  UNIQUE(event_id, user_id)
);

-- ── content.mess_menu ───────────────────
CREATE TABLE content.mess_menu (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  menu       JSONB NOT NULL,
  mess_type  TEXT DEFAULT 'both' CHECK (mess_type IN ('veg','nonveg','both')),
  updated_by UUID REFERENCES business.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── content.faculty ─────────────────────
CREATE TABLE content.faculty (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  employee_id   TEXT UNIQUE,
  department    TEXT NOT NULL CHECK (department IN
                  ('CSE','ECE','ME','CE','IT','EEE','Biotech','Other')),
  designation   TEXT CHECK (designation IN
                  ('Professor','Associate Professor','Assistant Professor','Lecturer')),
  phone         TEXT,
  office        TEXT,
  specialization TEXT[],
  bio           TEXT,
  photo_r2_key  TEXT,
  availability  JSONB,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── content.notices ─────────────────────
CREATE TABLE content.notices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  category   TEXT CHECK (category IN ('exam','holiday','general','urgent')),
  is_pinned  BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES business.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════
CREATE INDEX ON business.courses (status, featured);
CREATE INDEX ON business.courses (category);
CREATE INDEX ON business.courses (pid);
CREATE INDEX ON business.course_modules (course_id, type);
CREATE INDEX ON business.purchases (user_id);
CREATE INDEX ON business.marketplace_items (seller_id, is_available);
CREATE INDEX ON academic.timetable (branch, year, batch);
CREATE INDEX ON academic.attendance (user_id);
CREATE INDEX ON content.events (event_date, is_active);
CREATE INDEX ON content.faculty (department, is_active);
```

---

### Step 1.3 — Run RLS Policies

```sql
-- Enable RLS on every table
ALTER TABLE business.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.courses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.course_modules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.purchases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.razorpay_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.marketplace_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.timetable           ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.cgpa                ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.event_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.mess_menu            ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.faculty              ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.notices              ENABLE ROW LEVEL SECURITY;

-- ── Users: own data only ──
CREATE POLICY "users_read_own"   ON business.users FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON business.users FOR UPDATE  USING (auth.uid() = id);
-- Admins can read all users
CREATE POLICY "admin_read_users" ON business.users FOR SELECT
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');

-- ── Courses: public read, admin write ──
CREATE POLICY "courses_public_read" ON business.courses FOR SELECT USING (status = 'active');
CREATE POLICY "courses_admin_all"   ON business.courses FOR ALL
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');

-- ── Course modules: only if course purchased ──
CREATE POLICY "modules_purchased_only" ON business.course_modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM business.purchases
    WHERE user_id = auth.uid()
    AND course_id = course_modules.course_id
  )
);
CREATE POLICY "modules_admin_all" ON business.course_modules FOR ALL
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');

-- ── Purchases: own only ──
CREATE POLICY "purchases_own" ON business.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "purchases_backend_insert" ON business.purchases FOR INSERT WITH CHECK (true); -- backend uses service key

-- ── Razorpay orders: own only ──
CREATE POLICY "orders_own" ON business.razorpay_orders FOR SELECT USING (auth.uid() = user_id);

-- ── Marketplace: public read, own write ──
CREATE POLICY "marketplace_public_read" ON business.marketplace_items
  FOR SELECT USING (is_available = true);
CREATE POLICY "marketplace_own_write" ON business.marketplace_items
  FOR ALL USING (auth.uid() = seller_id);

-- ── Timetable: public read (any logged-in user), admin write ──
CREATE POLICY "timetable_auth_read" ON academic.timetable FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "timetable_admin_write" ON academic.timetable FOR ALL
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');

-- ── Attendance: own only ──
CREATE POLICY "attendance_own" ON academic.attendance FOR ALL USING (auth.uid() = user_id);

-- ── CGPA: own only ──
CREATE POLICY "cgpa_own" ON academic.cgpa FOR ALL USING (auth.uid() = user_id);

-- ── Events: public read, admin write ──
CREATE POLICY "events_public_read" ON content.events FOR SELECT USING (is_active = true);
CREATE POLICY "events_admin_write" ON content.events FOR ALL
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');

-- ── Event registrations: own + admin ──
CREATE POLICY "registrations_own" ON content.event_registrations
  FOR ALL USING (auth.uid() = user_id);

-- ── Mess menu: public read, admin write ──
CREATE POLICY "mess_public_read" ON content.mess_menu FOR SELECT USING (true);
CREATE POLICY "mess_admin_write" ON content.mess_menu FOR ALL
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');

-- ── Faculty: public read, admin write ──
CREATE POLICY "faculty_public_read" ON content.faculty FOR SELECT USING (is_active = true);
CREATE POLICY "faculty_admin_write" ON content.faculty FOR ALL
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');

-- ── Notices: public read, admin write ──
CREATE POLICY "notices_public_read" ON content.notices FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());
CREATE POLICY "notices_admin_write" ON content.notices FOR ALL
  USING ((SELECT role FROM business.users WHERE id = auth.uid()) = 'admin');
```

---

### Step 1.4 — Supabase Auth Configuration

In Supabase Dashboard → **Authentication → Settings**:

1. **Email provider** → Enable
2. **Email confirmation** → Enable (replaces your current OTP system)
3. **Google provider** → Enable
   - Client ID: `150852944049-1kljh7jhlubn7kpmrss0nccqkm61jv7u.apps.googleusercontent.com`
   - Client Secret: from `.env`
4. **Site URL** → `http://localhost:4000` (update to production URL later)
5. **Redirect URLs** → Add `http://localhost:4000/auth/callback`

---

### Step 1.5 — Create Cloudflare R2 Bucket

1. [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Create bucket
2. Name: `vitbhopal-platform`
3. Location: Auto (Cloudflare picks nearest)
4. **Do NOT make it public** — all access via signed URLs from backend

Create R2 API Token:
- Go to R2 → Manage R2 API Tokens → Create API Token
- Permissions: **Object Read & Write** on bucket `vitbhopal-platform`
- Copy: `Access Key ID` and `Secret Access Key`

R2 bucket structure to follow:
```
vitbhopal-platform/
├── courses/
│   ├── cse3001/
│   │   ├── module-1-introduction.pdf
│   │   ├── module-2-sql.pdf
│   │   └── pyq-2023-nov.pdf
│   └── mat2001/
│       └── module-1-differential-equations.pdf
├── faculty-photos/
│   └── dr-sharma.jpg
└── events/
    └── technovanza-2024.jpg
```

---

### Step 1.6 — Install Dependencies

```bash
cd backend
npm install @supabase/supabase-js @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm uninstall mongoose  # Remove later — keep for now until migration complete
```

---

### Step 1.7 — Update backend/.env

```bash
# Keep old vars during migration, add new ones:

# ── Supabase ──────────────────────────────
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=eyJ...        # Safe for frontend
SUPABASE_SERVICE_KEY=eyJ...     # Backend only — NEVER expose to frontend

# ── Cloudflare R2 ─────────────────────────
CLOUDFLARE_ACCOUNT_ID=abc123def456
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=vitbhopal-platform
R2_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com

# ── Keep these during migration ───────────
MONGO_URL=mongodb://localhost:27017/vitbsmashers
JWT_SECRET=your_existing_jwt_secret
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
```

---

### Step 1.8 — Create Shared Supabase + R2 Client Files

**Create `backend/lib/supabase.js`:**
```js
import { createClient } from '@supabase/supabase-js';

// Service client — used in all backend controllers
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

**Create `backend/lib/r2.js`:**
```js
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME;

// Generate a signed URL valid for `expiresIn` seconds (default 5 min)
export async function getR2SignedUrl(r2Key, expiresIn = 300) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
  return getSignedUrl(r2, cmd, { expiresIn });
}

// Upload a Buffer to R2
export async function uploadToR2(buffer, r2Key, contentType = 'application/pdf') {
  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         r2Key,
    Body:        buffer,
    ContentType: contentType,
  }));
}
```

**Phase 1 done. Nothing in the app is broken yet. MongoDB still running.**

---

## Phase 2 — Authentication Migration

**Goal:** Replace custom JWT + OTP + Passport with Supabase Auth.  
**Files changed:** `authController.js`, `authMiddleware.js`, `authRoutes.js`, `login1.html`, `index.html`

---

### Step 2.1 — Rewrite `backend/controllers/authController.js`

Complete replacement of the file:

```js
import { supabase } from '../lib/supabase.js';

// ── POST /api/v1/auth/signup ─────────────────────────────────────────────────
// Creates Supabase Auth user + inserts business.users profile row
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ status: 'error', message: 'username, email and password required' });

    if (!email.endsWith('@vitbhopal.ac.in'))
      return res.status(400).json({ status: 'error', message: 'Must use a VIT Bhopal email address' });

    // Check username not taken
    const { data: existing } = await supabase
      .from('users').select('id').eq('username', username).schema('business').maybeSingle();
    if (existing)
      return res.status(409).json({ status: 'error', message: 'Username already taken' });

    // Create Supabase Auth user — sends confirmation email automatically
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // user must confirm via email
    });

    if (authError)
      return res.status(400).json({ status: 'error', message: authError.message });

    // Insert profile row
    await supabase.schema('business').from('users').insert({
      id:       authData.user.id,
      email:    email.toLowerCase(),
      username: username.toLowerCase(),
      role:     'student',
    });

    return res.status(201).json({
      status: 'success',
      message: 'Account created. Check your email to confirm your address before logging in.',
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── POST /api/v1/auth/login ──────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Support login by username or email
    let loginEmail = email;
    if (!loginEmail && username) {
      const { data: user } = await supabase
        .schema('business').from('users').select('email').eq('username', username).maybeSingle();
      if (!user) return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      loginEmail = user.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

    if (error) return res.status(401).json({ status: 'error', message: error.message });

    // Fetch profile
    const { data: profile } = await supabase
      .schema('business').from('users').select('*').eq('id', data.user.id).single();

    if (profile.is_banned)
      return res.status(403).json({ status: 'error', message: `Account banned: ${profile.ban_reason}` });

    return res.status(200).json({
      status: 'success',
      data: {
        token:   data.session.access_token,
        refresh: data.session.refresh_token,
        user:    profile,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── POST /api/v1/auth/google-token ──────────────────────────────────────────
// Frontend sends Supabase session token after Google OAuth popup
export const googleAuth = async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    const { data: { user }, error } = await supabase.auth.getUser(access_token);
    if (error || !user) return res.status(401).json({ status: 'error', message: 'Invalid token' });

    if (!user.email.endsWith('@vitbhopal.ac.in'))
      return res.status(403).json({ status: 'error', message: 'Must use VIT Bhopal Google account' });

    // Upsert profile (first Google login creates the row)
    const { data: profile } = await supabase.schema('business').from('users').upsert({
      id:       user.id,
      email:    user.email.toLowerCase(),
      username: user.email.split('@')[0].toLowerCase(),
      full_name: user.user_metadata?.full_name || null,
      is_verified: true,
    }, { onConflict: 'id' }).select().single();

    return res.status(200).json({ status: 'success', data: { token: access_token, user: profile } });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── GET /api/v1/auth/profile ─────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  return res.status(200).json({ status: 'success', data: req.user });
};

// ── GET /api/v1/auth/validate-token ─────────────────────────────────────────
export const validateToken = async (req, res) => {
  return res.status(200).json({ status: 'success', valid: true, user: req.user });
};

// ── GET /api/v1/auth/admin-status ───────────────────────────────────────────
export const adminStatus = async (req, res) => {
  return res.status(200).json({ status: 'success', isAdmin: req.user.role === 'admin' });
};

// ── POST /api/v1/auth/logout ─────────────────────────────────────────────────
export const logout = async (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ status: 'success', message: 'Logged out' });
};
```

---

### Step 2.2 — Rewrite `backend/middleware/authMiddleware.js`

```js
import { supabase } from '../lib/supabase.js';

// ── protect — replaces the old JWT verify middleware ────────────────────────
export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : req.cookies?.token;

    if (!token) return res.status(401).json({ status: 'error', message: 'Not authenticated' });

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });

    // Fetch profile from business.users
    const { data: profile, error: profileError } = await supabase
      .schema('business').from('users').select('*').eq('id', user.id).single();

    if (profileError || !profile)
      return res.status(401).json({ status: 'error', message: 'User profile not found' });

    if (profile.is_banned)
      return res.status(403).json({ status: 'error', message: 'Account is banned' });

    req.user = profile;
    next();
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Auth check failed' });
  }
};

// ── adminOnly ────────────────────────────────────────────────────────────────
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  next();
};

// ── requireCompleteProfile ───────────────────────────────────────────────────
export const requireCompleteProfile = (req, res, next) => {
  const { phone, registration_number, branch } = req.user;
  if (!phone || !registration_number || !branch)
    return res.status(403).json({
      status: 'error',
      error: 'incomplete_profile',
      message: 'Complete your profile before making a purchase',
    });
  next();
};

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ status: 'error', message: err.message || 'Internal server error' });
};

export const notFound = (req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.originalUrl} not found` });
};
```

---

### Step 2.3 — Update `frontend/login1.html` JS

Find all `fetch('/api/v1/auth/...')` calls and update:

```js
// BEFORE — OTP flow
fetch('/api/v1/auth/signup', { body: JSON.stringify({ username, email, password }) })
fetch('/api/v1/auth/verify-otp', { body: JSON.stringify({ email, otp }) })
fetch('/api/v1/auth/login', { body: JSON.stringify({ username, password }) })

// AFTER — Supabase Auth flow (same API endpoints, now backed by Supabase)
// No change needed on the frontend — backend API shape stays identical.
// The OTP step is removed: Supabase sends a confirmation email automatically.
// After signup, show: "Check your email to confirm your account, then log in."
```

Remove the OTP input section from the signup form — replace with a message after successful signup.

---

### Step 2.4 — Update `frontend/index.html` Google Auth

```js
// BEFORE — redirect to Passport.js OAuth
window.location.href = '/api/v1/auth/google';

// AFTER — Supabase OAuth popup (add Supabase JS to the page)
// Add to <head>:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

const supabaseClient = window.supabase.createClient(
  'https://yourproject.supabase.co',
  'your-anon-key'
);

async function loginWithGoogle() {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
}
```

**Create `frontend/auth/callback.html`** to handle the redirect:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
  const client = window.supabase.createClient('YOUR_URL', 'YOUR_ANON_KEY');
  client.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      // Send token to backend to get/create profile
      const res = await fetch('/api/v1/auth/google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token })
      });
      const data = await res.json();
      if (data.status === 'success') {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        window.location.href = '/index.html';
      }
    }
  });
</script>
```

---

## Phase 3 — Profile System

**Goal:** Replace MongoDB profile reads/writes with Supabase.  
**Files changed:** `profileController.js`, `profile.html`

---

### Step 3.1 — Rewrite `backend/controllers/profileController.js`

```js
import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/profile/:userId ──────────────────────────────────────────────
export const getProfile = async (req, res) => {
  const { data, error } = await supabase
    .schema('business').from('users').select('*').eq('id', req.params.userId).single();
  if (error || !data) return res.status(404).json({ status: 'error', message: 'User not found' });
  return res.status(200).json({ status: 'success', data });
};

// ── PUT /api/v1/profile/:userId ──────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  // Rate limit: max 5 updates per day
  const today = new Date().toISOString().slice(0, 10);
  const user  = req.user;

  if (user.last_profile_update === today && user.profile_update_count >= 5)
    return res.status(429).json({ status: 'error', message: 'Max 5 profile updates per day' });

  const { full_name, phone, registration_number, branch, year } = req.body;

  // Validate phone
  if (phone && !/^\d{10}$/.test(phone))
    return res.status(400).json({ status: 'error', message: 'Phone must be 10 digits' });

  // Validate registration number
  if (registration_number && !/^\d{2}[A-Z]{3}\d{5}$/.test(registration_number))
    return res.status(400).json({ status: 'error', message: 'Invalid registration number format (e.g. 23BCE00001)' });

  const profileComplete = !!(full_name && phone && registration_number && branch);
  const newCount = user.last_profile_update === today ? user.profile_update_count + 1 : 1;

  const { data, error } = await supabase.schema('business').from('users')
    .update({
      full_name, phone, registration_number, branch, year,
      profile_completed:    profileComplete,
      last_profile_update:  today,
      profile_update_count: newCount,
      updated_at:           new Date().toISOString(),
    })
    .eq('id', req.params.userId)
    .select().single();

  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

## Phase 4 — Course Catalog

**Goal:** Replace MongoDB Course model with Supabase `business.courses` + `business.course_modules`.  
**Files changed:** `courseController.js`, `courseRoutes.js`, marketplace frontend  
**Deleted:** `backend/models/course.model.js`

---

### Step 4.1 — Rewrite `backend/controllers/courseController.js`

```js
import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/courses ──────────────────────────────────────────────────────
export const getCourses = async (req, res) => {
  const { category, search, featured, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase.schema('business').from('courses')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (category)  query = query.eq('category', category);
  if (featured)  query = query.eq('featured', true);
  if (search)    query = query.ilike('title', `%${search}%`);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ status: 'error', message: error.message });

  return res.status(200).json({
    status: 'success',
    results: data.length,
    total: count,
    data,
  });
};

// ── GET /api/v1/courses/my-courses ───────────────────────────────────────────
export const getMyCourses = async (req, res) => {
  const { data, error } = await supabase.schema('business').from('purchases')
    .select(`
      purchased_at, amount_paid,
      course:courses (
        id, pid, title, description, image, category,
        modules_count, notes_count, hours
      )
    `)
    .eq('user_id', req.user.id)
    .order('purchased_at', { ascending: false });

  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

// ── GET /api/v1/courses/:id ──────────────────────────────────────────────────
export const getCourse = async (req, res) => {
  const { id } = req.params;
  const isPid  = isNaN(id) && id.length < 20;

  const { data, error } = await supabase.schema('business').from('courses')
    .select('*')
    .or(isPid ? `pid.eq.${id.toUpperCase()}` : `id.eq.${id}`)
    .eq('status', 'active')
    .single();

  if (error || !data) return res.status(404).json({ status: 'error', message: 'Course not found' });

  // Also fetch modules (only metadata, no r2_key exposed publicly)
  const { data: modules } = await supabase.schema('business').from('course_modules')
    .select('id, type, title, topics, duration, module_no, academic_year, display_order')
    .eq('course_id', data.id)
    .eq('is_active', true)
    .order('type').order('display_order');

  return res.status(200).json({ status: 'success', data: { ...data, modules } });
};

// ── POST /api/v1/courses (admin) ─────────────────────────────────────────────
export const createCourse = async (req, res) => {
  const { data, error } = await supabase.schema('business').from('courses')
    .insert({ ...req.body, created_by: req.user.id })
    .select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(201).json({ status: 'success', data });
};

// ── PUT /api/v1/courses/:id (admin) ─────────────────────────────────────────
export const updateCourse = async (req, res) => {
  const { data, error } = await supabase.schema('business').from('courses')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

// ── DELETE /api/v1/courses/:id (admin) ──────────────────────────────────────
export const deleteCourse = async (req, res) => {
  await supabase.schema('business').from('courses')
    .update({ status: 'archived' }).eq('id', req.params.id);
  return res.status(200).json({ status: 'success', message: 'Course archived' });
};

// ── GET /api/v1/courses/:courseId/modules ────────────────────────────────────
// Protected: only if purchased. Returns module list WITH r2_key for PDF access.
export const getCourseModules = async (req, res) => {
  // Check purchase
  const { data: purchase } = await supabase.schema('business').from('purchases')
    .select('id').eq('user_id', req.user.id).eq('course_id', req.params.courseId).maybeSingle();

  if (!purchase) return res.status(403).json({ status: 'error', error: 'not_purchased' });

  const { data, error } = await supabase.schema('business').from('course_modules')
    .select('id, type, title, topics, duration, module_no, academic_year, display_order, r2_key')
    .eq('course_id', req.params.courseId)
    .eq('is_active', true)
    .order('type').order('display_order');

  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

## Phase 5 — PDF Storage + Secure Access

**Goal:** Replace Google Drive streaming with Cloudflare R2 signed URLs.  
**Files changed:** `notesController.js`, `notesRoutes.js`, `viewer.html`, `mycourses.html`  
**New files:** `backend/utils/uploadToR2.js`, `backend/utils/migrateToR2.js`

---

### Step 5.1 — Rewrite `backend/controllers/notesController.js`

```js
import { supabase }       from '../lib/supabase.js';
import { getR2SignedUrl } from '../lib/r2.js';

// ── GET /api/v1/courses/:courseId/notes/:moduleId ────────────────────────────
// Verifies purchase → fetches r2_key → returns 5-min signed URL + watermark data
export const getDocumentUrl = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user.id;

    // Verify purchase
    const { data: purchase } = await supabase.schema('business').from('purchases')
      .select('id').eq('user_id', userId).eq('course_id', courseId).maybeSingle();

    if (!purchase) return res.status(403).json({ status: 'error', error: 'not_purchased' });

    // Fetch module and verify it belongs to this course
    const { data: module, error } = await supabase.schema('business').from('course_modules')
      .select('id, title, r2_key, course_id')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (error || !module) return res.status(404).json({ status: 'error', error: 'module_not_found' });
    if (!module.r2_key)   return res.status(404).json({ status: 'error', error: 'file_not_uploaded' });

    // Generate 5-minute signed URL from R2
    const signedUrl = await getR2SignedUrl(module.r2_key, 300);

    return res.status(200).json({
      status: 'success',
      data: {
        signedUrl,
        expiresIn: 300,
        watermark: {
          name:      req.user.full_name || req.user.username,
          email:     req.user.email,
          userId:    req.user.id,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('Notes controller error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal error' });
  }
};
```

---

### Step 5.2 — Simplify `backend/routes/notesRoutes.js`

```js
import express from 'express';
import { getDocumentUrl } from '../controllers/notesController.js';
import { protect }        from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// GET /api/v1/courses/:courseId/notes/:moduleId
router.get('/:courseId/notes/:moduleId', getDocumentUrl);

export default router;
```

The old `/stream/:streamToken` route is gone — R2 serves files directly, no Node proxy.

---

### Step 5.3 — Create `backend/utils/migrateToR2.js`

One-time script to move all PDFs from Google Drive to R2:

```js
/**
 * One-time migration: Google Drive → Cloudflare R2
 * Run once: node backend/utils/migrateToR2.js
 */
import 'dotenv/config';
import { google }      from 'googleapis';
import { uploadToR2 }  from '../lib/r2.js';
import { supabase }    from '../lib/supabase.js';

function getDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

async function main() {
  const drive = getDrive();

  // Fetch all modules that have driveFileId but no r2_key
  // NOTE: During migration, course_modules still has a 'drive_file_id' column
  // Add it temporarily: ALTER TABLE business.course_modules ADD COLUMN drive_file_id TEXT;
  const { data: modules } = await supabase.schema('business').from('course_modules')
    .select('id, title, drive_file_id, course_id')
    .not('drive_file_id', 'is', null)
    .is('r2_key', null);

  let migrated = 0, errors = 0;
  for (const mod of modules) {
    try {
      process.stdout.write(`Migrating: ${mod.title} ... `);
      const meta = await drive.files.get({ fileId: mod.drive_file_id, fields: 'mimeType,name' });
      const { mimeType } = meta.data;
      const isGoogle = mimeType.startsWith('application/vnd.google-apps.');

      let buffer;
      if (isGoogle) {
        const res = await drive.files.export(
          { fileId: mod.drive_file_id, mimeType: 'application/pdf' },
          { responseType: 'arraybuffer' }
        );
        buffer = Buffer.from(res.data);
      } else {
        const res = await drive.files.get(
          { fileId: mod.drive_file_id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        buffer = Buffer.from(res.data);
      }

      const safeName = mod.title.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const r2Key = `courses/${mod.course_id}/${safeName}.pdf`;
      await uploadToR2(buffer, r2Key);

      await supabase.schema('business').from('course_modules')
        .update({ r2_key: r2Key }).eq('id', mod.id);

      console.log(`✅ ${r2Key}`);
      migrated++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      errors++;
    }
  }
  console.log(`\nDone: ${migrated} migrated, ${errors} errors`);
}
main().catch(console.error);
```

---

### Step 5.4 — Update `frontend/features/pdf-viewer/viewer.html`

In the `init()` function, change the API call and URL handling:

```js
// BEFORE
const res  = await fetch(`${getApiBase()}/courses/${courseId}/notes/${fileId}`, ...);
loadPdf(makeAbsoluteUrl(data.data.streamUrl));

// AFTER — fileId is now the module UUID from business.course_modules
const res  = await fetch(`${getApiBase()}/courses/${courseId}/notes/${fileId}`, ...);
// data.data.signedUrl is already absolute (R2 HTTPS URL), no makeAbsoluteUrl needed
loadPdf(data.data.signedUrl);

// Also use watermark data from response
const { signedUrl, watermark } = data.data;
loadPdf(signedUrl);
drawWatermark(`${watermark.name} | ${watermark.email}`);
```

Also add auto-refresh before URL expires (R2 signed URL is 5 min):
```js
// After PDF loads, refresh the signed URL at 4 min 30 sec
setTimeout(async () => {
  const refreshRes = await fetch(`${getApiBase()}/courses/${courseId}/notes/${fileId}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const refreshData = await refreshRes.json();
  if (refreshData.status === 'success') {
    currentSignedUrl = refreshData.data.signedUrl; // store for next page fetches
  }
}, 4 * 60 * 1000 + 30 * 1000);
```

---

### Step 5.5 — Create Admin Upload Endpoint

**Add to `backend/routes/courseRoutes.js`:**
```js
// POST /api/v1/courses/:courseId/modules/:moduleId/upload
// Admin uploads a PDF file to R2 and updates the r2_key
router.post('/:courseId/modules/:moduleId/upload', protect, adminOnly, uploadDocument);
```

**Add to `courseController.js`:**
```js
import { uploadToR2 } from '../lib/r2.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const uploadDocument = [
  upload.single('pdf'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    const r2Key = `courses/${req.params.courseId}/${req.params.moduleId}.pdf`;
    await uploadToR2(req.file.buffer, r2Key, req.file.mimetype);

    await supabase.schema('business').from('course_modules')
      .update({ r2_key: r2Key }).eq('id', req.params.moduleId);

    return res.status(200).json({ status: 'success', data: { r2_key: r2Key } });
  }
];
```

---

## Phase 6 — Payment System

**Goal:** Replace OrderModel with Supabase tables. Keep Razorpay logic identical.  
**Files changed:** `paymentController.js`  
**Deleted:** `backend/models/orderModel.js`, `backend/service/paymentService.js`

---

### Step 6.1 — Rewrite `backend/controllers/paymentController.js`

```js
import Razorpay      from 'razorpay';
import crypto        from 'crypto';
import { supabase }  from '../lib/supabase.js';

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/v1/payment/create-order ───────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    // Check not already purchased
    const { data: existing } = await supabase.schema('business').from('purchases')
      .select('id').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
    if (existing)
      return res.status(409).json({ status: 'error', message: 'Course already purchased' });

    // Fetch course price
    const { data: course } = await supabase.schema('business').from('courses')
      .select('id, title, price').eq('id', courseId).single();
    if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });

    const amountPaise = Math.round(course.price * 100);

    // Create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `rcpt_${userId.slice(0,8)}_${courseId.slice(0,8)}`,
    });

    // Save pending order in Supabase
    await supabase.schema('business').from('razorpay_orders').insert({
      user_id:           userId,
      course_id:         courseId,
      razorpay_order_id: rzpOrder.id,
      amount:            course.price,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        orderId:   rzpOrder.id,
        amount:    amountPaise,
        currency:  'INR',
        courseId:  course.id,
        courseName: course.title,
      },
    });
  } catch (err) {
    console.error('Create order error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to create order' });
  }
};

// ── POST /api/v1/payment/verify ──────────────────────────────────────────────
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
    const userId = req.user.id;

    // Verify signature
    const body     = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                           .update(body).digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ status: 'error', message: 'Payment signature invalid' });

    // Mark order as paid
    await supabase.schema('business').from('razorpay_orders')
      .update({ status: 'paid' }).eq('razorpay_order_id', razorpay_order_id);

    // Fetch order to get course_id (in case courseId is not trusted from body)
    const { data: order } = await supabase.schema('business').from('razorpay_orders')
      .select('course_id, amount').eq('razorpay_order_id', razorpay_order_id).single();

    // Create purchase record
    const { data: purchase, error } = await supabase.schema('business').from('purchases').insert({
      user_id:             userId,
      course_id:           order.course_id,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id:   razorpay_order_id,
      amount_paid:         order.amount,
    }).select().single();

    if (error && error.code !== '23505') // ignore duplicate (already purchased)
      return res.status(500).json({ status: 'error', message: 'Failed to record purchase' });

    return res.status(200).json({ status: 'success', message: 'Payment verified', data: purchase });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Payment verification failed' });
  }
};

// ── POST /api/v1/payment/webhook ─────────────────────────────────────────────
// Razorpay webhook — backup in case frontend verification fails
export const paymentWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature     = req.headers['x-razorpay-signature'];
  const body          = JSON.stringify(req.body);
  const expected      = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

  if (expected !== signature)
    return res.status(400).send('Invalid webhook signature');

  const event = req.body;
  if (event.event === 'payment.captured') {
    const { order_id, id: payment_id, amount } = event.payload.payment.entity;

    const { data: order } = await supabase.schema('business').from('razorpay_orders')
      .select('user_id, course_id, amount').eq('razorpay_order_id', order_id).single();

    if (order) {
      // Upsert — idempotent, safe to call multiple times
      await supabase.schema('business').from('purchases').upsert({
        user_id:             order.user_id,
        course_id:           order.course_id,
        razorpay_payment_id: payment_id,
        razorpay_order_id:   order_id,
        amount_paid:         order.amount,
      }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });

      await supabase.schema('business').from('razorpay_orders')
        .update({ status: 'paid' }).eq('razorpay_order_id', order_id);
    }
  }
  return res.status(200).send('ok');
};
```

---

## Phase 7 — Content Features

**Goal:** Implement events, faculty, mess menu fully with Supabase.  
**Files changed:** `eventController.js`, `facultyController.js`, `messController.js`, frontend HTML files

---

### Step 7.1 — Rewrite `backend/controllers/eventController.js`

```js
import { supabase } from '../lib/supabase.js';

export const getEvents = async (req, res) => {
  const { category } = req.query;
  let query = supabase.schema('content').from('events')
    .select('*').eq('is_active', true)
    .gte('event_date', new Date().toISOString().slice(0,10))
    .order('event_date');
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

export const getEvent = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('events')
    .select('*, event_registrations(count)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ status: 'error', message: 'Event not found' });
  return res.status(200).json({ status: 'success', data });
};

export const createEvent = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('events')
    .insert({ ...req.body, created_by: req.user.id }).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(201).json({ status: 'success', data });
};

export const updateEvent = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('events')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

export const deleteEvent = async (req, res) => {
  await supabase.schema('content').from('events').update({ is_active: false }).eq('id', req.params.id);
  return res.status(200).json({ status: 'success', message: 'Event deactivated' });
};

export const registerForEvent = async (req, res) => {
  const { eventId, extraData } = req.body;
  const { data, error } = await supabase.schema('content').from('event_registrations')
    .insert({ event_id: eventId, user_id: req.user.id, extra_data: extraData })
    .select().single();
  if (error?.code === '23505')
    return res.status(409).json({ status: 'error', message: 'Already registered' });
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(201).json({ status: 'success', data });
};

export const getMyEvents = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('event_registrations')
    .select('registered_at, event:events(*)').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

### Step 7.2 — Rewrite `backend/controllers/facultyController.js`

```js
import { supabase } from '../lib/supabase.js';
import { getR2SignedUrl } from '../lib/r2.js';

export const getFaculty = async (req, res) => {
  const { department, search } = req.query;
  let query = supabase.schema('content').from('faculty')
    .select('id,name,email,department,designation,phone,office,specialization,availability,photo_r2_key')
    .eq('is_active', true).order('name');
  if (department) query = query.eq('department', department);
  if (search)     query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ status: 'error', message: error.message });

  // Attach signed photo URLs
  const withPhotos = await Promise.all(data.map(async f => {
    if (!f.photo_r2_key) return { ...f, photoUrl: null };
    const photoUrl = await getR2SignedUrl(f.photo_r2_key, 3600);
    return { ...f, photoUrl };
  }));
  return res.status(200).json({ status: 'success', data: withPhotos });
};

export const getFacultyById = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('faculty')
    .select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ status: 'error', message: 'Faculty not found' });
  return res.status(200).json({ status: 'success', data });
};

export const createFaculty = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('faculty')
    .insert(req.body).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(201).json({ status: 'success', data });
};

export const updateFaculty = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('faculty')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

### Step 7.3 — Implement `backend/controllers/messController.js`

Currently a stub. Full implementation:

```js
import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/mess/current ─────────────────────────────────────────────────
export const getCurrentMenu = async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.schema('content').from('mess_menu')
    .select('*').lte('week_start', today).order('week_start', { ascending: false }).limit(1).single();
  if (error || !data) return res.status(404).json({ status: 'error', message: 'No menu available' });
  return res.status(200).json({ status: 'success', data });
};

// ── GET /api/v1/mess ─────────────────────────────────────────────────────────
export const getAllMenus = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('mess_menu')
    .select('*').order('week_start', { ascending: false }).limit(8);
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

// ── POST /api/v1/mess (admin) ─────────────────────────────────────────────────
export const createMenu = async (req, res) => {
  const { data, error } = await supabase.schema('content').from('mess_menu')
    .upsert({ ...req.body, updated_by: req.user.id, updated_at: new Date().toISOString() },
      { onConflict: 'week_start' }).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

### Step 7.4 — Update Mess Route `backend/routes/messRoutes.js`

```js
import express from 'express';
import { getCurrentMenu, getAllMenus, createMenu } from '../controllers/messController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/current', getCurrentMenu);
router.get('/',        getAllMenus);
router.post('/', protect, adminOnly, createMenu);
export default router;
```

---

### Step 7.5 — Update Frontend fetch calls

**`frontend/features/mess-menu/mess.html`:**
```js
// BEFORE — may have been a stub or hardcoded
// AFTER
const res  = await fetch('/api/v1/mess/current');
const data = await res.json();
const today = new Date().toLocaleDateString('en-US', {weekday:'long'}).toLowerCase();
const todayMenu = data.data.menu[today]; // { breakfast: [], lunch: [], snacks: [], dinner: [] }
```

**`frontend/features/event/event.html`:**
```js
// BEFORE
fetch('/api/v1/events')
// AFTER — same endpoint, same shape. No change needed here.
```

**`frontend/features/faculty/faculty.html`:**
```js
// BEFORE
fetch('/api/v1/faculty?department=CSE')
// AFTER — same endpoint. Faculty photos now come as `photoUrl` (signed R2 URL).
// Update image src: img.src = faculty.photoUrl || '/assets/default-avatar.png';
```

---

## Phase 8 — Academic Tools

**Goal:** Fully implement the stub controllers (timetable, attendance, GPA) with Supabase.

---

### Step 8.1 — Implement `backend/controllers/timetableController.js`

```js
import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/timetable/my ─────────────────────────────────────────────────
// Returns timetable for the logged-in student's branch/year/batch
export const getMyTimetable = async (req, res) => {
  const { branch, year, batch } = req.user;
  if (!branch || !year || !batch)
    return res.status(400).json({ status: 'error', message: 'Complete your profile first' });

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.schema('academic').from('timetable')
    .select('schedule, effective_from, effective_to')
    .eq('branch', branch).eq('year', year).eq('batch', batch)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1).single();

  if (error || !data)
    return res.status(404).json({ status: 'error', message: 'No timetable found for your batch' });

  return res.status(200).json({ status: 'success', data });
};

// ── POST /api/v1/timetable (admin) ──────────────────────────────────────────
export const createTimetable = async (req, res) => {
  const { branch, year, batch, effective_from, effective_to, schedule } = req.body;
  const { data, error } = await supabase.schema('academic').from('timetable')
    .upsert({ branch, year, batch, effective_from, effective_to, schedule,
              campus: 'vit-bhopal', created_by: req.user.id, updated_at: new Date().toISOString() },
      { onConflict: 'campus,branch,year,batch,effective_from' })
    .select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

### Step 8.2 — Implement `backend/controllers/attendanceController.js`

```js
import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/attendance ───────────────────────────────────────────────────
export const getAttendance = async (req, res) => {
  const { data, error } = await supabase.schema('academic').from('attendance')
    .select('*').eq('user_id', req.user.id).order('subject_name');
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

// ── PUT /api/v1/attendance/:subjectCode ─────────────────────────────────────
export const updateAttendance = async (req, res) => {
  const { subjectCode } = req.params;
  const { subject_name, total_classes, attended } = req.body;

  if (attended > total_classes)
    return res.status(400).json({ status: 'error', message: 'Attended cannot exceed total classes' });

  const { data, error } = await supabase.schema('academic').from('attendance')
    .upsert({
      user_id:       req.user.id,
      subject_code:  subjectCode,
      subject_name:  subject_name,
      total_classes: total_classes,
      attended:      attended,
      last_updated:  new Date().toISOString(),
    }, { onConflict: 'user_id,subject_code' })
    .select().single();

  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

// ── DELETE /api/v1/attendance/:subjectCode ───────────────────────────────────
export const deleteAttendance = async (req, res) => {
  await supabase.schema('academic').from('attendance')
    .delete().eq('user_id', req.user.id).eq('subject_code', req.params.subjectCode);
  return res.status(200).json({ status: 'success', message: 'Subject removed' });
};
```

---

### Step 8.3 — Implement `backend/controllers/gpaController.js`

```js
import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/gpa ──────────────────────────────────────────────────────────
export const getGpaData = async (req, res) => {
  const { data, error } = await supabase.schema('academic').from('cgpa')
    .select('*').eq('user_id', req.user.id).order('semester');
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

// ── PUT /api/v1/gpa/:semester ────────────────────────────────────────────────
export const saveGpaData = async (req, res) => {
  const { semester } = req.params;
  const { grades, sgpa, cgpa, credits_earned } = req.body;

  const { data, error } = await supabase.schema('academic').from('cgpa')
    .upsert({
      user_id:        req.user.id,
      semester:       parseInt(semester),
      grades:         grades,
      sgpa:           sgpa,
      cgpa:           cgpa,
      credits_earned: credits_earned,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'user_id,semester' })
    .select().single();

  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

### Step 8.4 — Add Routes for All Academic Tools

**`backend/routes/timetableRoutes.js`:**
```js
import express from 'express';
import { getMyTimetable, createTimetable } from '../controllers/timetableController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/my',  protect, getMyTimetable);
router.post('/', protect, adminOnly, createTimetable);
export default router;
```

**`backend/routes/attendanceRoutes.js`:**
```js
import express from 'express';
import { getAttendance, updateAttendance, deleteAttendance } from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/', getAttendance);
router.put('/:subjectCode', updateAttendance);
router.delete('/:subjectCode', deleteAttendance);
export default router;
```

**`backend/routes/gpaRoutes.js`:**
```js
import express from 'express';
import { getGpaData, saveGpaData } from '../controllers/gpaController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/', getGpaData);
router.put('/:semester', saveGpaData);
export default router;
```

---

### Step 8.5 — Update Academic Frontend Files

**`frontend/features/attendance/attendance.html`** — update all fetch calls:
```js
// Load attendance data
GET /api/v1/attendance → data.data[] → { subject_code, subject_name, total_classes, attended }

// Save a subject
PUT /api/v1/attendance/CS301 → { subject_name, total_classes, attended }

// Delete a subject
DELETE /api/v1/attendance/CS301
```

**`frontend/features/gpa-calculator/cgpa.html`** — update all fetch calls:
```js
// Load saved grades
GET /api/v1/gpa → data.data[] → { semester, grades:{}, sgpa, cgpa }

// Save semester
PUT /api/v1/gpa/3 → { grades, sgpa, cgpa, credits_earned }
```

**`frontend/features/ttmaker/ttmaker1.html`** — update all fetch calls:
```js
// Load timetable for logged-in user's batch
GET /api/v1/timetable/my → data.data.schedule → { monday: [{time,subject,...}], ... }

// Admin: create/update timetable
POST /api/v1/timetable → { branch, year, batch, effective_from, schedule }
```

---

## Phase 9 — Student Marketplace

**Goal:** Replace MarketplaceItem MongoDB model with Supabase table.  
**Files changed:** `marketplaceController.js`  
**Deleted:** `backend/models/marketplaceItem.model.js`

---

### Step 9.1 — Rewrite `backend/controllers/marketplaceController.js`

```js
import { supabase } from '../lib/supabase.js';

export const getItems = async (req, res) => {
  const { category, search } = req.query;
  let query = supabase.schema('business').from('marketplace_items')
    .select('*, seller:users(id,username,full_name)')
    .eq('is_available', true).order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  if (search)   query = query.ilike('title', `%${search}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

export const getItem = async (req, res) => {
  const { data, error } = await supabase.schema('business').from('marketplace_items')
    .select('*, seller:users(id,username,full_name,phone)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ status: 'error', message: 'Item not found' });
  return res.status(200).json({ status: 'success', data });
};

export const createItem = async (req, res) => {
  const { data, error } = await supabase.schema('business').from('marketplace_items')
    .insert({ ...req.body, seller_id: req.user.id }).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(201).json({ status: 'success', data });
};

export const updateItem = async (req, res) => {
  const { data, error } = await supabase.schema('business').from('marketplace_items')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).eq('seller_id', req.user.id).select().single();
  if (error) return res.status(400).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};

export const deleteItem = async (req, res) => {
  await supabase.schema('business').from('marketplace_items')
    .update({ is_available: false }).eq('id', req.params.id).eq('seller_id', req.user.id);
  return res.status(200).json({ status: 'success', message: 'Item removed' });
};

export const getMyItems = async (req, res) => {
  const { data, error } = await supabase.schema('business').from('marketplace_items')
    .select('*').eq('seller_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  return res.status(200).json({ status: 'success', data });
};
```

---

## Phase 10 — Cleanup + Deployment

**Goal:** Remove all MongoDB code. Deploy to Railway (backend) + Vercel (frontend).

---

### Step 10.1 — Remove MongoDB from backend

```bash
# Delete all model files
rm backend/models/user.model.js
rm backend/models/course.model.js
rm backend/models/event.model.js
rm backend/models/faculty.model.js
rm backend/models/orderModel.js
rm backend/models/marketplaceItem.model.js
rm backend/models/pendingEventUpdate.model.js
rm backend/models/pendingFacultyUpdate.model.js
rm backend/config/passport.js
rm backend/db/db.js
rm backend/service/paymentService.js
rm backend/service/authService.js

# Uninstall MongoDB packages
cd backend
npm uninstall mongoose
npm uninstall passport passport-google-oauth20 express-session
```

---

### Step 10.2 — Update `backend/app.js`

Remove these lines:
```js
// DELETE these lines from app.js
import mongoose from 'mongoose';
import './db/db.js';
import passport from 'passport';
import session from 'express-session';
import './config/passport.js';
app.use(session(...));
app.use(passport.initialize());
app.use(passport.session());
```

Update route registrations to include all new routes:
```js
import timetableRoutes  from './routes/timetableRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import gpaRoutes        from './routes/gpaRoutes.js';
import messRoutes       from './routes/messRoutes.js';

app.use('/api/v1/timetable',  timetableRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/gpa',        gpaRoutes);
app.use('/api/v1/mess',       messRoutes);
```

---

### Step 10.3 — Keep Supabase from sleeping (free tier)

Supabase free tier pauses after 7 days of inactivity. Add this GitHub Action:

**Create `.github/workflows/keep-alive.yml`:**
```yaml
name: Keep Supabase Alive
on:
  schedule:
    - cron: '0 8 */3 * *'  # Every 3 days at 8 AM UTC
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          curl -s "${{ secrets.SUPABASE_URL }}/rest/v1/mess_menu?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
          echo "Pinged Supabase"
```

Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to GitHub repository secrets.

---

### Step 10.4 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your repository → set root directory to `backend`
3. Railway auto-detects Node.js
4. Add all environment variables from `.env` in Railway's Variables tab
5. Set `PORT` to `4000` or leave empty (Railway auto-assigns)
6. Your backend URL: `https://yourapp.up.railway.app`

---

### Step 10.5 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select repo → set root directory to `frontend`
3. No build command needed (static HTML)
4. Add environment variable: `VITE_API_URL=https://yourapp.up.railway.app`

**Update `frontend/config.js`** (create if missing):
```js
window.config = {
  API_BASE: 'https://yourapp.up.railway.app/api/v1',
};
```

---

### Step 10.6 — Production Environment Variables (Railway)

```bash
NODE_ENV=production
PORT=4000

# Supabase
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=vitbhopal-platform
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com

# Razorpay (use live keys in production)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Frontend
FRONTEND_URL=https://yourapp.vercel.app
```

---

## Final Architecture Summary

```
STUDENT BROWSER
    │
    ├── Static files served by Vercel CDN (HTML/CSS/JS)
    │
    └── API calls → Railway (Node.js Express)
                       │
                       ├── Supabase PostgreSQL
                       │     ├── business schema (users, courses, purchases, payments, marketplace)
                       │     ├── academic schema  (timetable, attendance, cgpa)
                       │     └── content schema   (events, faculty, mess, notices)
                       │
                       └── Cloudflare R2
                             ├── courses/{courseId}/{module}.pdf   (protected, signed URLs)
                             ├── faculty-photos/{emp}.jpg          (signed URLs)
                             └── events/{banner}.jpg               (signed URLs)
```

---

## Complete File Change Summary

```
DELETED (MongoDB layer):
  backend/models/*.js                    (all 8 model files)
  backend/config/passport.js
  backend/db/db.js
  backend/service/paymentService.js
  backend/service/authService.js
  backend/utils/migrateToSupabase.js

REWRITTEN (controllers):
  backend/controllers/authController.js       Phase 2
  backend/middleware/authMiddleware.js         Phase 2
  backend/controllers/profileController.js    Phase 3
  backend/controllers/courseController.js     Phase 4
  backend/controllers/notesController.js      Phase 5
  backend/controllers/paymentController.js    Phase 6
  backend/controllers/eventController.js      Phase 7
  backend/controllers/facultyController.js    Phase 7
  backend/controllers/messController.js       Phase 7
  backend/controllers/timetableController.js  Phase 8
  backend/controllers/attendanceController.js Phase 8
  backend/controllers/gpaController.js        Phase 8
  backend/controllers/marketplaceController.js Phase 9

NEW FILES:
  backend/lib/supabase.js                Phase 1
  backend/lib/r2.js                      Phase 1
  backend/utils/migrateToR2.js           Phase 5
  frontend/auth/callback.html            Phase 2
  .github/workflows/keep-alive.yml       Phase 10

UPDATED (routes - minor changes):
  backend/routes/notesRoutes.js          Phase 5
  backend/routes/timetableRoutes.js      Phase 8
  backend/routes/attendanceRoutes.js     Phase 8
  backend/routes/gpaRoutes.js            Phase 8
  backend/routes/messRoutes.js           Phase 7
  backend/app.js                         Phase 10

UPDATED (frontend - fetch call changes):
  frontend/login1.html                   Phase 2
  frontend/index.html                    Phase 2
  frontend/features/profile/profile.html Phase 3
  frontend/features/mycourses/mycourses.html     Phase 5
  frontend/features/pdf-viewer/viewer.html       Phase 5
  frontend/features/event/event.html             Phase 7
  frontend/features/faculty/faculty.html         Phase 7
  frontend/features/mess-menu/mess.html          Phase 7
  frontend/features/attendance/attendance.html   Phase 8
  frontend/features/gpa-calculator/cgpa.html     Phase 8
  frontend/features/ttmaker/ttmaker1.html        Phase 8
```

---

## Cost at Scale

```
Service              Free Tier Limit              Cost After Free
────────────────────────────────────────────────────────────────
Supabase             500MB DB, 50K req/day         $25/month (Pro)
Cloudflare R2        10GB storage, 0 egress         $0.015/GB/month storage only
Railway              $5 credit/month               ~$5-10/month for backend
Razorpay             2% per transaction            Standard Indian payment rates
────────────────────────────────────────────────────────────────
TOTAL at launch      ~₹0-400/month
At 500 DAU           ~₹800-1,200/month (mostly Railway)
At 5,000 DAU         ~₹2,500-4,000/month + Supabase Pro
```
