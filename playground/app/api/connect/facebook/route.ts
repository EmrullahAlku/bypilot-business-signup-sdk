import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/connect/facebook
 *
 * FB.login() redirect_uri hedefi. Facebook popup'ı OAuth sonrası buraya yönlendirir.
 * Code'u URL param'dan alır, server-side exchange yapar, callback sayfasına redirect eder.
 *
 * redirect_uri parametresi exchange'de de bu URL'in kendisi olmalı (birebir eşleşme).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  if (error || !code) {
    const message = errorReason || error || "Authorization failed";
    return NextResponse.redirect(
      `${origin}/connect/facebook?error=${encodeURIComponent(message)}`,
    );
  }

  const clientId = process.env.NEXT_PUBLIC_META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${origin}/connect/facebook?error=${encodeURIComponent("Missing server config")}`,
    );
  }

  // redirect_uri exchange'de de birebir aynı olmalı
  const redirectUri = `${origin}/api/connect/facebook`;

  try {
    const url = new URL("https://graph.facebook.com/v24.0/oauth/access_token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    //url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);

    const tokenRes = await fetch(url.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      const message = tokenData.error?.message || "Token exchange failed";
      return NextResponse.redirect(
        `${origin}/connect/facebook?error=${encodeURIComponent(message)}`,
      );
    }

    // Kullanıcı bilgilerini çek
    let userId = "",
      userName = "",
      userEmail = "";
    if (tokenData.access_token) {
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v24.0/me?fields=id,name,email&access_token=${tokenData.access_token}`,
        );
        const meData = await meRes.json();
        if (!meData.error) {
          userId = meData.id || "";
          userName = meData.name || "";
          userEmail = meData.email || "";
        }
      } catch {
        // ignore
      }
    }

    // Callback sayfasına token ile redirect
    const params = new URLSearchParams({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "bearer",
      expires_in: String(tokenData.expires_in || 0),
    });
    if (userId) params.set("user_id", userId);
    if (userName) params.set("user_name", encodeURIComponent(userName));
    if (userEmail) params.set("user_email", encodeURIComponent(userEmail));

    return NextResponse.redirect(
      `${origin}/connect/facebook?${params.toString()}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${origin}/connect/facebook?error=${encodeURIComponent(message)}`,
    );
  }
}

/**
 * POST /api/connect/facebook
 *
 * Direkt code → access_token exchange (redirect flow olmayan durumlar için).
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  const { code } = (await request.json()) as { code: string };

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 },
    );
  }

  const clientId = process.env.NEXT_PUBLIC_META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Server missing META_APP_SECRET or NEXT_PUBLIC_META_APP_ID" },
      { status: 500 },
    );
  }

  try {
    const url = new URL("https://graph.facebook.com/v24.0/oauth/access_token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("code", code);

    const tokenRes = await fetch(url.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      return NextResponse.json(
        {
          error: tokenData.error?.message || "Token exchange failed",
          details: tokenData.error,
        },
        { status: 400 },
      );
    }

    let user = null;
    if (tokenData.access_token) {
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v24.0/me?fields=id,name,email&access_token=${tokenData.access_token}`,
        );
        const meData = await meRes.json();
        if (!meData.error) {
          user = { id: meData.id, name: meData.name, email: meData.email };
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "bearer",
      expires_in: tokenData.expires_in,
      user,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Token exchange failed: ${message}` },
      { status: 500 },
    );
  }
}
