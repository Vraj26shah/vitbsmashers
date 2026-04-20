import { supabase } from '../lib/supabase.js';

const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : !!value;

// ── GET /api/v1/profile/me  OR  GET /api/v1/profile/:userId ─────────────────
export const getProfile = async (req, res) => {
  try {
    const targetId = req.params.userId === 'me' || !req.params.userId
      ? req.user.id
      : req.params.userId;

    const { data, error } = await supabase
      .schema('business').from('users').select('*').eq('id', targetId).single();

    if (error || !data)
      return res.status(404).json({ status: 'error', message: 'User not found' });

    return res.status(200).json({
      status: 'success',
      data: {
        user: data,
        profileComplete: hasValue(data.phone) && hasValue(data.registration_number) && hasValue(data.branch),
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

    const { data, error } = await supabase.schema('business').from('users')
      .update({
        full_name:            full_name   || user.full_name,
        phone:                phone       ? phone.replace(/\s+/g, '') : user.phone,
        registration_number:  registration_number ? registration_number.toUpperCase() : user.registration_number,
        branch:               branch      || user.branch,
        year:                 year        || user.year,
        profile_completed:    profileComplete,
        last_profile_update:  today,
        profile_update_count: newCount,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error)
      return res.status(400).json({ status: 'error', message: error.message });

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
