export interface QueryResult {
  rows: Record<string, unknown>[];
}

export interface Queryable {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
}
