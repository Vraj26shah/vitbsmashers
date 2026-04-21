# Faculty Module Complete Scenario

Last updated: April 21, 2026

## 1) Goal
This document captures the complete faculty-module methodology and implementation:
- End-to-end user and admin workflow
- Data storage strategy
- API contract and route behavior
- Frontend rendering and tab-visibility behavior
- Delete/update approval handling
- Consistency and stale-data prevention
- What was fixed and how it was achieved

## 2) Module Scope
Faculty module supports:
- Browse approved faculty (public)
- Submit new faculty requests (authenticated user)
- Submit update requests (authenticated user)
- Submit delete requests (authenticated user)
- Review/approve/reject pending additions and updates (admin only)

Primary files:
- `backend/controllers/facultyController.js`
- `backend/routes/facultyRoutes.js`
- `frontend/features/faculty/faculty.html`

## 3) Data Methodology (R2-backed)
The module uses object storage (R2) with 4 logical JSON stores:

1. `faculty/list.json`
- Lightweight index for approved records
- Contains small summary fields (id, name, department, status, timestamps)

2. `faculty/all_approved_data.json`
- Consolidated full dataset for approved faculty
- Used for fast read operations (`GET /faculty`) with in-memory cache

3. `faculty/pending-additions.json`
- Queue for new faculty requests awaiting admin action

4. `faculty/pending-updates.json`
- Queue for update/delete requests awaiting admin action

Per-record object:
- `faculty/<facultyId>/data.json`

## 4) Backend Methodology

### 4.1 Cache strategy
`getAllApprovedFaculty()` uses an in-memory cache with 5-minute TTL:
- Reduces repeated R2 reads
- Falls back to rebuilding consolidated data if missing

### 4.2 ID normalization strategy (critical)
To prevent mismatches across string/number-like IDs:
- `normalizeIdValue(value)` converts IDs to string safely
- `idsMatch(left, right)` performs normalized equality
- `dedupeById()` and `upsertById()` enforce stable unique identity

This is used across approval, deletion, updates, and pending cleanup to avoid ghost records.

### 4.3 Public APIs
- `GET /api/v1/faculty`
  - Returns approved faculty list from consolidated dataset
  - Supports `department` and `search`
- `GET /api/v1/faculty/:id`
  - Cache-first lookup, then direct per-record fallback
- `GET /api/v1/faculty/department/:dept`
  - Department wrapper on main list API

### 4.4 Authenticated user APIs
- `POST /api/v1/faculty`
  - Creates pending addition request
  - Writes `faculty/<id>/data.json` as `status: pending`
  - Enforces per-user pending limit (5)
- `POST /api/v1/faculty/update-request`
  - Creates pending request with `request_type` = `update` or `delete`
  - Enforces same per-user pending limit (5)

### 4.5 Admin APIs
- `GET /api/v1/faculty/admin/pending`
- `GET /api/v1/faculty/admin/updates`
- `POST /api/v1/faculty/admin/:id/approve`
- `POST /api/v1/faculty/admin/:id/reject`
- `POST /api/v1/faculty/admin/updates/:id/approve`
- `POST /api/v1/faculty/admin/updates/:id/reject`

Approval behavior:
- Addition approve:
  - Marks record `approved`
  - Upserts into `list.json`
  - Upserts into `all_approved_data.json`
  - Removes from pending additions
- Update approve:
  - Applies changed fields to record
  - Updates index and consolidated set
  - Removes from pending updates
- Delete approve:
  - Deletes `faculty/<id>/data.json`
  - Removes from `list.json`
  - Removes from `all_approved_data.json`
  - Removes from pending updates

## 5) Frontend Methodology

### 5.1 Main tabs
In `faculty.html`:
- Browse Faculty
- Add Faculty
- Update Faculty
- Pending Requests (admin-only tab button)

### 5.2 Admin panel isolation
The pending panel is strictly scoped to pending tab via:
- `enforceAdminPanelVisibility(activeTabId, isAdminUser)`

Rules:
- Show admin content only when tab is `admin` and user is admin
- Hide admin panel from Browse/Add/Update always
- Hide from non-admin users and while admin check fails

### 5.3 Fresh-data strategy on client
`fetchFaculty()` uses:
- `GET /api/v1/faculty?ts=<timestamp>`
- `cache: 'no-store'`

This prevents stale browser responses after admin approvals/deletions.

### 5.4 Admin action refresh methodology
After approve/reject:
- Re-renders pending list(s)
- Re-renders browse list
- Re-populates update dropdown

Implemented through:
- `Promise.all([renderPending..., renderFaculty(), populateFacultySelect()])`

## 6) Full Lifecycle Scenarios

### Scenario A: Add faculty
1. User submits Add form
2. Backend creates pending addition
3. Admin opens Pending Additions
4. Admin approves
5. Record appears in Browse and Update select list

### Scenario B: Update faculty
1. User selects a faculty in Update tab
2. User submits changed values
3. Backend stores pending update request
4. Admin approves update
5. Browse and Update lists show updated values after refresh

### Scenario C: Delete faculty
1. User selects faculty in Update tab
2. User clicks Request Delete Faculty
3. Backend stores pending request with `request_type: delete`
4. Admin approves delete
5. Record is removed from:
   - Per-record object
   - Approved index
   - Consolidated approved dataset
6. Frontend refresh removes faculty from:
   - Browse Faculty cards
   - Update Faculty dropdown

## 7) Fixes Applied and How They Were Attained

### Fix 1: Deleted faculty still visible in other lists
Problem:
- Deletion path could fail to remove records consistently if ID types were mixed.

Method:
- Introduced normalized ID matching (`idsMatch`) and applied it to all filter/find paths.
- Applied normalization in:
  - Pending lookups
  - Index/consolidated filtering
  - Update/delete matching
  - Pending cleanup after action

Result:
- Approved delete now removes faculty consistently from all backend stores.

### Fix 2: UI showing stale data after admin actions
Problem:
- Browser cache could keep old faculty response.

Method:
- Added no-store fetch with timestamp query in `fetchFaculty()`.

Result:
- Browse and Update UI reflect latest state immediately after refresh calls.

### Fix 3: Pending panel visibility leakage
Problem:
- Pending admin panel visibility needed strict isolation.

Method:
- Added centralized visibility guard `enforceAdminPanelVisibility(...)`.
- Called it on:
  - Tab switches
  - Admin check success/failure
  - Initial page load

Result:
- Pending panel appears only in pending section for admins, and nowhere else.

## 8) Validation Checklist
- Non-admin user:
  - Cannot see Pending tab
  - Cannot see admin pending panel in other tabs
- Admin user:
  - Can open pending tab
  - Can see pending additions and pending updates
- Deletion flow:
  - Submit delete request
  - Approve from admin
  - Confirm faculty disappears from Browse and Update select
- Update flow:
  - Submit update request
  - Approve
  - Confirm changed values appear in Browse/Update
- Addition flow:
  - Submit new faculty
  - Approve
  - Confirm faculty appears in Browse/Update

## 9) Notes and Constraints
- Pending request limit is 5 per user (additions and updates managed in their respective queues).
- Admin routes are protected with `adminOnly`.
- Legacy direct admin `PUT`/`DELETE` routes are retained for compatibility.

## 10) Quick Reference (Route Map)
- Public:
  - `GET /api/v1/faculty`
  - `GET /api/v1/faculty/:id`
  - `GET /api/v1/faculty/department/:dept`
- Authenticated user:
  - `POST /api/v1/faculty`
  - `POST /api/v1/faculty/update-request`
- Admin:
  - `GET /api/v1/faculty/admin/pending`
  - `GET /api/v1/faculty/admin/updates`
  - `POST /api/v1/faculty/admin/:id/approve`
  - `POST /api/v1/faculty/admin/:id/reject`
  - `POST /api/v1/faculty/admin/updates/:id/approve`
  - `POST /api/v1/faculty/admin/updates/:id/reject`

