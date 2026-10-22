import { describe, expect, it, vi } from 'vitest';
import { OrderStatus, type DeliveryRecipient, type IDeliveryService } from '@merch/contracts';
import { NovaPoshtaDeliveryObserver } from '../application/nova-poshta-delivery-observer';

const recipient: DeliveryRecipient = { fullName: 'A B', phone: '0501234567', city: 'Київ', warehouse: '1' };

function setup(generate: IDeliveryService['generateTTN'] = async () => 'TTN-1') {
  const generateTTN = vi.fn(generate);
  const service: IDeliveryService = { calculateShippingCost: async () => 70, generateTTN };
  const provider = vi.fn(async () => recipient);
  return { observer: new NovaPoshtaDeliveryObserver(service, provider), generateTTN, provider };
}

describe('NovaPoshtaDeliveryObserver', () => {
  it('на SHIPPED створює ТТН і зберігає номер', async () => {
    const { observer, generateTTN, provider } = setup();
    await observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED);
    expect(provider).toHaveBeenCalledWith('o1');
    expect(generateTTN).toHaveBeenCalledWith('o1', recipient);
    expect(observer.getTtnNumber('o1')).toBe('TTN-1');
  });

  it('інші статуси ігнорує', async () => {
    const { observer, generateTTN } = setup();
    for (const status of [OrderStatus.CREATED, OrderStatus.PAID, OrderStatus.PRINTING, OrderStatus.CANCELLED]) {
      await observer.onOrderStatusChanged('o1', status);
    }
    expect(generateTTN).not.toHaveBeenCalled();
    expect(observer.getTtnNumber('o1')).toBeUndefined();
  });

  it('ідемпотентність: повторний SHIPPED не створює другу ТТН', async () => {
    const { observer, generateTTN } = setup();
    await observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED);
    await observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED);
    expect(generateTTN).toHaveBeenCalledTimes(1);
  });

  it('одночасні події SHIPPED обʼєднуються в один виклик API', async () => {
    const { observer, generateTTN } = setup(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 'TTN-2';
    });
    await Promise.all([
      observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED),
      observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED),
    ]);
    expect(generateTTN).toHaveBeenCalledTimes(1);
    expect(observer.getTtnNumber('o1')).toBe('TTN-2');
  });

  it('негатив: помилка API прокидається, а наступна спроба можлива', async () => {
    let fail = true;
    const { observer, generateTTN } = setup(async () => {
      if (fail) throw new Error('NP down');
      return 'TTN-3';
    });
    await expect(observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED)).rejects.toThrow('NP down');
    expect(observer.getTtnNumber('o1')).toBeUndefined();

    fail = false;
    await observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED);
    expect(observer.getTtnNumber('o1')).toBe('TTN-3');
    expect(generateTTN).toHaveBeenCalledTimes(2);
  });
});

describe('NovaPoshtaDeliveryObserver + TtnStore (ТТН зберігається в замовленні)', () => {
  function withStore(initial: Record<string, string> = {}) {
    const stored = new Map(Object.entries(initial));
    const store = {
      get: vi.fn(async (id: string) => stored.get(id) ?? null),
      save: vi.fn(async (id: string, ttn: string) => void stored.set(id, ttn)),
    };
    const generateTTN = vi.fn(async () => 'TTN-1');
    const service: IDeliveryService = { calculateShippingCost: async () => 70, generateTTN };
    const observer = new NovaPoshtaDeliveryObserver(service, async () => recipient, store);
    return { observer, store, stored, generateTTN };
  }

  it('створена ТТН зберігається в сховищі', async () => {
    const { observer, stored } = withStore();
    await observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED);
    expect(stored.get('o1')).toBe('TTN-1');
    expect(observer.getTtnNumber('o1')).toBe('TTN-1');
  });

  it('після перезапуску (порожня памʼять) ТТН зі сховища не створюється вдруге', async () => {
    const { observer, generateTTN, store } = withStore({ o1: 'TTN-OLD' });
    await observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED);
    expect(generateTTN).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
    expect(observer.getTtnNumber('o1')).toBe('TTN-OLD');
  });

  it('негатив: збереження впало; повтор лише зберігає ту саму ТТН, без нового виклику API', async () => {
    const { observer, store, stored, generateTTN } = withStore();
    store.save.mockRejectedValueOnce(new Error('db down'));
    await expect(observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED)).rejects.toThrow('db down');
    expect(stored.has('o1')).toBe(false);

    await observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED);
    expect(generateTTN).toHaveBeenCalledTimes(1);
    expect(stored.get('o1')).toBe('TTN-1');
  });
});
