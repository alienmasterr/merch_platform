import { postRaw } from './client';

/**
 * Ключ dev-заглушки оплати бекенду (StubPaymentStrategy.STUB_PRIVATE_KEY). Працює лише тоді,
 * коли на бекенді не задано LIQPAY_* ключі; зі справжнім LiqPay такий підпис відхиляється.
 */
const STUB_PRIVATE_KEY = 'dev-stub-private-key';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** LiqPay: data = base64(JSON), signature = base64(sha1(private_key + data + private_key)). */
export async function signLiqPayData(privateKey: string, data: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(privateKey + data + privateKey),
  );
  return toBase64(new Uint8Array(digest));
}

export async function buildStubCallback(orderId: string, amount: number): Promise<URLSearchParams> {
  const payload = {
    order_id: orderId,
    status: 'sandbox',
    amount,
    currency: 'UAH',
    payment_id: `dev-${Date.now()}`,
  };
  const data = toBase64(new TextEncoder().encode(JSON.stringify(payload)));
  return new URLSearchParams({ data, signature: await signLiqPayData(STUB_PRIVATE_KEY, data) });
}

/**
 * Лише для розробки: імітує callback LiqPay «оплата успішна» (те саме, що README-команда з tsx + curl).
 * Бекенд перевіряє підпис і переводить замовлення в PAID → PENDING_REVIEW.
 */
export async function simulateSuccessfulPayment(orderId: string, amount: number): Promise<void> {
  await postRaw('/payments/webhook', await buildStubCallback(orderId, amount));
}
