import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { clientIp } from '../common/client-ip';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  async sendOtp(
    @Body() body: { phone_number: string },
    @Req() req: Request,
  ) {
    return this.authService.sendOtp(body?.phone_number, clientIp(req));
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get session token' })
  async verifyOtp(@Body() body: { phone_number: string; code: string; device_id: string }) {
    return this.authService.verifyOtp(body?.phone_number, body?.code, body?.device_id);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate session' })
  async logout(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.logout(token);
  }
}
