import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // 1) Create a transporter
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });


  // 2) Define email options
  const mailOptions = {
    from: `VIT Bhopal <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
    // html: options.html (uncomment if you want HTML emails)
  };

  // 3) Send email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;