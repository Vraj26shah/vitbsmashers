import { uploadToR2, getR2Object, deleteFromR2 } from '../lib/r2.js';

// R2 Keys
const FACULTY_LIST_KEY = 'faculty/list.json';
const PENDING_ADDITIONS_KEY = 'faculty/pending-additions.json';
const PENDING_UPDATES_KEY = 'faculty/pending-updates.json';

// Helper: Get faculty list index from R2
async function getFacultyList() {
  try {
    const data = await getR2Object(FACULTY_LIST_KEY);
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
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

// ── GET /api/v1/faculty ───────────────────────────────────────────────────────
// Returns approved faculty list from R2
export const getFaculty = async (req, res) => {
  try {
    const { department, search } = req.query;
    
    // Get faculty list index from R2
    const facultyList = await getFacultyList();
    
    // Filter approved faculty
    let approved = facultyList.filter(f => f.status === 'approved');
    
    // Apply filters
    if (department) {
      approved = approved.filter(f => f.department === department);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      approved = approved.filter(f => 
        f.name.toLowerCase().includes(searchLower)
      );
    }

    // Fetch full data from R2 for each faculty
    const facultyWithData = await Promise.all(approved.map(async (f) => {
      const fullData = await getFacultyDataFromR2(f.id);
      return fullData || f;
    }));

    return res.status(200).json({ 
      status: 'success', 
      results: facultyWithData.length, 
      data: { faculty: facultyWithData } 
    });
  } catch (err) {
    console.error('getFaculty error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve faculty list' });
  }
};

// ── GET /api/v1/faculty/:id ───────────────────────────────────────────────────
export const getFacultyById = async (req, res) => {
  try {
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
    
    // Get pending additions list
    const pendingList = await getPendingAdditionsList();
    
    // Check rate limit (5 pending per user)
    const userPending = pendingList.filter(p => p.submitted_by === userEmail);
    if (userPending.length >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit reached. You have 5 pending requests.',
        pendingCount: userPending.length,
        remainingRequests: 0
      });
    }

    // Generate unique ID
    const facultyId = generateId();
    
    // Create faculty data
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

    // Save to R2
    await saveFacultyDataToR2(facultyId, facultyData);
    
    // Add to pending list
    pendingList.push({
      id: facultyId,
      name: facultyData.name,
      department: facultyData.department,
      status: 'pending',
      submitted_by: userEmail,
      created_at: facultyData.created_at
    });
    await savePendingAdditionsList(pendingList);

    const newPendingCount = userPending.length + 1;
    return res.status(201).json({
      status: 'success',
      message: 'Faculty submission pending admin approval',
      data: { faculty: facultyData },
      pendingCount: newPendingCount,
      remainingRequests: 5 - newPendingCount
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
    const { faculty_id, changes } = req.body;

    // Get pending updates list
    const pendingUpdates = await getPendingUpdatesList();
    
    // Check rate limit (5 pending per user)
    const userPending = pendingUpdates.filter(p => p.submitted_by === userEmail);
    if (userPending.length >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit reached. You have 5 pending update requests.',
        pendingCount: userPending.length,
        remainingRequests: 0
      });
    }

    // Get current faculty data
    const currentData = await getFacultyDataFromR2(faculty_id);
    if (!currentData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    // Create update request
    const updateId = generateId();
    const updateRequest = {
      id: updateId,
      faculty_id,
      faculty_name: currentData.name,
      changes,
      submitted_by: userEmail,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Add to pending updates list
    pendingUpdates.push(updateRequest);
    await savePendingUpdatesList(pendingUpdates);

    const newPendingCount = userPending.length + 1;
    return res.status(201).json({
      status: 'success',
      message: 'Update request submitted for admin approval',
      data: { updateRequest },
      pendingCount: newPendingCount,
      remainingRequests: 5 - newPendingCount
    });
  } catch (err) {
    console.error('createUpdateRequest error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to create update request' });
  }
};

// ── GET /api/v1/faculty/admin/pending (admin only) ───────────────────────────
export const getPendingAdditions = async (req, res) => {
  try {
    const pendingList = await getPendingAdditionsList();
    
    // Fetch full data for each pending faculty
    const pendingWithData = await Promise.all(pendingList.map(async (p) => {
      const fullData = await getFacultyDataFromR2(p.id);
      return fullData || p;
    }));

    return res.status(200).json({
      status: 'success',
      data: { pendingAdditions: pendingWithData }
    });
  } catch (err) {
    console.error('getPendingAdditions error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to get pending additions' });
  }
};

// ── GET /api/v1/faculty/admin/updates (admin only) ───────────────────────────
export const getPendingUpdates = async (req, res) => {
  try {
    const pendingUpdates = await getPendingUpdatesList();

    return res.status(200).json({
      status: 'success',
      data: { pendingUpdates }
    });
  } catch (err) {
    console.error('getPendingUpdates error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to get pending updates' });
  }
};

// ── POST /api/v1/faculty/admin/:id/approve (admin only) ──────────────────────
export const approveAddition = async (req, res) => {
  try {
    const { id } = req.params;

    // Get faculty data
    const facultyData = await getFacultyDataFromR2(id);
    if (!facultyData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    // Update status to approved
    facultyData.status = 'approved';
    facultyData.updated_at = new Date().toISOString();
    await saveFacultyDataToR2(id, facultyData);

    // Add to main faculty list
    const facultyList = await getFacultyList();
    facultyList.push({
      id: facultyData.id,
      name: facultyData.name,
      department: facultyData.department,
      status: 'approved',
      created_at: facultyData.created_at,
      updated_at: facultyData.updated_at
    });
    await saveFacultyList(facultyList);

    // Remove from pending list
    const pendingList = await getPendingAdditionsList();
    const updatedPending = pendingList.filter(p => p.id !== id);
    await savePendingAdditionsList(updatedPending);

    return res.status(200).json({
      status: 'success',
      message: 'Faculty approved successfully'
    });
  } catch (err) {
    console.error('approveAddition error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to approve faculty' });
  }
};

// ── POST /api/v1/faculty/admin/:id/reject (admin only) ───────────────────────
export const rejectAddition = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete faculty data from R2
    const r2Key = `faculty/${id}/data.json`;
    await deleteFromR2(r2Key).catch(err => console.error('R2 delete error:', err));

    // Remove from pending list
    const pendingList = await getPendingAdditionsList();
    const updatedPending = pendingList.filter(p => p.id !== id);
    await savePendingAdditionsList(updatedPending);

    return res.status(200).json({
      status: 'success',
      message: 'Faculty rejected and removed'
    });
  } catch (err) {
    console.error('rejectAddition error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to reject faculty' });
  }
};

// ── POST /api/v1/faculty/admin/updates/:id/approve (admin only) ──────────────
export const approveUpdate = async (req, res) => {
  try {
    const { id } = req.params;

    // Get update request
    const pendingUpdates = await getPendingUpdatesList();
    const updateReq = pendingUpdates.find(u => u.id === id);
    
    if (!updateReq) {
      return res.status(404).json({ status: 'error', message: 'Update request not found' });
    }

    // Get current faculty data
    const currentData = await getFacultyDataFromR2(updateReq.faculty_id);
    if (!currentData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }

    // Apply changes
    const changes = updateReq.changes;
    Object.keys(changes).forEach(key => {
      const change = changes[key];
      currentData[key] = change.new !== undefined ? change.new : change;
    });
    currentData.updated_at = new Date().toISOString();

    // Save updated data
    await saveFacultyDataToR2(updateReq.faculty_id, currentData);

    // Update main list if name/department changed
    if (changes.name || changes.department) {
      const facultyList = await getFacultyList();
      const index = facultyList.findIndex(f => f.id === updateReq.faculty_id);
      if (index !== -1) {
        facultyList[index].name = currentData.name;
        facultyList[index].department = currentData.department;
        facultyList[index].updated_at = currentData.updated_at;
        await saveFacultyList(facultyList);
      }
    }

    // Remove from pending updates
    const updatedPending = pendingUpdates.filter(u => u.id !== id);
    await savePendingUpdatesList(updatedPending);

    return res.status(200).json({
      status: 'success',
      message: 'Update approved successfully'
    });
  } catch (err) {
    console.error('approveUpdate error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to approve update' });
  }
};

// ── POST /api/v1/faculty/admin/updates/:id/reject (admin only) ───────────────
export const rejectUpdate = async (req, res) => {
  try {
    const { id } = req.params;

    // Remove from pending updates
    const pendingUpdates = await getPendingUpdatesList();
    const updatedPending = pendingUpdates.filter(u => u.id !== id);
    await savePendingUpdatesList(updatedPending);

    return res.status(200).json({
      status: 'success',
      message: 'Update request rejected'
    });
  } catch (err) {
    console.error('rejectUpdate error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to reject update' });
  }
};

// Legacy/helper endpoints
export const getFacultyByDepartment = async (req, res) => {
  req.query.department = req.params.dept;
  return getFaculty(req, res);
};

export const updateFaculty = async (req, res) => {
  return res.status(400).json({ 
    status: 'error', 
    message: 'Use POST /api/v1/faculty/update-request to submit updates for approval' 
  });
};

export const deleteFaculty = async (req, res) => {
  return res.status(403).json({ 
    status: 'error', 
    message: 'Contact admin to remove faculty' 
  });
};

export const contactFaculty = async (req, res) => {
  return res.status(200).json({ 
    status: 'success', 
    message: 'Contact request received. Email functionality coming soon.' 
  });
};

export const getFacultySchedule = async (req, res) => {
  try {
    const fullData = await getFacultyDataFromR2(req.params.id);
    if (!fullData) {
      return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    }
    return res.status(200).json({ 
      status: 'success', 
      data: { 
        faculty: { 
          id: fullData.id, 
          name: fullData.name, 
          availability: fullData.availability 
        } 
      } 
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve schedule' });
  }
};
