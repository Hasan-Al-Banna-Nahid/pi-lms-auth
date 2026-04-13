import { MailService } from './../../mail/mail.service';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private repo: AuthRepository,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(MailService) private MailService: MailService,
    @InjectQueue('auth-queue') private readonly authQueue: Queue,
  ) {}

  async register(dto: any, isOwner = false) {
    const existingUser = await this.repo.findUserByEmail(dto.email);
    if (existingUser) throw new ConflictException('Email already taken');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.authQueue.add(
      'register-user',
      {
        ...dto,
        otp,
        isOwner,
      },
      { attempts: 3, backoff: 5000 },
    );

    return {
      success: true,
      message: 'Processing your registration. Check email shortly.',
    };
  }

  async registerStudent(dto: any, domain: string) {
    const user = await this.repo.findUserByEmail(dto.email);
    if (user) throw new ConflictException('User already registered');

    return this.repo.createUser({ ...dto, domain }, false);
  }
  async createStaff(dto: any, creator: any) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(creator.role)) {
      throw new UnauthorizedException('You do not have permission');
    }

    const existingUser = await this.repo.findUserByEmail(dto.email);
    if (existingUser) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.repo.createUser(
      {
        ...dto,
        password: hashedPassword,
        companyId: creator.companyId,
        isVerified: true,
      },
      false,
    );
  }
  async refreshTokens(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.repo.findUserById(payload.sub);

      if (!user || !user.refreshToken) throw new UnauthorizedException();

      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) throw new UnauthorizedException();

      return this.generateAuthResponse(user);
    } catch (e) {
      throw new UnauthorizedException('Session expired or invalid');
    }
  }
  private async generateAuthResponse(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.repo.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          domain: user.company?.domain,
        },
      },
    };
  }

  async verifyAccount(email: string, otp: string) {
    const user = await this.repo.findUserByEmail(email);

    if (!user || !user.otpCode || !user.otpExpires) {
      throw new BadRequestException('Invalid request or OTP not found');
    }

    if (user.otpCode !== otp) {
      throw new BadRequestException('The OTP code is incorrect');
    }

    const now = new Date();
    if (now > user.otpExpires) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one',
      );
    }

    await this.repo.markUserAsVerified(user.id);

    return {
      success: true,
      message: 'Account verified successfully. You can now login.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.repo.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      cid: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.repo.updateRefreshToken(
      user.id,
      await bcrypt.hash(refreshToken, 10),
    );

    return {
      success: true,
      message: 'Authentication successful',
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }
}
