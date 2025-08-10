#!/usr/bin/env node

import 'dotenv/config.js';
import nodemailer from 'nodemailer';

console.log('🔍 Email Configuration Checker');
console.log('='.repeat(50));

// Check environment variables
const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USERNAME', 'EMAIL_PASSWORD', 'EMAIL_FROM'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing environment variables:');
  missingVars.forEach(varName => console.log(`  - ${varName}`));
  console.log('\n💡 Please add these to your .env file');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// Display current configuration (without password)
console.log('\n📧 Current Email Configuration:');
console.log('Host:', process.env.EMAIL_HOST);
console.log('Port:', process.env.EMAIL_PORT);
console.log('Username:', process.env.EMAIL_USERNAME);
console.log('From:', process.env.EMAIL_FROM);
console.log('Password:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');

// Test email configuration
async function testEmailConfig() {
  try {
    console.log('\n🧪 Testing email configuration...');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      service: process.env.EMAIL_HOST === 'smtp.gmail.com' ? 'gmail' : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    console.log('🔍 Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully!');

    // Test sending email
    console.log('📤 Testing email sending...');
    const testEmail = process.env.EMAIL_USERNAME; // Send to yourself for testing
    
    const info = await transporter.sendMail({
      from: `VIT Bhopal Test <${process.env.EMAIL_FROM}>`,
      to: testEmail,
      subject: 'VIT Bhopal Email Test',
      text: 'This is a test email from VIT Bhopal backend. If you receive this, your email configuration is working correctly!'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Sent to:', testEmail);
    
    return true;
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    
    // Provide specific solutions for common errors
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Solution for authentication error:');
      console.log('1. For Gmail: Enable 2-factor authentication');
      console.log('2. Generate an App Password (not your regular password)');
      console.log('3. Use the App Password in EMAIL_PASSWORD');
      console.log('4. Make sure EMAIL_USERNAME is your full Gmail address');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 Solution for connection error:');
      console.log('1. Check your internet connection');
      console.log('2. Verify EMAIL_HOST and EMAIL_PORT are correct');
      console.log('3. Check if your firewall is blocking the connection');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n🔧 Solution for timeout error:');
      console.log('1. Check your internet connection');
      console.log('2. Try a different port (587 or 465)');
      console.log('3. Check if your email provider is blocking the connection');
    }
    
    return false;
  }
}

// Gmail specific setup guide
function showGmailSetup() {
  console.log('\n📋 Gmail Setup Guide:');
  console.log('1. Go to your Google Account settings');
  console.log('2. Enable 2-Factor Authentication');
  console.log('3. Go to Security > App passwords');
  console.log('4. Generate a new app password for "Mail"');
  console.log('5. Use the generated password in EMAIL_PASSWORD');
  console.log('6. Make sure EMAIL_USERNAME is your full Gmail address');
  console.log('7. Use these settings in your .env file:');
  console.log('   EMAIL_HOST=smtp.gmail.com');
  console.log('   EMAIL_PORT=587');
  console.log('   EMAIL_USERNAME=your-email@gmail.com');
  console.log('   EMAIL_PASSWORD=your-app-password');
  console.log('   EMAIL_FROM=noreply@vitbhopal.ac.in');
}

// Alternative email services
function showAlternatives() {
  console.log('\n🔄 Alternative Email Services:');
  console.log('1. Mailtrap (for testing):');
  console.log('   EMAIL_HOST=sandbox.smtp.mailtrap.io');
  console.log('   EMAIL_PORT=2525');
  console.log('   EMAIL_USERNAME=your-mailtrap-username');
  console.log('   EMAIL_PASSWORD=your-mailtrap-password');
  
  console.log('\n2. Outlook/Hotmail:');
  console.log('   EMAIL_HOST=smtp-mail.outlook.com');
  console.log('   EMAIL_PORT=587');
  
  console.log('\n3. Yahoo:');
  console.log('   EMAIL_HOST=smtp.mail.yahoo.com');
  console.log('   EMAIL_PORT=587');
}

// Main execution
async function main() {
  const success = await testEmailConfig();
  
  if (!success) {
    console.log('\n🔧 Troubleshooting Options:');
    console.log('1. Check the error message above');
    console.log('2. Follow the specific solution provided');
    console.log('3. Use development mode with SKIP_EMAIL=true for testing');
    console.log('4. Try alternative email services');
    
    showGmailSetup();
    showAlternatives();
    
    console.log('\n💡 For development testing, you can add this to your .env file:');
    console.log('SKIP_EMAIL=true');
    console.log('This will skip email sending and return the OTP in the response.');
  } else {
    console.log('\n🎉 Email configuration is working perfectly!');
    console.log('You can now use the signup endpoint without issues.');
  }
}

main().catch(console.error);
