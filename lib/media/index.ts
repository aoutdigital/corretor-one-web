import type { MediaStorageProvider } from "@/lib/media/storage";
import { SupabaseStorageProvider } from "@/lib/media/providers/supabase-storage";

export function createMediaStorageProvider(): MediaStorageProvider {
  // V1 provider strategy.
  return new SupabaseStorageProvider();
}

