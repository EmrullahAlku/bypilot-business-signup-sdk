"use client";

import { useEffect } from "react";

/**
 * /connect/google
 *
 * Google OAuth popup callback page.
 * /api/connect/google exchanges the code server-side and redirects here with:
 *   ?access_token=...&refresh_token=...&expires_in=...&scope=...&state=...
 *
 * Sends { type: 'bypilot_oauth_callback', payload } to opener so that
 * GoogleProvider.loginWithPopup() (via PopupManager.waitForCallback) can resolve.
 * Then closes the popup.
 */
export default function GoogleCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = Number(params.get("expires_in")) || 3600;
    const scope = params.get("scope") ?? "";
    const idToken = params.get("id_token");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    const payload = error
      ? { error, error_description: errorDescription, state }
      : {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          scope,
          id_token: idToken,
          state,
        };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "bypilot_oauth_callback", payload },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div className="container">
      <h1>Google Connect</h1>
      <div className="card">
        <p className="status-text">
          Authentication complete. You can close this window.
        </p>
      </div>
    </div>
  );
}
