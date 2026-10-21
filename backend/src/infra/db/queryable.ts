/** Мінімальний інтерфейс БД: його задовольняє pg.Pool, а в тестах підставляється fake. */
export interface QueryResult {
  rows: Record<string, unknown>[];
}

export interface Queryable {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
}
