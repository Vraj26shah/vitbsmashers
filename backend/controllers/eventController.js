import { getR2Object, uploadToR2 } from '../lib/r2.js';

const EVENTS_APPROVED_KEY = 'events/approved.json';
const EVENTS_PENDING_ADDITIONS_KEY = 'events/pending-additions.json';
const EVENTS_PENDING_UPDATES_KEY = 'events/pending-updates.json';
const EVENT_REGISTRATIONS_KEY = 'events/registrations.json';

function generateId(prefix = 'evt') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function asString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function asInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
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

function normalizeEventRecord(input = {}, opts = {}) {
  const nowIso = new Date().toISOString();
  const coordinators = input.coordinators && typeof input.coordinators === 'object'
    ? { ...input.coordinators }
    : {};

  const startDateTime = asString(
    input.startDateTime
      || input.start_date
      || input.event_date
      || coordinators.startDateTime,
    ''
  );

  const endDateTime = asString(
    input.endDateTime
      || input.end_date
      || coordinators.endDateTime
      || startDateTime,
    startDateTime
  );

  const regDeadline = asString(
    input.regDeadline
      || input.registration_deadline
      || coordinators.regDeadline
      || startDateTime,
    startDateTime
  );

  const venue = asString(
    input.venue
      || input.location
      || coordinators.venue,
    'TBA'
  );

  const facultyIncharge = asString(
    input.facultyIncharge
      || input.organizer
      || coordinators.facultyIncharge
      || coordinators.organizer,
    'Event Team'
  );

  const facultyEmail = asString(
    input.facultyEmail
      || input.contact_email
      || coordinators.facultyEmail
      || coordinators.contactEmail,
    ''
  );

  const registrationLink = asString(
    input.registrationLink
      || input.registration_link
      || coordinators.registrationLink,
    ''
  );

  const maxAttendees = asInt(
    input.maxAttendees
      || input.capacity
      || coordinators.maxAttendees,
    0
  );

  const id = asString(input.id || input._id || opts.id || generateId('evt'));
  const title = asString(input.title || input.name, 'Untitled Event');
  const isActive = input.is_active !== undefined
    ? Boolean(input.is_active)
    : (input.isActive !== undefined ? Boolean(input.isActive) : true);

  const normalized = {
    id,
    title,
    name: title,
    category: asString(input.category, 'General'),
    description: asString(input.description, ''),
    event_date: startDateTime,
    startDateTime,
    endDateTime,
    regDeadline,
    location: venue,
    venue,
    registrationLink,
    facultyIncharge,
    facultyEmail,
    maxAttendees,
    capacity: maxAttendees,
    organizer: facultyIncharge,
    contact_email: facultyEmail,
    is_active: isActive,
    isActive,
    image: asString(input.image, 'bx bxs-calendar-event'),
    imageData: input.imageData || null,
    coordinators: {
      ...coordinators,
      facultyIncharge,
      facultyEmail,
      venue,
      registrationLink,
      startDateTime,
      endDateTime,
      regDeadline,
      maxAttendees,
    },
    created_by: opts.createdBy || input.created_by || null,
    created_at: input.created_at || opts.createdAt || nowIso,
    updated_at: nowIso,
  };

  return normalized;
}

function isExpired(event, ref = new Date()) {
  const end = new Date(event.endDateTime || event.event_date || event.startDateTime || 0);
  if (Number.isNaN(end.getTime())) return false;
  return end <= ref;
}

function filterActiveEvents(events, { date } = {}) {
  const today = new Date();
  const fromDate = date ? new Date(date) : today;

  return events
    .filter(e => e.is_active !== false && !isExpired(e, today))
    .filter(e => {
      const start = new Date(e.event_date || e.startDateTime || 0);
      if (Number.isNaN(start.getTime())) return true;
      return start >= fromDate;
    })
    .sort((a, b) => {
      const aTime = new Date(a.event_date || a.startDateTime || 0).getTime();
      const bTime = new Date(b.event_date || b.startDateTime || 0).getTime();
      return aTime - bTime;
    });
}

// ── GET /api/v1/events ────────────────────────────────────────────────────────
export const getEvents = async (req, res) => {
  try {
    const { category, date } = req.query;
    const approved = await getJsonList(EVENTS_APPROVED_KEY);

    let events = filterActiveEvents(approved, { date });
    if (category) {
      events = events.filter(e => e.category === category);
    }

    return res.status(200).json({ status: 'success', results: events.length, data: { events } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve events' });
  }
};

// ── GET /api/v1/events/:id ────────────────────────────────────────────────────
export const getEventById = async (req, res) => {
  try {
    const approved = await getJsonList(EVENTS_APPROVED_KEY);
    const event = approved.find(e => String(e.id) === String(req.params.id));
    if (!event) return res.status(404).json({ status: 'error', message: 'Event not found' });
    return res.status(200).json({ status: 'success', data: { event } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve event' });
  }
};

// ── POST /api/v1/events (admin) ──────────────────────────────────────────────
export const createEvent = async (req, res) => {
  try {
    const approved = await getJsonList(EVENTS_APPROVED_KEY);
    const event = normalizeEventRecord(req.body, {
      id: generateId('evt'),
      createdBy: req.user?.id || null,
    });

    approved.push(event);
    await saveJsonList(EVENTS_APPROVED_KEY, approved);

    return res.status(201).json({ status: 'success', data: { event } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to create event' });
  }
};

// ── PUT /api/v1/events/:id (admin) ───────────────────────────────────────────
export const updateEvent = async (req, res) => {
  try {
    const approved = await getJsonList(EVENTS_APPROVED_KEY);
    const idx = approved.findIndex(e => String(e.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ status: 'error', message: 'Event not found' });

    const merged = normalizeEventRecord({ ...approved[idx], ...req.body }, { id: approved[idx].id });
    merged.created_at = approved[idx].created_at;
    merged.created_by = approved[idx].created_by;
    approved[idx] = merged;

    await saveJsonList(EVENTS_APPROVED_KEY, approved);
    return res.status(200).json({ status: 'success', data: { event: merged } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update event' });
  }
};

// ── DELETE /api/v1/events/:id (admin) ────────────────────────────────────────
export const deleteEvent = async (req, res) => {
  try {
    const approved = await getJsonList(EVENTS_APPROVED_KEY);
    const idx = approved.findIndex(e => String(e.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ status: 'error', message: 'Event not found' });

    approved[idx] = {
      ...approved[idx],
      is_active: false,
      isActive: false,
      updated_at: new Date().toISOString(),
    };

    await saveJsonList(EVENTS_APPROVED_KEY, approved);
    return res.status(200).json({ status: 'success', message: 'Event deactivated' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete event' });
  }
};

// ── POST /api/v1/events/register ─────────────────────────────────────────────
export const registerForEvent = async (req, res) => {
  try {
    const { eventId, extra_data } = req.body;
    const userId = req.user?.id;

    if (!eventId || !userId) {
      return res.status(400).json({ status: 'error', message: 'eventId and authenticated user required' });
    }

    const registrations = await getJsonList(EVENT_REGISTRATIONS_KEY);
    const already = registrations.find(
      r => String(r.event_id) === String(eventId) && String(r.user_id) === String(userId)
    );

    if (already) {
      return res.status(409).json({ status: 'error', message: 'Already registered for this event' });
    }

    const data = {
      id: generateId('evt_reg'),
      event_id: eventId,
      user_id: userId,
      extra_data: extra_data || {},
      registered_at: new Date().toISOString(),
    };

    registrations.push(data);
    await saveJsonList(EVENT_REGISTRATIONS_KEY, registrations);

    return res.status(201).json({ status: 'success', message: 'Registered successfully', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to register for event' });
  }
};

// ── GET /api/v1/events/my ────────────────────────────────────────────────────
export const getRegisteredEvents = async (req, res) => {
  try {
    const userId = req.user?.id;
    const registrations = await getJsonList(EVENT_REGISTRATIONS_KEY);
    const approved = await getJsonList(EVENTS_APPROVED_KEY);

    const userRegs = registrations
      .filter(r => String(r.user_id) === String(userId))
      .sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
      .map(r => ({
        registered_at: r.registered_at,
        extra_data: r.extra_data,
        event: approved.find(e => String(e.id) === String(r.event_id)) || null,
      }));

    return res.status(200).json({ status: 'success', results: userRegs.length, data: { events: userRegs } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve registered events' });
  }
};

// ── POST /api/v1/events/submit-addition (user submission) ───────────────────
export const submitEventRegistration = async (req, res) => {
  try {
    const pending = await getJsonList(EVENTS_PENDING_ADDITIONS_KEY);
    const userEmail = req.user?.email || 'anonymous';

    const userPendingCount = pending.filter(p => p.submitted_by === userEmail).length;
    if (userPendingCount >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit reached. You have 5 pending requests.',
        pendingCount: userPendingCount,
        remainingRequests: 0,
      });
    }

    const request = {
      id: generateId('evt_add'),
      status: 'pending',
      submitted_by: userEmail,
      created_at: new Date().toISOString(),
      event: normalizeEventRecord(req.body, { id: generateId('evt') }),
    };

    pending.push(request);
    await saveJsonList(EVENTS_PENDING_ADDITIONS_KEY, pending);

    return res.status(202).json({
      status: 'success',
      message: 'Event addition request submitted for admin review',
      pendingCount: userPendingCount + 1,
      remainingRequests: Math.max(5 - (userPendingCount + 1), 0),
      data: { request },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to submit event addition request' });
  }
};

// ── POST /api/v1/events/submit-update (user submission) ─────────────────────
export const submitEventUpdate = async (req, res) => {
  try {
    const pending = await getJsonList(EVENTS_PENDING_UPDATES_KEY);
    const userEmail = req.user?.email || 'anonymous';
    const { event_id, changes } = req.body;

    if (!event_id) {
      return res.status(400).json({ status: 'error', message: 'event_id is required' });
    }

    const userPendingCount = pending.filter(p => p.submitted_by === userEmail).length;
    if (userPendingCount >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit reached. You have 5 pending requests.',
        pendingCount: userPendingCount,
        remainingRequests: 0,
      });
    }

    const request = {
      id: generateId('evt_upd'),
      event_id,
      changes: changes || {},
      status: 'pending',
      submitted_by: userEmail,
      created_at: new Date().toISOString(),
    };

    pending.push(request);
    await saveJsonList(EVENTS_PENDING_UPDATES_KEY, pending);

    return res.status(202).json({
      status: 'success',
      message: 'Event update request submitted for admin review',
      pendingCount: userPendingCount + 1,
      remainingRequests: Math.max(5 - (userPendingCount + 1), 0),
      data: { request },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to submit event update request' });
  }
};

// Admin approval handlers
export const approveEventRegistration = async (req, res) => {
  try {
    const requestId = req.body?.requestId || req.body?.id;
    if (!requestId) return res.status(400).json({ status: 'error', message: 'requestId is required' });

    const pending = await getJsonList(EVENTS_PENDING_ADDITIONS_KEY);
    const idx = pending.findIndex(r => String(r.id) === String(requestId));
    if (idx === -1) return res.status(404).json({ status: 'error', message: 'Pending addition request not found' });

    const approved = await getJsonList(EVENTS_APPROVED_KEY);
    approved.push(pending[idx].event);

    pending.splice(idx, 1);
    await saveJsonList(EVENTS_APPROVED_KEY, approved);
    await saveJsonList(EVENTS_PENDING_ADDITIONS_KEY, pending);

    return res.status(200).json({ status: 'success', message: 'Event addition approved' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to approve event addition' });
  }
};

export const rejectEventRegistration = async (req, res) => {
  try {
    const requestId = req.body?.requestId || req.body?.id;
    if (!requestId) return res.status(400).json({ status: 'error', message: 'requestId is required' });

    const pending = await getJsonList(EVENTS_PENDING_ADDITIONS_KEY);
    const next = pending.filter(r => String(r.id) !== String(requestId));
    await saveJsonList(EVENTS_PENDING_ADDITIONS_KEY, next);

    return res.status(200).json({ status: 'success', message: 'Event addition rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject event addition' });
  }
};

export const approveEventUpdate = async (req, res) => {
  try {
    const requestId = req.body?.requestId || req.body?.id;
    if (!requestId) return res.status(400).json({ status: 'error', message: 'requestId is required' });

    const pending = await getJsonList(EVENTS_PENDING_UPDATES_KEY);
    const idx = pending.findIndex(r => String(r.id) === String(requestId));
    if (idx === -1) return res.status(404).json({ status: 'error', message: 'Pending update request not found' });

    const approved = await getJsonList(EVENTS_APPROVED_KEY);
    const reqData = pending[idx];
    const eventIdx = approved.findIndex(e => String(e.id) === String(reqData.event_id));

    if (eventIdx === -1) {
      return res.status(404).json({ status: 'error', message: 'Target event not found' });
    }

    const updatedEvent = { ...approved[eventIdx] };
    const changes = reqData.changes || {};

    Object.entries(changes).forEach(([key, value]) => {
      const nextVal = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'new')
        ? value.new
        : value;
      updatedEvent[key] = nextVal;
    });

    const normalized = normalizeEventRecord(updatedEvent, { id: approved[eventIdx].id });
    normalized.created_at = approved[eventIdx].created_at;
    normalized.created_by = approved[eventIdx].created_by;
    approved[eventIdx] = normalized;

    pending.splice(idx, 1);
    await saveJsonList(EVENTS_APPROVED_KEY, approved);
    await saveJsonList(EVENTS_PENDING_UPDATES_KEY, pending);

    return res.status(200).json({ status: 'success', message: 'Event update approved' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to approve event update' });
  }
};

export const rejectEventUpdate = async (req, res) => {
  try {
    const requestId = req.body?.requestId || req.body?.id;
    if (!requestId) return res.status(400).json({ status: 'error', message: 'requestId is required' });

    const pending = await getJsonList(EVENTS_PENDING_UPDATES_KEY);
    const next = pending.filter(r => String(r.id) !== String(requestId));
    await saveJsonList(EVENTS_PENDING_UPDATES_KEY, next);

    return res.status(200).json({ status: 'success', message: 'Event update rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject event update' });
  }
};
