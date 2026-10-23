import express from 'express';
import { describe, expect, it } from 'vitest';
import { ExternalServiceError } from '@merch/contracts';
import { withServer } from '../../../test-utils/with-server';
import { FetchFormHttpClient } from '../infrastructure/form-http-client';

describe('FetchFormHttpClient', () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.post('/echo', (req, res) => { res.json({ received: req.body }); });
  app.post('/fail', (_req, res) => { res.status(500).send('boom'); });

  it('надсилає form-urlencoded і повертає розпарсену відповідь', async () => {
    await withServer(app, async (url) => {
      expect(await new FetchFormHttpClient().postForm(`${url}/echo`, { data: 'a+b=', signature: 's' })).toEqual({
        received: { data: 'a+b=', signature: 's' },
      });
    });
  });

  it('негатив: HTTP 500 і недоступний хост стають ExternalServiceError', async () => {
    await withServer(app, async (url) => {
      await expect(new FetchFormHttpClient().postForm(`${url}/fail`, {})).rejects.toBeInstanceOf(ExternalServiceError);
    });
    await expect(new FetchFormHttpClient(500).postForm('http://127.0.0.1:1/x', {})).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
