import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/connect/google
 *
 * Receives Google OAuth redirect with ?code=...&state=...
 * Exchanges code for access_token + refresh_token via oauth2.googleapis.com/token
 * Redirects to /connect/google with tokens + state as query params
 *
 * Env vars required (server-side):
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_BASE_URL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const callbackUrl = new URL('/connect/google', origin);
  if (state) callbackUrl.searchParams.set('state', state);

  if (error) {
    callbackUrl.searchParams.set('error', error);
    if (errorDescription) callbackUrl.searchParams.set('error_description', errorDescription);
    return NextResponse.redirect(callbackUrl.toString());
  }

  if (!code) {
    callbackUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(callbackUrl.toString());
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    callbackUrl.searchParams.set('error', 'server_misconfigured');
    callbackUrl.searchParams.set('error_description', 'GOOGLE_CLIENT_SECRET is not set');
    return NextResponse.redirect(callbackUrl.toString());
  }

  const redirectUri = `${origin}/api/connect/google`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      callbackUrl.searchParams.set('error', tokenData.error);
      if (tokenData.error_description)
        callbackUrl.searchParams.set('error_description', tokenData.error_description);
      return NextResponse.redirect(callbackUrl.toString());
    }

    callbackUrl.searchParams.set('access_token', tokenData.access_token);
    callbackUrl.searchParams.set('expires_in', String(tokenData.expires_in ?? 3600));
    callbackUrl.searchParams.set('scope', tokenData.scope ?? '');
    if (tokenData.refresh_token)
      callbackUrl.searchParams.set('refresh_token', tokenData.refresh_token);
    if (tokenData.id_token)
      callbackUrl.searchParams.set('id_token', tokenData.id_token);

    return NextResponse.redirect(callbackUrl.toString());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'token_exchange_failed';
    callbackUrl.searchParams.set('error', msg);
    return NextResponse.redirect(callbackUrl.toString());
  }
}
