import { describe, expect, it } from 'vitest';
import { LimitPipe, PagePipe, parseLimit, parsePage } from './pagination';

describe('pagination', () => {
  it('clamps a huge limit to the max', () => {
    expect(parseLimit('1000000', 20)).toBe(100);
    expect(parseLimit('1000000', 20, 500)).toBe(500);
    expect(new LimitPipe(20).transform('1000000')).toBe(100);
  });

  it('clamps zero and negative limits to 1', () => {
    expect(parseLimit('-1', 20)).toBe(1);
    expect(parseLimit('0', 20)).toBe(1);
  });

  it('uses the default for missing or non-numeric limit', () => {
    expect(parseLimit(undefined, 20)).toBe(20);
    expect(parseLimit('abc', 20)).toBe(20);
    expect(parseLimit('1e9', 20)).toBe(20);
    expect(parseLimit('99999999999999999999', 20)).toBe(20);
  });

  it('keeps a valid limit', () => {
    expect(parseLimit('50', 20)).toBe(50);
    expect(parseLimit('300', 20, 500)).toBe(300);
  });

  it('raises page to 1 for 0 and negatives', () => {
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-5')).toBe(1);
    expect(new PagePipe().transform('0')).toBe(1);
  });

  it('uses the default page for missing or non-numeric values', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('x')).toBe(1);
    expect(parsePage('3')).toBe(3);
  });
});
