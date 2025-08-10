import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  try {
    // Debug: Log email configuration (without sensitive data)
    console.log('📧 Email Configuration Check:');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('Username:', process.env.EMAIL_USERNAME);
    console.log('From:', process.env.EMAIL_FROM);
    console.log('To:', options.email);
    console.log('Subject:', options.subject);

    // Validate required environment variables
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USERNAME', 'EMAIL_PASSWORD', 'EMAIL_FROM'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing email environment variables: ${missingVars.join(', ')}`);
    }

    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      // Add timeout and connection settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // For Gmail, add these settings
      service: process.env.EMAIL_HOST === 'smtp.gmail.com' ? 'gmail' : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    // 2) Verify transporter configuration
    console.log('🔍 Verifying email transporter...');
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');

    // 3) Define email options
    const mailOptions = {
      from: `VIT Bhopal <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      // html: options.html (uncomment if you want HTML emails)
    };

    // 4) Send email
    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('Full error:', error);
    
    // Provide specific error messages for common issues
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your email username and password.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Email connection failed. Please check your internet connection and email host settings.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Email connection timed out. Please check your email host and port settings.');
    } else {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
};

export default sendEmail;