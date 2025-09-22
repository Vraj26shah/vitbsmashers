import mongoose from 'mongoose';
import Course from './models/course.model.js';
import User from './models/user.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedCourses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/vitbsmashers');

    console.log('Connected to MongoDB');

    // Get admin user for createdBy field
    let adminUser = await User.findOne({ email: 'admin@vitbhopal.ac.in' });
    if (!adminUser) {
      // Create admin user if not exists
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@vitbhopal.ac.in',
        password: 'password123',
        fullName: 'Admin User',
        registrationNumber: 'ADMIN001',
        branch: 'ADMIN',
        year: '2024',
        phone: '9999999999',
        isVerified: true,
        profileComplete: true
      });
      console.log('Admin user created');
    }

    // Load courses from JSON file
    const coursesPath = path.join(__dirname, '../frontend/features/marketplace/courses.json');
    const coursesData = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));

    console.log(`Found ${Object.keys(coursesData.courses).length} courses in JSON file`);

    // Clear existing courses
    await Course.deleteMany({});
    console.log('Cleared existing courses');

    // Prepare courses for insertion
    const coursesToInsert = Object.values(coursesData.courses).map(course => {
      // Parse price (remove ₹ and commas)
      const priceString = course.price.toString().replace('₹', '').replace(',', '');
      const price = parseInt(priceString);

      // Map tags to categories
      const tagToCategory = {
        'cs': 'Computer Science',
        'eng': 'Engineering',
        'math': 'Mathematics',
        'sci': 'Science'
      };

      const tagToSubcategory = {
        'cs': 'Programming',
        'eng': 'Systems',
        'math': 'Calculus',
        'sci': 'Chemistry'
      };

      const primaryTag = course.tags.split(' ')[0];
      const category = tagToCategory[primaryTag] || 'Computer Science';
      const subcategory = tagToSubcategory[primaryTag] || 'General';

      return {
        pid: course.id || course.pid,
        title: course.title,
        description: course.description,
        price: price,
        rating: course.rating || 4.5,
        modules: course.modulesList || course.modules || [],
        modulesCount: (course.modulesList || course.modules || []).length,
        hours: course.hours || 0,
        notes: course.notes || 0,
        image: course.image,
        category: category,
        subcategory: subcategory,
        level: course.level || 'Intermediate',
        instructor: course.instructor || 'Expert Faculty',
        tags: course.tags ? course.tags.split(' ') : [],
        featured: course.featured || false,
        bestseller: course.bestseller || false,
        status: 'active',
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      };
    });

    // Insert courses
    const insertedCourses = await Course.insertMany(coursesToInsert);
    console.log(`✅ Successfully seeded ${insertedCourses.length} courses`);

    // Log sample courses
    console.log('Sample seeded courses:');
    insertedCourses.slice(0, 3).forEach(course => {
      console.log(`- ${course.pid}: ${course.title}`);
    });

  } catch (error) {
    console.error('Error seeding courses:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

seedCourses();