import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import 'dotenv/config';
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendOtpEmail(email: string, otp: string) {
    const htmlTemplate = `
  <div style="background-color: #f4f7f6; padding: 50px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      <div style="background: #007bff; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Pi-LMS Security</h1>
      </div>
      <div style="padding: 40px; text-align: center;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Verify Your Account</p>
        <p style="font-size: 15px; color: #666; line-height: 1.6;">Please use the 6-digit verification code below to complete your registration.</p>
        <div style="margin: 30px 0; padding: 15px; background: #f8f9fa; border: 1px dashed #007bff; border-radius: 10px; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #007bff;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #999;">This code will expire in <b>10 minutes</b>.</p>
      </div>
      <div style="background: #fdfdfd; padding: 20px; text-align: center; border-top: 1px solid #f1f1f1;">
        <p style="font-size: 12px; color: #aaa; margin: 0;">This is an automated email, please do not reply.</p>
      </div>
    </div>
  </div>
`;

    await this.transporter.sendMail({
      from: '"Pi-LMS Support" <noreply@pi-lms.com>',
      to: email,
      subject: `🔐 ${otp} is your verification code`,
      html: htmlTemplate,
    });
  }
}
