import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { clientIp } from '../common/client-ip';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { StaffId } from '../common/decorators';
import { AdminAuthService } from './admin-auth.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

@ApiTags('Admin')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(
    @Body() body: { phone: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuthService.login(body.phone, body.password);
    res.cookie('admin_session', result.sessionToken, COOKIE_OPTIONS);
    return {
      success: true,
      staff: result.staff,
      mustChangePassword: result.mustChangePassword,
    };
  }

  @Get('session')
  @UseGuards(AdminAuthGuard)
  async getSession(@StaffId() staffId: string) {
    const staff = await this.adminAuthService.getStaffById(staffId);
    return { success: true, staff };
  }

  @Delete('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('admin_session', { path: '/' });
    return { success: true, message: 'Logged out' };
  }

  @Post('set-password')
  @UseGuards(AdminAuthGuard)
  async setPassword(
    @StaffId() staffId: string,
    @Body() body: { currentPassword?: string; newPassword: string },
  ) {
    await this.adminAuthService.setPassword(
      staffId,
      body.newPassword,
      body.currentPassword,
    );
    return { success: true, message: 'Password updated' };
  }

  @Post('forgot-password/send-otp')
  async forgotPasswordSendOtp(
    @Body() body: { phone: string },
    @Req() req: Request,
  ) {
    await this.adminAuthService.forgotPasswordSendOtp(
      body?.phone,
      clientIp(req),
    );
    return { success: true, message: 'OTP sent' };
  }

  @Post('forgot-password/verify-otp')
  async forgotPasswordVerifyOtp(
    @Body() body: { phone: string; code: string },
    @Req() req: Request,
  ) {
    const result = await this.adminAuthService.forgotPasswordVerifyOtp(
      body?.phone,
      body?.code,
      clientIp(req),
    );
    return { success: true, resetToken: result.resetToken };
  }

  @Post('forgot-password/reset-password')
  async forgotPasswordResetPassword(
    @Body() body: { resetToken: string; newPassword: string },
  ) {
    await this.adminAuthService.resetPasswordWithToken(
      body.resetToken,
      body.newPassword,
    );
    return { success: true, message: 'Password reset successfully' };
  }
}
