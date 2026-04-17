import { fail, ok, type ApiResult } from "@/lib/api/result";
import { renderProfileLogoVariantsFromHtml } from "@/lib/branding/logo-html-renderer";
import { createMediaStorageProvider } from "@/lib/media";
import { renderCorretorOneLogoPng } from "@/lib/media/watermark";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PROFILE_LOGO_VERSION = "v2";
const NICKNAME_REGEX = /^[a-z0-9]{1,35}$/;

function isCurrentLogoVersion(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/branding/logo/${PROFILE_LOGO_VERSION}/`);
}

function getMediaBucketName(): string {
  return process.env.MEDIA_BUCKET_NAME ?? "midia";
}

function normalizeNicknameSlug(nickname: string): string {
  return nickname
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeNicknameValue(nickname: string): string {
  return nickname.trim().toLowerCase();
}

export async function ensureProfileNicknameLogos(
  ownerId: string,
  options?: { force?: boolean },
): Promise<ApiResult<{ logo_nickname_url: string; logo_nickname_white_url: string }>> {
  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: "profiles") => {
      select: (
        columns: "id,nickname,logo_nickname_url,logo_nickname_white_url",
      ) => {
        eq: (column: "id", value: string) => {
          maybeSingle: () => Promise<{
            data: {
              id: string;
              nickname: string | null;
              logo_nickname_url: string | null;
              logo_nickname_white_url: string | null;
            } | null;
            error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
          }>;
        };
      };
      update: (values: {
        logo_nickname_url: string;
        logo_nickname_white_url: string;
      }) => {
        eq: (column: "id", value: string) => Promise<{
          error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
        }>;
      };
    };
  };

  const profileResult = await admin
    .from("profiles")
    .select("id,nickname,logo_nickname_url,logo_nickname_white_url")
    .eq("id", ownerId)
    .maybeSingle();

  if (profileResult.error) {
    return fail("DATABASE_ERROR", profileResult.error.message, {
      details: profileResult.error.details,
      hint: profileResult.error.hint,
      code: profileResult.error.code,
    });
  }

  if (!profileResult.data) {
    return fail("NOT_FOUND", "Perfil não encontrado.");
  }

  const nickname = normalizeNicknameValue(profileResult.data.nickname ?? "");
  if (!nickname || !NICKNAME_REGEX.test(nickname)) {
    return fail("VALIDATION_ERROR", "Nickname inválido para gerar logo.");
  }

  const hasExisting =
    Boolean(profileResult.data.logo_nickname_url?.trim()) &&
    Boolean(profileResult.data.logo_nickname_white_url?.trim()) &&
    isCurrentLogoVersion(profileResult.data.logo_nickname_url) &&
    isCurrentLogoVersion(profileResult.data.logo_nickname_white_url);
  if (hasExisting && !options?.force) {
    return ok({
      logo_nickname_url: profileResult.data.logo_nickname_url!.trim(),
      logo_nickname_white_url: profileResult.data.logo_nickname_white_url!.trim(),
    });
  }

  const htmlRender = await renderProfileLogoVariantsFromHtml(nickname);
  const logoDefaultBuffer =
    htmlRender?.default ?? (await renderCorretorOneLogoPng({ nickname, theme: "default" }));
  const logoWhiteBuffer =
    htmlRender?.white ?? (await renderCorretorOneLogoPng({ nickname, theme: "white" }));

  if (!logoDefaultBuffer || !logoWhiteBuffer) {
    return fail("DATABASE_ERROR", "Não foi possível gerar os logos do corretor.");
  }

  const bucket = getMediaBucketName();
  const nicknameSlug = normalizeNicknameSlug(nickname);
  const basePath = `${ownerId}/branding/logo/${PROFILE_LOGO_VERSION}`;
  const logoDefaultPath = `${basePath}/${nicknameSlug}.png`;
  const logoWhitePath = `${basePath}/${nicknameSlug}-white.png`;

  const storage = createMediaStorageProvider();

  try {
    const [defaultUpload, whiteUpload] = await Promise.all([
      storage.upload({
        bucket,
        path: logoDefaultPath,
        file: new File([logoDefaultBuffer], `${nicknameSlug}.png`, { type: "image/png" }),
        contentType: "image/png",
        upsert: true,
      }),
      storage.upload({
        bucket,
        path: logoWhitePath,
        file: new File([logoWhiteBuffer], `${nicknameSlug}-white.png`, { type: "image/png" }),
        contentType: "image/png",
        upsert: true,
      }),
    ]);

    const updateResult = await admin
      .from("profiles")
      .update({
        logo_nickname_url: defaultUpload.publicUrl,
        logo_nickname_white_url: whiteUpload.publicUrl,
      })
      .eq("id", ownerId);

    if (updateResult.error) {
      return fail("DATABASE_ERROR", updateResult.error.message, {
        details: updateResult.error.details,
        hint: updateResult.error.hint,
        code: updateResult.error.code,
      });
    }

    return ok({
      logo_nickname_url: defaultUpload.publicUrl,
      logo_nickname_white_url: whiteUpload.publicUrl,
    });
  } catch (error) {
    return fail("DATABASE_ERROR", "Falha ao publicar logos do corretor.", {
      message: (error as Error).message,
    });
  }
}

export async function getOrEnsureProfileNicknameLogosByNickname(
  nicknameRaw: string,
): Promise<
  ApiResult<{ owner_id: string; logo_nickname_url: string; logo_nickname_white_url: string }>
> {
  const nickname = normalizeNicknameValue(nicknameRaw);
  if (!NICKNAME_REGEX.test(nickname)) {
    return fail("VALIDATION_ERROR", "Nickname inválido.");
  }

  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: "profiles") => {
      select: (
        columns: "id,nickname,logo_nickname_url,logo_nickname_white_url",
      ) => {
        eq: (column: "nickname", value: string) => {
          maybeSingle: () => Promise<{
            data: {
              id: string;
              nickname: string | null;
              logo_nickname_url: string | null;
              logo_nickname_white_url: string | null;
            } | null;
            error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
          }>;
        };
      };
    };
  };

  const profileResult = await admin
    .from("profiles")
    .select("id,nickname,logo_nickname_url,logo_nickname_white_url")
    .eq("nickname", nickname)
    .maybeSingle();

  if (profileResult.error) {
    return fail("DATABASE_ERROR", profileResult.error.message, {
      details: profileResult.error.details,
      hint: profileResult.error.hint,
      code: profileResult.error.code,
    });
  }

  if (!profileResult.data) {
    return fail("NOT_FOUND", "Perfil não encontrado.");
  }

  const hasExisting =
    Boolean(profileResult.data.logo_nickname_url?.trim()) &&
    Boolean(profileResult.data.logo_nickname_white_url?.trim()) &&
    isCurrentLogoVersion(profileResult.data.logo_nickname_url) &&
    isCurrentLogoVersion(profileResult.data.logo_nickname_white_url);

  if (hasExisting) {
    return ok({
      owner_id: profileResult.data.id,
      logo_nickname_url: profileResult.data.logo_nickname_url!.trim(),
      logo_nickname_white_url: profileResult.data.logo_nickname_white_url!.trim(),
    });
  }

  const ensureResult = await ensureProfileNicknameLogos(profileResult.data.id);
  if (!ensureResult.ok) {
    return ensureResult;
  }

  return ok({
    owner_id: profileResult.data.id,
    logo_nickname_url: ensureResult.data.logo_nickname_url,
    logo_nickname_white_url: ensureResult.data.logo_nickname_white_url,
  });
}
