"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  WhatsAppProvider,
  type AuthResult,
  type WhatsAppSessionInfo,
  isEmbeddedSignupSuccess,
  isEmbeddedSignupError,
} from "bypilot-business-signup-sdk";

interface ExchangeResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export default function WhatsAppPage() {
  const whatsapp = useMemo(
    () =>
      new WhatsAppProvider({
        clientId: process.env.NEXT_PUBLIC_META_APP_ID || "",
        configId: process.env.NEXT_PUBLIC_WA_CONFIG_ID || "",
        redirectUri: process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : ""),
        storage: "localStorage",
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
  const [sessionInfo, setSessionInfo] = useState<WhatsAppSessionInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${message}`]);
  }, []);

  useEffect(() => {
    const token = whatsapp.getAccessToken();
    if (token) {
      setCode(token);
      setAuthenticated(true);
      addLog("[WA] Existing token found");
    }

    const unsubSuccess = whatsapp.on("auth:success", (result: unknown) => {
      const r = result as AuthResult;
      addLog(`[WA] Auth successful: ${r.token?.code?.substring(0, 20)}...`);
    });
    const unsubError = whatsapp.on("auth:error", (err: unknown) => {
      const e = err as { error?: string };
      addLog(`[WA] Auth error: ${e?.error || "Unknown error"}`);
    });
    const unsubCancel = whatsapp.on("auth:cancel", () => addLog("[WA] User cancelled"));
    const unsubStart = whatsapp.on("auth:start", () => addLog("[WA] Auth started"));

    const unsubSession = whatsapp.getSessionInfoListener((info) => {
      if (info.rawEvent) {
        if (isEmbeddedSignupSuccess(info.rawEvent)) {
          addLog(`[WA] Session: WABA=${info.wabaId}, Phone=${info.phoneNumberId}, Event=${info.rawEvent.event}`);
        } else if (isEmbeddedSignupError(info.rawEvent)) {
          addLog(`[WA] Signup error: ${info.error?.message} (ID: ${info.error?.errorId})`);
        } else {
          addLog("[WA] Unknown event format");
        }
      } else {
        addLog(`[WA] Session: WABA=${info.wabaId}, Phone=${info.phoneNumberId}`);
      }
      setSessionInfo(info);
    });

    return () => {
      unsubSuccess();
      unsubError();
      unsubCancel();
      unsubStart();
      unsubSession();
    };
  }, [whatsapp, addLog]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      addLog("[WA] Opening login popup...");
      const result = await whatsapp.loginWithPopup();

      if (result.success && result.token) {
        const authCode = result.token.code;
        setCode(authCode);
        setAuthenticated(true);
        addLog(`[WA] Code received: ${authCode.substring(0, 20)}...`);

        addLog("[WA] Exchanging code for access token...");
        const res = await fetch("/api/connect/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: authCode }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || "Token exchange failed");
          addLog(`[WA] Exchange failed: ${data.error}`);
        } else {
          setExchangeResult(data);
          addLog(`[WA] Access token: ${data.access_token.substring(0, 20)}...`);
          addLog(`[WA] Expires in: ${data.expires_in}s`);
        }
      } else {
        setError(result.error || "Login failed");
        addLog(`[WA] Login failed: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      addLog(`[WA] Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    whatsapp.logout();
    setCode(null);
    setExchangeResult(null);
    setAuthenticated(false);
    setSessionInfo(null);
    addLog("[WA] Logged out");
  };

  return (
    <div className="page">
      <h1>WhatsApp Business</h1>
      <p className="subtitle">Embedded Signup via Facebook SDK</p>

      {/* Status */}
      <div className="card">
        <h2>Status</h2>
        <div className="status">
          <span className={`badge ${authenticated ? "success" : "warning"}`}>
            {authenticated ? "Connected" : "Not Connected"}
          </span>
        </div>
        {!authenticated ? (
          <button onClick={handleLogin} disabled={loading} className="btn primary">
            {loading ? "Loading..." : "Login with WhatsApp"}
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
            </tbody>
          </table>
        </div>
      )}

      {/* Session Info */}
      {sessionInfo && (
        <div className="card">
          <h2>Session Info</h2>
          {sessionInfo.error ? (
            <div className="error-section">
              <table>
                <tbody>
                  <tr><td>Error:</td><td><code>{sessionInfo.error.message}</code></td></tr>
                  <tr><td>Error ID:</td><td><code>{sessionInfo.error.errorId}</code></td></tr>
                  <tr><td>Session ID:</td><td><code>{sessionInfo.error.sessionId}</code></td></tr>
                  <tr><td>Timestamp:</td><td><code>{sessionInfo.error.timestamp}</code></td></tr>
                </tbody>
              </table>
            </div>
          ) : (
            <table>
              <tbody>
                <tr><td>WABA ID:</td><td><code>{sessionInfo.wabaId || "-"}</code></td></tr>
                <tr><td>Phone Number ID:</td><td><code>{sessionInfo.phoneNumberId || "-"}</code></td></tr>
                <tr><td>Phone Number:</td><td><code>{sessionInfo.phoneNumber || "-"}</code></td></tr>
                <tr><td>Business ID:</td><td><code>{sessionInfo.businessId || "-"}</code></td></tr>
                {sessionInfo.adAccountIds?.length ? (
                  <tr><td>Ad Account IDs:</td><td><code>{sessionInfo.adAccountIds.join(", ")}</code></td></tr>
                ) : null}
                {sessionInfo.pageIds?.length ? (
                  <tr><td>Page IDs:</td><td><code>{sessionInfo.pageIds.join(", ")}</code></td></tr>
                ) : null}
                {sessionInfo.datasetIds?.length ? (
                  <tr><td>Dataset IDs:</td><td><code>{sessionInfo.datasetIds.join(", ")}</code></td></tr>
                ) : null}
              </tbody>
            </table>
          )}
          {sessionInfo.rawEvent && (
            <details className="raw-data" style={{ marginTop: "1rem" }}>
              <summary style={{ cursor: "pointer", color: "#888" }}>Raw Event Data</summary>
              <pre style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "0.5rem" }}>
                {JSON.stringify(sessionInfo.rawEvent, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Setup Guide */}
      <div className="card info">
        <h2>Setup Guide</h2>
        <ol>
          <li>Create a Meta app and add WhatsApp Business Platform</li>
          <li>Configure Embedded Signup and get <code>config_id</code></li>
          <li>Set <code>NEXT_PUBLIC_META_APP_ID</code>, <code>META_APP_SECRET</code>, <code>NEXT_PUBLIC_WA_CONFIG_ID</code></li>
          <li>
            Add <code>{process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}</code> as Redirect URI
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
