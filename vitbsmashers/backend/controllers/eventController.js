// Event Controller
import Event from '../models/event.model.js';
import PendingEventUpdate from '../models/pendingEventUpdate.model.js';
import AppError from '../utils/appError.js';
import User from '../models/user.model.js';

export const getEvents = async (req, res, next) => {
  try {
    const { category, date, active } = req.query;
    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (date) {
      query.date = { $gte: new Date(date) };
    }

    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const events = await Event.find(query)
      .populate('createdBy', 'username email')
      .populate('registeredUsers', 'username email')
      .sort({ date: 1 })
      .select('-__v');

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events }
    });
  } catch (error) {
    next(new AppError('Failed to retrieve events', 500));
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('registeredUsers', 'username email')
      .select('-__v');
    
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { event }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid event ID', 400));
    }
    next(new AppError('Failed to retrieve event details', 500));
  }
};

// Admin-only: Create event
export const createEvent = async (req, res, next) => {
  try {
    const event = await Event.create({
      ...req.body,
      createdBy: req.user._id
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'username email')
      .select('-__v');

    res.status(201).json({
      status: 'success',
      data: { event: populatedEvent }
    });
  } catch (error) {
    next(new AppError('Failed to create event', 500));
  }
};

// Admin-only: Update event
export const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'username email')
      .populate('registeredUsers', 'username email')
      .select('-__v');

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { event }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid event ID', 400));
    }
    next(new AppError('Failed to update event', 500));
  }
};

// Admin-only: Delete event
export const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid event ID', 400));
    }
    next(new AppError('Failed to delete event', 500));
  }
};

export const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    if (event.registeredUsers.includes(userId)) {
      return next(new AppError('Already registered for this event', 400));
    }

    if (event.registeredUsers.length >= event.capacity) {
      return next(new AppError('Event is full', 400));
    }

    event.registeredUsers.push(userId);
    await event.save();

    const populatedEvent = await Event.findById(eventId)
      .populate('registeredUsers', 'username email')
      .select('-__v');

    res.status(201).json({
      status: 'success',
      message: 'Registered for event successfully',
      data: { event: populatedEvent }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid event ID', 400));
    }
    next(new AppError('Failed to register for event', 500));
  }
};

export const getRegisteredEvents = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const events = await Event.find({
      registeredUsers: userId,
      isActive: true
    })
      .populate('createdBy', 'username email')
      .sort({ date: 1 })
      .select('-__v');

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events }
    });
  } catch (error) {
    next(new AppError('Failed to retrieve registered events', 500));
  }
};

// User submission: Submit event registration request
export const submitEventRegistration = async (req, res, next) => {
  try {
    const submittedBy = req.user._id;
    const eventData = req.body;

    // Create pending registration record
    const pendingUpdate = await PendingEventUpdate.create({
      originalEventId: null, // New registration
      submittedBy,
      changes: eventData, // Full event data for new event
      notes: req.body.notes || ''
    });

    // Send notification to admin (implement email if needed)
    console.log('Admin notification sent for new event registration:', eventData.title);

    res.status(201).json({
      status: 'success',
      message: 'Event registration request submitted successfully for admin review',
      data: { pendingUpdateId: pendingUpdate._id }
    });
  } catch (error) {
    next(new AppError('Failed to submit event registration request', 500));
  }
};

// User submission: Submit event update request
export const submitEventUpdate = async (req, res, next) => {
  try {
    const { eventId, ...changes } = req.body;
    const submittedBy = req.user._id;

    // Get current event data
    const currentEvent = await Event.findById(eventId);
    if (!currentEvent) {
      return next(new AppError('Event not found', 404));
    }

    // Prepare changes object
    const updateChanges = {};
    Object.keys(changes).forEach(key => {
      if (currentEvent[key] !== changes[key]) {
        updateChanges[key] = { old: currentEvent[key], new: changes[key] };
      }
    });

    if (Object.keys(updateChanges).length === 0) {
      return next(new AppError('No changes detected', 400));
    }

    // Create pending update record
    const pendingUpdate = await PendingEventUpdate.create({
      originalEventId: eventId,
      submittedBy,
      changes: updateChanges,
      notes: req.body.notes || ''
    });

    // Send notification to admin (implement email if needed)
    console.log('Admin notification sent for event update:', eventId);

    res.status(201).json({
      status: 'success',
      message: 'Event update request submitted successfully for admin review',
      data: { pendingUpdateId: pendingUpdate._id }
    });
  } catch (error) {
    next(new AppError('Failed to submit event update request', 500));
  }
};

// Admin approval: Approve event registration
export const approveEventRegistration = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingEventUpdate.findById(pendingUpdateId);
    if (!pendingUpdate) {
      return next(new AppError('Pending update not found', 404));
    }

    // Create new event from changes
    const newEvent = await Event.create({
      title: pendingUpdate.changes.title || pendingUpdate.changes.name, // Handle both
      description: pendingUpdate.changes.description,
      date: pendingUpdate.changes.date || new Date(pendingUpdate.changes.startDateTime),
      time: pendingUpdate.changes.time,
      location: pendingUpdate.changes.location || pendingUpdate.changes.venue,
      category: pendingUpdate.changes.category,
      organizer: pendingUpdate.changes.organizer || pendingUpdate.changes.facultyIncharge,
      contactEmail: pendingUpdate.changes.contactEmail || pendingUpdate.changes.facultyEmail,
      capacity: pendingUpdate.changes.capacity || pendingUpdate.changes.maxAttendees,
      createdBy: req.user._id // Admin approves, so admin creates
    });

    // Mark as approved
    pendingUpdate.status = 'approved';
    pendingUpdate.reviewedAt = Date.now();
    pendingUpdate.reviewedBy = req.user._id;
    await pendingUpdate.save();

    res.status(200).json({
      status: 'success',
      message: 'Event registration approved and added to database',
      data: { event: newEvent }
    });
  } catch (error) {
    next(new AppError('Failed to approve event registration', 500));
  }
};

// Admin rejection: Reject event registration
export const rejectEventRegistration = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingEventUpdate.findByIdAndUpdate(
      pendingUpdateId,
      { status: 'rejected', reviewedAt: Date.now(), reviewedBy: req.user._id },
      { new: true }
    );

    if (!pendingUpdate) {
      return next(new AppError('Pending update not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Event registration request rejected'
    });
  } catch (error) {
    next(new AppError('Failed to reject event registration', 500));
  }
};

// Admin approval: Approve event update
export const approveEventUpdate = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingEventUpdate.findById(pendingUpdateId);
    if (!pendingUpdate) {
      return next(new AppError('Pending update not found', 404));
    }

    const { originalEventId } = pendingUpdate;

    // Apply changes to original event
    const updatedEvent = await Event.findByIdAndUpdate(
      originalEventId,
      pendingUpdate.changes,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return next(new AppError('Original event not found', 404));
    }

    // Mark as approved
    pendingUpdate.status = 'approved';
    pendingUpdate.reviewedAt = Date.now();
    pendingUpdate.reviewedBy = req.user._id;
    await pendingUpdate.save();

    res.status(200).json({
      status: 'success',
      message: 'Event update approved and applied',
      data: { event: updatedEvent }
    });
  } catch (error) {
    next(new AppError('Failed to approve event update', 500));
  }
};

// Admin rejection: Reject event update
export const rejectEventUpdate = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingEventUpdate.findByIdAndUpdate(
      pendingUpdateId,
      { status: 'rejected', reviewedAt: Date.now(), reviewedBy: req.user._id },
      { new: true }
    );

    if (!pendingUpdate) {
      return next(new AppError('Pending update not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Event update request rejected'
    });
  } catch (error) {
    next(new AppError('Failed to reject event update', 500));
  }
};
