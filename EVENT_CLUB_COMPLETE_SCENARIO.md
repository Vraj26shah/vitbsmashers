# Event and Club Management Complete Scenario

Last updated: April 21, 2026

## 1) Goal
This document mirrors the faculty methodology and captures the full Event + Club management scenario:
- Architecture and data model
- API flows (public, user, admin)
- Pending approval methodology
- Frontend tab behavior and admin controls
- What is fully implemented vs what is partial
- Standardization plan to match faculty-grade consistency

## 2) High-Level Summary

### Club module
- Uses real backend-driven pending workflow.
- Uses Supabase (`content` schema) + R2 for logos.
- Has admin approve/reject flows for registrations and update requests.
- Already close to faculty-style governance.

### Event module
- Backend has direct CRUD and registration APIs in Supabase.
- Frontend currently mixes API fetch with in-page simulated pending arrays.
- Pending workflow in Event UI is mostly mock/simulated and not fully persisted backend-side.

## 3) Club Management Methodology (Current)

### 3.1 Data/storage
- Database table: `content.clubs`
- Update requests table: `content.club_update_requests`
- R2 logo storage:
  - Canonical: `clubs/<clubId>/logo`
  - Pending update logo: `clubs/<clubId>/logo_pending_<updateRequestId>`

### 3.2 Core backend flow
- Public listing:
  - `GET /api/v1/clubs`
  - Returns only approved clubs (`status = approved`)
  - Supports `category`, `search`
  - Attaches signed logo URL
- Club creation (pending):
  - `POST /api/v1/clubs` (auth required)
  - Creates club with `status = pending`
  - Optional logo upload to R2
  - Enforces pending limit: max 5 per user
- Club update request (pending):
  - `POST /api/v1/clubs/update-request` (auth required)
  - Stores field diff in `club_update_requests`
  - Optional pending logo upload
  - Enforces pending limit: max 5 per user
- Admin moderation:
  - `GET /api/v1/clubs/admin/pending`
  - `GET /api/v1/clubs/admin/updates`
  - `POST /api/v1/clubs/admin/:id/approve|reject`
  - `POST /api/v1/clubs/admin/updates/:id/approve|reject`
- Update approval applies changes to canonical club record and promotes pending logo.

### 3.3 Club frontend flow
- Browse tab loads approved clubs from API.
- Add tab submits registration request to backend.
- Update tab computes change-diff and submits pending update request.
- Pending tab (admin-only):
  - Shows pending registrations and updates from backend
  - Approve/reject actions call backend
  - Refreshes pending lists + public club list after actions

### 3.4 Club status
- Club management is already largely production-pattern and aligned with faculty-style moderation.

## 4) Event Management Methodology (Current)

### 4.1 Data/storage
- Database tables in Supabase:
  - `content.events`
  - `content.event_registrations`
- Backend supports active-flag soft delete (`is_active = false`).

### 4.2 Core backend flow
- Public:
  - `GET /api/v1/events`
  - `GET /api/v1/events/:id`
- Authenticated:
  - `POST /api/v1/events/register`
  - `GET /api/v1/events/my`
  - `POST /api/v1/events/submit-addition` (stub)
  - `POST /api/v1/events/submit-update` (stub)
- Admin:
  - `POST /api/v1/events`
  - `PUT /api/v1/events/:id`
  - `DELETE /api/v1/events/:id` (soft delete via `is_active=false`)
  - approve/reject endpoints currently return informational stubs

### 4.3 Event frontend flow (important)
- `fetch('/api/v1/events')` is used for event list.
- Pending additions and updates are currently local in-memory arrays in `event.html`.
- Approve/reject in Event admin UI mutates local arrays and shows simulated notifications.
- Add/update requests in Event UI are mostly simulated pending objects, not persisted moderation records.

### 4.4 Event status
- Event backend CRUD exists, but frontend pending moderation is not yet fully wired to persistent backend approval queues.
- This is not yet at parity with faculty/club pending-governance methodology.

## 5) Faculty-Style Standard to Apply to Event + Club

To keep all modules consistent (Faculty, Club, Event), use this unified standard:
- User changes do not directly publish content.
- All user create/update/delete actions enter pending queues.
- Admin panel is the only approval gate.
- Approvals update canonical data and immediately refresh browse/update lists.
- Admin-only pending panels are strictly hidden outside pending tabs.
- ID matching and dedupe should be normalized to avoid ghost records.

## 6) Gap Analysis Against Standard

### Club
- Mostly compliant.
- Already has persistent pending queues and admin approval actions.
- Remaining improvement opportunities:
  - Standardized idempotency/error semantics (`already processed` handling)
  - Optional no-store fetch/cache-busting pattern after moderation actions
  - Stronger centralized visibility guard for pending panel (like faculty)

### Event
- Partially compliant.
- Gaps:
  - Pending additions/updates are simulated in frontend arrays.
  - Backend submit-addition / submit-update / approve/reject endpoints are stubs.
  - No persistent event moderation queue equivalent to faculty/club flow.

## 7) Recommended Standardization Plan

### Phase 1: Event backend moderation parity
1. Add persistent pending tables for events:
   - `event_pending_additions`
   - `event_update_requests` (including optional `request_type: delete`)
2. Implement real controllers for:
   - user submit addition/update/delete
   - admin pending list retrieval
   - admin approve/reject actions
3. Make approve actions update canonical `events` rows and clear pending records.

### Phase 2: Event frontend parity
1. Replace local `pendingEvents` and `pendingUpdates` arrays with API-driven data.
2. Wire register/update forms to submit endpoints (persistent).
3. Wire approve/reject buttons to admin moderation APIs.
4. Add no-store fetch refresh strategy after moderation.
5. Keep pending panel strictly admin-only and only visible in pending section.

### Phase 3: Club and Faculty harmonization
1. Standardize response shape across modules.
2. Standardize pending limit and error messages.
3. Add normalized ID comparison helper where needed.
4. Ensure all moderation actions refresh:
   - pending list
   - public browse list
   - update-select dropdowns

## 8) Route Reference Snapshot

### Event routes
- Public:
  - `GET /api/v1/events`
  - `GET /api/v1/events/:id`
- Auth:
  - `POST /api/v1/events/register`
  - `GET /api/v1/events/my`
  - `POST /api/v1/events/submit-addition` (currently stub)
  - `POST /api/v1/events/submit-update` (currently stub)
- Admin:
  - `POST /api/v1/events`
  - `PUT /api/v1/events/:id`
  - `DELETE /api/v1/events/:id`
  - approve/reject routes (currently stub behavior)

### Club routes
- Public:
  - `GET /api/v1/clubs`
  - `GET /api/v1/clubs/:id`
- Auth:
  - `POST /api/v1/clubs`
  - `POST /api/v1/clubs/update-request`
- Admin:
  - `GET /api/v1/clubs/admin/pending`
  - `GET /api/v1/clubs/admin/updates`
  - `POST /api/v1/clubs/admin/:id/approve|reject`
  - `POST /api/v1/clubs/admin/updates/:id/approve|reject`
  - Diagnostics/seed/smoke endpoints

## 9) Operational Checklist
- Club:
  - Submit new club -> appears in pending -> approve -> appears in browse/update select.
  - Submit update -> appears in pending updates -> approve -> changes reflected.
- Event:
  - Current state: verify direct CRUD + registration works.
  - Pending moderation is currently simulated in frontend (not persistent).
- Security:
  - Verify admin tab visibility and admin endpoint protection.
  - Verify non-admin cannot access pending data endpoints.

## 10) Final Note
This document is intentionally aligned with the faculty documentation style.  
If you want, next step is implementing **Phase 1 + Phase 2** for Event so Event reaches the same fully-managed moderation pattern already used by Faculty and mostly by Club.

