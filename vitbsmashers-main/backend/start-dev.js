#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 VIT Bhopal Backend Development Setup');
console.log('='.repeat(50));

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📝 Please create a .env file with the following variables:');
  console.log('');
  console.log('PORT=4000');
  console.log('NODE_ENV=development');
  console.log('MONGO_URL=mongodb://localhost:27017/vitbsmasher');
  console.log('JWT_SECRET=your-super-secret-jwt-key-here');
  console.log('JWT_EXPIRES_IN=90d');
  console.log('EMAIL_HOST=smtp.gmail.com');
  console.log('EMAIL_PORT=587');
  console.log('EMAIL_USERNAME=your-email@gmail.com');
  console.log('EMAIL_PASSWORD=your-app-password');
  console.log('EMAIL_FROM=noreply@vitbhopal.ac.in');
  console.log('');
  console.log('💡 Copy the contents of env-template.txt to create your .env file');
  process.exit(1);
}

console.log('✅ .env file found');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  const { execSync } = await import('child_process');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.log('❌ Failed to install dependencies');
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Check if MongoDB is running (basic check)
console.log('🔍 Checking MongoDB connection...');
try {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  await client.close();
  console.log('✅ MongoDB is running');
} catch (error) {
  console.log('⚠️  MongoDB connection failed. Make sure MongoDB is running.');
  console.log('💡 You can still start the server, but database operations will fail.');
}

console.log('');
console.log('🎯 Starting development server...');
console.log('📝 Server will be available at: http://localhost:4000');
console.log('🔐 In development mode, OTPs will be logged to console');
console.log('📧 Make sure your email credentials are correct in .env file');
console.log('');

// Start the server
const { spawn } = await import('child_process');
const server = spawn('npm', ['run', 'dev'], { 
  stdio: 'inherit',
  shell: true 
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

server.on('close', (code) => {
  console.log(`\n🛑 Server stopped with code ${code}`);
});
