import 'dotenv/config';
import { supabase } from './lib/supabase.js';
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

async function seedFacultyData() {
  console.log('🚀 Seeding faculty data to R2...\n');

  try {
    // Get faculty IDs from Supabase
    const { data: facultyList, error } = await supabase
      .schema('content')
      .from('faculty')
      .select('id, name')
      .eq('status', 'approved')
      .order('id');

    if (error) {
      console.error('❌ Error fetching faculty from Supabase:', error.message);
      return;
    }

    if (!facultyList || facultyList.length === 0) {
      console.log('⚠️  No faculty found in database. Please run faculty-schema.sql first.');
      return;
    }

    console.log(`📋 Found ${facultyList.length} faculty members in database\n`);

    // Upload data to R2 for each faculty
    for (let i = 0; i < facultyList.length && i < sampleFaculty.length; i++) {
      const faculty = facultyList[i];
      const sampleData = sampleFaculty[i];

      const fullData = {
        id: faculty.id,
        ...sampleData,
        submitted_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const r2Key = `faculty/${faculty.id}/data.json`;
      const jsonString = JSON.stringify(fullData, null, 2);

      try {
        await uploadToR2(r2Key, Buffer.from(jsonString), 'application/json');
        console.log(`✅ Uploaded data for: ${faculty.name} (ID: ${faculty.id})`);
        console.log(`   📁 R2 Key: ${r2Key}`);
      } catch (uploadError) {
        console.error(`❌ Failed to upload data for ${faculty.name}:`, uploadError.message);
      }
    }

    console.log('\n✨ Faculty data seeding completed!');
    console.log('\n📝 Summary:');
    console.log(`   - Database: ${facultyList.length} faculty entries (minimal metadata)`);
    console.log(`   - R2 Storage: Complete faculty data as JSON files`);
    console.log(`   - Format: faculty/<id>/data.json`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seedFacultyData();
