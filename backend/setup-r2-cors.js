#!/usr/bin/env node
/**
 * Setup CORS configuration for Cloudflare R2 bucket
 * Run: node backend/setup-r2-cors.js
 */
import 'dotenv/config';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ['*'], // Allow all origins for now - tighten in production
      AllowedMethods: ['GET', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: [
        'Content-Length',
        'Content-Type',
        'Content-Disposition',
        'ETag',
        'Last-Modified',
        'Accept-Ranges',
        'Content-Range',
      ],
      MaxAgeSeconds: 3600,
    },
  ],
};

async function setupCORS() {
  try {
    console.log('Setting up CORS for bucket:', BUCKET);
    console.log('Endpoint:', process.env.R2_ENDPOINT);
    
    // Set CORS configuration
    await r2.send(new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: corsConfiguration,
    }));
    
    console.log('✅ CORS configuration applied successfully!');
    
    // Verify CORS configuration
    const result = await r2.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
    console.log('\nCurrent CORS configuration:');
    console.log(JSON.stringify(result.CORSRules, null, 2));
    
  } catch (error) {
    console.error('❌ Failed to setup CORS:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

setupCORS();
