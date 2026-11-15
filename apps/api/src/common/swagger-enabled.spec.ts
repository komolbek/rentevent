import { describe, expect, it } from 'vitest';
import { swaggerEnabled } from './swagger-enabled';

describe('swaggerEnabled', () => {
  it('is on in dev and when NODE_ENV is unset', () => {
    expect(swaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(swaggerEnabled({})).toBe(true);
  });

  it('is off in production unless ENABLE_SWAGGER=true', () => {
    expect(swaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(swaggerEnabled({ NODE_ENV: 'production', ENABLE_SWAGGER: 'false' })).toBe(false);
    expect(swaggerEnabled({ NODE_ENV: 'production', ENABLE_SWAGGER: '1' })).toBe(false);
    expect(swaggerEnabled({ NODE_ENV: 'production', ENABLE_SWAGGER: 'true' })).toBe(true);
  });
});
