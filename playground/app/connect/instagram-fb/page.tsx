"use client";

import { useEffect } from "react";

/**
 * /connect/instagram-fb
 *
 * Facebook Login for Business (IG_API_ONBOARDING) callback page.
 *
 * Facebook redirects here with a URL hash fragment (NOT query params):
 *   #access_token=SHORT&long_lived_token=LONG&expires_in=4815&data_access_expiration_time=...
 *
 * If login was cancelled or errored:
 *   #error=access_denied&error_description=...
 *
 * If inside popup (window.opener exists):
 *   → postMessage to opener → window.close()
 * Otherwise:
 *   → Display a "you can close this window" message
 */
export default function InstagramFBCallback() {
  useEffect(() => {
    // Parse hash fragment (remove leading #)
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const longLivedToken = params.get("long_lived_token");
    const expiresIn = Number(params.get("expires_in")) || 0;
    const dataAccessExpirationTime = params.get("data_access_expiration_time");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    const payload = error
      ? { error, error_description: errorDescription }
      : {
          access_token: accessToken,
          long_lived_token: longLivedToken,
          expires_in: expiresIn,
          data_access_expiration_time: dataAccessExpirationTime,
        };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "ig_fb_oauth_callback", payload },
        window.location.origin,
      );
      window.close();
    }
    // If no opener, fall through to render below
  }, []);

  return (
    <div className="container">
      <h1>Instagram Connect</h1>
      <div className="card">
        <p className="status-text">
          Authentication complete. You can close this window.
        </p>
      </div>
    </div>
  );
}
