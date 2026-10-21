import express from 'express';
import { describe, expect, it } from 'vitest';
import { ExternalServiceError } from '@merch/contracts';
import { withServer } from '../../../test-utils/with-server';
import { FetchHttpClient } from '../infrastructure/http-client';

describe('FetchHttpClient', () => {
  const app = express();
  app.use(express.json());
  app.post('/echo', (req, res) => { res.json({ received: req.body }); });
  app.post('/fail', (_req, res) => { res.status(500).send('boom'); });

  it('надсилає JSON і повертає розпарсену відповідь', async () => {
    await withServer(app, async (url) => {
      expect(await new FetchHttpClient().postJson(`${url}/echo`, { a: 1 })).toEqual({ received: { a: 1 } });
    });
  });

  it('негатив: HTTP 500 перетворюється на ExternalServiceError', async () => {
    await withServer(app, async (url) => {
      await expect(new FetchHttpClient().postJson(`${url}/fail`, {})).rejects.toBeInstanceOf(ExternalServiceError);
    });
  });

  it('негатив: недоступний хост перетворюється на ExternalServiceError', async () => {
    await expect(new FetchHttpClient(500).postJson('http://127.0.0.1:1/x', {})).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
