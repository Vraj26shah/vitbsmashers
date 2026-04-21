import 'dotenv/config';
import { uploadToR2 } from './lib/r2.js';

const sampleFaculty = [
  {
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@vitb.edu',
    department: 'Computer Science',
    designation: 'Professor',
    phone: '+91-9876543210',
    office: 'AB-301',
    specialization: 'Artificial Intelligence, Machine Learning',
    availability: 'Mon-Fri: 10:00 AM - 12:00 PM',
    bio: 'Dr. Rajesh Kumar has over 15 years of experience in AI and ML research. He has published numerous papers in top-tier conferences and journals.',
    photo_url: null
  },
  {
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@vitb.edu',
    department: 'Electronics',
    designation: 'Associate Professor',
    phone: '+91-9876543211',
    office: 'EC-205',
    specialization: 'VLSI Design, Embedded Systems',
    availability: 'Mon-Wed-Fri: 2:00 PM - 4:00 PM',
    bio: 'Dr. Priya Sharma specializes in VLSI design and has worked on several industry-sponsored projects in embedded systems.',
    photo_url: null
  },
  {
    name: 'Dr. Amit Patel',
    email: 'amit.patel@vitb.edu',
    department: 'Mechanical',
    designation: 'Assistant Professor',
    phone: '+91-9876543212',
    office: 'ME-102',
    specialization: 'Thermodynamics, Heat Transfer',
    availability: 'Tue-Thu: 11:00 AM - 1:00 PM',
    bio: 'Dr. Amit Patel focuses on thermal engineering and renewable energy systems. He has guided multiple student projects in sustainable energy.',
    photo_url: null
  },
  {
    name: 'Dr. Sneha Reddy',
    email: 'sneha.reddy@vitb.edu',
    department: 'Civil',
    designation: 'Professor',
    phone: '+91-9876543213',
    office: 'CE-401',
    specialization: 'Structural Engineering, Earthquake Engineering',
    availability: 'Mon-Thu: 3:00 PM - 5:00 PM',
    bio: 'Dr. Sneha Reddy is an expert in structural analysis and seismic design. She has consulted on major infrastructure projects across India.',
    photo_url: null
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@vitb.edu',
    department: 'Computer Science',
    designation: 'Associate Professor',
    phone: '+91-9876543214',
    office: 'AB-305',
    specialization: 'Data Science, Big Data Analytics',
    availability: 'Tue-Fri: 10:00 AM - 12:00 PM',
    bio: 'Dr. Vikram Singh has extensive experience in data analytics and has collaborated with industry leaders on big data projects.',
    photo_url: null
  }
];

// R2 Keys
const FACULTY_LIST_KEY = 'faculty/list.json';
const ALL_APPROVED_DATA_KEY = 'faculty/all_approved_data.json';

function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

async function seedFacultyData() {
  console.log('🚀 Seeding faculty data to R2 (Pure R2 implementation)...\n');

  try {
    const fullFacultyData = [];
    const facultyIndex = [];

    // Process each sample faculty
    for (const sample of sampleFaculty) {
      const id = generateId();
      const facultyData = {
        id,
        ...sample,
        status: 'approved',
        submitted_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Individual file
      const r2Key = `faculty/${id}/data.json`;
      const jsonString = JSON.stringify(facultyData, null, 2);
      await uploadToR2(r2Key, Buffer.from(jsonString), 'application/json');
      console.log(`✅ Uploaded individual data for: ${sample.name} (ID: ${id})`);

      fullFacultyData.push(facultyData);
      facultyIndex.push({
        id,
        name: sample.name,
        department: sample.department,
        status: 'approved',
        created_at: facultyData.created_at,
        updated_at: facultyData.updated_at
      });
    }

    // Upload consolidated files
    console.log('\n📦 Uploading consolidated files...');
    
    await uploadToR2(FACULTY_LIST_KEY, Buffer.from(JSON.stringify(facultyIndex, null, 2)), 'application/json');
    console.log(`✅ Uploaded index: ${FACULTY_LIST_KEY}`);

    await uploadToR2(ALL_APPROVED_DATA_KEY, Buffer.from(JSON.stringify(fullFacultyData, null, 2)), 'application/json');
    console.log(`✅ Uploaded all-in-one: ${ALL_APPROVED_DATA_KEY}`);

    console.log('\n✨ Faculty data seeding completed successfully!');
    console.log('📝 Summary:');
    console.log(`   - Total Faculty: ${fullFacultyData.length}`);
    console.log(`   - Individual Files: faculty/<id>/data.json`);
    console.log(`   - Index File: ${FACULTY_LIST_KEY}`);
    console.log(`   - Consolidated Data: ${ALL_APPROVED_DATA_KEY}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seedFacultyData();
