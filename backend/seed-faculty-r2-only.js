import 'dotenv/config';
import { uploadToR2 } from './lib/r2.js';

const sampleFaculty = [
  {
    id: '1713000001abc',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@vitb.edu',
    department: 'Computer Science',
    designation: 'Professor',
    phone: '+91-9876543210',
    office: 'AB-301',
    specialization: 'Artificial Intelligence, Machine Learning',
    availability: 'Mon-Fri: 10:00 AM - 12:00 PM',
    bio: 'Dr. Rajesh Kumar has over 15 years of experience in AI and ML research. He has published numerous papers in top-tier conferences and journals.',
    photo_url: null,
    status: 'approved',
    submitted_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '1713000002def',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@vitb.edu',
    department: 'Electronics',
    designation: 'Associate Professor',
    phone: '+91-9876543211',
    office: 'EC-205',
    specialization: 'VLSI Design, Embedded Systems',
    availability: 'Mon-Wed-Fri: 2:00 PM - 4:00 PM',
    bio: 'Dr. Priya Sharma specializes in VLSI design and has worked on several industry-sponsored projects in embedded systems.',
    photo_url: null,
    status: 'approved',
    submitted_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '1713000003ghi',
    name: 'Dr. Amit Patel',
    email: 'amit.patel@vitb.edu',
    department: 'Mechanical',
    designation: 'Assistant Professor',
    phone: '+91-9876543212',
    office: 'ME-102',
    specialization: 'Thermodynamics, Heat Transfer',
    availability: 'Tue-Thu: 11:00 AM - 1:00 PM',
    bio: 'Dr. Amit Patel focuses on thermal engineering and renewable energy systems. He has guided multiple student projects in sustainable energy.',
    photo_url: null,
    status: 'approved',
    submitted_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '1713000004jkl',
    name: 'Dr. Sneha Reddy',
    email: 'sneha.reddy@vitb.edu',
    department: 'Civil',
    designation: 'Professor',
    phone: '+91-9876543213',
    office: 'CE-401',
    specialization: 'Structural Engineering, Earthquake Engineering',
    availability: 'Mon-Thu: 3:00 PM - 5:00 PM',
    bio: 'Dr. Sneha Reddy is an expert in structural analysis and seismic design. She has consulted on major infrastructure projects across India.',
    photo_url: null,
    status: 'approved',
    submitted_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '1713000005mno',
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@vitb.edu',
    department: 'Computer Science',
    designation: 'Associate Professor',
    phone: '+91-9876543214',
    office: 'AB-305',
    specialization: 'Data Science, Big Data Analytics',
    availability: 'Tue-Fri: 10:00 AM - 12:00 PM',
    bio: 'Dr. Vikram Singh has extensive experience in data analytics and has collaborated with industry leaders on big data projects.',
    photo_url: null,
    status: 'approved',
    submitted_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function seedFacultyToR2() {
  console.log('🚀 Seeding faculty data directly to R2...\n');

  try {
    // 1. Upload individual faculty data files
    console.log('📁 Uploading individual faculty data files...');
    for (const faculty of sampleFaculty) {
      const r2Key = `faculty/${faculty.id}/data.json`;
      const jsonString = JSON.stringify(faculty, null, 2);
      
      await uploadToR2(r2Key, Buffer.from(jsonString), 'application/json');
      console.log(`✅ Uploaded: ${faculty.name} (${r2Key})`);
    }

    // 2. Create faculty list index
    console.log('\n📋 Creating faculty list index...');
    const facultyList = sampleFaculty.map(f => ({
      id: f.id,
      name: f.name,
      department: f.department,
      status: f.status,
      created_at: f.created_at,
      updated_at: f.updated_at
    }));

    const listJson = JSON.stringify(facultyList, null, 2);
    await uploadToR2('faculty/list.json', Buffer.from(listJson), 'application/json');
    console.log('✅ Uploaded: faculty/list.json');

    // 2b. Create consolidated data file
    console.log('\n📋 Creating consolidated faculty data file...');
    const allDataJson = JSON.stringify(sampleFaculty, null, 2);
    await uploadToR2('faculty/all_approved_data.json', Buffer.from(allDataJson), 'application/json');
    console.log('✅ Uploaded: faculty/all_approved_data.json');

    // 3. Initialize empty pending lists
    console.log('\n📝 Initializing pending lists...');
    await uploadToR2('faculty/pending-additions.json', Buffer.from('[]'), 'application/json');
    console.log('✅ Created: faculty/pending-additions.json');
    
    await uploadToR2('faculty/pending-updates.json', Buffer.from('[]'), 'application/json');
    console.log('✅ Created: faculty/pending-updates.json');

    console.log('\n✨ Faculty data seeding completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Individual faculty files: ${sampleFaculty.length}`);
    console.log(`   - Faculty list index: 1 file`);
    console.log(`   - Consolidated data file: 1 file`);
    console.log(`   - Pending lists: 2 files`);
    console.log(`   - Total R2 objects: ${sampleFaculty.length + 4}`);
    console.log('\n📂 R2 Structure:');
    console.log('   faculty/');
    console.log('   ├── list.json (index of all approved faculty)');
    console.log('   ├── all_approved_data.json (full data of all approved faculty)');
    console.log('   ├── pending-additions.json (pending submissions)');
    console.log('   ├── pending-updates.json (pending updates)');
    console.log('   ├── <id1>/data.json');
    console.log('   ├── <id2>/data.json');
    console.log('   └── ...');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seedFacultyToR2();
