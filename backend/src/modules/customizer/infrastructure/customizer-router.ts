import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  PrintPlacement,
  PrintTechnology,
  ValidationError,
  type ICustomMerchProduct,
} from '@merch/contracts';
import { asyncHandler } from '../../../infra/http/async-handler';
import type { CustomizerService } from '../application/customizer-service';
import { MAX_PRINT_FILE_BYTES } from '../domain/print-file-rules';
import { itemToDto } from '../../../infra/http/catalog-dto';

const placements = Object.values(PrintPlacement) as [PrintPlacement, ...PrintPlacement[]];
const technologies = Object.values(PrintTechnology) as [PrintTechnology, ...PrintTechnology[]];

const printSchema = z.object({
  printFileUrl: z.url({ protocol: /^https?$/ }),
  placement: z.enum(placements),
  technology: z.enum(technologies),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  scale: z.number().positive().default(1),
});

const createBody = z.object({
  baseItemId: z.string().min(1),
  prints: z.array(printSchema).min(1).max(6),
});

export function productToDto(product: ICustomMerchProduct) {
  return {
    id: product.getId(),
    baseItem: itemToDto(product.getBaseItem()),
    prints: product.getPrintConfigs().map((c) => ({
      printFileUrl: c.printFileUrl,
      placement: c.placement,
      technology: c.technology,
      widthMm: c.widthMm,
      heightMm: c.heightMm,
      offsetX: c.offsetX,
      offsetY: c.offsetY,
      scale: c.scale,
      printCost: c.calculatePrintCost(),
    })),
    previewImageUrl: product.getPreviewImageUrl(),
    mockupApproved: product.isMockupApproved(),
    totalCost: product.getTotalCost(),
  };
}

export function createCustomizerRouter(service: CustomizerService): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PRINT_FILE_BYTES, files: 1 },
  });

  router.post(
    '/customizer/uploads',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      if (!req.file) throw new ValidationError('Multipart field "file" is required');
      const { url } = await service.uploadPrint(req.file.originalname, req.file.buffer);
      res.status(201).json({ printFileUrl: url });
    }),
  );

  router.post(
    '/customizer/products',
    asyncHandler(async (req, res) => {
      const body = createBody.parse(req.body);
      const product = await service.createCustomProduct(body);
      res.status(201).json(productToDto(product));
    }),
  );

  router.get(
    '/customizer/products/:id',
    asyncHandler(async (req, res) => {
      res.json(productToDto(await service.getProduct(String(req.params.id))));
    }),
  );

  return router;
}
