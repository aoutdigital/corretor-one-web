export type UploadMediaInput = {
  bucket: string;
  path: string;
  file: File;
  contentType?: string;
};

export type UploadMediaResult = {
  bucket: string;
  path: string;
  publicUrl: string;
  size: number | null;
};

export interface MediaStorageProvider {
  upload(input: UploadMediaInput): Promise<UploadMediaResult>;
  remove(bucket: string, path: string): Promise<void>;
}

