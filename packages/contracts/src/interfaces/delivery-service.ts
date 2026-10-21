export interface DeliveryRecipient {
  fullName: string;
  phone: string;
  email?: string;
  city: string;
  /** Номер відділення Нової Пошти, наприклад "12". */
  warehouse: string;
}

export interface IDeliveryService {
  calculateShippingCost(city: string, weightKg: number): Promise<number>;
  generateTTN(orderId: string, recipient: DeliveryRecipient): Promise<string>;
}
