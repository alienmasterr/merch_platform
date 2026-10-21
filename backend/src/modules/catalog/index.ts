import type { ICatalogRepository } from '@merch/contracts';
import { CatalogService } from './application/catalog-service';
import { createCatalogRouter } from './infrastructure/catalog-router';

export interface CatalogModuleDeps {
  catalogRepo: ICatalogRepository;
  idGenerator?: () => string;
}

export function createCatalogModule(deps: CatalogModuleDeps) {
  const service = new CatalogService(deps.catalogRepo);
  const router = createCatalogRouter(service, deps.idGenerator);
  return { service, router };
}
