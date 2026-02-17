import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MediaStorageProvider, UploadMediaInput, UploadMediaResult } from "@/lib/media/storage";

export class SupabaseStorageProvider implements MediaStorageProvider {
  async upload(input: UploadMediaInput): Promise<UploadMediaResult> {
    const client = createSupabaseAdminClient();

    const upload = await client.storage.from(input.bucket).upload(input.path, input.file, {
      contentType: input.contentType ?? input.file.type,
      upsert: false,
    });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const publicUrl = client.storage.from(input.bucket).getPublicUrl(input.path).data.publicUrl;

    return {
      bucket: input.bucket,
      path: input.path,
      publicUrl,
      size: input.file.size ?? null,
    };
  }

  async remove(bucket: string, path: string): Promise<void> {
    const client = createSupabaseAdminClient();
    const result = await client.storage.from(bucket).remove([path]);
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}

