export interface IStorageService {
  /** Зберігає оригінал принта користувача, повертає публічний URL. */
  uploadPrintOriginal(fileName: string, fileData: Uint8Array): Promise<string>;
  /** Зберігає згенероване прев'ю макета, повертає публічний URL. */
  uploadPreview(fileName: string, previewData: Uint8Array): Promise<string>;
}
