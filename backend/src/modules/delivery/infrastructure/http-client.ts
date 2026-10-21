import { ExternalServiceError } from '@merch/contracts';

export interface HttpClient {
  postJson(url: string, body: unknown): Promise<unknown>;
}

export class FetchHttpClient implements HttpClient {
  private readonly timeoutMs: number;

  constructor(timeoutMs = 10_000) {
    this.timeoutMs = timeoutMs;
  }

  async postJson(url: string, body: unknown): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new ExternalServiceError(`HTTP request to ${url} failed: ${String(cause)}`);
    }
    if (!res.ok) throw new ExternalServiceError(`HTTP ${res.status} from ${url}`);
    return res.json();
  }
}
