import {
  ExternalServiceError,
  NotFoundError,
  ValidationError,
  type DeliveryRecipient,
  type IDeliveryService,
} from '@merch/contracts';
import type { HttpClient } from './http-client';

export interface NovaPoshtaSenderConfig {
  cityName: string;
  senderRef: string;
  contactSenderRef: string;
  senderAddressRef: string;
  phone: string;
}

export interface NovaPoshtaOptions {
  apiKey: string;
  http: HttpClient;
  sender: NovaPoshtaSenderConfig;
  apiUrl?: string;
  declaredCostUah?: number;
  defaultWeightKg?: number;
  now?: () => Date;
}

interface NpResponse {
  success: boolean;
  data: Record<string, unknown>[];
  errors?: string[];
}

const DEFAULT_URL = 'https://api.novaposhta.ua/v2.0/json/';

export class NovaPoshtaDeliveryService implements IDeliveryService {
  private readonly apiKey: string;
  private readonly http: HttpClient;
  private readonly sender: NovaPoshtaSenderConfig;
  private readonly apiUrl: string;
  private readonly declaredCost: number;
  private readonly defaultWeightKg: number;
  private readonly now: () => Date;
  private readonly cityRefs = new Map<string, string>();

  constructor(options: NovaPoshtaOptions) {
    this.apiKey = options.apiKey;
    this.http = options.http;
    this.sender = options.sender;
    this.apiUrl = options.apiUrl ?? DEFAULT_URL;
    this.declaredCost = options.declaredCostUah ?? 500;
    this.defaultWeightKg = options.defaultWeightKg ?? 0.5;
    this.now = options.now ?? (() => new Date());
  }

  async calculateShippingCost(city: string, weightKg: number): Promise<number> {
    if (!(weightKg > 0)) throw new ValidationError('weightKg must be positive');
    const [citySender, cityRecipient] = await Promise.all([
      this.resolveCityRef(this.sender.cityName),
      this.resolveCityRef(city),
    ]);
    const data = await this.call('InternetDocument', 'getDocumentPrice', {
      CitySender: citySender,
      CityRecipient: cityRecipient,
      Weight: String(weightKg),
      ServiceType: 'WarehouseWarehouse',
      CargoType: 'Cargo',
      Cost: String(this.declaredCost),
      SeatsAmount: '1',
    });
    const cost = Number(data[0]?.Cost);
    if (!Number.isFinite(cost)) throw new ExternalServiceError('Nova Poshta returned no delivery cost');
    return cost;
  }

  async generateTTN(orderId: string, recipient: DeliveryRecipient): Promise<string> {
    const [citySender, cityRecipient] = await Promise.all([
      this.resolveCityRef(this.sender.cityName),
      this.resolveCityRef(recipient.city),
    ]);
    const warehouseRef = await this.resolveWarehouseRef(cityRecipient, recipient.warehouse);
    const { counterpartyRef, contactRef } = await this.createRecipient(recipient);

    const data = await this.call('InternetDocument', 'save', {
      PayerType: 'Recipient',
      PaymentMethod: 'Cash',
      DateTime: formatDate(this.now()),
      CargoType: 'Cargo',
      Weight: String(this.defaultWeightKg),
      VolumeGeneral: '0.004',
      ServiceType: 'WarehouseWarehouse',
      SeatsAmount: '1',
      Description: `Merch order ${orderId}`,
      Cost: String(this.declaredCost),
      CitySender: citySender,
      Sender: this.sender.senderRef,
      SenderAddress: this.sender.senderAddressRef,
      ContactSender: this.sender.contactSenderRef,
      SendersPhone: normalizePhone(this.sender.phone),
      CityRecipient: cityRecipient,
      Recipient: counterpartyRef,
      RecipientAddress: warehouseRef,
      ContactRecipient: contactRef,
      RecipientsPhone: normalizePhone(recipient.phone),
    });
    const ttn = data[0]?.IntDocNumber;
    if (typeof ttn !== 'string' || !ttn) throw new ExternalServiceError('Nova Poshta did not return a TTN number');
    return ttn;
  }

  private async resolveCityRef(cityName: string): Promise<string> {
    const key = cityName.trim().toLowerCase();
    const cached = this.cityRefs.get(key);
    if (cached) return cached;

    const data = await this.call('Address', 'getCities', { FindByString: cityName.trim() });
    const exact = data.find((c) => String(c.Description ?? '').toLowerCase() === key);
    const ref = (exact ?? data[0])?.Ref;
    if (typeof ref !== 'string') throw new NotFoundError(`City "${cityName}" not found in Nova Poshta`);
    this.cityRefs.set(key, ref);
    return ref;
  }

  private async resolveWarehouseRef(cityRef: string, warehouseNumber: string): Promise<string> {
    const data = await this.call('Address', 'getWarehouses', {
      CityRef: cityRef,
      FindByString: warehouseNumber,
    });
    const match = data.find((w) => String(w.Number) === String(warehouseNumber));
    const ref = match?.Ref;
    if (typeof ref !== 'string') throw new NotFoundError(`Warehouse ${warehouseNumber} not found`);
    return ref;
  }

  private async createRecipient(recipient: DeliveryRecipient): Promise<{ counterpartyRef: string; contactRef: string }> {
    const [lastName, firstName, ...rest] = recipient.fullName.trim().split(/\s+/);
    if (!lastName || !firstName) throw new ValidationError('Recipient full name must contain last name and first name');

    const data = await this.call('Counterparty', 'save', {
      CounterpartyProperty: 'Recipient',
      CounterpartyType: 'PrivatePerson',
      FirstName: firstName,
      MiddleName: rest.join(' '),
      LastName: lastName,
      Phone: normalizePhone(recipient.phone),
      ...(recipient.email && { Email: recipient.email }),
    });
    const first = data[0];
    const contacts = (first?.ContactPerson as { data?: Record<string, unknown>[] } | undefined)?.data;
    const counterpartyRef = first?.Ref;
    const contactRef = contacts?.[0]?.Ref;
    if (typeof counterpartyRef !== 'string' || typeof contactRef !== 'string') {
      throw new ExternalServiceError('Nova Poshta did not return recipient references');
    }
    return { counterpartyRef, contactRef };
  }

  private async call(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, string>,
  ): Promise<Record<string, unknown>[]> {
    const response = (await this.http.postJson(this.apiUrl, {
      apiKey: this.apiKey,
      modelName,
      calledMethod,
      methodProperties,
    })) as NpResponse;
    if (!response || response.success !== true) {
      const reason = response?.errors?.join('; ') || 'unknown error';
      throw new ExternalServiceError(`Nova Poshta ${modelName}.${calledMethod} failed: ${reason}`);
    }
    return response.data ?? [];
  }
}

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('380')) return digits;
  if (digits.startsWith('0')) return `38${digits}`;
  return digits;
}
