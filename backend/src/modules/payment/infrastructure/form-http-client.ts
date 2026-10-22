import { ExternalServiceError } from '@merch/contracts';

export interface FormHttpClient {
  postForm(url: string, fields: Record<string, string>): Promise<unknown>;
}

export class FetchFormHttpClient implements FormHttpClient {
  private readonly timeoutMs: number;

  constructor(timeoutMs = 15_000) {
    this.timeoutMs = timeoutMs;
  }

  async postForm(url: string, fields: Record<string, string>): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields).toString(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new ExternalServiceError(`HTTP request to ${url} failed: ${String(cause)}`);
    }
    if (!res.ok) throw new ExternalServiceError(`HTTP ${res.status} from ${url}`);
    return res.json();
  }
}
