import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AuthRepository } from './auth.repository';
import { MailService } from 'src/mail/mail.service';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
@Processor('auth-queue')
export class AuthProcessor extends WorkerHost {
  constructor(
    @Inject(AuthRepository) private readonly repo: AuthRepository,
    @Inject(MailService) private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'register-user') {
      const { email, password, name, domain, otp, isOwner } = job.data;

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await this.repo.createUser(
        {
          email,
          password: hashedPassword,
          name,
          domain,
          otpCode: otp,
          otpExpires: new Date(Date.now() + 10 * 60000),
        },
        isOwner, // !!domain এর বদলে সরাসরি isOwner ব্যবহার করুন
      );

      // ইমেইল পাঠানোর আগে কনসোল লগ দিয়ে চেক করুন
      console.log(`Sending email to: ${user.email} with OTP: ${otp}`);

      try {
        await this.mailService.sendOtpEmail(user.email, otp);
      } catch (error) {
        console.error('Mail sending failed:', error);
        throw error; // throw করলে BullMQ এটাকে 'failed' হিসেবে দেখাবে এবং পুনরায় চেষ্টা করবে
      }

      return { status: 'completed', userId: user.id };
    }
  }
}
