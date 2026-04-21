// Script to make vitbsmashers@gmail.com an admin
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function makeAdmin() {
  console.log('🔧 Making vitbsmashers@gmail.com an admin...\n');

  try {
    const adminEmail = 'vitbsmashers@gmail.com';

    // Check if user exists
    const { data: user, error: fetchError } = await supabase
      .schema('business')
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError.message);
      return;
    }

    if (!user) {
      console.log('⚠️  User not found in database');
      console.log('   The user needs to sign up or log in first');
      console.log('   After they log in once, run this script again\n');
      return;
    }

    console.log('✅ Found user:', user.email);
    console.log('   Current role:', user.role);
    console.log('   Username:', user.username);

    if (user.role === 'admin') {
      console.log('\n✨ User is already an admin!\n');
      return;
    }

    // Update role to admin
    const { error: updateError } = await supabase
      .schema('business')
      .from('users')
      .update({ role: 'admin' })
      .eq('email', adminEmail);

    if (updateError) {
      console.error('❌ Error updating role:', updateError.message);
      return;
    }

    console.log('\n🎉 Successfully updated role to admin!');
    console.log('   Email:', adminEmail);
    console.log('   New role: admin\n');
    console.log('📱 The user can now access admin features:');
    console.log('   - Admin Panel in Club page');
    console.log('   - Admin Panel in Faculty page');
    console.log('   - Admin Panel in Event page');
    console.log('   - All admin-only features across the site\n');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

makeAdmin();
