import express from 'express';
import { describe, expect, it } from 'vitest';
import { withServer } from '../../../test-utils/with-server';
import { cors } from '../cors';

describe('cors', () => {
  const app = express();
  app.use(cors('http://localhost:5173'));
  app.get('/ping', (_req, res) => { res.json({ ok: true }); });

  it('дозволений origin отримує заголовки, preflight повертає 204', async () => {
    await withServer(app, async (url) => {
      const res = await fetch(`${url}/ping`, { method: 'OPTIONS', headers: { origin: 'http://localhost:5173' } });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
      expect(res.headers.get('access-control-allow-headers')).toContain('x-user-role');
    });
  });

  it('негатив: чужий origin не отримує дозволу', async () => {
    await withServer(app, async (url) => {
      const res = await fetch(`${url}/ping`, { headers: { origin: 'http://evil.example' } });
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });
  });
});
