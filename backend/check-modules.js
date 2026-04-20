#!/usr/bin/env node
/**
 * Check course modules and their r2_key values
 * Run: node backend/check-modules.js
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

async function checkModules() {
  console.log('='.repeat(60));
  console.log('COURSE MODULES CHECK');
  console.log('='.repeat(60));
  
  // Get all courses
  const { data: courses, error: courseError } = await supabase
    .schema('business')
    .from('courses')
    .select('id, pid, title, status')
    .eq('status', 'active')
    .order('pid');
  
  if (courseError) {
    console.error('❌ Failed to fetch courses:', courseError.message);
    process.exit(1);
  }
  
  console.log(`\nFound ${courses.length} active courses\n`);
  
  for (const course of courses) {
    // Get modules for this course
    const { data: modules, error: moduleError } = await supabase
      .schema('business')
      .from('course_modules')
      .select('id, title, type, module_no, r2_key, is_active')
      .eq('course_id', course.id)
      .eq('is_active', true)
      .order('display_order');
    
    if (moduleError) {
      console.error(`❌ Error fetching modules for ${course.pid}:`, moduleError.message);
      continue;
    }
    
    const withR2 = modules.filter(m => m.r2_key);
    const withoutR2 = modules.filter(m => !m.r2_key);
    
    console.log(`[${course.pid}] ${course.title}`);
    console.log(`  Total modules: ${modules.length}`);
    console.log(`  With R2 key: ${withR2.length} ✅`);
    console.log(`  Without R2 key: ${withoutR2.length} ${withoutR2.length > 0 ? '⚠️' : ''}`);
    
    if (withR2.length > 0) {
      console.log(`  Sample R2 keys:`);
      withR2.slice(0, 2).forEach(m => {
        console.log(`    - ${m.title}: ${m.r2_key.substring(0, 60)}...`);
      });
    }
    
    if (withoutR2.length > 0) {
      console.log(`  Missing R2 keys:`);
      withoutR2.slice(0, 3).forEach(m => {
        console.log(`    - ${m.title} (${m.type})`);
      });
      if (withoutR2.length > 3) {
        console.log(`    ... and ${withoutR2.length - 3} more`);
      }
    }
    
    console.log('');
  }
  
  // Summary
  const { data: allModules } = await supabase
    .schema('business')
    .from('course_modules')
    .select('r2_key')
    .eq('is_active', true);
  
  const totalWithR2 = allModules.filter(m => m.r2_key).length;
  const totalWithoutR2 = allModules.filter(m => !m.r2_key).length;
  
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total active modules: ${allModules.length}`);
  console.log(`With R2 key: ${totalWithR2} (${((totalWithR2/allModules.length)*100).toFixed(1)}%)`);
  console.log(`Without R2 key: ${totalWithoutR2} (${((totalWithoutR2/allModules.length)*100).toFixed(1)}%)`);
  
  if (totalWithoutR2 > 0) {
    console.log('\n⚠️  Some modules are missing R2 keys.');
    console.log('   Run: node backend/seed-modules-from-r2.mjs');
    console.log('   This will scan R2 and populate the course_modules table.');
  } else {
    console.log('\n✅ All modules have R2 keys!');
  }
}

checkModules().catch(console.error);
