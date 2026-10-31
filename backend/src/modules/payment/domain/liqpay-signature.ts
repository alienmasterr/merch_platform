import { createHash, timingSafeEqual } from 'node:crypto';

export function encodeLiqPayData(params: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
}

export function decodeLiqPayData(data: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('LiqPay data is not an object');
  return parsed as Record<string, unknown>;
}

export function signLiqPayData(privateKey: string, data: string): string {
  return createHash('sha1').update(privateKey + data + privateKey).digest('base64');
}

export function isValidLiqPaySignature(privateKey: string, data: string, signature: string): boolean {
  const expected = Buffer.from(signLiqPayData(privateKey, data));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
