import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'lib/prisma.service';
import * as bcrypt from 'bcryptjs';
@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findUserById(id: string) {
    return this.prisma.prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  }

  async markUserAsVerified(userId: string) {
    return this.prisma.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpires: null,
      },
    });
  }

  async findUserByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    return this.prisma.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        otpCode: true,
        otpExpires: true,
        passwordHash: true,
        role: true,
        companyId: true,
      },
    });
  }
  async createStudent(data: any, domain: string) {
    const company = await this.prisma.prisma.company.findUnique({
      where: { domain },
    });

    if (!company) throw new BadRequestException('Invalid platform domain');

    return this.prisma.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(data.password, 10),
        name: data.name,
        role: 'STUDENT',
        companyId: company.id,
        isVerified: true,
      },
    });
  }
  async createUser(data: any, isOwner = false) {
    const emailLower = data.email.toLowerCase().trim();
    const domainLower = data.domain ? data.domain.toLowerCase().trim() : null;

    return this.prisma.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: emailLower,
            passwordHash: data.password,
            name: data.name,
            // এখানে পরিবর্তন: যদি data.role থাকে তবে সেটি ব্যবহার করবে,
            // নাহলে isOwner অনুযায়ী রোল সেট করবে।
            role: data.role ? data.role : isOwner ? 'SUPER_ADMIN' : 'STUDENT',
            companyId: data.companyId || null, // কোম্পানি আইডি পাস করা নিশ্চিত করুন
            otpCode: data.otpCode,
            otpExpires: data.otpExpires,
            isVerified: data.isVerified || false,
          },
        });

        if (isOwner && domainLower) {
          await tx.company.create({
            data: {
              name: `${data.name}'s Platform`,
              domain: domainLower,
              ownerId: user.id,
            },
          });
        }
        return user;
      },
      {
        timeout: 20000,
      },
    );
  }

  async updateRefreshToken(userId: string, token: string | null) {
    await this.prisma.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }
}
