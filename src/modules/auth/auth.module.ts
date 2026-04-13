import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailService } from 'src/mail/mail.service';
import 'dotenv/config';
import { PrismaModule } from 'lib/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { AuthProcessor } from './auth.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'auth-queue',
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'PI_LMS_SECRET',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthProcessor,
    AuthService,
    AuthRepository,
    JwtStrategy,
    MailService,
    PrismaModule,
  ],
  exports: [AuthService],
})
export class AuthModule {}
