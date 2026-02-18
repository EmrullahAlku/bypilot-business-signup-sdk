import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/connect/facebook
 *
 * Exchanges an authorization code for an access token via Facebook Graph API,
 * then fetches user info (/me).
 *
 * Body: { code: string }
 * Returns: { access_token, token_type, expires_in, user }
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
    // Exchange code for access token
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

    // Fetch user info
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
        // User info fetch failed, continue without it
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
