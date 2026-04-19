/**
 * One-time migration: Google Drive → Cloudflare R2
 * Run once: node backend/utils/migrateToR2.js
 *
 * Prerequisites:
 *   - Add GOOGLE_SERVICE_ACCOUNT_KEY to .env (JSON stringified)
 *   - Add drive_file_id column temporarily:
 *     ALTER TABLE business.course_modules ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
 */
import 'dotenv/config';
import { google }      from 'googleapis';
import { uploadToR2 }  from '../lib/r2.js';
import { supabase }    from '../lib/supabase.js';

function getDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

async function main() {
  const drive = getDrive();

  const { data: modules, error } = await supabase.schema('business').from('course_modules')
    .select('id, title, drive_file_id, course_id')
    .not('drive_file_id', 'is', null)
    .is('r2_key', null);

  if (error) { console.error('Failed to fetch modules:', error.message); process.exit(1); }
  if (!modules.length) { console.log('No modules to migrate.'); return; }

  console.log(`Found ${modules.length} modules to migrate.\n`);
  let migrated = 0, errors = 0;

  for (const mod of modules) {
    try {
      process.stdout.write(`Migrating: ${mod.title} ... `);
      const meta = await drive.files.get({ fileId: mod.drive_file_id, fields: 'mimeType,name' });
      const { mimeType } = meta.data;
      const isGoogleDoc = mimeType.startsWith('application/vnd.google-apps.');

      let buffer;
      if (isGoogleDoc) {
        const res = await drive.files.export(
          { fileId: mod.drive_file_id, mimeType: 'application/pdf' },
          { responseType: 'arraybuffer' }
        );
        buffer = Buffer.from(res.data);
      } else {
        const res = await drive.files.get(
          { fileId: mod.drive_file_id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        buffer = Buffer.from(res.data);
      }

      const safeName = mod.title.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const r2Key = `courses/${mod.course_id}/${safeName}.pdf`;
      await uploadToR2(buffer, r2Key, 'application/pdf');

      await supabase.schema('business').from('course_modules')
        .update({ r2_key: r2Key }).eq('id', mod.id);

      console.log(`✅ ${r2Key}`);
      migrated++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone: ${migrated} migrated, ${errors} errors`);
}

main().catch(console.error);
