import { uploadToR2, getImageSignedUrl, deleteFromR2, getR2Object } from '../lib/r2.js';

const CLUBS_APPROVED_KEY = 'clubs/approved.json';
const CLUBS_PENDING_ADDITIONS_KEY = 'clubs/pending-additions.json';
const CLUBS_PENDING_UPDATES_KEY = 'clubs/pending-updates.json';

function generateId(prefix = 'club') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getRecordId(item) {
  return item?.id || item?._id || null;
}

function normalizeId(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function idsMatch(a, b) {
  const left = normalizeId(a);
  const right = normalizeId(b);
  return left !== '' && left === right;
}

async function getJsonList(key) {
  try {
    const data = await getR2Object(key);
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveJsonList(key, list) {
  const payload = JSON.stringify(Array.isArray(list) ? list : [], null, 2);
  await uploadToR2(key, Buffer.from(payload), 'application/json');
}

async function attachLogoUrl(club) {
  if (!club?.logo_r2_key) return { ...club, logoUrl: null };
  try {
    const logoUrl = await getImageSignedUrl(club.logo_r2_key, 3600);
    return { ...club, logoUrl };
  } catch {
    return { ...club, logoUrl: null };
  }
}

function normalizeClubPayload(payload = {}, opts = {}) {
  const now = new Date().toISOString();
  return {
    id: payload.id || opts.id || generateId('club'),
    name: payload.name || '',
    category: payload.category || '',
    description: payload.description || '',
    contact_person: payload.contact_person || '',
    contact_email: payload.contact_email || '',
    faculty_coordinator: payload.faculty_coordinator || '',
    faculty_email: payload.faculty_email || '',
    co_faculty_coordinator: payload.co_faculty_coordinator || null,
    co_faculty_email: payload.co_faculty_email || null,
    members: Number.parseInt(payload.members || 0, 10) || 0,
    events: Number.parseInt(payload.events || 0, 10) || 0,
    logo_r2_key: payload.logo_r2_key || null,
    status: payload.status || opts.status || 'approved',
    submitted_by: payload.submitted_by || opts.submittedBy || null,
    created_at: payload.created_at || opts.createdAt || now,
    updated_at: now,
  };
}

function hasRequiredClubFields(payload = {}) {
  return !!(
    payload.name && payload.category && payload.description &&
    payload.contact_person && payload.contact_email &&
    payload.faculty_coordinator && payload.faculty_email
  );
}

function applyChangesToClub(club, changes = {}) {
  const next = { ...club };
  Object.entries(changes).forEach(([field, val]) => {
    const value = val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'new')
      ? val.new
      : val;
    next[field] = value;
  });
  next.updated_at = new Date().toISOString();
  return next;
}

// ── GET /api/v1/clubs ─────────────────────────────────────────────────────────
export const getClubs = async (req, res) => {
  try {
    const { category, search } = req.query;
    let approved = await getJsonList(CLUBS_APPROVED_KEY);

    if (category) approved = approved.filter(c => c.category === category);
    if (search) {
      const q = String(search).toLowerCase();
      approved = approved.filter(c => String(c.name || '').toLowerCase().includes(q));
    }

    const withLogos = await Promise.all(approved.map(attachLogoUrl));
    return res.status(200).json({ status: 'success', results: withLogos.length, data: { clubs: withLogos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve clubs' });
  }
};

// ── GET /api/v1/clubs/:id ─────────────────────────────────────────────────────
export const getClubById = async (req, res) => {
  try {
    const approved = await getJsonList(CLUBS_APPROVED_KEY);
    const club = approved.find(c => idsMatch(getRecordId(c), req.params.id));
    if (!club) return res.status(404).json({ status: 'error', message: 'Club not found' });

    const result = await attachLogoUrl(club);
    return res.status(200).json({ status: 'success', data: { club: result } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve club' });
  }
};

// ── POST /api/v1/clubs — create (pending approval) ───────────────────────────
export const createClub = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!hasRequiredClubFields(payload)) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const submittedBy = req.user?.email || payload.contact_email || 'anonymous';
    const pending = await getJsonList(CLUBS_PENDING_ADDITIONS_KEY);

    const userPending = pending.filter(c => String(c.submitted_by || '').toLowerCase() === String(submittedBy).toLowerCase()).length;
    if (userPending >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'You have reached the maximum of 5 pending club registrations. Please wait for admin approval before submitting more.',
        pendingCount: userPending,
      });
    }

    const clubId = generateId('club');
    const club = normalizeClubPayload(payload, {
      id: clubId,
      status: 'pending',
      submittedBy,
    });

    if (req.file) {
      const r2Key = `clubs/${clubId}/logo`;
      await uploadToR2(r2Key, req.file.buffer, req.file.mimetype);
      club.logo_r2_key = r2Key;
    }

    pending.push(club);
    await saveJsonList(CLUBS_PENDING_ADDITIONS_KEY, pending);

    return res.status(201).json({
      status: 'success',
      message: 'Club registration submitted for admin review',
      data: { club },
      pendingCount: userPending + 1,
      remainingRequests: Math.max(5 - (userPending + 1), 0),
    });
  } catch (err) {
    console.error('createClub error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to register club' });
  }
};

// ── POST /api/v1/clubs/update-request ────────────────────────────────────────
export const createUpdateRequest = async (req, res) => {
  try {
    const { club_id, changes, submitted_by } = req.body || {};
    if (!club_id || !changes) {
      return res.status(400).json({ status: 'error', message: 'club_id and changes are required' });
    }

    const submittedBy = req.user?.email || submitted_by || 'anonymous';
    const pendingUpdates = await getJsonList(CLUBS_PENDING_UPDATES_KEY);

    const userPending = pendingUpdates.filter(u => String(u.submitted_by || '').toLowerCase() === String(submittedBy).toLowerCase()).length;
    if (userPending >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'You have reached the maximum of 5 pending requests. Please wait for admin approval before submitting more.',
        pendingCount: userPending,
      });
    }

    const approved = await getJsonList(CLUBS_APPROVED_KEY);
    const club = approved.find(c => idsMatch(getRecordId(c), club_id));
    if (!club) {
      return res.status(404).json({ status: 'error', message: 'Club not found' });
    }

    const requestId = generateId('club_upd');
    const parsedChanges = typeof changes === 'string' ? JSON.parse(changes) : changes;

    const updateRequest = {
      id: requestId,
      club_id,
      submitted_by: submittedBy,
      status: 'pending',
      created_at: new Date().toISOString(),
      changes: parsedChanges,
      logo_r2_key_new: null,
    };

    if (req.file) {
      const logoKey = `clubs/${club_id}/logo_pending_${requestId}`;
      await uploadToR2(logoKey, req.file.buffer, req.file.mimetype);
      updateRequest.logo_r2_key_new = logoKey;
    }

    pendingUpdates.push(updateRequest);
    await saveJsonList(CLUBS_PENDING_UPDATES_KEY, pendingUpdates);

    return res.status(201).json({
      status: 'success',
      message: 'Update request submitted for admin review',
      pendingCount: userPending + 1,
      remainingRequests: Math.max(5 - (userPending + 1), 0),
    });
  } catch (err) {
    console.error('createUpdateRequest error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to submit update request' });
  }
};

// ── GET /api/v1/clubs/admin/pending ──────────────────────────────────────────
export const getPendingClubs = async (req, res) => {
  try {
    const pending = await getJsonList(CLUBS_PENDING_ADDITIONS_KEY);
    const withLogos = await Promise.all(pending.map(attachLogoUrl));
    return res.status(200).json({ status: 'success', data: { clubs: withLogos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get pending clubs' });
  }
};

// ── GET /api/v1/clubs/admin/updates ──────────────────────────────────────────
export const getPendingUpdates = async (req, res) => {
  try {
    const updates = await getJsonList(CLUBS_PENDING_UPDATES_KEY);
    const approved = await getJsonList(CLUBS_APPROVED_KEY);

    const enriched = updates.map(update => {
      const club = approved.find(c => idsMatch(getRecordId(c), update.club_id));
      return {
        ...update,
        clubs: club ? {
          name: club.name,
          logo_r2_key: club.logo_r2_key,
        } : null,
      };
    });

    return res.status(200).json({ status: 'success', data: { updates: enriched } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get pending updates' });
  }
};

// ── POST /api/v1/clubs/admin/:id/approve ─────────────────────────────────────
export const approveClub = async (req, res) => {
  try {
    const pending = await getJsonList(CLUBS_PENDING_ADDITIONS_KEY);
    const approved = await getJsonList(CLUBS_APPROVED_KEY);

    const idx = pending.findIndex(c => idsMatch(getRecordId(c), req.params.id));
    if (idx === -1) return res.status(404).json({ status: 'error', message: 'Pending club not found' });

    const club = {
      ...pending[idx],
      status: 'approved',
      updated_at: new Date().toISOString(),
    };

    approved.push(club);
    pending.splice(idx, 1);

    await saveJsonList(CLUBS_APPROVED_KEY, approved);
    await saveJsonList(CLUBS_PENDING_ADDITIONS_KEY, pending);

    return res.status(200).json({ status: 'success', message: 'Club approved', data: { club } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to approve club' });
  }
};

// ── POST /api/v1/clubs/admin/:id/reject ──────────────────────────────────────
export const rejectClub = async (req, res) => {
  try {
    const pending = await getJsonList(CLUBS_PENDING_ADDITIONS_KEY);
    const idx = pending.findIndex(c => idsMatch(getRecordId(c), req.params.id));
    if (idx === -1) return res.status(404).json({ status: 'error', message: 'Pending club not found' });

    const club = pending[idx];
    if (club.logo_r2_key) {
      try { await deleteFromR2(club.logo_r2_key); } catch {}
    }

    pending.splice(idx, 1);
    await saveJsonList(CLUBS_PENDING_ADDITIONS_KEY, pending);

    return res.status(200).json({ status: 'success', message: 'Club rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject club' });
  }
};

// ── POST /api/v1/clubs/admin/updates/:id/approve ─────────────────────────────
export const approveUpdate = async (req, res) => {
  try {
    const updates = await getJsonList(CLUBS_PENDING_UPDATES_KEY);
    const approved = await getJsonList(CLUBS_APPROVED_KEY);

    const updateIdx = updates.findIndex(u => idsMatch(getRecordId(u), req.params.id));
    if (updateIdx === -1) return res.status(404).json({ status: 'error', message: 'Update request not found' });

    const updateReq = updates[updateIdx];
    const clubIdx = approved.findIndex(c => idsMatch(getRecordId(c), updateReq.club_id));
    if (clubIdx === -1) return res.status(404).json({ status: 'error', message: 'Club not found' });

    const nextClub = applyChangesToClub(approved[clubIdx], updateReq.changes || {});
    if (updateReq.logo_r2_key_new) {
      if (nextClub.logo_r2_key) {
        try { await deleteFromR2(nextClub.logo_r2_key); } catch {}
      }
      nextClub.logo_r2_key = updateReq.logo_r2_key_new;
    }

    approved[clubIdx] = nextClub;
    updates.splice(updateIdx, 1);

    await saveJsonList(CLUBS_APPROVED_KEY, approved);
    await saveJsonList(CLUBS_PENDING_UPDATES_KEY, updates);

    return res.status(200).json({ status: 'success', message: 'Update approved and applied' });
  } catch (err) {
    console.error('approveUpdate error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to approve update' });
  }
};

// ── POST /api/v1/clubs/admin/updates/:id/reject ───────────────────────────────
export const rejectUpdate = async (req, res) => {
  try {
    const updates = await getJsonList(CLUBS_PENDING_UPDATES_KEY);
    const idx = updates.findIndex(u => idsMatch(getRecordId(u), req.params.id));
    if (idx === -1) return res.status(404).json({ status: 'error', message: 'Update request not found' });

    const updateReq = updates[idx];
    if (updateReq.logo_r2_key_new) {
      try { await deleteFromR2(updateReq.logo_r2_key_new); } catch {}
    }

    updates.splice(idx, 1);
    await saveJsonList(CLUBS_PENDING_UPDATES_KEY, updates);

    return res.status(200).json({ status: 'success', message: 'Update request rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject update' });
  }
};

// ── POST /api/v1/clubs/admin/seed-sample ───────────────────────────────────────
export const seedSampleClubs = async (req, res) => {
  try {
    const sample = [
      {
        name: 'Code Warriors',
        category: 'Technical',
        description: 'A club for coding enthusiasts to collaborate on projects and hackathons.',
        contact_person: 'Rahul Sharma',
        contact_email: 'codewarriors@vitb.edu',
        faculty_coordinator: 'Dr. S. Kumar',
        faculty_email: 'skumar@vitb.edu',
        co_faculty_coordinator: 'Dr. M. Sharma',
        co_faculty_email: 'msharma@vitb.edu',
        members: 85,
        events: 12,
      },
      {
        name: 'Robotics Club',
        category: 'Technical',
        description: 'Designing, building, and programming robots for competitions and projects.',
        contact_person: 'Priya Patel',
        contact_email: 'robotics@vitb.edu',
        faculty_coordinator: 'Dr. R. Singh',
        faculty_email: 'rsingh@vitb.edu',
        members: 42,
        events: 8,
      },
      {
        name: 'Dramatics Society',
        category: 'Cultural',
        description: 'Exploring theater through workshops, productions, and performances.',
        contact_person: 'Vikram Singh',
        contact_email: 'dramatics@vitb.edu',
        faculty_coordinator: 'Dr. A. Reddy',
        faculty_email: 'areddy@vitb.edu',
        co_faculty_coordinator: 'Dr. P. Verma',
        co_faculty_email: 'pverma@vitb.edu',
        members: 64,
        events: 6,
      },
      {
        name: 'Music Club',
        category: 'Cultural',
        description: 'Jam sessions, concerts, and workshops for musicians and music lovers.',
        contact_person: 'Ananya Reddy',
        contact_email: 'music@vitb.edu',
        faculty_coordinator: 'Dr. K. Desai',
        faculty_email: 'kdesai@vitb.edu',
        members: 78,
        events: 10,
      },
    ];

    const approved = await getJsonList(CLUBS_APPROVED_KEY);
    const created = sample.map(item => normalizeClubPayload(item, { id: generateId('club'), status: 'approved' }));
    await saveJsonList(CLUBS_APPROVED_KEY, [...approved, ...created]);

    return res.status(201).json({
      status: 'success',
      message: 'Seeded sample clubs',
      data: { clubs: created.map(c => ({ id: c.id, name: c.name, status: c.status, created_at: c.created_at })) },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to seed sample clubs' });
  }
};

// ── POST /api/v1/clubs/admin/smoke-update ──────────────────────────────────────
export const smokeUpdateClub = async (req, res) => {
  try {
    const approved = await getJsonList(CLUBS_APPROVED_KEY);
    if (!approved.length) {
      return res.status(404).json({ status: 'error', message: 'No approved club found to update' });
    }

    const club = approved[approved.length - 1];
    const updateReq = {
      id: generateId('club_upd'),
      club_id: club.id,
      submitted_by: req.user?.email || 'admin',
      status: 'pending',
      created_at: new Date().toISOString(),
      logo_r2_key_new: null,
      changes: {
        description: { old: club.description, new: `${club.description} (updated ${new Date().toLocaleDateString()})` },
        members: { old: club.members, new: (Number.parseInt(club.members || 0, 10) + 1) },
      },
    };

    const updates = await getJsonList(CLUBS_PENDING_UPDATES_KEY);
    updates.push(updateReq);
    await saveJsonList(CLUBS_PENDING_UPDATES_KEY, updates);

    const updatedClub = applyChangesToClub(club, updateReq.changes);
    const idx = approved.findIndex(c => idsMatch(c.id, club.id));
    approved[idx] = updatedClub;

    await saveJsonList(CLUBS_APPROVED_KEY, approved);
    await saveJsonList(CLUBS_PENDING_UPDATES_KEY, updates.filter(u => !idsMatch(u.id, updateReq.id)));

    return res.status(200).json({
      status: 'success',
      message: 'Smoke update created and approved',
      data: { clubBefore: club, updateRequest: updateReq, clubAfter: updatedClub },
    });
  } catch (err) {
    console.error('smokeUpdateClub error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to smoke update club' });
  }
};

// ── GET /api/v1/clubs/admin/diagnostics ────────────────────────────────────────
export const clubDiagnostics = async (req, res) => {
  const requiredEnv = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const missingEnv = requiredEnv.filter((k) => !process.env[k]);

  try {
    const diagKey = `diagnostics/clubs_${Date.now()}_${Math.random().toString(16).slice(2)}.txt`;
    const payload = Buffer.from(`club diagnostics ${new Date().toISOString()}\n`, 'utf8');

    let r2SignedUrl = null;
    let r2Ok = false;
    let r2Error = null;

    try {
      await uploadToR2(diagKey, payload, 'text/plain');
      r2SignedUrl = await getImageSignedUrl(diagKey, 300);
      await deleteFromR2(diagKey);
      r2Ok = true;
    } catch (e) {
      r2Error = e?.message || String(e);
      try { await deleteFromR2(diagKey); } catch {}
    }

    return res.status(r2Ok ? 200 : 500).json({
      status: r2Ok ? 'success' : 'error',
      data: {
        env: {
          ok: missingEnv.length === 0,
          missing: missingEnv,
        },
        r2: {
          ok: r2Ok,
          signedUrlSample: r2SignedUrl,
          error: r2Error,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err?.message || 'Diagnostics failed' });
  }
};

// ── GET /api/v1/clubs/diagnostics (dev/secret) ─────────────────────────────────
export const clubDiagnosticsPublic = async (req, res) => {
  const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development';
  const key = req.headers['x-diagnostics-key'];
  const expectedKey = process.env.DIAGNOSTICS_KEY;

  if (!isDev && (!expectedKey || key !== expectedKey)) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }

  return clubDiagnostics(req, res);
};
