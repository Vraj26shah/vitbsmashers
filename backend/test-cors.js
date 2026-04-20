import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getR2SignedUrl } from './lib/r2.js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function test() {
  // Get a module
  const { data: module } = await supabase
    .schema('business')
    .from('course_modules')
    .select('id, title, r2_key')
    .not('r2_key', 'is', null)
    .limit(1)
    .single();
  
  console.log('Testing:', module.title);
  console.log('R2 Key:', module.r2_key);
  
  // Generate signed URL
  const signedUrl = await getR2SignedUrl(module.r2_key, 300);
  console.log('\nSigned URL:', signedUrl.substring(0, 100) + '...');
  
  // Test fetch
  console.log('\nTesting fetch...');
  const response = await fetch(signedUrl);
  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  
  if (response.ok) {
    const buffer = await response.arrayBuffer();
    console.log('\n✅ PDF downloaded successfully!');
    console.log('Size:', buffer.byteLength, 'bytes');
    console.log('\nCORS Headers:');
    console.log('  access-control-allow-origin:', response.headers.get('access-control-allow-origin') || '❌ NOT SET');
    console.log('  access-control-allow-methods:', response.headers.get('access-control-allow-methods') || '❌ NOT SET');
    
    if (!response.headers.get('access-control-allow-origin')) {
      console.log('\n⚠️  CORS NOT CONFIGURED!');
      console.log('PDFs will not load in browser until CORS is set up.');
      console.log('\nGo to: https://dash.cloudflare.com/');
      console.log('Navigate to: R2 → scholarstack → Settings → CORS Policy');
      console.log('Add: {"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}');
    } else {
      console.log('\n✅ CORS is configured!');
    }
  } else {
    console.log('❌ Failed:', await response.text());
  }
}

test().catch(console.error);
