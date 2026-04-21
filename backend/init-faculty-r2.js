#!/usr/bin/env node
import 'dotenv/config';
import { uploadToR2 } from './lib/r2.js';

/**
 * Initialize R2 storage structure for faculty management
 * Creates empty index files needed for the system to work
 */
async function initFacultyR2() {
  console.log('🚀 Initializing Faculty R2 Storage Structure...\n');

  try {
    // 1. Create empty faculty list index
    console.log('📋 Creating faculty list index...');
    await uploadToR2('faculty/list.json', Buffer.from('[]'), 'application/json');
    console.log('✅ Created: faculty/list.json (empty array)');

    // 2. Create empty pending additions list
    console.log('\n📝 Creating pending additions list...');
    await uploadToR2('faculty/pending-additions.json', Buffer.from('[]'), 'application/json');
    console.log('✅ Created: faculty/pending-additions.json (empty array)');
    
    // 3. Create empty pending updates list
    console.log('\n📝 Creating pending updates list...');
    await uploadToR2('faculty/pending-updates.json', Buffer.from('[]'), 'application/json');
    console.log('✅ Created: faculty/pending-updates.json (empty array)');

    console.log('\n✨ Faculty R2 storage initialized successfully!');
    console.log('\n📂 R2 Structure Created:');
    console.log('   faculty/');
    console.log('   ├── list.json                  (approved faculty index)');
    console.log('   ├── pending-additions.json     (pending submissions)');
    console.log('   ├── pending-updates.json       (pending updates)');
    console.log('   └── <id>/data.json             (individual faculty data - created on submission)');
    console.log('\n💡 Next Steps:');
    console.log('   1. Users can now submit faculty via the frontend');
    console.log('   2. Admin can approve/reject via the Pending Requests tab');
    console.log('   3. Approved faculty will appear in the Browse Faculty section');
    console.log('\n📌 Optional: Run "node backend/seed-faculty-r2-only.js" to add sample data');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

initFacultyR2();
