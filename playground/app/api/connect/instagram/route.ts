import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/connect/instagram
 *
 * Instagram Business Login OAuth redirect_uri hedefi.
 *
 * Step 2: Short-lived token exchange
 *   POST https://api.instagram.com/oauth/access_token
 *   (redirect_uri token exchange'de de birebir aynı olmalı)
 *
 * Step 3: Long-lived token exchange (60 days)
 *   GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  if (error || !code) {
    const message = errorReason || error || "Authorization failed";
    return NextResponse.redirect(
      `${origin}/connect/instagram?error=${encodeURIComponent(message)}`,
    );
  }

  const clientId = process.env.NEXT_PUBLIC_IG_APP_ID;
  const clientSecret = process.env.IG_APP_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${origin}/connect/instagram?error=${encodeURIComponent(
        "Missing server config: NEXT_PUBLIC_IG_APP_ID or IG_APP_SECRET",
      )}`,
    );
  }

  // redirect_uri her iki adımda da birebir aynı olmalı
  const redirectUri = `${origin}/api/connect/instagram`;

  try {
    // Step 2: authorization code → short-lived Instagram User access token
    // Instagram requires application/x-www-form-urlencoded (not JSON or query params)
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error_type) {
      const message = tokenData.error_message || "Token exchange failed";
      return NextResponse.redirect(
        `${origin}/connect/instagram?error=${encodeURIComponent(message)}`,
      );
    }

    // Response: { data: [{ access_token, user_id, permissions }] }
    const tokenInfo = Array.isArray(tokenData.data) ? tokenData.data[0] : tokenData;
    const shortLivedToken: string = tokenInfo.access_token || tokenData.access_token;
    const userId: string = String(tokenInfo.user_id || tokenData.user_id || "");
    const permissions: string = tokenInfo.permissions || tokenData.permissions || "";

    if (!shortLivedToken) {
      return NextResponse.redirect(
        `${origin}/connect/instagram?error=${encodeURIComponent("No access token in response")}`,
      );
    }

    // Step 3: short-lived → long-lived token (valid 60 days)
    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.set("client_secret", clientSecret);
    longLivedUrl.searchParams.set("access_token", shortLivedToken);

    const longRes = await fetch(longLivedUrl.toString());
    const longData = await longRes.json();

    const isLongLived = longRes.ok && !!longData.access_token && !longData.error;
    const finalToken = isLongLived ? longData.access_token : shortLivedToken;
    const expiresIn = isLongLived ? (longData.expires_in ?? 5183944) : 3600;
    const tokenType = longData.token_type || "bearer";

    const params = new URLSearchParams({
      access_token: finalToken,
      token_type: tokenType,
      expires_in: String(expiresIn),
      user_id: userId,
      permissions,
      long_lived: String(isLongLived),
    });

    return NextResponse.redirect(`${origin}/connect/instagram?${params.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${origin}/connect/instagram?error=${encodeURIComponent(message)}`,
    );
  }
}
