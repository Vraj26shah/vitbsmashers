import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fix() {
  console.log('Checking and fixing issues...\n');
  
  // 1. Check if there are any users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  console.log(`Found ${authUsers.users.length} auth users`);
  
  if (authUsers.users.length === 0) {
    console.log('❌ No users found. Please sign up first at http://localhost:4000');
    return;
  }
  
  // 2. Check business.users profiles
  const { data: profiles } = await supabase.schema('business').from('users').select('*');
  console.log(`Found ${profiles?.length || 0} user profiles`);
  
  // 3. Create missing profiles
  for (const user of authUsers.users) {
    const hasProfile = profiles?.find(p => p.id === user.id);
    if (!hasProfile) {
      console.log(`Creating profile for ${user.email}...`);
      await supabase.schema('business').from('users').insert({
        id: user.id,
        email: user.email.toLowerCase(),
        username: user.email.split('@')[0].toLowerCase(),
        full_name: user.user_metadata?.full_name || null,
        role: 'student',
        is_verified: true,
      });
      console.log('✅ Profile created');
    }
  }
  
  // 4. Check purchases
  const { data: purchases } = await supabase.schema('business').from('purchases').select('user_id, course_id');
  console.log(`\nFound ${purchases?.length || 0} purchases`);
  
  if (!purchases || purchases.length === 0) {
    console.log('\n⚠️  No purchases found.');
    console.log('Users need to purchase courses to see modules.');
    console.log('\nTo add a test purchase:');
    console.log('1. Go to http://localhost:4000');
    console.log('2. Browse courses');
    console.log('3. Purchase a course');
  }
  
  // 5. Check modules
  const { data: modules } = await supabase.schema('business').from('course_modules')
    .select('id, r2_key')
    .eq('is_active', true);
  
  const withR2 = modules?.filter(m => m.r2_key).length || 0;
  const total = modules?.length || 0;
  
  console.log(`\nModules: ${withR2}/${total} have R2 keys`);
  
  if (withR2 === total && total > 0) {
    console.log('✅ All modules have R2 keys');
  }
  
  console.log('\n✅ Fix complete. Now configure CORS on Cloudflare R2:');
  console.log('   https://dash.cloudflare.com/ → R2 → scholarstack → Settings → CORS');
}

fix().catch(console.error);
