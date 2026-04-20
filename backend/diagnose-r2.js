#!/usr/bin/env node
/**
 * Comprehensive R2 diagnostic script
 * Run: node backend/diagnose-r2.js
 */
import 'dotenv/config';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

console.log('='.repeat(60));
console.log('R2 DIAGNOSTIC TOOL');
console.log('='.repeat(60));

// Check environment variables
console.log('\n1. Environment Variables:');
console.log('   R2_ENDPOINT:', process.env.R2_ENDPOINT || '❌ NOT SET');
console.log('   R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? '✅ Set' : '❌ NOT SET');
console.log('   R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? '✅ Set' : '❌ NOT SET');
console.log('   R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME || '❌ NOT SET');

if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || 
    !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
  console.log('\n❌ Missing required R2 environment variables!');
  console.log('   Please check your .env file.');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;

async function diagnose() {
  try {
    // Test 1: List objects
    console.log('\n2. Testing bucket access (listing objects)...');
    const listCmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      MaxKeys: 10,
    });
    const listResult = await r2.send(listCmd);
    console.log(`   ✅ Successfully connected to bucket`);
    console.log(`   Found ${listResult.KeyCount || 0} objects (showing first 10)`);
    
    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log('\n3. Sample objects in bucket:');
      listResult.Contents.slice(0, 5).forEach((obj, i) => {
        console.log(`   ${i + 1}. ${obj.Key} (${(obj.Size / 1024).toFixed(2)} KB)`);
      });
      
      // Test 2: Generate signed URL for first PDF
      const firstPdf = listResult.Contents.find(obj => obj.Key.toLowerCase().endsWith('.pdf'));
      if (firstPdf) {
        console.log('\n4. Testing signed URL generation...');
        console.log(`   Using file: ${firstPdf.Key}`);
        
        const cmd = new GetObjectCommand({
          Bucket: BUCKET,
          Key: firstPdf.Key,
          ResponseContentDisposition: 'inline',
          ResponseContentType: 'application/pdf',
        });
        
        const signedUrl = await getSignedUrl(r2, cmd, { expiresIn: 300 });
        console.log(`   ✅ Signed URL generated successfully`);
        console.log(`   URL length: ${signedUrl.length} characters`);
        console.log(`   URL preview: ${signedUrl.substring(0, 100)}...`);
        
        // Test 3: Verify object metadata
        console.log('\n5. Testing object metadata retrieval...');
        const headCmd = new HeadObjectCommand({
          Bucket: BUCKET,
          Key: firstPdf.Key,
        });
        const metadata = await r2.send(headCmd);
        console.log(`   ✅ Object metadata retrieved`);
        console.log(`   Content-Type: ${metadata.ContentType}`);
        console.log(`   Content-Length: ${(metadata.ContentLength / 1024).toFixed(2)} KB`);
        console.log(`   Last-Modified: ${metadata.LastModified}`);
        
        console.log('\n6. Testing URL accessibility...');
        console.log('   You can test this URL in your browser:');
        console.log(`   ${signedUrl}`);
        console.log('   (URL expires in 5 minutes)');
        
      } else {
        console.log('\n   ⚠️  No PDF files found in bucket');
      }
    } else {
      console.log('\n   ⚠️  Bucket is empty');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - R2 is configured correctly!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ DIAGNOSTIC FAILED');
    console.log('='.repeat(60));
    console.error('\nError:', error.message);
    if (error.Code) console.error('Error Code:', error.Code);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
      console.error('Request ID:', error.$metadata.requestId);
    }
    console.log('\nPossible issues:');
    console.log('1. Check if R2_ENDPOINT is correct (should include account ID)');
    console.log('2. Verify R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are valid');
    console.log('3. Ensure the bucket name is correct');
    console.log('4. Check if the API token has proper permissions');
    process.exit(1);
  }
}

diagnose();
