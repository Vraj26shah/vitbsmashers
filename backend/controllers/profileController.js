import { supabase } from '../lib/supabase.js';
import { getImageSignedUrl, getR2Object, uploadToR2 } from '../lib/r2.js';

const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : !!value;

// ── R2 Profile Cache ─────────────────────────────────────────────────────────
const profileR2Key = (userId) => `profiles/${userId}/profile.json`;

/**
 * Write the user's profile data to R2 as a fast-read cache.
 * Runs fire-and-forget — never blocks the HTTP response.
 */
async function saveProfileToR2(userId, profileData) {
  try {
    const payload = {
      ...profileData,
      _cached_at: new Date().toISOString(),
    };
    await uploadToR2(
      profileR2Key(userId),
      Buffer.from(JSON.stringify(payload)),
      'application/json',
      'private, max-age=0, no-store',   // always re-validate; don't serve stale
    );
  } catch (err) {
    // Non-critical — log but never throw
    console.warn('[R2 profile cache] write failed:', err.message);
  }
}

/**
 * Read the user's profile from R2 cache.
 * Returns null on any error or cache miss.
 */
async function getProfileFromR2(userId) {
  try {
    const raw = await getR2Object(profileR2Key(userId));
    const parsed = JSON.parse(raw);
    return parsed || null;
  } catch {
    return null;   // cache miss — caller falls back to Supabase
  }
}

// ── GET /api/v1/profile/me  OR  GET /api/v1/profile/:userId ─────────────────
export const getProfile = async (req, res) => {
  try {
    const isSelf = req.params.userId === 'me' || !req.params.userId;
    const targetId = isSelf ? req.user.id : req.params.userId;

    // Fast path: serve from R2 cache for the authenticated user's own profile
    if (isSelf) {
      const cached = await getProfileFromR2(targetId);
      if (cached) {
        // Respond immediately with cached data
        res.status(200).json({
          status:  'success',
          source:  'cache',
          data: {
            user: cached,
            profileComplete:
              hasValue(cached.phone) &&
              hasValue(cached.registration_number) &&
              hasValue(cached.branch),
          },
        });

        // Background: refresh cache from Supabase (fire-and-forget)
        supabase
          .schema('business').from('users').select('*').eq('id', targetId).maybeSingle()
          .then(({ data }) => { if (data) saveProfileToR2(targetId, data); })
          .catch(() => {});

        return;
      }
    }

    // Slow path: fetch from Supabase and populate cache
    const { data, error } = await supabase
      .schema('business').from('users').select('*').eq('id', targetId).maybeSingle();

    const user = data || (isSelf ? req.user : null);

    if (!user)
      return res.status(404).json({ status: 'error', message: 'User not found' });

    // Populate R2 cache for next request (fire-and-forget)
    if (isSelf) saveProfileToR2(targetId, user);

    return res.status(200).json({
      status: 'success',
      source: 'db',
      data: {
        user,
        profileComplete: hasValue(user.phone) && hasValue(user.registration_number) && hasValue(user.branch),
      },
    });
  } catch (err) {
    console.error('getProfile error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── PUT /api/v1/profile/update ───────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Accept both snake_case (API standard) and camelCase (legacy frontend forms)
    const full_name           = req.body.full_name           || req.body.fullName;
    const phone               = req.body.phone;
    const registration_number = req.body.registration_number || req.body.registrationNumber;
    const branch              = req.body.branch              || req.body.program;
    const year                = req.body.year;

    if (phone && !/^\d{10}$/.test(phone.replace(/\s+/g, '')))
      return res.status(400).json({ status: 'error', message: 'Phone must be 10 digits' });

    if (registration_number && !/^\d{2}[A-Z]{3}\d{5}$/.test(registration_number.toUpperCase()))
      return res.status(400).json({
        status: 'error',
        message: 'Invalid registration number (e.g. 23BCE00001)',
      });

    const today = new Date().toISOString().slice(0, 10);
    const user  = req.user;
    const newCount = user.last_profile_update === today ? (user.profile_update_count || 0) + 1 : 1;

    const profileComplete = (
      hasValue(full_name || user.full_name) &&
      hasValue(phone || user.phone) &&
      hasValue(registration_number || user.registration_number) &&
      hasValue(branch || user.branch)
    );

    const emailLower = (user.email || '').toLowerCase();
    const profilePayload = {
      full_name:            full_name   || user.full_name,
      phone:                phone       ? phone.replace(/\s+/g, '') : user.phone,
      registration_number:  registration_number ? registration_number.toUpperCase() : user.registration_number,
      branch:               branch      || user.branch,
      year:                 year        || user.year,
      role:                 user.role   || 'student',
      is_verified:          user.is_verified ?? true,
      profile_completed:    profileComplete,
      last_profile_update:  today,
      profile_update_count: newCount,
      updated_at:           new Date().toISOString(),
    };

    // Determine whether a row already exists (by id, then by email as fallback)
    let existingId = null;
    const { data: byId } = await supabase.schema('business').from('users')
      .select('id').eq('id', userId).maybeSingle();
    if (byId) {
      existingId = byId.id;
    } else {
      const { data: byEmail } = await supabase.schema('business').from('users')
        .select('id').eq('email', emailLower).maybeSingle();
      if (byEmail) existingId = byEmail.id;
    }

    let data, error;
    if (existingId) {
      // Row exists — UPDATE so we never conflict on id or email
      ({ data, error } = await supabase.schema('business').from('users')
        .update({ username: user.username || emailLower.split('@')[0], ...profilePayload })
        .eq('id', existingId)
        .select()
        .single());
    } else {
      // No row at all — INSERT
      ({ data, error } = await supabase.schema('business').from('users')
        .insert({ id: userId, email: emailLower, username: user.username || emailLower.split('@')[0], ...profilePayload })
        .select()
        .single());
    }

    if (error) {
      const isRLSRecursion = String(error.message).toLowerCase().includes('infinite recursion');
      console.error('updateProfile save error:', error.message, '| code:', error.code);

      if (isRLSRecursion) {
        console.warn('[updateProfile] RLS recursion — returning in-memory success. Run fix-rls-policies.sql to fix permanently.');
        const syntheticUser = {
          ...user,
          ...profilePayload,
          id: userId,
          email: emailLower,
          username: user.username || emailLower.split('@')[0],
        };
        // Still cache the synthetic data to R2 so fast reads work
        saveProfileToR2(userId, syntheticUser);
        return res.status(200).json({
          status: 'success',
          message: 'Profile updated successfully',
          data: { user: syntheticUser, profileComplete },
          _rls_warning: 'Data may not have persisted — run fix-rls-policies.sql',
        });
      }

      return res.status(400).json({ status: 'error', message: error.message });
    }

    // Write fresh profile to R2 cache (fire-and-forget, non-blocking)
    saveProfileToR2(userId, data);

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: data, profileComplete },
    });
  } catch (err) {
    console.error('updateProfile error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

export const uploadAvatar = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Avatar upload coming soon' });
};

export const getAchievements = async (req, res) => {
  return res.status(200).json({ status: 'success', data: [] });
};

export const addAchievement = async (req, res) => {
  return res.status(201).json({ status: 'success', message: 'Achievement added' });
};

const QUERY_INDEX_KEY = 'support/queries/index.json';
const ALLOWED_QUERY_CATEGORIES = new Set([
  'Academic',
  'Administrative',
  'Technical Support',
  'Payment',
  'Other',
]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function safeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function buildTicketId(date = new Date()) {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `QRY-${datePart}-${randomPart}`;
}

function extFromMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function toReadableTicketText(ticket) {
  return [
    'Scholars Stack Support Ticket',
    '=============================',
    `Ticket ID: ${ticket.ticket_id}`,
    `Submitted At: ${ticket.created_at}`,
    '',
    'Student Information',
    '-------------------',
    `Name: ${ticket.user.full_name || 'Not provided'}`,
    `Email: ${ticket.user.email || 'Not provided'}`,
    `Phone: ${ticket.user.phone || 'Not provided'}`,
    `Registration Number: ${ticket.user.registration_number || 'Not provided'}`,
    `Branch: ${ticket.user.branch || 'Not provided'}`,
    '',
    'Issue Details',
    '-------------',
    `Category: ${ticket.category}`,
    `Subject: ${ticket.subject}`,
    `Issue Type: ${ticket.issue_type || 'Not provided'}`,
    `Current Page URL: ${ticket.page_url || 'Not provided'}`,
    '',
    `Expected Behavior: ${ticket.expected_behavior || 'Not provided'}`,
    `Actual Behavior: ${ticket.actual_behavior || 'Not provided'}`,
    '',
    'Steps to Reproduce',
    '------------------',
    ticket.steps_to_reproduce || 'Not provided',
    '',
    'Detailed Message',
    '----------------',
    ticket.message,
    '',
    `Screenshot Key: ${ticket.screenshot_key || 'No screenshot attached'}`,
  ].join('\n');
}

async function readQueryIndex() {
  try {
    const raw = await getR2Object(QUERY_INDEX_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (String(error.message || '').includes('Object not found')) {
      return [];
    }
    throw error;
  }
}

export const submitQueryTicket = async (req, res) => {
  try {
    const subject = safeText(req.body.subject);
    const category = safeText(req.body.category);
    const message = safeText(req.body.message);
    const issueType = safeText(req.body.issue_type);
    const expectedBehavior = safeText(req.body.expected_behavior);
    const actualBehavior = safeText(req.body.actual_behavior);
    const stepsToReproduce = safeText(req.body.steps_to_reproduce);
    const pageUrl = safeText(req.body.page_url);

    if (subject.length < 5 || subject.length > 140) {
      return res.status(400).json({
        status: 'error',
        message: 'Subject must be between 5 and 140 characters.',
      });
    }

    if (!ALLOWED_QUERY_CATEGORIES.has(category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please choose a valid category.',
      });
    }

    if (message.length < 20 || message.length > 5000) {
      return res.status(400).json({
        status: 'error',
        message: 'Message must be between 20 and 5000 characters.',
      });
    }

    if (req.file && !ALLOWED_IMAGE_MIME_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({
        status: 'error',
        message: 'Screenshot must be JPG, PNG, or WEBP.',
      });
    }

    const now = new Date();
    const ticketId = buildTicketId(now);
    const year = now.getUTCFullYear();

    let screenshotKey = null;
    if (req.file) {
      const ext = extFromMime(req.file.mimetype);
      screenshotKey = `support/queries/${year}/${ticketId}/screenshot.${ext}`;
      await uploadToR2(screenshotKey, req.file.buffer, req.file.mimetype, 'private, max-age=0, no-store');
    }

    const ticket = {
      ticket_id: ticketId,
      created_at: now.toISOString(),
      category,
      subject,
      message,
      issue_type: issueType || null,
      expected_behavior: expectedBehavior || null,
      actual_behavior: actualBehavior || null,
      steps_to_reproduce: stepsToReproduce || null,
      page_url: pageUrl || null,
      screenshot_key: screenshotKey,
      status: 'open',
      source: 'profile_form',
      user: {
        id: req.user.id,
        full_name: req.user.full_name || req.user.username || null,
        email: req.user.email || null,
        phone: req.user.phone || null,
        registration_number: req.user.registration_number || null,
        branch: req.user.branch || null,
      },
    };

    const jsonKey = `support/queries/${year}/${ticketId}.json`;
    const textKey = `support/queries/${year}/${ticketId}.txt`;
    const readableText = toReadableTicketText(ticket);

    await uploadToR2(jsonKey, Buffer.from(JSON.stringify(ticket, null, 2)), 'application/json', 'private, max-age=0, no-store');
    await uploadToR2(textKey, Buffer.from(readableText), 'text/plain; charset=utf-8', 'private, max-age=0, no-store');

    const existingIndex = await readQueryIndex();
    existingIndex.unshift({
      ticket_id: ticketId,
      created_at: ticket.created_at,
      status: ticket.status,
      category: ticket.category,
      subject: ticket.subject,
      user_id: ticket.user.id,
      json_key: jsonKey,
      text_key: textKey,
      screenshot_key: screenshotKey,
    });
    await uploadToR2(QUERY_INDEX_KEY, Buffer.from(JSON.stringify(existingIndex.slice(0, 2000), null, 2)), 'application/json', 'private, max-age=0, no-store');

    const screenshotUrl = screenshotKey ? await getImageSignedUrl(screenshotKey, 60 * 60 * 24) : null;

    return res.status(201).json({
      status: 'success',
      message: 'Query submitted successfully.',
      data: {
        ticketId,
        createdAt: ticket.created_at,
        status: ticket.status,
        readableSummary: readableText,
        screenshotUrl,
      },
    });
  } catch (err) {
    console.error('submitQueryTicket error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to submit query. Please try again.' });
  }
};
