#!/usr/bin/env node
/**
 * Test authentication and module loading flow
 * Run: node backend/test-auth-flow.js <token>
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const token = process.argv[2];

if (!token || token === 'YOUR_TOKEN') {
  console.log('❌ Invalid token provided');
  console.log('\n📋 How to get your authentication token:');
  console.log('');
  console.log('1. Open your application in a browser (http://localhost:4000)');
  console.log('2. Log in to your account');
  console.log('3. Press F12 to open DevTools');
  console.log('4. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)');
  console.log('5. Click "Local Storage" → http://localhost:4000');
  console.log('6. Find the "token" key');
  console.log('7. Copy the entire value (it\'s a long string starting with "eyJ...")');
  console.log('8. Run: node backend/test-auth-flow.js "YOUR_COPIED_TOKEN"');
  console.log('');
  console.log('💡 TIP: Use the debug page instead:');
  console.log('   1. Start backend: cd backend && npm start');
  console.log('   2. Open: http://localhost:4000/debug-auth.html');
  console.log('   3. Click through the tests - no token copying needed!');
  console.log('');
  process.exit(1);
}

async function testAuthFlow() {
  console.log('='.repeat(60));
  console.log('AUTHENTICATION FLOW TEST');
  console.log('='.repeat(60));
  
  // Step 1: Verify token
  console.log('\n1. Verifying token...');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.log('❌ Token verification failed');
    console.log('Error:', authError?.message || 'User not found');
    process.exit(1);
  }
  
  console.log('✅ Token is valid');
  console.log('   User ID:', user.id);
  console.log('   Email:', user.email);
  
  // Step 2: Check user profile
  console.log('\n2. Checking user profile...');
  const { data: profile, error: profileError } = await supabase
    .schema('business')
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile) {
    console.log('❌ User profile not found');
    console.log('Error:', profileError?.message || 'No profile');
    
    // Try to create profile
    console.log('\n3. Attempting to create profile...');
    const { data: created, error: createError } = await supabase
      .schema('business')
      .from('users')
      .insert({
        id: user.id,
        email: user.email.toLowerCase(),
        username: user.email.split('@')[0].toLowerCase(),
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'student',
        is_verified: true,
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Failed to create profile:', createError.message);
      process.exit(1);
    }
    
    console.log('✅ Profile created successfully');
    console.log('   Username:', created.username);
    console.log('   Role:', created.role);
  } else {
    console.log('✅ User profile found');
    console.log('   Username:', profile.username);
    console.log('   Role:', profile.role);
    console.log('   Is banned:', profile.is_banned || false);
  }
  
  // Step 3: Check purchases
  console.log('\n3. Checking user purchases...');
  const { data: purchases, error: purchaseError } = await supabase
    .schema('business')
    .from('purchases')
    .select(`
      purchased_at,
      course:courses (id, pid, title)
    `)
    .eq('user_id', user.id);
  
  if (purchaseError) {
    console.log('❌ Failed to fetch purchases:', purchaseError.message);
  } else if (!purchases || purchases.length === 0) {
    console.log('⚠️  No purchases found');
    console.log('   User needs to purchase a course to access modules');
  } else {
    console.log(`✅ Found ${purchases.length} purchase(s)`);
    purchases.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.course.title} (${p.course.pid})`);
    });
    
    // Step 4: Test module access for first course
    if (purchases.length > 0) {
      const firstCourse = purchases[0].course;
      console.log(`\n4. Testing module access for: ${firstCourse.title}`);
      
      const { data: modules, error: moduleError } = await supabase
        .schema('business')
        .from('course_modules')
        .select('id, type, title, r2_key, is_active')
        .eq('course_id', firstCourse.id)
        .eq('is_active', true)
        .order('display_order');
      
      if (moduleError) {
        console.log('❌ Failed to fetch modules:', moduleError.message);
      } else if (!modules || modules.length === 0) {
        console.log('⚠️  No modules found for this course');
      } else {
        console.log(`✅ Found ${modules.length} module(s)`);
        const withR2 = modules.filter(m => m.r2_key);
        const withoutR2 = modules.filter(m => !m.r2_key);
        console.log(`   With R2 key: ${withR2.length}`);
        console.log(`   Without R2 key: ${withoutR2.length}`);
        
        if (withR2.length > 0) {
          console.log('\n   Sample modules:');
          withR2.slice(0, 3).forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.title} (${m.type})`);
            console.log(`      R2 key: ${m.r2_key.substring(0, 50)}...`);
          });
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

testAuthFlow().catch(console.error);
