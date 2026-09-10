import { NextResponse } from "next/server";
import { authorizeAdmin, writeAdminAudit } from "@/lib/admin/authorization";
import { renderPropertyCreative } from "@/lib/creatives/render-static";
import { templatePreviewPayload } from "@/lib/creatives/template-preview";
import type { CreativeTemplateConfig } from "@/lib/creatives/static-template";
import { createMediaStorageProvider } from "@/lib/media";

const asArrayBuffer = (buffer: Buffer) =>
  buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAdmin(request, "templates.publish");
  if (!access.ok)
    return NextResponse.json(
      { ok: false, error: { message: access.message } },
      { status: access.status },
    );
  const { id } = await context.params;
  const current = await access.db
    .from("templates")
    .select("id,renderer_key,version,config,draft_config,formatos")
    .eq("id", id)
    .maybeSingle();
  if (!current.data)
    return NextResponse.json(
      { ok: false, error: { message: "Template não encontrado." } },
      { status: 404 },
    );
  const config = (current.data.draft_config ??
    current.data.config) as CreativeTemplateConfig;
  const version = current.data.version + 1;
  try {
    const portrait = await renderPropertyCreative(
      templatePreviewPayload("PORTRAIT", config, current.data.renderer_key),
      current.data.renderer_key,
    );
    const supportsVertical =
      Array.isArray(current.data.formatos) &&
      current.data.formatos.includes("VERTICAL");
    const vertical = supportsVertical
      ? await renderPropertyCreative(
          templatePreviewPayload("VERTICAL", config, current.data.renderer_key),
          current.data.renderer_key,
        )
      : null;
    const storage = createMediaStorageProvider();
    const bucket = process.env.MEDIA_BUCKET_NAME ?? "midia";
    const base = `system/template-previews/${id}/v${version}`;
    const portraitUpload = await storage.upload({
      bucket,
      path: `${base}/portrait.png`,
      file: new File([asArrayBuffer(portrait)], "portrait.png", {
        type: "image/png",
      }),
      contentType: "image/png",
      upsert: true,
    });
    const verticalUpload = vertical
      ? await storage.upload({
          bucket,
          path: `${base}/vertical.png`,
          file: new File([asArrayBuffer(vertical)], "vertical.png", {
            type: "image/png",
          }),
          contentType: "image/png",
          upsert: true,
        })
      : null;
    const previews = {
      preview_url: portraitUpload.publicUrl,
      preview_vertical_url: verticalUpload?.publicUrl ?? null,
    };
    const history = await access.db
      .from("template_versions")
      .insert({
        template_id: id,
        version,
        config: config as never,
        ...previews,
        published_by: access.admin.id,
      });
    if (history.error)
      return NextResponse.json(
        { ok: false, error: { message: history.error.message } },
        { status: 500 },
      );
    const updated = await access.db
      .from("templates")
      .update({
        config: config as never,
        draft_config: config as never,
        version,
        ...previews,
      })
      .eq("id", id)
      .select(
        "id,version,config,draft_config,preview_url,preview_vertical_url,updated_at",
      )
      .single();
    if (updated.error)
      return NextResponse.json(
        { ok: false, error: { message: updated.error.message } },
        { status: 500 },
      );
    await writeAdminAudit({
      db: access.db,
      request,
      adminUserId: access.admin.id,
      action: "TEMPLATE_VERSION_PUBLISHED",
      resourceType: "TEMPLATE",
      resourceId: id,
      before: { version: current.data.version, config: current.data.config },
      after: { version, config, ...previews },
    });
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Falha ao gerar previews do template.",
        },
      },
      { status: 500 },
    );
  }
}
