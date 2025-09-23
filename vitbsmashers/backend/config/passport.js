import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists, return it
          return done(null, user);
        }

        // Check if user exists with the same email
        const email = profile.emails[0].value;
        user = await User.findOne({ email });

        if (user) {
          // User exists with email but no Google ID - link the accounts
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }

        // Validate that email is from VIT Bhopal
        if (!email.endsWith('@vitbhopal.ac.in')) {
          return done(new Error('Only VIT Bhopal email addresses are allowed. Please use your institutional email.'), null);
        }

        // Create new user
        const newUser = await User.create({
          googleId: profile.id,
          email: email,
          username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000), // Generate unique username
          fullName: profile.displayName,
          profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
          isVerified: true, // Google accounts are pre-verified
          role: email === 'vitbsmashers@gmail.com' ? 'admin' : 'user'
        });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;