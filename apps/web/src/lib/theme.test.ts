import { describe, it, expect } from 'vitest';
import { parseTheme, resolveTheme, themeInitScript, THEME_KEY } from './theme';

describe('parseTheme', () => {
  it('accepts the three values', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('system')).toBe('system');
  });
  it('falls back to system for anything else', () => {
    expect(parseTheme(null)).toBe('system');
    expect(parseTheme(undefined)).toBe('system');
    expect(parseTheme('')).toBe('system');
    expect(parseTheme('DARK')).toBe('system');
    expect(parseTheme(1)).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('system follows the OS', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
  it('a manual choice wins over the OS', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('themeInitScript', () => {
  it('is valid JS and uses the storage key', () => {
    const src = themeInitScript();
    expect(() => new Function(src)).not.toThrow();
    expect(src).toContain(JSON.stringify(THEME_KEY));
  });
});
