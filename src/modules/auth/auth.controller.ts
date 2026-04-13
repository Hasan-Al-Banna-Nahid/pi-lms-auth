import {
  Controller,
  Post,
  Body,
  UsePipes,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from './dto/auth.dto';
import type { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register-company')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async registerCompany(@Body() dto: RegisterDto) {
    return this.authService.register(dto, true);
  }

  @Post('student-signup')
  async studentSignup(@Body() body: any, @Req() req: any) {
    const domain = req.headers['origin'] || body.domain;
    return this.authService.registerStudent(body, domain);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('create-staff')
  async createStaff(@Body() body: any, @Req() req: any) {
    return this.authService.createStaff(body, req.user);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    // ফ্রন্টএন্ড থেকে হেডার বা বডিতে 'x-device-id' পাঠাতে হবে
    const deviceId = req.headers['x-device-id'] || 'unknown_device';
    return this.authService.login(dto, deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Body('all') all: boolean) {
    // JwtAuthGuard থেকে আসা user অবজেক্টে did (device id) থাকবে
    return this.authService.logout(req.user.id, req.user.did, all);
  }

  @Post('verify-otp')
  async verify(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyAccount(body.email, body.otp);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshTokens(token);
  }

  // Microservice Validation API
  @UseGuards(JwtAuthGuard)
  @Get('validate-internal')
  async validateInternal(@Req() req: any) {
    if (!req.user) throw new UnauthorizedException('Invalid Token');
    return {
      userId: req.user.id,
      role: req.user.role,
      companyId: req.user.companyId,
      isValid: true,
    };
  }
}
