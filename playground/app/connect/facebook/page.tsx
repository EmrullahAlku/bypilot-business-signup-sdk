"use client";

import { useEffect } from "react";

/**
 * /connect/facebook
 *
 * FB.login() redirect akışında popup'ın son durağı.
 * GET /api/connect/facebook token exchange yaptıktan sonra buraya yönlendirir.
 *
 * Eğer popup içindeyse (window.opener var):
 *   → postMessage ile token'ı ana pencereye gönderir → kendini kapatır
 * Değilse (doğrudan ziyaret):
 *   → token bilgisini ekranda gösterir
 */
export default function FacebookCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const tokenType = params.get("token_type") || "bearer";
    const expiresIn = Number(params.get("expires_in")) || 0;
    const error = params.get("error");

    const userId = params.get("user_id") || "";
    const userName = decodeURIComponent(params.get("user_name") || "");
    const userEmail = decodeURIComponent(params.get("user_email") || "");

    const payload = error
      ? { error }
      : {
          access_token: accessToken,
          token_type: tokenType,
          expires_in: expiresIn,
          user:
            userId || userName || userEmail
              ? { id: userId, name: userName, email: userEmail }
              : null,
        };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "fb_oauth_callback", payload },
        window.location.origin,
      );
      window.close();
    }
    // Opener yoksa sayfada kalır, aşağıdaki JSX gösterilir
  }, []);

  return (
    <div className="container">
      <h1>Facebook Connect</h1>
      <div className="card">
        <p className="status-text">Authentication complete. You can close this window.</p>
      </div>
    </div>
  );
}
