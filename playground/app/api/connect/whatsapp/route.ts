import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/connect/whatsapp
 *
 * Exchanges an authorization code for an access token via Facebook Graph API.
 * Same logic as api.bypilot's MetaTokenProvider.exchangeToken().
 *
 * Body: { code: string }
 * Returns: { access_token, token_type, expires_in }
 */
export async function POST(request: NextRequest) {
  const { code } = (await request.json()) as { code: string };

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  const clientId = process.env.NEXT_PUBLIC_META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Server missing META_APP_SECRET or NEXT_PUBLIC_META_APP_ID" },
      { status: 500 }
    );
  }

  try {
    // Exchange code for access token — same as MetaTokenProvider.exchangeToken()
    const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
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
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "bearer",
      expires_in: tokenData.expires_in,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Token exchange failed: ${message}` },
      { status: 500 }
    );
  }
}
