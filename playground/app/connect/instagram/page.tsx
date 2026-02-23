"use client";

import { useEffect } from "react";

/**
 * /connect/instagram
 *
 * Instagram OAuth popup'ının son durağı.
 * GET /api/connect/instagram token exchange'i tamamladıktan sonra buraya yönlendirir.
 *
 * Popup içindeyse → postMessage ile token'ı ana pencereye gönderir → kapanır.
 * Doğrudan ziyarette → bilgi mesajı gösterir.
 */
export default function InstagramCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const tokenType = params.get("token_type") || "bearer";
    const expiresIn = Number(params.get("expires_in")) || 0;
    const userId = params.get("user_id") || "";
    const permissions = params.get("permissions") || "";
    const longLived = params.get("long_lived") === "true";
    const error = params.get("error");

    const payload = error
      ? { error }
      : {
          access_token: accessToken,
          token_type: tokenType,
          expires_in: expiresIn,
          user_id: userId,
          permissions,
          long_lived: longLived,
        };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "ig_oauth_callback", payload },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div className="page">
      <h1>Instagram Connect</h1>
      <div className="card">
        <p className="status-text">Authentication complete. You can close this window.</p>
      </div>
    </div>
  );
}
