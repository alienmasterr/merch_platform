import type { OrderStatus } from '../enums/order-status';

// Спільний інтерфейс з діаграми. Власник: C (якщо C вже створила файл, лишається її версія,
// головне, щоб метод міг повертати і void, і Promise<void>).
export interface IOrderObserver {
  onOrderStatusChanged(orderId: string, newStatus: OrderStatus): void | Promise<void>;
}
