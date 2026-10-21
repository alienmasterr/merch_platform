const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/** Безпечний ключ: тільки [a-zA-Z0-9._-], без шляхів (захист від path traversal). */
export function buildStorageKey(prefix: string, fileName: string, id: string): string {
  const safe = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .slice(-80);
  return `${prefix}/${id}-${safe || 'file'}`;
}

export function contentTypeFor(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const ext = dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}
