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

    res.status(200).json({
      status: 'success',
      data: {
        user,
        profileComplete: user.isProfileComplete()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve profile'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, registrationNumber, branch, year } = req.body;
    const userId = req.user._id;

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullName,
        phone,
        registrationNumber,
        branch,
        year
      },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires -passwordChangedAt');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Recalculate profile completion status based on final user state
    updatedUser.profileCompleted = !!(updatedUser.phone && updatedUser.registrationNumber && updatedUser.branch);
    await updatedUser.save();

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
        profileComplete: updatedUser.isProfileComplete()
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid profile data'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
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
