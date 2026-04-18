import { describe, it, expect } from 'vitest';
import { MS_PER_DAY } from '@/lib/constants';

describe('MS_PER_DAY', () => {
  it('equals 86400000 (24 * 60 * 60 * 1000)', () => {
    expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
  });
});
