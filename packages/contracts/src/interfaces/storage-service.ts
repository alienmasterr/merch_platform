export interface IStorageService {
  uploadPrintOriginal(fileName: string, fileData: Uint8Array): Promise<string>;
  uploadPreview(fileName: string, previewData: Uint8Array): Promise<string>;
}
