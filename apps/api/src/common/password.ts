import { BadRequestException } from '@nestjs/common';

/**
 * Minimum length for a NEW admin/staff password. Checked only when a password is
 * set, changed or reset; login does not enforce it, so existing passwords keep working.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 10;

export function assertAdminPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `Пароль должен содержать не менее ${MIN_ADMIN_PASSWORD_LENGTH} символов`,
    );
  }
}
