import type {
  ICatalogRepository,
  ICustomMerchRepository,
  IStorageService,
} from '@merch/contracts';
import { CustomizerService } from './application/customizer-service';
import { CustomMerchBuilder } from './domain/custom-merch-builder';
import type { IPreviewRenderer } from './domain/preview-renderer';
import { createCustomizerRouter } from './infrastructure/customizer-router';
import { SvgPreviewRenderer } from './infrastructure/svg-preview-renderer';

export interface CustomizerModuleDeps {
  catalogRepo: ICatalogRepository;
  productRepo: ICustomMerchRepository;
  storage: IStorageService;
  renderer?: IPreviewRenderer;
  idGenerator?: () => string;
}

export function createCustomizerModule(deps: CustomizerModuleDeps) {
  const renderer = deps.renderer ?? new SvgPreviewRenderer();
  const service = new CustomizerService({
    catalogRepo: deps.catalogRepo,
    productRepo: deps.productRepo,
    storage: deps.storage,
    builderFactory: () =>
      new CustomMerchBuilder({
        storage: deps.storage,
        renderer,
        ...(deps.idGenerator && { idGenerator: deps.idGenerator }),
      }),
  });
  const router = createCustomizerRouter(service);
  return { service, router };
}
