import { Router } from 'express';
import { z } from 'zod';
import type { IDeliveryService } from '@merch/contracts';
import { asyncHandler } from '../../../infra/http/async-handler';

const query = z.object({
  city: z.string().min(1),
  weightKg: z.coerce.number().positive(),
});

export function createDeliveryRouter(deliveryService: IDeliveryService): Router {
  const router = Router();
  router.get(
    '/delivery/shipping-cost',
    asyncHandler(async (req, res) => {
      const { city, weightKg } = query.parse(req.query);
      res.json({ city, weightKg, cost: await deliveryService.calculateShippingCost(city, weightKg), currency: 'UAH' });
    }),
  );
  return router;
}
