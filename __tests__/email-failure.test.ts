/**
 * TC4 — Email failure path test.
 * Verifies that sendEmail() never throws — it catches Resend errors
 * internally and returns { success: false }. This protects all 15+
 * fire-and-forget call sites from propagating email failures as 500s.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = { send: mockSend };
    },
  };
});

describe('TC4 — sendEmail failure handling', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
  });

  it('returns { success: true } when Resend succeeds', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'msg_123' }, error: null });

    const { sendEmail } = await import('@/lib/email');
    const result = await sendEmail('test@test.com', 'Subject', '<p>Body</p>');

    expect(result).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('returns { success: false } when Resend throws — does NOT propagate', async () => {
    mockSend.mockRejectedValueOnce(new Error('Resend API rate limit'));

    const { sendEmail } = await import('@/lib/email');
    const result = await sendEmail('test@test.com', 'Subject', '<p>Body</p>');

    expect(result).toEqual({ success: false });
  });

  it('returns { success: false } when Resend throws a network error', async () => {
    mockSend.mockRejectedValueOnce(new TypeError('fetch failed'));

    const { sendEmail } = await import('@/lib/email');
    const result = await sendEmail('test@test.com', 'Subject', '<p>Body</p>');

    expect(result).toEqual({ success: false });
  });
});
