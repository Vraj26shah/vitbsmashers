// Profile Controller
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';

export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // If requesting own profile, use authenticated user
    const profileUserId = userId === 'me' ? req.user._id : userId;

    const user = await User.findById(profileUserId).select('-password -otp -otpExpires -passwordChangedAt');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Ensure profile completion status is up to date
    const isComplete = user.isProfileComplete();
    console.log('🔍 Profile retrieval for user:', user.email, {
      profileCompleted: user.profileCompleted,
      hasPhone: !!user.phone,
      hasRegistration: !!user.registrationNumber,
      hasBranch: !!user.branch,
      isProfileComplete: isComplete
    });

    res.status(200).json({
      status: 'success',
      data: {
        user,
        profileComplete: isComplete
      }
    });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve profile'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, registrationNumber, branch, year, email } = req.body;
    const userId = req.user._id;

    // Get current user to validate email if provided
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        errors: { general: 'User account not found' }
      });
    }

    // Check if profile is already completed
    if (currentUser.isProfileComplete()) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile is already completed and cannot be modified',
        errors: { general: 'Your profile has already been completed. Contact support if you need to make changes.' }
      });
    }

    // Validate email if provided (should match existing email)
    if (email && email !== currentUser.email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email validation failed',
        errors: { email: 'Email cannot be changed and must match your authenticated account' }
      });
    }

    // Validate required fields
    const errors = {};

    if (!phone || phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone.replace(/\s+/g, ''))) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!registrationNumber || registrationNumber.trim() === '') {
      errors.registrationNumber = 'Registration number is required';
    } else if (!/^\d{2}[A-Z]{3}\d{5}$/.test(registrationNumber.toUpperCase())) {
      errors.registrationNumber = 'Registration number must be in format: 23BCE00001';
    }

    if (!branch || branch.trim() === '') {
      errors.branch = 'Program/Branch is required';
    }

    if (!email || email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!email.endsWith('@vitbhopal.ac.in')) {
      errors.email = 'Email must be a valid VIT Bhopal email (@vitbhopal.ac.in)';
    }

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile validation failed',
        errors: errors
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullName: fullName || 'Student',
        phone: phone.replace(/\s+/g, ''), // Clean phone number
        registrationNumber: registrationNumber.toUpperCase(), // Ensure uppercase
        branch,
        year
      },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires -passwordChangedAt');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Failed to update user profile',
        errors: { general: 'User profile could not be updated' }
      });
    }

    // Recalculate profile completion status based on final user state
    const wasCompleted = updatedUser.isProfileComplete();
    updatedUser.profileCompleted = !!(updatedUser.phone && updatedUser.registrationNumber && updatedUser.branch);
    await updatedUser.save();

    console.log('✅ Profile updated successfully for user:', updatedUser.email, {
      hasPhone: !!updatedUser.phone,
      hasRegistration: !!updatedUser.registrationNumber,
      hasBranch: !!updatedUser.branch,
      profileCompleted: updatedUser.profileCompleted,
      wasAlreadyComplete: wasCompleted,
      isNowComplete: updatedUser.isProfileComplete()
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
        profileComplete: updatedUser.isProfileComplete()
      },
      message: 'Profile completed successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        status: 'error',
        message: 'Profile validation failed',
        errors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Duplicate data found',
        errors: { registrationNumber: 'This registration number is already registered' }
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile. Please try again.',
      errors: { general: 'An unexpected error occurred. Please try again later.' }
    });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { message: 'Avatar uploaded successfully' }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload avatar'
    });
  }
};

export const getAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    res.status(200).json({
      status: 'success',
      data: { userId, message: 'Achievements retrieved successfully' }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve achievements'
    });
  }
};

export const addAchievement = async (req, res) => {
  try {
    res.status(201).json({
      status: 'success',
      data: { message: 'Achievement added successfully' }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to add achievement'
    });
  }
};
