import { describe, expect, it } from 'vitest';
import { OtpService } from './otp.service';

/** In-memory OTP table; each prisma call yields first so parallel calls interleave like real I/O. */
function setup(code = '123456') {
  const row = { id: 'o1', phoneNumber: '+998901234567', code, attempts: 0, verified: false, createdAt: new Date() };
  const tick = () => new Promise((r) => setImmediate(r));
  const prisma = {
    oTP: {
      findFirst: async () => {
        await tick();
        return { ...row };
      },
      updateMany: async ({ where, data }: any) => {
        await tick();
        if (where.attempts?.lt !== undefined && !(row.attempts < where.attempts.lt)) return { count: 0 };
        if (where.verified === false && row.verified) return { count: 0 };
        if (data.attempts?.increment) row.attempts += data.attempts.increment;
        if (data.verified !== undefined) row.verified = data.verified;
        return { count: 1 };
      },
    },
  };
  return { row, service: new OtpService(prisma as any) };
}

describe('OtpService.verify attempts', () => {
  it('10 parallel wrong guesses consume at most 3 attempts', async () => {
    const { row, service } = setup();
    const results = await Promise.all(Array.from({ length: 10 }, () => service.verify('+998901234567', '000000')));
    expect(row.attempts).toBe(3);
    expect(results.every((r) => !r.valid)).toBe(true);
  });

  it('parallel guesses cannot find the code after the cap is spent', async () => {
    const { service } = setup();
    // 3 wrong guesses first, then the right code must be refused
    for (let i = 0; i < 3; i++) await service.verify('+998901234567', '000000');
    const r = await service.verify('+998901234567', '123456');
    expect(r.valid).toBe(false);
  });

  it('only the first of parallel correct submissions succeeds', async () => {
    const { service } = setup();
    const results = await Promise.all([
      service.verify('+998901234567', '123456'),
      service.verify('+998901234567', '123456'),
    ]);
    expect(results.filter((r) => r.valid)).toHaveLength(1);
  });

  it('keeps the reason field for the admin reset flow', async () => {
    const { service } = setup();
    expect(await service.verify('+998901234567', '000000')).toMatchObject({ valid: false, reason: 'wrong_code' });
  });
});
