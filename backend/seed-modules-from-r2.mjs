/**
 * seed-modules-from-r2.mjs
 * Scans the R2 bucket, parses the path structure, and inserts course_modules rows.
 *
 * R2 path pattern:
 *  drive-imports/23 Batch/<Course Title> (<PID>)/<Module N>/<file>.pdf
 *  drive-imports/23 Batch/<Course Title> (<PID>)/PYQs.pdf
 *  drive-imports/23 Batch/<Course Title> (<PID>)/Syllabus.pdf
 *
 * Run from backend/: node seed-modules-from-r2.mjs
 */
import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BUCKET = process.env.R2_BUCKET_NAME;

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractPid(folderName) {
  // "Database Management Systems (CSE3001)" → "CSE3001"
  const m = folderName.match(/\(([A-Z]{2,4}\d{4})\)\s*$/);
  return m ? m[1] : null;
}

function classifyFile(r2Key) {
  const lower = r2Key.toLowerCase();
  const fileName = path.basename(lower);
  const parts = r2Key.split('/');

  // Determine type
  let type = 'module';
  if (fileName.includes('pyq') || fileName.includes('previous year') || fileName.includes('question paper')) {
    type = 'pyq';
  } else if (fileName.includes('syllabus') || fileName.includes('lesson plan') || fileName.includes('link') || fileName.includes('youtube')) {
    type = 'reference';
  }

  // Determine module number from folder name e.g. "Module 1", "Module 2"
  const moduleFolder = parts.find(p => /^module\s*\d+$/i.test(p.trim()));
  const moduleNo = moduleFolder ? parseInt(moduleFolder.replace(/\D/g, '')) : null;

  // Build display title from filename (strip extension)
  const rawTitle = path.basename(r2Key, path.extname(r2Key)).trim();

  return { type, moduleNo, rawTitle };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. List all R2 keys
  console.log('📦 Listing R2 bucket...');
  const allKeys = [];
  let token;
  do {
    const cmd = new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token });
    const res = await r2.send(cmd);
    for (const obj of (res.Contents || [])) allKeys.push(obj.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`   Found ${allKeys.length} objects in R2\n`);

  // 2. Fetch all courses
  const { data: courses, error: courseErr } = await supabase.schema('business').from('courses')
    .select('id, pid, title').eq('status', 'active');
  if (courseErr) { console.error('Failed to fetch courses:', courseErr.message); process.exit(1); }

  const courseByPid = {};
  for (const c of courses) courseByPid[c.pid.toUpperCase()] = c;
  console.log(`📚 Found ${courses.length} courses in DB\n`);

  // 3. Parse R2 keys and build module rows
  // Expected prefix: "drive-imports/23 Batch/<CourseFolderWithPid>/..."
  const PREFIX = 'drive-imports/23 Batch/';
  const moduleRows = [];
  const skipKeys = [];

  for (const key of allKeys) {
    if (!key.startsWith(PREFIX)) { skipKeys.push(key); continue; }
    const rel = key.slice(PREFIX.length); // "<CourseFolderWithPid>/..."
    const slashIdx = rel.indexOf('/');
    if (slashIdx === -1) { skipKeys.push(key); continue; } // top-level file, skip

    const courseFolderName = rel.slice(0, slashIdx);
    const pid = extractPid(courseFolderName);
    if (!pid) { skipKeys.push(key); continue; }

    const course = courseByPid[pid.toUpperCase()];
    if (!course) {
      console.warn(`  ⚠️  PID ${pid} not found in DB — skipping ${key}`);
      continue;
    }

    const { type, moduleNo, rawTitle } = classifyFile(rel);

    moduleRows.push({
      course_id: course.id,
      type,
      title: rawTitle,
      r2_key: key,
      module_no: moduleNo,
      display_order: moduleNo || 99,
      is_active: true,
    });
  }

  console.log(`🔧 Prepared ${moduleRows.length} module rows to insert\n`);
  if (skipKeys.length > 0) {
    console.log(`ℹ️  Skipped ${skipKeys.length} files (no matching course or top-level):`);
    skipKeys.slice(0, 5).forEach(k => console.log('   ', k));
    if (skipKeys.length > 5) console.log(`   ... and ${skipKeys.length - 5} more`);
    console.log();
  }

  // 4. Delete old module rows (re-seed cleanly)
  console.log('🗑️  Clearing old course_modules rows...');
  const { error: delErr } = await supabase.schema('business').from('course_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) console.warn('   (delete warning):', delErr.message);

  // 5. Batch insert
  console.log('⬆️  Inserting module rows...');
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < moduleRows.length; i += BATCH) {
    const batch = moduleRows.slice(i, i + BATCH);
    const { error } = await supabase.schema('business').from('course_modules').insert(batch);
    if (error) {
      console.error(`   ❌ Batch ${i}-${i+BATCH} failed:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`   Inserted ${inserted}/${moduleRows.length}\r`);
    }
  }

  // 6. Update modules_count on each course
  console.log(`\n\n✅ Inserted ${inserted} module rows. Updating modules_count...\n`);
  const { data: countRows } = await supabase.schema('business').from('course_modules')
    .select('course_id').eq('type', 'module');
  const { data: pyqRows }   = await supabase.schema('business').from('course_modules')
    .select('course_id').eq('type', 'pyq');

  const moduleCounts = {};
  for (const r of (countRows||[])) moduleCounts[r.course_id] = (moduleCounts[r.course_id]||0)+1;
  const pyqCounts = {};
  for (const r of (pyqRows||[])) pyqCounts[r.course_id] = (pyqCounts[r.course_id]||0)+1;

  for (const c of courses) {
    await supabase.schema('business').from('courses').update({
      modules_count: moduleCounts[c.id] || 0,
      notes_count:   (moduleCounts[c.id]||0) + (pyqCounts[c.id]||0),
    }).eq('id', c.id);
  }

  console.log('✅ Seeding complete!\n');
  console.log('═══ SUMMARY: modules per course ═══');
  for (const [pid, c] of Object.entries(courseByPid).sort()) {
    const n = moduleRows.filter(r => r.course_id === c.id).length;
    if (n > 0) console.log(`  [${pid}] ${n} files`);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
