import nodemailer from 'nodemailer';

// Step 1: Create transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: 'it.application@tech-bridge.biz',
    pass: 'nqmhbdhkbmbdnygn'
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// Step 2: Verify transporter (shows if Gmail allows connection)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Transporter connection failed:", error);
  } else {
    console.log("✅ Transporter is ready to send emails");
  }
});

// Step 3: Test Mail Sender (Manual test)
export const sendTestEmail = () => {
  const testMailOptions = {
    from: 'it.application@tech-bridge.biz',
    to: 'aarushgupta2018@gmail.com',
    subject: '✅ Test Mail from Node.js',
    text: 'This is a test email from the mailer setup.',
  };

  transporter.sendMail(testMailOptions, (error, info) => {
    if (error) {
      console.error('❌ Error sending test email:', error);
    } else {
      console.log('✅ Test email sent:', info.response);
    }
  });
};

// Step 4: Actual Reset Email Function
export const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const resetMailOptions = {
    from: 'it.application@tech-bridge.biz',
    to: email,
    subject: '🔐 Password Reset Link',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
  };

  try {
    const info = await transporter.sendMail(resetMailOptions);
    console.log("✅ Reset email sent:", info.response);
  } catch (error) {
    console.error("❌ Failed to send reset email:", error);
  }
};
