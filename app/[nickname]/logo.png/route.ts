import { NextResponse } from "next/server";

import { getOrEnsureProfileNicknameLogosByNickname } from "@/lib/branding/profile-logo";

type Params = {
  params: Promise<{ nickname: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { nickname } = await params;
  const result = await getOrEnsureProfileNicknameLogosByNickname(nickname);

  if (!result.ok) {
    const status =
      result.error.code === "NOT_FOUND"
        ? 404
        : result.error.code === "VALIDATION_ERROR"
          ? 400
          : 500;
    return NextResponse.json(result, { status });
  }

  const response = NextResponse.redirect(result.data.logo_nickname_url, 307);
  response.headers.set("Cache-Control", "public, max-age=300, s-maxage=3600");
  return response;
}

