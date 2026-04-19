// Faculty Controller
import Faculty from '../models/faculty.model.js';
import PendingFacultyUpdate from '../models/pendingFacultyUpdate.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';

export const getFaculty = async (req, res, next) => {
  try {
    const { department, search } = req.query;
    let query = {};

    if (department) {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    const faculty = await Faculty.find(query).select('-__v').sort({ name: 1 });
    
    res.status(200).json({
      status: 'success',
      results: faculty.length,
      data: { faculty }
    });
  } catch (error) {
    next(new AppError('Failed to retrieve faculty list', 500));
  }
};

export const getFacultyById = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id).select('-__v');
    if (!faculty) {
      return next(new AppError('Faculty not found', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { faculty }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid faculty ID', 400));
    }
    next(new AppError('Failed to retrieve faculty details', 500));
  }
};

export const getFacultyByDepartment = async (req, res, next) => {
  try {
    const faculty = await Faculty.find({ department: req.params.dept }).select('-__v').sort({ name: 1 });
    res.status(200).json({
      status: 'success',
      results: faculty.length,
      data: { faculty }
    });
  } catch (error) {
    next(new AppError('Failed to retrieve faculty by department', 500));
  }
};

export const contactFaculty = async (req, res, next) => {
  try {
    const { facultyId, message, senderEmail, senderName } = req.body;

    // Find faculty to get contact email
    const faculty = await Faculty.findById(facultyId).select('email name');
    if (!faculty) {
      return next(new AppError('Faculty not found', 404));
    }

    // Send email to faculty
    const emailMessage = `
      Subject: Student Contact Request - ${senderName}
      
      Dear ${faculty.name},
      
      You have received a contact request from ${senderName} (${senderEmail}).
      
      Message:
      ${message}
      
      Best regards,
      VIT Bhopal Student Portal
    `;

    await sendEmail({
      email: faculty.email,
      subject: `Student Contact Request - ${senderName}`,
      message: emailMessage
    });

    res.status(201).json({
      status: 'success',
      message: 'Contact message sent successfully'
    });
  } catch (error) {
    next(new AppError('Failed to send contact message', 500));
  }
};

export const getFacultySchedule = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id).select('schedule name');
    if (!faculty) {
      return next(new AppError('Faculty not found', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { faculty }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid faculty ID', 400));
    }
    next(new AppError('Failed to retrieve faculty schedule', 500));
  }
};

// Admin-only CRUD operations
export const createFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.create({
      name: req.body.name,
      email: req.body.email,
      department: req.body.department,
      designation: req.body.designation,
      phone: req.body.phone,
      office: req.body.office,
      specialization: req.body.specialization,
      image: req.body.image,
      bio: req.body.bio,
      schedule: req.body.schedule
    });

    res.status(201).json({
      status: 'success',
      data: { faculty }
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Faculty email already exists', 400));
    }
    next(new AppError('Failed to create faculty', 500));
  }
};

// Get pending faculty additions (originalFacultyId: null)
export const getPendingAdditions = async (req, res, next) => {
  try {
    const pendingAdditions = await PendingFacultyUpdate.find({
      originalFacultyId: null,
      status: 'pending'
    }).populate('submittedBy', 'username email').sort({ submittedAt: -1 });

    res.status(200).json({
      status: 'success',
      results: pendingAdditions.length,
      data: { pendingAdditions }
    });
  } catch (error) {
    next(new AppError('Failed to retrieve pending additions', 500));
  }
};

// Get pending faculty updates (originalFacultyId exists)
export const getPendingUpdates = async (req, res, next) => {
  try {
    const pendingUpdates = await PendingFacultyUpdate.find({
      originalFacultyId: { $ne: null },
      status: 'pending'
    }).populate('submittedBy', 'username email').sort({ submittedAt: -1 });

    res.status(200).json({
      status: 'success',
      results: pendingUpdates.length,
      data: { pendingUpdates }
    });
  } catch (error) {
    next(new AppError('Failed to retrieve pending updates', 500));
  }
};

// Approve faculty addition
export const approveAddition = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingFacultyUpdate.findById(pendingUpdateId);
    if (!pendingUpdate) {
      return next(new AppError('Pending addition not found', 404));
    }

    // Extract new values from changes (old is null for additions)
    const newFacultyData = {};
    Object.entries(pendingUpdate.changes).forEach(([field, values]) => {
      newFacultyData[field] = values.new;
    });

    // Create faculty
    const faculty = await Faculty.create(newFacultyData);

    // Mark pending as approved
    pendingUpdate.status = 'approved';
    pendingUpdate.reviewedAt = Date.now();
    pendingUpdate.reviewedBy = req.user._id;
    await pendingUpdate.save();

    // Send approval email to submitter
    const submitter = await User.findById(pendingUpdate.submittedBy).select('email');
    if (submitter) {
      await sendEmail({
        email: submitter.email,
        subject: `Faculty Addition Approved: ${newFacultyData.name}`,
        message: `Your faculty addition for ${newFacultyData.name} has been approved and is now live.`
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Faculty addition approved and created',
      data: { faculty }
    });
  } catch (error) {
    next(new AppError('Failed to approve faculty addition', 500));
  }
};

// Reject faculty addition
export const rejectAddition = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingFacultyUpdate.findByIdAndUpdate(
      pendingUpdateId,
      {
        status: 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: req.user._id
      },
      { new: true }
    );

    if (!pendingUpdate) {
      return next(new AppError('Pending addition not found', 404));
    }

    // Send rejection email to submitter
    const submitter = await User.findById(pendingUpdate.submittedBy).select('email');
    if (submitter) {
      await sendEmail({
        email: submitter.email,
        subject: 'Faculty Addition Request Rejected',
        message: 'Your faculty addition request has been reviewed but not approved. Please contact admin for details.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Faculty addition request rejected'
    });
  } catch (error) {
    next(new AppError('Failed to reject faculty addition', 500));
  }
};

// Approve faculty update
export const approveUpdate = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingFacultyUpdate.findById(pendingUpdateId);
    if (!pendingUpdate) {
      return next(new AppError('Pending update not found', 404));
    }

    const { originalFacultyId } = pendingUpdate;

    // Apply changes to existing faculty
    const updateData = {};
    Object.entries(pendingUpdate.changes).forEach(([field, values]) => {
      updateData[field] = values.new;
    });

    const faculty = await Faculty.findByIdAndUpdate(
      originalFacultyId,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!faculty) {
      return next(new AppError('Faculty not found', 404));
    }

    // Mark pending as approved
    pendingUpdate.status = 'approved';
    pendingUpdate.reviewedAt = Date.now();
    pendingUpdate.reviewedBy = req.user._id;
    await pendingUpdate.save();

    // Send approval email to faculty
    await sendEmail({
      email: faculty.email,
      subject: `Faculty Update Approved: ${faculty.name}`,
      message: `Your faculty information updates have been approved and are now live.`
    });

    res.status(200).json({
      status: 'success',
      message: 'Faculty update approved and applied',
      data: { faculty }
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Faculty email already exists', 400));
    }
    next(new AppError('Failed to approve faculty update', 500));
  }
};

// Reject faculty update
export const rejectUpdate = async (req, res, next) => {
  try {
    const { pendingUpdateId } = req.body;

    const pendingUpdate = await PendingFacultyUpdate.findByIdAndUpdate(
      pendingUpdateId,
      {
        status: 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: req.user._id
      },
      { new: true }
    );

    if (!pendingUpdate) {
      return next(new AppError('Pending update not found', 404));
    }

    // Send rejection email to submitter
    const submitter = await User.findById(pendingUpdate.submittedBy).select('email');
    if (submitter) {
      await sendEmail({
        email: submitter.email,
        subject: 'Faculty Update Request Rejected',
        message: 'Your faculty update request has been reviewed but not approved. Please contact admin for details.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Faculty update request rejected'
    });
  } catch (error) {
    next(new AppError('Failed to reject faculty update', 500));
  }
};

export const updateFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        email: req.body.email,
        department: req.body.department,
        designation: req.body.designation,
        phone: req.body.phone,
        office: req.body.office,
        specialization: req.body.specialization,
        image: req.body.image,
        bio: req.body.bio,
        schedule: req.body.schedule
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!faculty) {
      return next(new AppError('Faculty not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { faculty }
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Faculty email already exists', 400));
    }
    if (error.name === 'CastError') {
      return next(new AppError('Invalid faculty ID', 400));
    }
    next(new AppError('Failed to update faculty', 500));
  }
};

export const deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) {
      return next(new AppError('Faculty not found', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid faculty ID', 400));
    }
    next(new AppError('Failed to delete faculty', 500));
  }
};
