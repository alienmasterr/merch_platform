export const ALLOWED_PRINT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'] as const;
export const MAX_PRINT_FILE_BYTES = 20 * 1024 * 1024;

export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Растрові (png/jpg/webp) та векторні (svg) принти, до 20 МБ. */
export function isAllowedPrintFile(extension: string, sizeBytes: number): boolean {
  const ext = extension.replace(/^\./, '').toLowerCase();
  const formatOk = (ALLOWED_PRINT_EXTENSIONS as readonly string[]).includes(ext);
  return formatOk && sizeBytes > 0 && sizeBytes <= MAX_PRINT_FILE_BYTES;
}
