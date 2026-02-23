"use client";

import { useState, useCallback } from "react";

interface TokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  permissions: string;
  long_lived: boolean;
}

export default function InstagramPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [tokenResult, setTokenResult] = useState<TokenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${message}`]);
  }, []);

  const handleLogin = () => {
    setLoading(true);
    setError(null);

    const clientId = process.env.NEXT_PUBLIC_IG_APP_ID;
    if (!clientId) {
      setError("Missing NEXT_PUBLIC_IG_APP_ID environment variable");
      setLoading(false);
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const redirectUri = `${baseUrl}/api/connect/instagram`;
    const scope =
      process.env.NEXT_PUBLIC_IG_SCOPE ||
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish";

    const authUrl = new URL("https://www.instagram.com/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    // enable_fb_login=0: Instagram login sayfasında Facebook Login seçeneğini gizle
    authUrl.searchParams.set("enable_fb_login", "0");

    const width = 600;
    const height = 700;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

    const popup = window.open(
      authUrl.toString(),
      "ig_oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      setError("Popup blocked. Please allow popups for this site.");
      setLoading(false);
      return;
    }

    addLog("[IG] Opening login popup...");
    addLog(`[IG] Scope: ${scope}`);

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
      if (event.data?.type !== "ig_oauth_callback") return;

      const {
        access_token,
        token_type,
        expires_in,
        user_id,
        permissions,
        long_lived,
        error: cbError,
      } = event.data.payload as {
        access_token?: string;
        token_type?: string;
        expires_in?: number;
        user_id?: string;
        permissions?: string;
        long_lived?: boolean;
        error?: string;
      };

      if (cbError) {
        setError(cbError);
        addLog(`[IG] Login failed: ${cbError}`);
      } else if (access_token) {
        setTokenResult({
          access_token,
          token_type: token_type || "bearer",
          expires_in: expires_in || 0,
          user_id: user_id || "",
          permissions: permissions || "",
          long_lived: long_lived || false,
        });
        setAuthenticated(true);
        addLog(`[IG] Access token: ${access_token.substring(0, 20)}...`);
        addLog(`[IG] User ID: ${user_id}`);
        addLog(
          `[IG] Long-lived token: ${long_lived ? "Yes (60 days)" : "No (1 hour)"}`,
        );
        if (permissions) addLog(`[IG] Permissions: ${permissions}`);
      }
      settle();
    };

    window.addEventListener("message", messageHandler);

    // Popup kapandı mı diye polling
    const pollInterval = setInterval(() => {
      if (popup.closed && !settled) {
        addLog("[IG] Popup closed by user");
        settle();
      }
    }, 500);
  };

  const handleLogout = () => {
    setTokenResult(null);
    setAuthenticated(false);
    addLog("[IG] Logged out");
  };

  const days = tokenResult ? Math.round(tokenResult.expires_in / 86400) : 0;

  return (
    <div className="page">
      <h1>Instagram Business</h1>
      <p className="subtitle">Business Login via Instagram OAuth 2.0</p>

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
            className="btn instagram"
          >
            {loading ? "Loading..." : "Login with Instagram"}
          </button>
        ) : (
          <button onClick={handleLogout} className="btn secondary">
            Logout
          </button>
        )}
        {error && <div className="error">{error}</div>}
      </div>

      {/* Access Token */}
      {tokenResult && (
        <div className="card">
          <h2>Access Token</h2>
          <code className="token access-token">{tokenResult.access_token}</code>
          <table>
            <tbody>
              <tr>
                <td>Token Type:</td>
                <td>
                  <code>{tokenResult.token_type}</code>
                </td>
              </tr>
              <tr>
                <td>Expires In:</td>
                <td>
                  <code>
                    {tokenResult.expires_in}s
                    {days > 0 ? ` (~${days} days)` : ""}
                  </code>
                </td>
              </tr>
              <tr>
                <td>Long-lived:</td>
                <td>
                  <code
                    style={{
                      color: tokenResult.long_lived ? "#4ade80" : "#facc15",
                    }}
                  >
                    {tokenResult.long_lived
                      ? "Yes (60 days)"
                      : "No (short-lived, 1h)"}
                  </code>
                </td>
              </tr>
              <tr>
                <td>User ID:</td>
                <td>
                  <code>{tokenResult.user_id || "-"}</code>
                </td>
              </tr>
              {tokenResult.permissions && (
                <tr>
                  <td>Permissions:</td>
                  <td>
                    <code
                      style={{ fontSize: "0.75rem", wordBreak: "break-all" }}
                    >
                      {tokenResult.permissions.split(",").join(", ")}
                    </code>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Setup Guide */}
      <div className="card info">
        <h2>Setup Guide</h2>
        <ol>
          <li>
            Meta App Dashboard → Add Instagram product → API setup with
            Instagram login
          </li>
          <li>
            Set up Instagram business login → get <code>Instagram App ID</code>{" "}
            and <code>Instagram App Secret</code>
          </li>
          <li>
            Set <code>NEXT_PUBLIC_IG_APP_ID</code>, <code>IG_APP_SECRET</code>
          </li>
          <li>
            Optionally set <code>NEXT_PUBLIC_IG_SCOPE</code>
          </li>
          <li>
            Add{" "}
            <code>
              {`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/connect/instagram`}
            </code>{" "}
            as OAuth Redirect URI
          </li>
        </ol>
        <p style={{ color: "#888", fontSize: "0.8rem", margin: "0.75rem 0 0" }}>
          App Dashboard → Instagram → API setup with Instagram login → Set up
          Instagram business login → Business login settings → OAuth redirect
          URIs
        </p>
      </div>

      {/* Logs */}
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
