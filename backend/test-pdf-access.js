import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getR2SignedUrl } from './lib/r2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function test() {
  // Get a module with r2_key
  const { data: module } = await supabase
    .schema('business')
    .from('course_modules')
    .select('id, title, r2_key, course_id')
    .not('r2_key', 'is', null)
    .limit(1)
    .single();
  
  if (!module) {
    console.log('No modules found');
    return;
  }
  
  console.log('Testing PDF access...');
  console.log('Module:', module.title);
  console.log('R2 Key:', module.r2_key);
  
  // Generate signed URL
  const signedUrl = await getR2SignedUrl(module.r2_key, 300);
  console.log('\nSigned URL generated (expires in 5 min):');
  console.log(signedUrl);
  
  console.log('\n✅ Test this URL in your browser:');
  console.log('   1. Copy the URL above');
  console.log('   2. Paste in browser address bar');
  console.log('   3. PDF should download/display');
  console.log('\nIf PDF loads in browser but not in app → CORS issue');
  console.log('If PDF doesn\'t load anywhere → R2 access issue');
}

test().catch(console.error);
