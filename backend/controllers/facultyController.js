import { uploadToR2, getR2Object, deleteFromR2 } from '../lib/r2.js';

// R2 Keys
const FACULTY_LIST_KEY = 'faculty/list.json'; // Minimal list for index
const ALL_APPROVED_DATA_KEY = 'faculty/all_approved_data.json'; // Full data for all approved
const PENDING_ADDITIONS_KEY = 'faculty/pending-additions.json';
const PENDING_UPDATES_KEY = 'faculty/pending-updates.json';

// In-memory cache
let facultyCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper: Get all approved faculty data with caching
async function getAllApprovedFaculty() {
  const now = Date.now();
  if (facultyCache && (now - lastCacheUpdate < CACHE_TTL)) {
    return facultyCache;
  }

  try {
    const data = await getR2Object(ALL_APPROVED_DATA_KEY);
    facultyCache = JSON.parse(data);
    lastCacheUpdate = now;
    return facultyCache;
  } catch (error) {
    // If consolidated file doesn't exist, try to build it from the list
    console.log('Consolidated faculty file not found, attempting to rebuild...');
    const list = await getFacultyList();
    const approved = list.filter(f => f.status === 'approved');
    
    const fullDataList = await Promise.all(approved.map(async (f) => {
      const data = await getFacultyDataFromR2(f.id);
      return data || f;
    }));

    if (fullDataList.length > 0) {
      await saveAllApprovedFaculty(fullDataList);
      facultyCache = fullDataList;
      lastCacheUpdate = now;
      return facultyCache;
    }
    
    return [];
  }
}

// Helper: Save all approved faculty data to R2 and update cache
async function saveAllApprovedFaculty(list) {
  const jsonString = JSON.stringify(list, null, 2);
  await uploadToR2(ALL_APPROVED_DATA_KEY, Buffer.from(jsonString), 'application/json');
  facultyCache = list;
  lastCacheUpdate = Date.now();
}

// Helper: Get faculty list index from R2
async function getFacultyList() {
  try {
    const data = await getR2Object(FACULTY_LIST_KEY);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper: Save faculty list index to R2
async function saveFacultyList(list) {
  const jsonString = JSON.stringify(list, null, 2);
  await uploadToR2(FACULTY_LIST_KEY, Buffer.from(jsonString), 'application/json');
}

// Helper: Get pending additions from R2
async function getPendingAdditionsList() {
  try {
    const data = await getR2Object(PENDING_ADDITIONS_KEY);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper: Save pending additions to R2
async function savePendingAdditionsList(list) {
  const jsonString = JSON.stringify(list, null, 2);
  await uploadToR2(PENDING_ADDITIONS_KEY, Buffer.from(jsonString), 'application/json');
}

// Helper: Get pending updates from R2
async function getPendingUpdatesList() {
  try {
    const data = await getR2Object(PENDING_UPDATES_KEY);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper: Save pending updates to R2
async function savePendingUpdatesList(list) {
  const jsonString = JSON.stringify(list, null, 2);
  await uploadToR2(PENDING_UPDATES_KEY, Buffer.from(jsonString), 'application/json');
}

// Helper: Get individual faculty data from R2
async function getFacultyDataFromR2(facultyId) {
  try {
    const r2Key = `faculty/${facultyId}/data.json`;
    const jsonData = await getR2Object(r2Key);
    return JSON.parse(jsonData);
  } catch (error) {
    return null;
  }
}

// Helper: Save individual faculty data to R2
async function saveFacultyDataToR2(facultyId, facultyData) {
  const r2Key = `faculty/${facultyId}/data.json`;
  const jsonString = JSON.stringify(facultyData, null, 2);
  await uploadToR2(r2Key, Buffer.from(jsonString), 'application/json');
}

// Helper: Generate unique ID
function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

function getRecordId(item) {
  return item?.id || item?._id || null;
}

function normalizeIdValue(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function idsMatch(left, right) {
  const normalizedLeft = normalizeIdValue(left);
  const normalizedRight = normalizeIdValue(right);
  return normalizedLeft !== '' && normalizedLeft === normalizedRight;
}

function upsertById(list, item) {
  const normalized = Array.isArray(list) ? [...list] : [];
  const targetId = getRecordId(item);
  const index = normalized.findIndex(entry => idsMatch(getRecordId(entry), targetId));

  if (index !== -1) {
    normalized[index] = { ...normalized[index], ...item, id: targetId };
  } else {
    normalized.push({ ...item, id: targetId });
  }

  return normalized;
}

function dedupeById(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).filter(item => {
    const id = normalizeIdValue(getRecordId(item));
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// ── GET /api/v1/faculty ───────────────────────────────────────────────────────
export const getFaculty = async (req, res) => {
  try {
    const { department, search } = req.query;
    
    // Get all approved faculty with details (uses cache)
    let approved = await getAllApprovedFaculty();
    
    // Apply filters
    if (department) {
      approved = approved.filter(f => f.department === department);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      approved = approved.filter(f => 
        f.name.toLowerCase().includes(searchLower) ||
        (f.specialization && f.specialization.toLowerCase().includes(searchLower))
      );
    }

    return res.status(200).json({ 
      status: 'success', 
      results: approved.length, 
      data: { faculty: approved } 
    });
  } catch (err) {
    console.error('getFaculty error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve faculty list' });
  }
};

// ── GET /api/v1/faculty/:id ───────────────────────────────────────────────────
export const getFacultyById = async (req, res) => {
  try {
    // Try to find in cache first
    const approved = await getAllApprovedFaculty();
    const faculty = approved.find(f => idsMatch(getRecordId(f), req.params.id));
    
    if (faculty) {
      return res.status(200).json({ status: 'success', data: { faculty } });
    }

    // Fallback to direct R2 read (might be a newly approved one not in cache yet)
    const fullData = await getFacultyDataFromR2(req.params.id);
    
    if (!fullData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    return res.status(200).json({ status: 'success', data: { faculty: fullData } });
  } catch (err) {
    console.error('getFacultyById error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve faculty' });
  }
};

// ── POST /api/v1/faculty (user submission - pending approval) ────────────────
export const createFaculty = async (req, res) => {
  try {
    const userEmail = req.user?.email || 'anonymous';
    
    const pendingList = await getPendingAdditionsList();
    const userPending = pendingList.filter(p => p.submitted_by === userEmail);
    if (userPending.length >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit reached. You have 5 pending requests.',
        pendingCount: userPending.length,
        remainingRequests: 0
      });
    }

    const facultyId = generateId();
    const facultyData = {
      id: facultyId,
      name: req.body.name,
      email: req.body.email,
      department: req.body.department,
      designation: req.body.designation,
      phone: req.body.phone,
      office: req.body.office,
      specialization: req.body.specialization,
      availability: req.body.availability,
      bio: req.body.bio,
      photo_url: req.body.photo_url || null,
      status: 'pending',
      submitted_by: userEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await saveFacultyDataToR2(facultyId, facultyData);
    
    pendingList.push({
      id: facultyId,
      name: facultyData.name,
      department: facultyData.department,
      status: 'pending',
      submitted_by: userEmail,
      created_at: facultyData.created_at
    });
    await savePendingAdditionsList(pendingList);

    return res.status(201).json({
      status: 'success',
      message: 'Faculty submission pending admin approval',
      pendingCount: userPending.length + 1,
      remainingRequests: Math.max(5 - (userPending.length + 1), 0),
      data: { faculty: facultyData }
    });
  } catch (err) {
    console.error('createFaculty error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to create faculty' });
  }
};

// ── POST /api/v1/faculty/update-request (user update request) ────────────────
export const createUpdateRequest = async (req, res) => {
  try {
    const userEmail = req.user?.email || 'anonymous';
    const { faculty_id, changes, request_type } = req.body;

    const pendingUpdates = await getPendingUpdatesList();
    const userPending = pendingUpdates.filter(p => p.submitted_by === userEmail);
    if (userPending.length >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit reached. You have 5 pending requests.',
        pendingCount: userPending.length,
        remainingRequests: 0
      });
    }

    const currentData = await getFacultyDataFromR2(faculty_id);
    if (!currentData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    const updateId = generateId();
    const updateRequest = {
      id: updateId,
      faculty_id,
      faculty_name: currentData.name,
      changes: changes || {},
      request_type: request_type === 'delete' ? 'delete' : 'update',
      submitted_by: userEmail,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    pendingUpdates.push(updateRequest);
    await savePendingUpdatesList(pendingUpdates);

    return res.status(201).json({
      status: 'success',
      message: updateRequest.request_type === 'delete'
        ? 'Delete request submitted for admin approval'
        : 'Update request submitted for admin approval',
      pendingCount: userPending.length + 1,
      remainingRequests: Math.max(5 - (userPending.length + 1), 0),
      data: { updateRequest }
    });
  } catch (err) {
    console.error('createUpdateRequest error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to create update request' });
  }
};

// ── POST /api/v1/faculty/admin/:id/approve (admin only) ──────────────────────
export const approveAddition = async (req, res) => {
  try {
    const { id } = req.params;
    const pendingList = await getPendingAdditionsList();
    const pendingRequest = pendingList.find(p => idsMatch(p.id, id));

    if (!pendingRequest) {
      return res.status(409).json({
        status: 'error',
        message: 'This addition request was already processed.'
      });
    }

    const facultyData = await getFacultyDataFromR2(id);
    if (!facultyData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    facultyData.id = getRecordId(facultyData) || id;

    facultyData.status = 'approved';
    facultyData.updated_at = new Date().toISOString();
    await saveFacultyDataToR2(id, facultyData);

    // Update main faculty list index
    const facultyList = await getFacultyList();
    const nextListEntry = {
      id: facultyData.id,
      name: facultyData.name,
      department: facultyData.department,
      status: 'approved',
      created_at: facultyData.created_at,
      updated_at: facultyData.updated_at
    };
    await saveFacultyList(dedupeById(upsertById(facultyList, nextListEntry)));

    // Update consolidated full data file
    const allApproved = await getAllApprovedFaculty();
    await saveAllApprovedFaculty(dedupeById(upsertById(allApproved, facultyData)));

    // Remove from pending list
    const updatedPending = pendingList.filter(p => !idsMatch(p.id, id));
    await savePendingAdditionsList(updatedPending);

    return res.status(200).json({ status: 'success', message: 'Faculty approved successfully' });
  } catch (err) {
    console.error('approveAddition error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to approve faculty' });
  }
};

// ── POST /api/v1/faculty/admin/updates/:id/approve (admin only) ──────────────
export const approveUpdate = async (req, res) => {
  try {
    const { id } = req.params;

    const pendingUpdates = await getPendingUpdatesList();
    const updateReq = pendingUpdates.find(u => idsMatch(u.id, id));
    if (!updateReq) {
      return res.status(409).json({
        status: 'error',
        message: 'This update request was already processed.'
      });
    }

    const currentData = await getFacultyDataFromR2(updateReq.faculty_id);
    if (!currentData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    currentData.id = getRecordId(currentData) || updateReq.faculty_id;

    if (updateReq.request_type === 'delete') {
      await deleteFromR2(`faculty/${updateReq.faculty_id}/data.json`).catch(() => {});

      const facultyList = await getFacultyList();
      await saveFacultyList(dedupeById(facultyList.filter(f => !idsMatch(getRecordId(f), updateReq.faculty_id))));

      const allApproved = await getAllApprovedFaculty();
      await saveAllApprovedFaculty(dedupeById(allApproved.filter(f => !idsMatch(getRecordId(f), updateReq.faculty_id))));

      const updatedPendingDelete = pendingUpdates.filter(u => !idsMatch(u.id, id));
      await savePendingUpdatesList(updatedPendingDelete);

      return res.status(200).json({ status: 'success', message: 'Delete request approved successfully' });
    }

    const changes = updateReq.changes;
    Object.keys(changes).forEach(key => {
      const change = changes[key];
      currentData[key] = change.new !== undefined ? change.new : change;
    });
    currentData.updated_at = new Date().toISOString();

    await saveFacultyDataToR2(updateReq.faculty_id, currentData);

    // Update main list index
    const facultyList = await getFacultyList();
    const index = facultyList.findIndex(f => idsMatch(getRecordId(f), updateReq.faculty_id));
    if (index !== -1) {
      facultyList[index].name = currentData.name;
      facultyList[index].department = currentData.department;
      facultyList[index].updated_at = currentData.updated_at;
      await saveFacultyList(dedupeById(facultyList));
    }

    // Update consolidated full data file
    const allApproved = await getAllApprovedFaculty();
    const approvedIndex = allApproved.findIndex(f => idsMatch(getRecordId(f), updateReq.faculty_id));
    if (approvedIndex !== -1) {
      allApproved[approvedIndex] = currentData;
    } else {
      allApproved.push(currentData);
    }
    await saveAllApprovedFaculty(dedupeById(allApproved));

    const updatedPending = pendingUpdates.filter(u => !idsMatch(u.id, id));
    await savePendingUpdatesList(updatedPending);

    return res.status(200).json({ status: 'success', message: 'Update approved successfully' });
  } catch (err) {
    console.error('approveUpdate error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to approve update' });
  }
};

// ── ADMIN CRUD OPERATIONS ───────────────────────────────────────────────────

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const currentData = await getFacultyDataFromR2(id);
    if (!currentData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    const updatedData = { ...currentData, ...req.body, id: getRecordId(currentData) || id, updated_at: new Date().toISOString() };
    await saveFacultyDataToR2(id, updatedData);

    // Update index and consolidated
    const facultyList = await getFacultyList();
    const idx = facultyList.findIndex(f => idsMatch(getRecordId(f), id));
    if (idx !== -1) {
      facultyList[idx] = { ...facultyList[idx], ...req.body, updated_at: updatedData.updated_at };
      await saveFacultyList(facultyList);
    }

    const allApproved = await getAllApprovedFaculty();
    const appIdx = allApproved.findIndex(f => idsMatch(getRecordId(f), id));
    if (appIdx !== -1) {
      allApproved[appIdx] = updatedData;
      await saveAllApprovedFaculty(allApproved);
    }

    return res.status(200).json({ status: 'success', data: { faculty: updatedData } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update faculty' });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFromR2(`faculty/${id}/data.json`).catch(() => {});

    const facultyList = await getFacultyList();
    await saveFacultyList(facultyList.filter(f => !idsMatch(getRecordId(f), id)));

    const allApproved = await getAllApprovedFaculty();
    await saveAllApprovedFaculty(allApproved.filter(f => !idsMatch(getRecordId(f), id)));

    return res.status(200).json({ status: 'success', message: 'Faculty deleted' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete faculty' });
  }
};

// ... keep other admin exports ...
export const getPendingAdditions = async (req, res) => {
  try {
    const pendingList = await getPendingAdditionsList();
    const pendingWithData = await Promise.all(pendingList.map(async (p) => {
      const fullData = await getFacultyDataFromR2(p.id);
      return fullData || p;
    }));
    return res.status(200).json({ status: 'success', data: { pendingAdditions: pendingWithData } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get pending additions' });
  }
};

export const getPendingUpdates = async (req, res) => {
  try {
    const pendingUpdates = await getPendingUpdatesList();
    return res.status(200).json({ status: 'success', data: { pendingUpdates } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get pending updates' });
  }
};

export const rejectAddition = async (req, res) => {
  try {
    const { id } = req.params;
    const pendingList = await getPendingAdditionsList();
    const pendingRequest = pendingList.find(p => idsMatch(p.id, id));

    if (!pendingRequest) {
      return res.status(409).json({
        status: 'error',
        message: 'This addition request was already processed.'
      });
    }

    await deleteFromR2(`faculty/${id}/data.json`).catch(() => {});
    await savePendingAdditionsList(pendingList.filter(p => !idsMatch(p.id, id)));
    return res.status(200).json({ status: 'success', message: 'Faculty rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject faculty' });
  }
};

export const rejectUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const pendingUpdates = await getPendingUpdatesList();
    const pendingRequest = pendingUpdates.find(u => idsMatch(u.id, id));

    if (!pendingRequest) {
      return res.status(409).json({
        status: 'error',
        message: 'This update request was already processed.'
      });
    }

    await savePendingUpdatesList(pendingUpdates.filter(u => !idsMatch(u.id, id)));
    return res.status(200).json({ status: 'success', message: 'Update rejected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reject update' });
  }
};

export const getFacultyByDepartment = async (req, res) => {
  req.query.department = req.params.dept;
  return getFaculty(req, res);
};

export const contactFaculty = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Contact request received' });
};

export const getFacultySchedule = async (req, res) => {
  try {
    const fullData = await getFacultyDataFromR2(req.params.id);
    if (!fullData) return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    return res.status(200).json({ status: 'success', data: { faculty: { id: fullData.id, name: fullData.name, availability: fullData.availability } } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve schedule' });
  }
};
