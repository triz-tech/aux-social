import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl =
    new URL(request.url);

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  const requestedNext =
    requestUrl.searchParams.get(
      "next"
    );

  /*
   * Nunca aceitamos redirect externo.
   * O destino precisa começar com "/".
   */
  const next =
    requestedNext?.startsWith("/")
      ? requestedNext
      : "/onboarding";

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=confirmation",
        requestUrl.origin
      )
    );
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "AUX auth callback:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=confirmation",
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(
      next,
      requestUrl.origin
    )
  );
}