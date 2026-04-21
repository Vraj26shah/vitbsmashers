import { supabase }                          from '../lib/supabase.js';
import { uploadToR2, getImageSignedUrl, deleteFromR2 } from '../lib/r2.js';

// ── Helpers ────────────────────────────────────────────────────────────────────
async function attachLogoUrl(club) {
  if (!club.logo_r2_key) return { ...club, logoUrl: null };
  try {
    const logoUrl = await getImageSignedUrl(club.logo_r2_key, 3600);
    return { ...club, logoUrl };
  } catch {
    return { ...club, logoUrl: null };
  }
}

async function applyUpdateRequest(updateReq) {
  const changes = typeof updateReq.changes === 'string'
    ? JSON.parse(updateReq.changes) : updateReq.changes;

  // Flatten changes object to apply to club (new value of each field)
  const updates = {};
  for (const [field, val] of Object.entries(changes)) {
    updates[field] = typeof val === 'object' && val?.new !== undefined ? val.new : val;
  }

  // If there's a pending logo, make it the canonical one
  if (updateReq.logo_r2_key_new) {
    const canonicalKey = `clubs/${updateReq.club_id}/logo`;
    updates.logo_r2_key = canonicalKey;

    // Try to copy the pending object over the canonical key in R2
    try {
      const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { r2, BUCKET } = await import('../lib/r2.js');
      const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: updateReq.logo_r2_key_new });
      const obj = await r2.send(getCmd);
      const chunks = [];
      for await (const chunk of obj.Body) chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: canonicalKey, Body: buf, ContentType: obj.ContentType }));
      await deleteFromR2(updateReq.logo_r2_key_new);
    } catch (e) {
      console.error('Logo copy error:', e);
    }
  }

  updates.updated_at = new Date().toISOString();
  await supabase.schema('content').from('clubs').update(updates).eq('id', updateReq.club_id);
  await supabase.schema('content').from('club_update_requests')
    .update({ status: 'approved' }).eq('id', updateReq.id);
}

// ── GET /api/v1/clubs ─────────────────────────────────────────────────────────
export const getClubs = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = supabase.schema('content').from('clubs')
      .select('id, name, category, description, contact_person, contact_email, faculty_coordinator, faculty_email, co_faculty_coordinator, co_faculty_email, members, events, logo_r2_key, created_at')
      .eq('status', 'approved')
      .order('name');

    if (category) query = query.eq('category', category);
    if (search)   query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ status: 'error', message: error.message });

    const withLogos = await Promise.all(data.map(attachLogoUrl));
    return res.status(200).json({ status: 'success', results: withLogos.length, data: { clubs: withLogos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve clubs' });
  }
};

// ── GET /api/v1/clubs/:id ─────────────────────────────────────────────────────
export const getClubById = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('clubs')
      .select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ status: 'error', message: 'Club not found' });
    const result = await attachLogoUrl(data);
    return res.status(200).json({ status: 'success', data: { club: result } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve club' });
  }
};

// ── POST /api/v1/clubs — create (pending approval) ───────────────────────────
export const createClub = async (req, res) => {
  try {
    const {
      name, category, description,
      contact_person, contact_email,
      faculty_coordinator, faculty_email,
      co_faculty_coordinator, co_faculty_email,
      members, events,
    } = req.body;

    if (!name || !category || !description || !contact_person || !contact_email || !faculty_coordinator || !faculty_email) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    // Get user email from authenticated user
    const userEmail = req.user?.email || contact_email;

    // Check rate limit: max 5 pending club registrations per user
    const { data: pendingClubs, error: countError } = await supabase
      .schema('content')
      .from('clubs')
      .select('id')
      .eq('contact_email', userEmail)
      .eq('status', 'pending');

    if (countError) {
      console.error('Error checking pending clubs:', countError);
    }

    const currentPending = pendingClubs?.length || 0;
    if (currentPending >= 5) {
      return res.status(429).json({ 
        status: 'error', 
        message: 'You have reached the maximum of 5 pending club registrations. Please wait for admin approval before submitting more.',
        pendingCount: currentPending
      });
    }

    // Insert pending club first to get an ID
    const { data: club, error: insertErr } = await supabase.schema('content').from('clubs')
      .insert({
        name, category, description,
        contact_person, contact_email,
        faculty_coordinator, faculty_email,
        co_faculty_coordinator: co_faculty_coordinator || null,
        co_faculty_email: co_faculty_email || null,
        members: members ? parseInt(members) : 0,
        events: events ? parseInt(events) : 0,
        status: 'pending',
      }).select().single();

    if (insertErr) return res.status(400).json({ status: 'error', message: insertErr.message });

    // Upload logo to R2 if provided
    if (req.file) {
      const r2Key = `clubs/${club.id}/logo`;
      await uploadToR2(req.file.buffer, r2Key, req.file.mimetype);
      await supabase.schema('content').from('clubs')
        .update({ logo_r2_key: r2Key }).eq('id', club.id);
      club.logo_r2_key = r2Key;
    }

    return res.status(201).json({
      status: 'success',
      message: 'Club registration submitted for admin review',
      data: { club },
      pendingCount: currentPending + 1,
      remainingRequests: 4 - currentPending
    });
  } catch (err) {
    console.error('createClub error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to register club' });
  }
};

// ── POST /api/v1/clubs/update-request ────────────────────────────────────────
export const createUpdateRequest = async (req, res) => {
  try {
    const { club_id, changes, submitted_by } = req.body;
    if (!club_id || !changes) {
      return res.status(400).json({ status: 'error', message: 'club_id and changes are required' });
    }

    // Get user email from authenticated user
    const userEmail = req.user?.email || submitted_by || 'Unknown';

    // Check rate limit: max 5 pending requests per user
    const { data: pendingCount, error: countError } = await supabase
      .schema('content')
      .from('club_update_requests')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by', userEmail)
      .eq('status', 'pending');

    if (countError) {
      console.error('Error checking pending requests:', countError);
    }

    const currentPending = pendingCount?.length || 0;
    if (currentPending >= 5) {
      return res.status(429).json({ 
        status: 'error', 
        message: 'You have reached the maximum of 5 pending requests. Please wait for admin approval before submitting more.',
        pendingCount: currentPending
      });
    }

    let logo_r2_key_new = null;

    const { data: req_data, error } = await supabase.schema('content').from('club_update_requests')
      .insert({
        club_id,
        changes: typeof changes === 'string' ? JSON.parse(changes) : changes,
        submitted_by: userEmail,
        status: 'pending',
      }).select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });

    // Upload new logo if provided
    if (req.file) {
      logo_r2_key_new = `clubs/${club_id}/logo_pending_${req_data.id}`;
      await uploadToR2(req.file.buffer, logo_r2_key_new, req.file.mimetype);
      await supabase.schema('content').from('club_update_requests')
        .update({ logo_r2_key_new }).eq('id', req_data.id);
    }

    return res.status(201).json({ 
      status: 'success', 
      message: 'Update request submitted for admin review',
      pendingCount: currentPending + 1,
      remainingRequests: 4 - currentPending
    });
  } catch (err) {
    console.error('createUpdateRequest error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to submit update request' });
  }
};

// ── GET /api/v1/clubs/admin/pending ──────────────────────────────────────────
export const getPendingClubs = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('clubs')
      .select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ status: 'error', message: error.message });
    const withLogos = await Promise.all(data.map(attachLogoUrl));
    return res.status(200).json({ status: 'success', data: { clubs: withLogos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get pending clubs' });
  }
};

// ── GET /api/v1/clubs/admin/updates ──────────────────────────────────────────
export const getPendingUpdates = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('club_update_requests')
      .select('*, clubs(name, logo_r2_key)').eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data: { updates: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get pending updates' });
  }
};

// ── POST /api/v1/clubs/admin/:id/approve ─────────────────────────────────────
export const approveClub = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('clubs')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', message: 'Club approved', data: { club: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to approve club' });
  }
};

// ── POST /api/v1/clubs/admin/:id/reject ──────────────────────────────────────
export const rejectClub = async (req, res) => {
  try {
    // Delete logo from R2 if exists
    const { data: club } = await supabase.schema('content').from('clubs')
      .select('logo_r2_key').eq('id', req.params.id).single();
    if (club?.logo_r2_key) {
      try { await deleteFromR2(club.logo_r2_key); } catch {}
    }
    await supabase.schema('content').from('clubs')
      .update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', req.params.id);
    return res.status(200).json({ status: 'success', message: 'Club rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject club' });
  }
};

// ── POST /api/v1/clubs/admin/updates/:id/approve ─────────────────────────────
export const approveUpdate = async (req, res) => {
  try {
    const { data: updateReq, error: fetchErr } = await supabase.schema('content')
      .from('club_update_requests').select('*').eq('id', req.params.id).single();
    if (fetchErr || !updateReq) return res.status(404).json({ status: 'error', message: 'Update request not found' });
    await applyUpdateRequest(updateReq);
    return res.status(200).json({ status: 'success', message: 'Update approved and applied' });
  } catch (err) {
    console.error('approveUpdate error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to approve update' });
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
        status: 'approved',
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
        status: 'approved',
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
        status: 'approved',
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
        status: 'approved',
      },
    ];

    const { data, error } = await supabase.schema('content').from('clubs')
      .insert(sample).select('id, name, status, created_at');
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', message: 'Seeded sample clubs', data: { clubs: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to seed sample clubs' });
  }
};

// ── POST /api/v1/clubs/admin/smoke-update ──────────────────────────────────────
// Creates a pending update request for the most recent approved club and approves it.
export const smokeUpdateClub = async (req, res) => {
  try {
    const { data: club, error: clubErr } = await supabase.schema('content').from('clubs')
      .select('id, name, description, members')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (clubErr) return res.status(400).json({ status: 'error', message: clubErr.message });
    if (!club) return res.status(404).json({ status: 'error', message: 'No approved club found to update' });

    const changes = {
      description: { old: club.description, new: `${club.description} (updated ${new Date().toLocaleDateString()})` },
      members: { old: club.members, new: (parseInt(club.members || 0) + 1) },
    };

    const { data: updateReq, error: reqErr } = await supabase.schema('content').from('club_update_requests')
      .insert({
        club_id: club.id,
        changes,
        submitted_by: req.user?.email || 'admin',
        status: 'pending',
      }).select('*').single();
    if (reqErr) return res.status(400).json({ status: 'error', message: reqErr.message });

    await applyUpdateRequest(updateReq);

    const { data: updatedClub } = await supabase.schema('content').from('clubs')
      .select('*').eq('id', club.id).single();

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

// ── POST /api/v1/clubs/admin/updates/:id/reject ───────────────────────────────
export const rejectUpdate = async (req, res) => {
  try {
    const { data: updateReq } = await supabase.schema('content').from('club_update_requests')
      .select('logo_r2_key_new').eq('id', req.params.id).single();
    if (updateReq?.logo_r2_key_new) {
      try { await deleteFromR2(updateReq.logo_r2_key_new); } catch {}
    }
    await supabase.schema('content').from('club_update_requests')
      .update({ status: 'rejected' }).eq('id', req.params.id);
    return res.status(200).json({ status: 'success', message: 'Update request rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject update' });
  }
};

// ── GET /api/v1/clubs/admin/diagnostics ────────────────────────────────────────
// Verifies DB schema access + R2 upload/signed-url/delete roundtrip.
export const clubDiagnostics = async (req, res) => {
  const requiredEnv = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missingEnv = requiredEnv.filter((k) => !process.env[k]);

  try {
    // 1) Verify Supabase schema/tables/columns exist by selecting expected columns.
    const clubsProbe = await supabase
      .schema('content')
      .from('clubs')
      .select('id, name, status, logo_r2_key, created_at')
      .limit(1);

    const updatesProbe = await supabase
      .schema('content')
      .from('club_update_requests')
      .select('id, club_id, status, changes, logo_r2_key_new, created_at')
      .limit(1);

    const dbOk = !clubsProbe.error && !updatesProbe.error;

    // 2) Verify R2 write + signed URL + delete.
    const diagKey = `diagnostics/clubs_${Date.now()}_${Math.random().toString(16).slice(2)}.txt`;
    const payload = Buffer.from(`club diagnostics ${new Date().toISOString()}\n`, 'utf8');

    let r2SignedUrl = null;
    let r2Ok = false;
    let r2Error = null;

    try {
      await uploadToR2(payload, diagKey, 'text/plain');
      r2SignedUrl = await getImageSignedUrl(diagKey, 300);
      await deleteFromR2(diagKey);
      r2Ok = true;
    } catch (e) {
      r2Error = e?.message || String(e);
      try { await deleteFromR2(diagKey); } catch {}
    }

    return res.status(dbOk && r2Ok ? 200 : 500).json({
      status: dbOk && r2Ok ? 'success' : 'error',
      data: {
        env: {
          ok: missingEnv.length === 0,
          missing: missingEnv,
        },
        database: {
          ok: dbOk,
          clubs: {
            ok: !clubsProbe.error,
            error: clubsProbe.error?.message || null,
          },
          club_update_requests: {
            ok: !updatesProbe.error,
            error: updatesProbe.error?.message || null,
          },
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
// Same checks as admin diagnostics, but does NOT require Supabase auth.getUser().
// Guarded by either:
// - NODE_ENV=development, OR
// - header `x-diagnostics-key` matching DIAGNOSTICS_KEY env var.
export const clubDiagnosticsPublic = async (req, res) => {
  const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development';
  const key = req.headers['x-diagnostics-key'];
  const expectedKey = process.env.DIAGNOSTICS_KEY;

  if (!isDev && (!expectedKey || key !== expectedKey)) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }

  // Reuse the same implementation.
  return clubDiagnostics(req, res);
};
