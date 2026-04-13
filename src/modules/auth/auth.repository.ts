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

  async findUserByEmail(email: string) {
    // ইমেইল লোয়ারকেস এবং ট্রিম করা হচ্ছে
    const normalizedEmail = email.toLowerCase().trim();

    return this.prisma.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { company: true }, // কোম্পানির তথ্যসহ রিটার্ন করবে
    });
  }

  // ডিভাইস ট্র্যাকিং মেথডসমূহ
  async getDeviceCount(userId: string): Promise<number> {
    return this.prisma.prisma.device.count({ where: { userId } });
  }

  async findDevice(userId: string, deviceId: string) {
    return this.prisma.prisma.device.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
  }

  async upsertDevice(userId: string, deviceId: string) {
    return this.prisma.prisma.device.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: { lastLogin: new Date() },
      create: { userId, deviceId },
    });
  }

  async removeDevice(userId: string, deviceId: string) {
    return this.prisma.prisma.device.delete({
      where: { userId_deviceId: { userId, deviceId } },
    });
  }

  async removeAllDevices(userId: string) {
    return this.prisma.prisma.device.deleteMany({ where: { userId } });
  }

  async markUserAsVerified(userId: string) {
    return this.prisma.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, otpCode: null, otpExpires: null },
    });
  }

  async updateRefreshToken(userId: string, token: string | null) {
    await this.prisma.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }

  // auth.repository.ts

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
            role: data.role ? data.role : isOwner ? 'SUPER_ADMIN' : 'STUDENT',
            companyId: data.companyId || null,
            isVerified: data.isVerified || false,
            otpCode: data.otpCode || null,
            otpExpires: data.otpExpires || null,
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
        maxWait: 5000, // ট্রানজ্যাকশন শুরু করার জন্য ৫ সেকেন্ড অপেক্ষা করবে
        timeout: 10000, // পুরো ট্রানজ্যাকশন শেষ করার জন্য ১০ সেকেন্ড সময় পাবে
      },
    );
  }
  async findCompanyByDomain(domain: string) {
    // ডোমেইন থেকে 'https://' বা 'www.' বাদ দিয়ে ক্লিন করা
    const cleanDomain = domain
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
      .split('/')[0];

    return this.prisma.prisma.company.findUnique({
      where: { domain: cleanDomain },
    });
  }
}
