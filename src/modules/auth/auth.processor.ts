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
      const { email, password, name, domain, otp, isOwner, role, companyId } =
        job.data;

      const hashedPassword = await bcrypt.hash(password, 10);

      // ডাটাবেজে ইউজার তৈরি
      const user = await this.repo.createUser(
        {
          email,
          password: hashedPassword,
          name,
          role: role || (isOwner ? 'SUPER_ADMIN' : 'STUDENT'),
          companyId: companyId || null,
          otpCode: otp,
          otpExpires: new Date(Date.now() + 10 * 60000), // ১০ মিনিট মেয়াদ
          isVerified: false,
        },
        isOwner,
      );

      console.log(`Sending OTP to ${user.email}: ${otp}`);

      try {
        // ইমেইল পাঠানো
        await this.mailService.sendOtpEmail(user.email, otp);
      } catch (error) {
        console.error('Mail sending failed:', error);
        throw error;
      }

      return { status: 'completed', userId: user.id };
    }
  }
}
