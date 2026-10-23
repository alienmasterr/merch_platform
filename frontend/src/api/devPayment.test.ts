import { describe, expect, it } from 'vitest';
import { buildStubCallback, signLiqPayData } from './devPayment';

describe('dev payment callback', () => {
  it('signs data exactly like the backend (sha1 + base64)', async () => {
    // node -e "require('crypto').createHash('sha1').update('keyZGF0YQ==key').digest('base64')"
    await expect(signLiqPayData('key', 'ZGF0YQ==')).resolves.toBe('r55zZ2cp/mW5zz1owteBCe4zc9E=');
  });

  it('encodes a sandbox success callback for the order', async () => {
    const params = await buildStubCallback('order-1', 475.5);
    const payload = JSON.parse(atob(params.get('data') ?? '')) as Record<string, unknown>;
    expect(payload).toMatchObject({
      order_id: 'order-1',
      status: 'sandbox',
      amount: 475.5,
      currency: 'UAH',
    });
    expect(params.get('signature')).toBe(
      await signLiqPayData('dev-stub-private-key', params.get('data') ?? ''),
    );
  });
});
