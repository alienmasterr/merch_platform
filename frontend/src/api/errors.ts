/** Помилка API у єдиному форматі. Бекенд повертає `{ error: CODE, message, details? }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

function isErrorBody(body: unknown): body is ErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ErrorBody).error === 'string' &&
    typeof (body as ErrorBody).message === 'string'
  );
}

export function toApiError(status: number, body: unknown): ApiError {
  if (isErrorBody(body)) return new ApiError(status, body.error, body.message, body.details);
  // тіло не JSON: зазвичай це проксі Vite, коли бекенд не запущений
  if (status >= 500)
    return new ApiError(status, 'SERVER_UNAVAILABLE', 'Сервер недоступний, спробуйте пізніше');
  return new ApiError(status, 'HTTP_ERROR', `Запит завершився з кодом ${status}`);
}

interface ZodIssue {
  path?: (string | number)[];
  message?: string;
}

/** Текст помилки для користувача (з деталями валідації, якщо вони є). */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError))
    return error instanceof Error ? error.message : 'Невідома помилка';
  if (error.code === 'FORBIDDEN') return 'Недостатньо прав для цієї дії (оберіть роль у шапці).';
  if (Array.isArray(error.details) && error.details.length > 0) {
    const issues = (error.details as ZodIssue[])
      .map((i) => [i.path?.join('.'), i.message].filter(Boolean).join(': '))
      .filter(Boolean);
    if (issues.length) return `${error.message}: ${issues.join('; ')}`;
  }
  return error.message;
}
