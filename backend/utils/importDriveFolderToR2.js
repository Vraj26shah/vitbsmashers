import 'dotenv/config';
import path from 'path';
import { google } from 'googleapis';
import { uploadToR2 } from '../lib/r2.js';

const GOOGLE_DOC_MIME_TYPES = new Map([
  ['application/vnd.google-apps.document', { exportMime: 'application/pdf', extension: '.pdf' }],
  ['application/vnd.google-apps.spreadsheet', { exportMime: 'application/pdf', extension: '.pdf' }],
  ['application/vnd.google-apps.presentation', { exportMime: 'application/pdf', extension: '.pdf' }],
]);

function getDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

function getFolderIdFromInput(input) {
  if (!input) return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;
  const match = String(input).match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input;
}

function sanitizeSegment(value) {
  return String(value)
    .trim()
    .replace(/[<>:"\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\//g, '-');
}

async function listFolderChildren(drive, folderId) {
  const files = [];
  let pageToken = undefined;

  do {
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    files.push(...(data.files || []));
    pageToken = data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

async function downloadDriveFile(drive, file) {
  const googleDocConfig = GOOGLE_DOC_MIME_TYPES.get(file.mimeType);

  if (googleDocConfig) {
    const exported = await drive.files.export(
      { fileId: file.id, mimeType: googleDocConfig.exportMime },
      { responseType: 'arraybuffer' }
    );

    return {
      buffer: Buffer.from(exported.data),
      contentType: googleDocConfig.exportMime,
      extension: googleDocConfig.extension,
    };
  }

  const downloaded = await drive.files.get(
    { fileId: file.id, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );

  return {
    buffer: Buffer.from(downloaded.data),
    contentType: file.mimeType || 'application/octet-stream',
    extension: path.extname(file.name || ''),
  };
}

async function importFolderRecursive(drive, folderId, currentPath, summary) {
  const children = await listFolderChildren(drive, folderId);

  for (const child of children) {
    if (child.mimeType === 'application/vnd.google-apps.folder') {
      const nestedPath = [...currentPath, sanitizeSegment(child.name)];
      console.log(`Entering folder: ${nestedPath.join('/')}`);
      await importFolderRecursive(drive, child.id, nestedPath, summary);
      continue;
    }

    try {
      process.stdout.write(`Uploading ${[...currentPath, child.name].join('/')} ... `);
      const { buffer, contentType, extension } = await downloadDriveFile(drive, child);
      const safeBaseName = sanitizeSegment(path.basename(child.name, path.extname(child.name)));
      const fileName = extension ? `${safeBaseName}${extension}` : safeBaseName;
      const r2Key = [...currentPath, fileName].filter(Boolean).join('/');

      await uploadToR2(buffer, r2Key, contentType);
      summary.uploaded += 1;
      console.log(`OK -> ${r2Key}`);
    } catch (error) {
      summary.failed += 1;
      console.log(`FAILED -> ${error.message}`);
    }
  }
}

async function main() {
  const input = process.argv[2];
  const folderId = getFolderIdFromInput(input);

  if (!folderId) {
    throw new Error('Provide a Google Drive folder ID or link, or set GOOGLE_DRIVE_ROOT_FOLDER_ID.');
  }

  const drive = getDrive();
  const { data: folderMeta } = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, mimeType',
    supportsAllDrives: true,
  });

  if (folderMeta.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error('The provided Google Drive link/ID is not a folder.');
  }

  const rootSegment = sanitizeSegment(folderMeta.name || folderId);
  const summary = { uploaded: 0, failed: 0 };

  console.log(`Starting Drive -> R2 import for folder: ${folderMeta.name} (${folderId})`);
  await importFolderRecursive(drive, folderId, ['drive-imports', rootSegment], summary);
  console.log(`Import complete. Uploaded: ${summary.uploaded}, Failed: ${summary.failed}`);
}

main().catch((error) => {
  console.error('Drive import failed:', error.message);
  process.exit(1);
});
