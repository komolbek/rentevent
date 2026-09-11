import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_KEY;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET or ADMIN_API_KEY must be configured');
  }
  return secret;
}

export function createAdminSession(staffId: string): string {
  const timestamp = Date.now();
  const payload = `staff:${staffId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('hex');
  return `${payload}:${signature}`;
}

export function validateAdminSession(
  sessionToken: string,
): { valid: boolean; staffId?: string } {
  if (!sessionToken) return { valid: false };

  const parts = sessionToken.split(':');
  if (parts.length !== 4) return { valid: false };

  const [prefix, staffId, timestampStr, signature] = parts;
  if (prefix !== 'staff') return { valid: false };

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return { valid: false };

  const elapsed = Date.now() - timestamp;
  if (elapsed > SESSION_DURATION) return { valid: false };

  const payload = `${prefix}:${staffId}:${timestampStr}`;
  const expectedSignature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('hex');

  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  // timingSafeEqual throws on buffers of different length; a malformed
  // signature must be rejected as invalid, not surfaced as a 500.
  if (signatureBuf.length !== expectedBuf.length) return { valid: false };

  const isValid = crypto.timingSafeEqual(signatureBuf, expectedBuf);

  return isValid ? { valid: true, staffId } : { valid: false };
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const cookies = request.cookies || {};
    const sessionToken = cookies.admin_session;

    if (!sessionToken) {
      throw new UnauthorizedException('Admin authentication required');
    }

    const result = validateAdminSession(sessionToken);
    if (!result.valid || !result.staffId) {
      throw new UnauthorizedException('Invalid or expired admin session');
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: result.staffId },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Staff account not found or inactive');
    }

    const url = request.url || '';
    const isPasswordEndpoint =
      url.includes('/set-password') || url.includes('/forgot-password');
    if (staff.mustChangePassword && !isPasswordEndpoint) {
      throw new ForbiddenException({
        success: false,
        message: 'Password change required',
        mustChangePassword: true,
      });
    }

    request.staffId = staff.id;
    request.staffRole = staff.role;
    request.staffName = staff.name;
    return true;
  }
}
