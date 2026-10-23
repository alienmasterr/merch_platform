import express, { Router } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@merch/contracts';
import { asyncHandler } from '../../../infra/http/async-handler';
import { requireRole } from '../../../infra/http/auth';
import type { OrderActionResult, OrderService } from '../application/order-service';
import { orderToDto } from './order-dto';

const statuses = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];

const createBody = z.object({
  items: z
    .array(z.object({ customProductId: z.string().min(1), quantity: z.number().int().positive().max(100).default(1) }))
    .min(1)
    .max(20),
  recipient: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().min(1),
    city: z.string().min(1),
    warehouse: z.string().min(1),
  }),
});

const webhookBody = z.object({ data: z.string().min(1), signature: z.string().min(1) });
const verifyBody = z.object({ approved: z.boolean() });
const statusBody = z.object({ status: z.enum(statuses) });
const listQuery = z.object({ status: z.enum(statuses).default(OrderStatus.PENDING_REVIEW) });

const actionToDto = (r: OrderActionResult) => ({ ...orderToDto(r.order), warnings: r.warnings });

export function createOrderRouter(service: OrderService): Router {
  const router = Router();

  // ---- клієнт ----
  router.post(
    '/orders',
    asyncHandler(async (req, res) => {
      const order = await service.createOrder(createBody.parse(req.body));
      res.status(201).json(orderToDto(order));
    }),
  );

  router.get(
    '/orders/:id',
    asyncHandler(async (req, res) => {
      res.json(orderToDto(await service.getOrder(String(req.params.id))));
    }),
  );

  router.post(
    '/orders/:id/checkout',
    asyncHandler(async (req, res) => {
      res.json(await service.checkout(String(req.params.id)));
    }),
  );

  // ---- платіжний провайдер (LiqPay шле application/x-www-form-urlencoded: data, signature) ----
  router.post(
    '/payments/webhook',
    express.urlencoded({ extended: false, limit: '100kb' }),
    asyncHandler(async (req, res) => {
      await service.handlePaymentWebhook(webhookBody.parse(req.body));
      res.json({ ok: true });
    }),
  );

  // ---- менеджер ----
  const manager = Router();
  manager.use(requireRole('manager'));

  manager.get(
    '/',
    asyncHandler(async (req, res) => {
      const { status } = listQuery.parse(req.query);
      res.json((await service.listByStatus(status)).map(orderToDto));
    }),
  );

  manager.post(
    '/:id/verify-mockup',
    asyncHandler(async (req, res) => {
      const { approved } = verifyBody.parse(req.body);
      res.json(actionToDto(await service.verifyMockup(String(req.params.id), approved)));
    }),
  );

  manager.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
      const { status } = statusBody.parse(req.body);
      res.json(actionToDto(await service.changeStatus(String(req.params.id), status)));
    }),
  );

  manager.post(
    '/:id/notify',
    asyncHandler(async (req, res) => {
      res.json(actionToDto(await service.retryNotifications(String(req.params.id))));
    }),
  );

  router.use('/manager/orders', manager);
  return router;
}
