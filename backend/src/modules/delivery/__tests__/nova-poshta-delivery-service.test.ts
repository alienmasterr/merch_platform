import { describe, expect, it } from 'vitest';
import { ExternalServiceError, NotFoundError, ValidationError } from '@merch/contracts';
import type { HttpClient } from '../infrastructure/http-client';
import {
  NovaPoshtaDeliveryService,
  formatDate,
  normalizePhone,
} from '../infrastructure/nova-poshta-delivery-service';

interface Recorded {
  url: string;
  body: { apiKey: string; modelName: string; calledMethod: string; methodProperties: Record<string, string> };
}

type Handler = (props: Record<string, string>) => { success: boolean; data?: unknown[]; errors?: string[] };

class FakeNp implements HttpClient {
  readonly requests: Recorded[] = [];
  private readonly handlers = new Map<string, Handler>();

  on(method: string, handler: Handler): this {
    this.handlers.set(method, handler);
    return this;
  }

  async postJson(url: string, body: unknown): Promise<unknown> {
    const b = body as Recorded['body'];
    this.requests.push({ url, body: b });
    const handler = this.handlers.get(`${b.modelName}.${b.calledMethod}`);
    if (!handler) throw new Error(`No handler for ${b.modelName}.${b.calledMethod}`);
    const result = handler(b.methodProperties);
    return { data: [], ...result };
  }
}

function happyNp(): FakeNp {
  return new FakeNp()
    .on('Address.getCities', (p) => ({
      success: true,
      data: p.FindByString === 'Київ'
        ? [{ Ref: 'city-kyiv', Description: 'Київ' }]
        : [{ Ref: 'city-other', Description: 'Київка' }, { Ref: 'city-lviv', Description: 'Львів' }],
    }))
    .on('InternetDocument.getDocumentPrice', () => ({ success: true, data: [{ Cost: '85' }] }))
    .on('Address.getWarehouses', () => ({ success: true, data: [{ Ref: 'wh-other', Number: '120' }, { Ref: 'wh-12', Number: '12' }] }))
    .on('Counterparty.save', () => ({ success: true, data: [{ Ref: 'cp-1', ContactPerson: { data: [{ Ref: 'contact-1' }] } }] }))
    .on('InternetDocument.save', () => ({ success: true, data: [{ IntDocNumber: '20600000002545' }] }));
}

function makeService(http: HttpClient) {
  return new NovaPoshtaDeliveryService({
    apiKey: 'KEY',
    http,
    sender: { cityName: 'Київ', senderRef: 's-ref', contactSenderRef: 'cs-ref', senderAddressRef: 'sa-ref', phone: '0671112233' },
    now: () => new Date(2026, 9, 5),
  });
}

const recipient = { fullName: 'Іваненко Іван Іванович', phone: '+38 (050) 123-45-67', email: 'i@x.ua', city: 'Львів', warehouse: '12' };

describe('NovaPoshtaDeliveryService', () => {
  it('calculateShippingCost: резолвить міста й повертає вартість числом', async () => {
    const np = happyNp();
    const cost = await makeService(np).calculateShippingCost('Львів', 1.5);
    expect(cost).toBe(85);

    const price = np.requests.find((r) => r.body.calledMethod === 'getDocumentPrice')!;
    expect(price.body.apiKey).toBe('KEY');
    expect(price.url).toBe('https://api.novaposhta.ua/v2.0/json/');
    expect(price.body.methodProperties).toMatchObject({
      CitySender: 'city-kyiv', CityRecipient: 'city-lviv', Weight: '1.5', ServiceType: 'WarehouseWarehouse', SeatsAmount: '1',
    });
  });

  it('ref міста кешується між викликами', async () => {
    const np = happyNp();
    const service = makeService(np);
    await service.calculateShippingCost('Львів', 1);
    await service.calculateShippingCost('Львів', 2);
    expect(np.requests.filter((r) => r.body.calledMethod === 'getCities')).toHaveLength(2); // Київ + Львів один раз
  });

  it('generateTTN: збирає всі refs і повертає номер накладної', async () => {
    const np = happyNp();
    const ttn = await makeService(np).generateTTN('order-1', recipient);
    expect(ttn).toBe('20600000002545');

    const counterparty = np.requests.find((r) => r.body.modelName === 'Counterparty')!;
    expect(counterparty.body.methodProperties).toMatchObject({
      LastName: 'Іваненко', FirstName: 'Іван', MiddleName: 'Іванович', Phone: '380501234567', CounterpartyProperty: 'Recipient',
    });

    const save = np.requests.find((r) => r.body.modelName === 'InternetDocument' && r.body.calledMethod === 'save')!;
    expect(save.body.methodProperties).toMatchObject({
      CityRecipient: 'city-lviv', RecipientAddress: 'wh-12', Recipient: 'cp-1', ContactRecipient: 'contact-1',
      Sender: 's-ref', SenderAddress: 'sa-ref', ContactSender: 'cs-ref', SendersPhone: '380671112233',
      DateTime: '05.10.2026', RecipientsPhone: '380501234567', PayerType: 'Recipient',
    });
  });

  it('негатив: API повертає success=false, помилки потрапляють у повідомлення', async () => {
    const np = happyNp().on('InternetDocument.getDocumentPrice', () => ({ success: false, errors: ['Weight is invalid'] }));
    await expect(makeService(np).calculateShippingCost('Львів', 1)).rejects.toThrow(/Weight is invalid/);
    await expect(makeService(np).calculateShippingCost('Львів', 1)).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it('негатив: невідоме місто, невідоме відділення, немає номера ТТН', async () => {
    const noCity = happyNp().on('Address.getCities', () => ({ success: true, data: [] }));
    await expect(makeService(noCity).calculateShippingCost('Нікуди', 1)).rejects.toThrow(NotFoundError);

    const noWarehouse = happyNp().on('Address.getWarehouses', () => ({ success: true, data: [{ Ref: 'w', Number: '5' }] }));
    await expect(makeService(noWarehouse).generateTTN('o', recipient)).rejects.toThrow(/Warehouse 12 not found/);

    const noTtn = happyNp().on('InternetDocument.save', () => ({ success: true, data: [{}] }));
    await expect(makeService(noTtn).generateTTN('o', recipient)).rejects.toThrow(/did not return a TTN/);
  });

  it('негатив: вага <= 0, імʼя з одного слова', async () => {
    await expect(makeService(happyNp()).calculateShippingCost('Львів', 0)).rejects.toThrow(ValidationError);
    await expect(makeService(happyNp()).generateTTN('o', { ...recipient, fullName: 'Іван' })).rejects.toThrow(ValidationError);
  });

  it('негатив: Counterparty.save без refs', async () => {
    const np = happyNp().on('Counterparty.save', () => ({ success: true, data: [{ Ref: 'cp-1' }] }));
    await expect(makeService(np).generateTTN('o', recipient)).rejects.toThrow(/recipient references/);
  });
});

describe('helpers', () => {
  it('normalizePhone', () => {
    expect(normalizePhone('0501234567')).toBe('380501234567');
    expect(normalizePhone('+38 (050) 123-45-67')).toBe('380501234567');
    expect(normalizePhone('380501234567')).toBe('380501234567');
  });

  it('formatDate: дд.мм.рррр', () => {
    expect(formatDate(new Date(2026, 0, 3))).toBe('03.01.2026');
  });
});
