/**
 * unlock-and-import.js
 *
 * Step 1: Authenticates YOU (the Drive owner) via browser OAuth2.
 * Step 2: Finds every file in the 23 Batch folder that has download restricted.
 * Step 3: Sets copyRequiresWriterPermission=false on each one (owner-only operation).
 * Step 4: Immediately downloads each unlocked file and uploads it to R2.
 *
 * Run once from backend/:
 *   node unlock-and-import.js
 *
 * You will be shown a URL — open it in your browser, approve, paste the code back.
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import http from 'http';
import { google } from 'googleapis';
import { r2, BUCKET } from './lib/r2.js';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ── OAuth2 client (uses same Google project as the service account) ───────────
const OAUTH_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI        = 'http://localhost:9876/oauth2callback';
const TOKEN_FILE          = new URL('./.owner-token.json', import.meta.url);

// ── Helpers ───────────────────────────────────────────────────────────────────

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
        '.jpg':  'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    })[ext] || 'application/octet-stream';
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    return Buffer.concat(chunks);
}

function parseFailedPaths(logContent) {
    const failed = [];
    for (const line of logContent.split('\n')) {
        const m = line.match(/^Uploading (.+?) \.\.\. FAILED/);
        if (m) failed.push(m[1].trim());
    }
    return failed;
}

// ── OAuth2 flow ───────────────────────────────────────────────────────────────

async function getAuthenticatedClient() {
    const oAuth2 = new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, REDIRECT_URI);

    // Reuse saved token if available
    if (existsSync(new URL(TOKEN_FILE))) {
        const saved = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
        oAuth2.setCredentials(saved);
        // Refresh if expired
        const { credentials } = await oAuth2.refreshAccessToken();
        oAuth2.setCredentials(credentials);
        writeFileSync(TOKEN_FILE, JSON.stringify(credentials));
        console.log('✅ Reusing saved OAuth token.\n');
        return oAuth2;
    }

    // New login — open browser
    const authUrl = oAuth2.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive'],
        prompt: 'select_account consent',
    });

    console.log('\n🔑 Open this URL in your browser and approve access:\n');
    console.log('   ' + authUrl);
    console.log('\nWaiting for you to approve (listening on http://localhost:9876)...\n');

    // Start a tiny local server to catch the redirect
    const code = await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, 'http://localhost:9876');
            const code = url.searchParams.get('code');
            if (code) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h2>✅ Authorised! You can close this tab.</h2>');
                server.close();
                resolve(code);
            } else {
                res.writeHead(400);
                res.end('Missing code');
                reject(new Error('No code in callback'));
            }
        });
        server.listen(9876, '127.0.0.1');
        server.on('error', reject);
    });

    const { tokens } = await oAuth2.getToken(code);
    oAuth2.setCredentials(tokens);
    writeFileSync(TOKEN_FILE, JSON.stringify(tokens));
    console.log('✅ Authenticated as owner.\n');
    return oAuth2;
}

// ── Drive navigation ──────────────────────────────────────────────────────────

const folderCache = {};
const BATCH_23_FOLDER_ID = '1DZX1crsJG3vB-EwK1fPIDm2sojHxNTpK';

async function resolveFolderId(drive, segments) {
    let parentId = BATCH_23_FOLDER_ID;
    let cacheKey = '';
    for (const seg of segments) {
        cacheKey += (cacheKey ? '/' : '') + seg;
        if (folderCache[cacheKey]) { parentId = folderCache[cacheKey]; continue; }
        const res = await drive.files.list({
            q: `'${parentId}' in parents and name = ${JSON.stringify(seg)} and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
            corpora: 'allDrives', supportsAllDrives: true, includeItemsFromAllDrives: true,
            pageSize: 5,
        });
        if (!res.data.files?.length) return null;
        parentId = res.data.files[0].id;
        folderCache[cacheKey] = parentId;
    }
    return parentId;
}

async function findFileInFolder(drive, folderId, filename) {
    for (const name of [filename, filename.replace(/\s+/g, ' ').trim()]) {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and name = ${JSON.stringify(name)} and trashed = false`,
            fields: 'files(id,name,mimeType,copyRequiresWriterPermission)',
            corpora: 'allDrives', supportsAllDrives: true, includeItemsFromAllDrives: true,
            pageSize: 5,
        });
        if (res.data.files?.length) return res.data.files[0];
    }
    return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });

    const logPath = new URL('../files.md', import.meta.url);
    const log = readFileSync(logPath, 'utf8');
    const failedPaths = parseFailedPaths(log);

    console.log(`\n🔄  Processing ${failedPaths.length} failed uploads (as Drive owner)...\n`);

    const WORKSPACE_EXPORT = {
        'application/vnd.google-apps.document':     'application/pdf',
        'application/vnd.google-apps.presentation': 'application/pdf',
        'application/vnd.google-apps.spreadsheet':  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.drawing':      'application/pdf',
    };

    let ok = 0, skipped = 0, notFound = 0, failed = 0;
    const stillFailed = [];

    for (let i = 0; i < failedPaths.length; i++) {
        const r2Key = failedPaths[i];
        const label = `[${i + 1}/${failedPaths.length}]`;

        // Skip if already in R2
        try {
            await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: r2Key }));
            console.log(`${label} SKIP  ${path.basename(r2Key)}`);
            skipped++;
            continue;
        } catch { /* not in R2 yet */ }

        try {
            const withoutPrefix = r2Key.replace(/^drive-imports\/23 Batch\//, '');
            const parts = withoutPrefix.split('/');
            const filename = parts.pop();
            const folderSegments = parts;

            const folderId = await resolveFolderId(drive, folderSegments);
            if (!folderId) {
                console.log(`${label} MISS  (folder) ${r2Key}`);
                notFound++;
                stillFailed.push(r2Key);
                continue;
            }

            const file = await findFileInFolder(drive, folderId, filename);
            if (!file) {
                console.log(`${label} MISS  (file) ${r2Key}`);
                notFound++;
                stillFailed.push(r2Key);
                continue;
            }

            // If download was restricted, unlock it first (owner can always do this)
            if (file.copyRequiresWriterPermission) {
                try {
                    await drive.files.update({
                        fileId: file.id,
                        supportsAllDrives: true,
                        requestBody: { copyRequiresWriterPermission: false },
                    });
                } catch (unlockErr) {
                    // Not fatal — proceed anyway, download might still work as owner
                    console.log(`  ⚠️ Could not unlock ${filename}: ${unlockErr.message}`);
                }
            }

            // Download
            const exportMime = WORKSPACE_EXPORT[file.mimeType];
            let buffer, uploadMime;

            if (exportMime) {
                const res = await drive.files.export(
                    { fileId: file.id, mimeType: exportMime },
                    { responseType: 'stream' }
                );
                buffer = await streamToBuffer(res.data);
                uploadMime = exportMime;
            } else {
                const res = await drive.files.get(
                    { fileId: file.id, alt: 'media', supportsAllDrives: true },
                    { responseType: 'stream' }
                );
                buffer = await streamToBuffer(res.data);
                uploadMime = mimeFromExt(filename);
            }

            // Upload to R2
            await r2.send(new PutObjectCommand({
                Bucket: BUCKET, Key: r2Key, Body: buffer, ContentType: uploadMime,
            }));

            console.log(`${label} OK    ${r2Key}`);
            ok++;
        } catch (err) {
            console.log(`${label} FAIL  ${path.basename(r2Key)}: ${err.message}`);
            failed++;
            stillFailed.push(r2Key);
        }

        if ((i + 1) % 10 === 0) await new Promise(r => setTimeout(r, 800));
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  ${ok} uploaded successfully
⏭️  ${skipped} already in R2 (skipped)
🔍  ${notFound} not found in Drive
❌  ${failed} still failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (stillFailed.length > 0) {
        console.log('\n📋 Still failed:\n');
        stillFailed.forEach(p => console.log('   •', p));
    }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
