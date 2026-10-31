export const ALLOWED_PRINT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'] as const;
export const MAX_PRINT_FILE_BYTES = 20 * 1024 * 1024;
export const PRINT_FILE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml';

export type PrintFileCheck = { ok: true } | { ok: false; error: string };

export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

export function validatePrintFile(file: Pick<File, 'name' | 'size' | 'type'>): PrintFileCheck {
  const ext = getFileExtension(file.name);
  if (!(ALLOWED_PRINT_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      error: `Формат «${ext || 'без розширення'}» не підтримується. Дозволено: PNG, JPG, WEBP, SVG.`,
    };
  }
  if (file.type && !file.type.startsWith('image/')) {
    return { ok: false, error: 'Файл не схожий на зображення.' };
  }
  if (file.size <= 0) return { ok: false, error: 'Файл порожній.' };
  if (file.size > MAX_PRINT_FILE_BYTES) {
    return { ok: false, error: `Файл завеликий (${formatBytes(file.size)}). Максимум 20 МБ.` };
  }
  return { ok: true };
}

export function readImageAspect(file: Blob, timeoutMs = 3000): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;
    const done = (aspect: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(aspect) && aspect > 0 ? aspect : 1);
    };
    const timer = setTimeout(() => done(1), timeoutMs);
    img.onload = () => done(img.naturalWidth / img.naturalHeight);
    img.onerror = () => done(1);
    img.src = url;
  });
}
