/**
 * Retry failed Drive → R2 imports by parsing files.md.
 *
 * For each "FAILED" line it will:
 *   1. Check if the file is already in R2 (skip if yes)
 *   2. Navigate Google Drive to find the file by folder path + filename
 *   3. Download and upload to R2
 *
 * Run from the backend/ directory:
 *   node retry-failed-imports.js
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { r2, BUCKET } from './lib/r2.js';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFailedPaths(logContent) {
    const failed = [];
    for (const line of logContent.split('\n')) {
        const m = line.match(/^Uploading (.+?) \.\.\. FAILED/);
        if (m) failed.push(m[1].trim());
    }
    return failed;
}

function mimeFromExt(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ({
        '.pdf':  'application/pdf',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.ppt':  'application/vnd.ms-powerpoint',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc':  'application/msword',
        '.odp':  'application/vnd.oasis.opendocument.presentation',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png':  'image/png',
    })[ext] || 'application/octet-stream';
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

// ── Drive navigation (cached) ─────────────────────────────────────────────────

async function buildDriveHelpers(drive, rootId) {
    const folderCache = {};

    async function resolveFolderId(segments) {
        let parentId = rootId;
        let cacheKey = '';
        for (const seg of segments) {
            cacheKey += (cacheKey ? '/' : '') + seg;
            if (folderCache[cacheKey]) {
                parentId = folderCache[cacheKey];
                continue;
            }
            const res = await drive.files.list({
                q: `'${parentId}' in parents and name = ${JSON.stringify(seg)} and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id)',
                corpora: 'allDrives',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 5,
            });
            if (!res.data.files?.length) return null;
            parentId = res.data.files[0].id;
            folderCache[cacheKey] = parentId;
        }
        return parentId;
    }

    async function findFileInFolder(folderId, filename) {
        // Try exact name first, then collapsed-whitespace variant
        for (const name of [filename, filename.replace(/\s+/g, ' ').trim()]) {
            const res = await drive.files.list({
                q: `'${folderId}' in parents and name = ${JSON.stringify(name)} and trashed = false`,
                fields: 'files(id, name, mimeType)',
                corpora: 'allDrives',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 5,
            });
            if (res.data.files?.length) return res.data.files[0];
        }
        return null;
    }

    return { resolveFolderId, findFileInFolder };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
    if (!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID not set');

    const serviceKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.JWT({
        email:  serviceKey.client_email,
        key:    serviceKey.private_key,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    // The "23 Batch" folder ID is known from the import log header
    const BATCH_23_FOLDER_ID = '1DZX1crsJG3vB-EwK1fPIDm2sojHxNTpK';
    const { resolveFolderId, findFileInFolder } = await buildDriveHelpers(drive, BATCH_23_FOLDER_ID);

    // files.md lives one level above backend/
    const logPath = new URL('../files.md', import.meta.url);
    const log = readFileSync(logPath, 'utf8');
    const failedPaths = parseFailedPaths(log);

    console.log(`\n🔄  Found ${failedPaths.length} failed uploads to retry\n`);

    let ok = 0, skipped = 0, notFound = 0, failed = 0;
    const stillFailed = [];

    for (let i = 0; i < failedPaths.length; i++) {
        const r2Key = failedPaths[i];
        const label = `[${i + 1}/${failedPaths.length}]`;

        // Skip if already in R2
        try {
            await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: r2Key }));
            console.log(`${label} SKIP  (already in R2) ${path.basename(r2Key)}`);
            skipped++;
            continue;
        } catch { /* not in R2 yet */ }

        try {
            // Parse: drive-imports/23 Batch/[course folder]/[subfolder]/filename
            // Strip "drive-imports/23 Batch/" prefix — navigate from BATCH_23_FOLDER_ID
            const withoutPrefix = r2Key.replace(/^drive-imports\/23 Batch\//, '');
            const parts = withoutPrefix.split('/');
            const filename = parts.pop();
            const folderSegments = parts;

            const folderId = await resolveFolderId(folderSegments);
            if (!folderId) {
                console.log(`${label} MISS  (folder not found) ${r2Key}`);
                notFound++;
                stillFailed.push(r2Key);
                continue;
            }

            const file = await findFileInFolder(folderId, filename);
            if (!file) {
                console.log(`${label} MISS  (file not found in Drive) ${r2Key}`);
                notFound++;
                stillFailed.push(r2Key);
                continue;
            }

            // Download from Drive
            // Google Workspace files (Docs/Slides/Sheets) must be exported, not downloaded directly
            const WORKSPACE_EXPORT_MIME = {
                'application/vnd.google-apps.document':     'application/pdf',
                'application/vnd.google-apps.presentation': 'application/pdf',
                'application/vnd.google-apps.spreadsheet':  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.google-apps.drawing':      'application/pdf',
            };

            const exportMime = WORKSPACE_EXPORT_MIME[file.mimeType];
            let buffer, uploadMime;

            if (exportMime) {
                // Google Workspace file → export as PDF / XLSX
                const expRes = await drive.files.export(
                    { fileId: file.id, mimeType: exportMime },
                    { responseType: 'stream' }
                );
                buffer = await streamToBuffer(expRes.data);
                uploadMime = exportMime;
            } else {
                // Binary file (PDF, PPTX, DOCX …) → direct media download
                const dlRes = await drive.files.get(
                    { fileId: file.id, alt: 'media', supportsAllDrives: true },
                    { responseType: 'stream' }
                );
                buffer = await streamToBuffer(dlRes.data);
                uploadMime = mimeFromExt(filename);
            }

            // Upload to R2
            await r2.send(new PutObjectCommand({
                Bucket:      BUCKET,
                Key:         r2Key,
                Body:        buffer,
                ContentType: uploadMime,
            }));

            console.log(`${label} OK    ${r2Key}`);
            ok++;
        } catch (err) {
            const msg = err.message || String(err);
            console.log(`${label} FAIL  ${path.basename(r2Key)}: ${msg}`);
            failed++;
            stillFailed.push(r2Key);
        }

        // Small delay to avoid Drive API rate limits
        if ((i + 1) % 10 === 0) await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  ${ok} uploaded successfully
⏭️  ${skipped} already in R2 (skipped)
🔍  ${notFound} not found in Drive
❌  ${failed} failed to download/upload
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (stillFailed.length > 0) {
        console.log('\n📋 Still failed — likely restricted in Google Drive:\n');
        stillFailed.forEach(p => console.log('   •', p));
        console.log('\nFix: On Google Drive, right-click each folder → Share → "Anyone with the link can view"');
        console.log('     or grant the service account (scholarstack@hip-computer-472718-p2.iam.gserviceaccount.com) Viewer access.');
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
