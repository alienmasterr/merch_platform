import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { ApparelFilter, ApparelKind } from '@merch/contracts';
import { asyncHandler } from '../../../infra/http/async-handler';
import { requireRole } from '../../../infra/http/auth';
import type { CatalogService } from '../application/catalog-service';
import { createApparelItem } from '../domain/apparel-item-factory';
import { categoryToDto, itemToDto } from '../../../infra/http/catalog-dto';

const filterQuery = z.object({
  categoryId: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStockOnly: z.enum(['true', 'false']).optional(),
});

const commonFields = {
  title: z.string().min(1),
  basePrice: z.number().nonnegative(),
  size: z.string().min(1),
  color: z.string().min(1),
  fabricComposition: z.string().default(''),
  inStock: z.boolean().default(true),
  categoryId: z.string().min(1),
};

const createBody = z.discriminatedUnion('kind', [
  z.object({ ...commonFields, kind: z.literal(ApparelKind.TOP), hasHood: z.boolean(), hasPockets: z.boolean() }),
  z.object({ ...commonFields, kind: z.literal(ApparelKind.BOTTOM), waistCm: z.number().positive(), lengthCm: z.number().positive() }),
  z.object({ ...commonFields, kind: z.literal(ApparelKind.ACCESSORY), accessoryType: z.string().min(1) }),
]);

const patchBody = z
  .object({ basePrice: z.number().nonnegative().optional(), inStock: z.boolean().optional() })
  .refine((v) => v.basePrice !== undefined || v.inStock !== undefined, {
    message: 'Provide basePrice and/or inStock',
  });

export function createCatalogRouter(
  service: CatalogService,
  idGenerator: () => string = randomUUID,
): Router {
  const router = Router();

  router.get(
    '/catalog/categories',
    asyncHandler(async (_req, res) => {
      const categories = await service.getCategories();
      res.json(categories.map(categoryToDto));
    }),
  );

  router.get(
    '/catalog',
    asyncHandler(async (req, res) => {
      const q = filterQuery.parse(req.query);
      const filter = new ApparelFilter({
        ...(q.categoryId !== undefined && { categoryId: q.categoryId }),
        ...(q.size !== undefined && { size: q.size }),
        ...(q.color !== undefined && { color: q.color }),
        ...(q.minPrice !== undefined && { minPrice: q.minPrice }),
        ...(q.maxPrice !== undefined && { maxPrice: q.maxPrice }),
        inStockOnly: q.inStockOnly === 'true',
      });
      const items = await service.searchProducts(filter);
      res.json(items.map(itemToDto));
    }),
  );

  router.get(
    '/catalog/:id',
    asyncHandler(async (req, res) => {
      const item = await service.getProductById(String(req.params.id));
      res.json(itemToDto(item));
    }),
  );

  const admin = Router();
  admin.use(requireRole('admin'));

  admin.post(
    '/',
    asyncHandler(async (req, res) => {
      const { categoryId, ...rest } = createBody.parse(req.body);
      const category = await service.getCategoryById(categoryId);
      const item = createApparelItem({ ...rest, id: idGenerator(), category });
      await service.createProduct(item);
      res.status(201).json(itemToDto(item));
    }),
  );

  admin.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = String(req.params.id);
      const body = patchBody.parse(req.body);
      if (body.basePrice !== undefined) await service.updatePrice(id, body.basePrice);
      if (body.inStock !== undefined) await service.updateStock(id, body.inStock);
      res.json(itemToDto(await service.getProductById(id)));
    }),
  );

  router.use('/admin/catalog', admin);
  return router;
}
