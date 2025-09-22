import mongoose from 'mongoose';
import Course from './models/course.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkCourses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    const courses = await Course.find({}).select('pid title');
    console.log(`Found ${courses.length} courses in database:`);
    courses.forEach(course => {
      console.log(`- ${course.pid}: ${course.title}`);
    });

    if (courses.length === 0) {
      console.log('No courses found in database!');
    }
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCourses();