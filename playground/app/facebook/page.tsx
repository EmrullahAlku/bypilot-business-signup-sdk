"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FacebookProvider,
  type AuthResult,
  type FacebookSessionInfo,
} from "bypilot-business-signup-sdk";

interface ExchangeResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  user?: { id: string; name: string; email: string } | null;
}

export default function FacebookPage() {
  const facebook = useMemo(
    () =>
      new FacebookProvider({
        clientId: process.env.NEXT_PUBLIC_META_APP_ID || "",
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}/api/connect/facebook`,
        storage: "localStorage",
        configId: process.env.NEXT_PUBLIC_META_CONFIG_ID || "",
        scope:
          process.env.NEXT_PUBLIC_FB_SCOPE ||
          "public_profile,email,pages_show_list",
        graphApiVersion: "v24.0",
        sdkVersion: "v24.0",
      }),
    [],
  );

  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [exchangeResult, setExchangeResult] = useState<ExchangeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<FacebookSessionInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${message}`]);
  }, []);

  useEffect(() => {
    const token = facebook.getAccessToken();
    if (token) {
      setCode(token);
      setAuthenticated(true);
      addLog("[FB] Existing token found");
    }

    const unsubSuccess = facebook.on("auth:success", (result: unknown) => {
      const r = result as AuthResult;
      addLog(`[FB] Auth successful: ${r.token?.code?.substring(0, 20)}...`);
    });
    const unsubError = facebook.on("auth:error", (err: unknown) => {
      const e = err as { error?: string };
      addLog(`[FB] Auth error: ${e?.error || "Unknown error"}`);
    });
    const unsubCancel = facebook.on("auth:cancel", () => addLog("[FB] User cancelled"));
    const unsubStart = facebook.on("auth:start", () => addLog("[FB] Auth started"));

    return () => {
      unsubSuccess();
      unsubError();
      unsubCancel();
      unsubStart();
    };
  }, [facebook, addLog]);

  const handleLogin = () => {
    setLoading(true);
    setError(null);

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", messageHandler);
      clearInterval(pollInterval);
      setLoading(false);
    };

    // postMessage dinleyicisi — /connect/facebook callback sayfasından
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "fb_oauth_callback") return;

      const { access_token, token_type, expires_in, user, error: cbError } =
        event.data.payload as {
          access_token?: string;
          token_type?: string;
          expires_in?: number;
          user?: { id: string; name: string; email: string } | null;
          error?: string;
        };

      if (cbError) {
        setError(cbError);
        addLog(`[FB] Login failed: ${cbError}`);
      } else if (access_token) {
        setExchangeResult({ access_token, token_type: token_type || "bearer", expires_in: expires_in || 0, user: user ?? null });
        setAuthenticated(true);
        addLog(`[FB] Access token received: ${access_token.substring(0, 20)}...`);
        if (user?.name) addLog(`[FB] User: ${user.name} (${user.email})`);
      }
      settle();
    };

    window.addEventListener("message", messageHandler);

    addLog("[FB] Opening login popup...");

    // FB.login() ile popup aç (config_id + response_type:code → redirect flow)
    facebook.loginWithPopup().then((result) => {
      // Redirect flow: loginWithPopup "closed by user" ile dönebilir, postMessage zaten gelecek
      if (result.success && result.token?.code && !settled) {
        // Doğrudan kod dönüş durumu (fallback)
        const authCode = result.token.code;
        setCode(authCode);
        addLog(`[FB] Code received directly: ${authCode.substring(0, 20)}...`);
        addLog("[FB] Exchanging code for access token...");

        fetch("/api/connect/facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: authCode }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              setError(data.error);
              addLog(`[FB] Exchange failed: ${data.error}`);
            } else {
              setExchangeResult(data);
              setAuthenticated(true);
              addLog(`[FB] Access token: ${data.access_token.substring(0, 20)}...`);
              if (data.user?.name) addLog(`[FB] User: ${data.user.name}`);
            }
            settle();
          })
          .catch((err) => {
            setError(err.message);
            settle();
          });
      } else if (!result.success && !settled) {
        if (!result.error?.includes("closed") && !result.error?.includes("cancel")) {
          setError(result.error || "Login failed");
          addLog(`[FB] Login failed: ${result.error}`);
          settle();
        }
      }
    });

    const pollInterval = setInterval(() => {
      if (settled) clearInterval(pollInterval);
    }, 500);
  };

  const handleLogout = () => {
    facebook.logout();
    setCode(null);
    setExchangeResult(null);
    setAuthenticated(false);
    setSessionInfo(null);
    addLog("[FB] Logged out");
  };

  return (
    <div className="page">
      <h1>Facebook Login</h1>
      <p className="subtitle">OAuth 2.0 code flow via FB.login()</p>

      {/* Status */}
      <div className="card">
        <h2>Status</h2>
        <div className="status">
          <span className={`badge ${authenticated ? "success" : "warning"}`}>
            {authenticated ? "Connected" : "Not Connected"}
          </span>
        </div>
        {!authenticated ? (
          <button onClick={handleLogin} disabled={loading} className="btn facebook">
            {loading ? "Loading..." : "Login with Facebook"}
          </button>
        ) : (
          <button onClick={handleLogout} className="btn secondary">Logout</button>
        )}
        {error && <div className="error">{error}</div>}
      </div>

      {/* Authorization Code */}
      {code && (
        <div className="card">
          <h2>Authorization Code</h2>
          <code className="token">{code}</code>
        </div>
      )}

      {/* Access Token */}
      {exchangeResult && (
        <div className="card">
          <h2>Access Token</h2>
          <code className="token access-token">{exchangeResult.access_token}</code>
          <table>
            <tbody>
              <tr>
                <td>Token Type:</td>
                <td><code>{exchangeResult.token_type}</code></td>
              </tr>
              <tr>
                <td>Expires In:</td>
                <td><code>{exchangeResult.expires_in}s</code></td>
              </tr>
              {exchangeResult.user && (
                <>
                  <tr><td>User ID:</td><td><code>{exchangeResult.user.id}</code></td></tr>
                  <tr><td>Name:</td><td><code>{exchangeResult.user.name}</code></td></tr>
                  <tr><td>Email:</td><td><code>{exchangeResult.user.email}</code></td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Session Info (if available) */}
      {sessionInfo && (
        <div className="card">
          <h2>Session Info</h2>
          <table>
            <tbody>
              <tr><td>User ID:</td><td><code>{sessionInfo.userId || "-"}</code></td></tr>
              <tr><td>Name:</td><td><code>{sessionInfo.name || "-"}</code></td></tr>
              <tr><td>Email:</td><td><code>{sessionInfo.email || "-"}</code></td></tr>
              {sessionInfo.grantedPermissions?.length ? (
                <tr><td>Granted:</td><td><code>{sessionInfo.grantedPermissions.join(", ")}</code></td></tr>
              ) : null}
              {sessionInfo.deniedPermissions?.length ? (
                <tr><td>Denied:</td><td><code>{sessionInfo.deniedPermissions.join(", ")}</code></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {/* Setup Guide */}
      <div className="card info">
        <h2>Setup Guide</h2>
        <ol>
          <li>Create a Meta app and add Facebook Login product</li>
          <li>Set <code>NEXT_PUBLIC_META_APP_ID</code>, <code>META_APP_SECRET</code></li>
          <li>Optionally set <code>NEXT_PUBLIC_META_CONFIG_ID</code> and <code>NEXT_PUBLIC_FB_SCOPE</code></li>
          <li>
            Add <code>
              {`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/connect/facebook`}
            </code> as Valid OAuth Redirect URI
          </li>
        </ol>
      </div>

      {/* Logs */}
      <div className="card">
        <div className="logs-header">
          <h2>Event Logs</h2>
          <button onClick={() => setLogs([])} className="btn small">Clear</button>
        </div>
        <div className="logs">
          {logs.length === 0 ? (
            <p className="empty">No logs yet</p>
          ) : (
            logs.map((log, i) => <div key={i} className="log-line">{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
