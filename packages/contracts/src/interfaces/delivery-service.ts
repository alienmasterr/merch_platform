export interface DeliveryRecipient {
  fullName: string;
  phone: string;
  email?: string;
  city: string;
  warehouse: string;
}

export interface IDeliveryService {
  calculateShippingCost(city: string, weightKg: number): Promise<number>;
  generateTTN(orderId: string, recipient: DeliveryRecipient): Promise<string>;
}
