"use client";

import { useState, useCallback } from "react";

/**
 * Facebook Login for Business — Instagram Platform
 *
 * Doc: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 *
 * Facebook Login for Business flow (IG_API_ONBOARDING):
 *   1. Open popup to facebook.com/dialog/oauth with:
 *      - display=page
 *      - extras={"setup":{"channel":"IG_API_ONBOARDING"}}
 *      - response_type=token   ← returns tokens directly, NO server exchange needed
 *   2. Facebook redirects to redirect_uri with hash fragment:
 *      #access_token=SHORT&long_lived_token=LONG&expires_in=...
 *   3. /connect/instagram-fb callback page reads hash, postMessages to opener
 *   4. Main page receives both tokens
 *
 * Env vars needed:
 *   NEXT_PUBLIC_META_APP_ID     — same Meta app used for WhatsApp/Facebook
 *   NEXT_PUBLIC_BASE_URL        — base URL for redirect_uri
 *   NEXT_PUBLIC_IG_FB_SCOPE     — optional custom scopes (defaults to DEFAULT_SCOPE below)
 */

const DEFAULT_SCOPE = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_manage_messages",
].join(",");

interface TokenResult {
  access_token?: string;
  long_lived_token?: string;
  expires_in?: number;
  data_access_expiration_time?: string;
  error?: string;
  error_description?: string;
}

export default function InstagramFBPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [result, setResult] = useState<TokenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const handleLogin = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) {
      setError("NEXT_PUBLIC_META_APP_ID is not set");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/connect/instagram-fb`;
    const scope = process.env.NEXT_PUBLIC_IG_FB_SCOPE || DEFAULT_SCOPE;

    const params = new URLSearchParams({
      client_id: appId,
      display: "page",
      extras: JSON.stringify({ setup: { channel: "IG_API_ONBOARDING" } }),
      redirect_uri: redirectUri,
      response_type: "token",
      scope,
    });

    const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?${params.toString()}`;

    setLoading(true);
    setError(null);
    addLog("[IG-FB] Opening login popup...");
    addLog(`[IG-FB] redirect_uri: ${redirectUri}`);

    const popup = window.open(
      authUrl,
      "ig_fb_login",
      "width=620,height=720,left=200,top=80,scrollbars=yes",
    );

    if (!popup) {
      setError("Popup was blocked. Please allow popups for this site.");
      setLoading(false);
      return;
    }

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", messageHandler);
      clearInterval(pollInterval);
      setLoading(false);
    };

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "ig_fb_oauth_callback") return;

      const payload = event.data.payload as TokenResult;

      if (payload.error) {
        setError(
          payload.error +
            (payload.error_description ? `: ${payload.error_description}` : ""),
        );
        addLog(`[IG-FB] Error: ${payload.error}`);
      } else {
        setResult(payload);
        setAuthenticated(true);
        const token = payload.long_lived_token || payload.access_token || "";
        addLog(`[IG-FB] Long-lived token: ${token.substring(0, 24)}...`);
        addLog(`[IG-FB] Short-lived expires in: ${payload.expires_in}s`);
        if (payload.data_access_expiration_time) {
          addLog(
            `[IG-FB] Data access expires: ${payload.data_access_expiration_time}`,
          );
        }
      }
      settle();
    };

    window.addEventListener("message", messageHandler);

    const pollInterval = setInterval(() => {
      if (popup.closed && !settled) {
        addLog("[IG-FB] Popup closed by user");
        settle();
      }
    }, 500);
  };

  const handleLogout = () => {
    setResult(null);
    setAuthenticated(false);
    addLog("[IG-FB] Disconnected");
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/connect/instagram-fb`;

  return (
    <div className="page">
      <h1>Instagram via Facebook Login</h1>
      <p className="subtitle">
        Facebook Login for Business · IG_API_ONBOARDING · response_type=token
      </p>

      {/* Status */}
      <div className="card">
        <h2>Status</h2>
        <div className="status">
          <span className={`badge ${authenticated ? "success" : "warning"}`}>
            {authenticated ? "Connected" : "Not Connected"}
          </span>
        </div>
        {!authenticated ? (
          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn instagram-fb"
          >
            {loading ? "Connecting..." : "Connect Instagram via Facebook"}
          </button>
        ) : (
          <button onClick={handleLogout} className="btn secondary">
            Disconnect
          </button>
        )}
        {error && <div className="error">{error}</div>}
      </div>

      {/* Tokens */}
      {result && (
        <div className="card">
          <h2>Tokens Received</h2>
          {result.long_lived_token && (
            <>
              <h3
                style={{ color: "#aaa", fontSize: "0.8rem", margin: "0 0 0.5rem" }}
              >
                Long-lived Token (~60 days)
              </h3>
              <code className="token access-token">{result.long_lived_token}</code>
            </>
          )}
          {result.access_token && (
            <>
              <h3
                style={{
                  color: "#aaa",
                  fontSize: "0.8rem",
                  margin: "1rem 0 0.5rem",
                }}
              >
                Short-lived Token
              </h3>
              <code className="token">{result.access_token}</code>
            </>
          )}
          <table style={{ marginTop: "1rem" }}>
            <tbody>
              <tr>
                <td>Short-lived expires:</td>
                <td>
                  <code>{result.expires_in}s</code>
                </td>
              </tr>
              {result.data_access_expiration_time && (
                <tr>
                  <td>Data access expires at:</td>
                  <td>
                    <code>{result.data_access_expiration_time}</code>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* How it works vs Instagram Business Login */}
      <div className="card">
        <h2>vs Instagram Business Login</h2>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingBottom: "0.5rem", color: "#888" }}>Aspect</th>
              <th style={{ textAlign: "left", paddingBottom: "0.5rem", color: "#E1306C" }}>Instagram OAuth</th>
              <th style={{ textAlign: "left", paddingBottom: "0.5rem", color: "#C13584" }}>FB Login for Business</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Auth URL</td>
              <td><code>instagram.com/oauth/authorize</code></td>
              <td><code>facebook.com/dialog/oauth</code></td>
            </tr>
            <tr>
              <td>extras param</td>
              <td>—</td>
              <td><code>IG_API_ONBOARDING</code></td>
            </tr>
            <tr>
              <td>response_type</td>
              <td><code>code</code></td>
              <td><code>token</code></td>
            </tr>
            <tr>
              <td>Token delivery</td>
              <td>Server-side code exchange (2 steps)</td>
              <td>Hash fragment — no server needed</td>
            </tr>
            <tr>
              <td>Long-lived token</td>
              <td>Separate graph.instagram.com call</td>
              <td>Returned directly in redirect</td>
            </tr>
            <tr>
              <td>IG onboarding</td>
              <td>User must pre-configure account</td>
              <td>Onboarding in-flow (convert + link Page)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Setup Guide */}
      <div className="card info">
        <h2>Setup Guide</h2>
        <ol>
          <li>
            Create a <strong>Meta Business type app</strong> in the App Dashboard
          </li>
          <li>
            Add products:{" "}
            <strong>Instagram → API setup with Facebook login</strong>,{" "}
            <strong>Facebook Login for Business</strong>,{" "}
            <strong>Webhooks</strong>
          </li>
          <li>
            Go to <strong>Facebook Login for Business → Settings</strong> →{" "}
            Client OAuth Settings → add redirect URI:
            <br />
            <code>{redirectUri}</code>
          </li>
          <li>
            Set <code>NEXT_PUBLIC_META_APP_ID</code> (same app ID as other
            providers)
          </li>
          <li>
            Optionally set <code>NEXT_PUBLIC_IG_FB_SCOPE</code> (defaults to
            messaging + content + insights scopes)
          </li>
        </ol>
      </div>

      {/* Event Logs */}
      <div className="card">
        <div className="logs-header">
          <h2>Event Logs</h2>
          <button onClick={() => setLogs([])} className="btn small">
            Clear
          </button>
        </div>
        <div className="logs">
          {logs.length === 0 ? (
            <p className="empty">No logs yet</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="log-line">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
