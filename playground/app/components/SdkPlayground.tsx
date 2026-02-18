"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  WhatsAppProvider,
  FacebookProvider,
  type AuthResult,
  type WhatsAppSessionInfo,
  type FacebookSessionInfo,
  isEmbeddedSignupSuccess,
  isEmbeddedSignupError,
} from "bypilot-business-signup-sdk";

type TabType = "whatsapp" | "facebook";

export default function SdkPlayground() {
  const whatsapp = useMemo(
    () =>
      new WhatsAppProvider({
        clientId: process.env.NEXT_PUBLIC_META_APP_ID || "",
        configId: process.env.NEXT_PUBLIC_WA_CONFIG_ID || "",
        redirectUri: typeof window !== "undefined" ? window.location.origin : "",
        storage: "localStorage",
        graphApiVersion: "v24.0",
        sdkVersion: "v24.0",
      }),
    []
  );

  const facebook = useMemo(
    () =>
      new FacebookProvider({
        clientId: process.env.NEXT_PUBLIC_META_APP_ID || "",
        redirectUri: typeof window !== "undefined" ? window.location.origin : "",
        storage: "localStorage",
        scope:
          process.env.NEXT_PUBLIC_FB_SCOPE ||
          "public_profile,email,pages_show_list",
        graphApiVersion: "v24.0",
        sdkVersion: "v24.0",
      }),
    []
  );

  const [activeTab, setActiveTab] = useState<TabType>("whatsapp");

  // WhatsApp state
  const [waAuthenticated, setWaAuthenticated] = useState(false);
  const [waAccessToken, setWaAccessToken] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waSessionInfo, setWaSessionInfo] =
    useState<WhatsAppSessionInfo | null>(null);

  // Facebook state
  const [fbAuthenticated, setFbAuthenticated] = useState(false);
  const [fbAccessToken, setFbAccessToken] = useState<string | null>(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbSessionInfo, setFbSessionInfo] =
    useState<FacebookSessionInfo | null>(null);

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // WhatsApp event listeners
  useEffect(() => {
    // Check existing token
    const token = whatsapp.getAccessToken();
    if (token) {
      setWaAccessToken(token);
      setWaAuthenticated(true);
      addLog("[WA] Existing token found");
    }

    const unsubSuccess = whatsapp.on("auth:success", (result: unknown) => {
      const authResult = result as AuthResult;
      addLog(
        `[WA] Auth successful: ${authResult.token?.code?.substring(0, 20)}...`
      );
    });

    const unsubError = whatsapp.on("auth:error", (err: unknown) => {
      const errorData = err as { error?: string };
      addLog(`[WA] Auth error: ${errorData?.error || "Unknown error"}`);
    });

    const unsubCancel = whatsapp.on("auth:cancel", () => {
      addLog("[WA] User cancelled");
    });

    const unsubStart = whatsapp.on("auth:start", () => {
      addLog("[WA] Auth started");
    });

    const unsubSession = whatsapp.getSessionInfoListener((info) => {
      if (info.rawEvent) {
        if (isEmbeddedSignupSuccess(info.rawEvent)) {
          addLog(
            `[WA] Session info: WABA=${info.wabaId}, Phone=${info.phoneNumberId}, Event=${info.rawEvent.event}`
          );
        } else if (isEmbeddedSignupError(info.rawEvent)) {
          addLog(
            `[WA] Embedded Signup error: ${info.error?.message} (ID: ${info.error?.errorId})`
          );
        } else {
          addLog("[WA] Unknown event format - raw data available");
        }
      } else {
        addLog(
          `[WA] Session info: WABA=${info.wabaId}, Phone=${info.phoneNumberId}`
        );
      }
      setWaSessionInfo(info);
    });

    return () => {
      unsubSuccess();
      unsubError();
      unsubCancel();
      unsubStart();
      unsubSession();
    };
  }, [whatsapp, addLog]);

  // Facebook event listeners
  useEffect(() => {
    const token = facebook.getAccessToken();
    if (token) {
      setFbAccessToken(token);
      setFbAuthenticated(true);
      addLog("[FB] Existing token found");
    }

    const unsubSuccess = facebook.on("auth:success", (result: unknown) => {
      const authResult = result as AuthResult;
      addLog(
        `[FB] Auth successful: ${authResult.token?.code?.substring(0, 20)}...`
      );
    });

    const unsubError = facebook.on("auth:error", (err: unknown) => {
      const errorData = err as { error?: string };
      addLog(`[FB] Auth error: ${errorData?.error || "Unknown error"}`);
    });

    const unsubCancel = facebook.on("auth:cancel", () => {
      addLog("[FB] User cancelled");
    });

    const unsubStart = facebook.on("auth:start", () => {
      addLog("[FB] Auth started");
    });

    return () => {
      unsubSuccess();
      unsubError();
      unsubCancel();
      unsubStart();
    };
  }, [facebook, addLog]);

  // WhatsApp login — FB.login() handles popup natively, no redirect needed
  const handleWaLogin = async () => {
    setWaLoading(true);
    setWaError(null);

    try {
      addLog("[WA] Opening login popup...");
      const result = await whatsapp.loginWithPopup();

      if (result.success && result.token) {
        setWaAccessToken(result.token.code);
        setWaAuthenticated(true);
        addLog("[WA] Login successful!");
      } else {
        setWaError(result.error || "Login failed");
        addLog(`[WA] Login failed: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setWaError(message);
      addLog(`[WA] Error: ${message}`);
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaLogout = () => {
    whatsapp.logout();
    setWaAccessToken(null);
    setWaAuthenticated(false);
    setWaSessionInfo(null);
    addLog("[WA] Logged out");
  };

  // Facebook login
  const handleFbLogin = async () => {
    setFbLoading(true);
    setFbError(null);

    try {
      addLog("[FB] Opening login popup...");
      const result = await facebook.loginWithPopup();

      if (result.success && result.token) {
        setFbAccessToken(result.token.code);
        setFbAuthenticated(true);
        addLog("[FB] Login successful!");
      } else {
        setFbError(result.error || "Login failed");
        addLog(`[FB] Login failed: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFbError(message);
      addLog(`[FB] Error: ${message}`);
    } finally {
      setFbLoading(false);
    }
  };

  const handleFbLogout = () => {
    facebook.logout();
    setFbAccessToken(null);
    setFbAuthenticated(false);
    setFbSessionInfo(null);
    addLog("[FB] Logged out");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="container">
      <h1>ByPilot SDK Test</h1>
      <p className="subtitle">Business Signup SDK Test Environment</p>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "whatsapp" ? "active whatsapp" : ""}`}
          onClick={() => setActiveTab("whatsapp")}
        >
          WhatsApp
        </button>
        <button
          className={`tab ${activeTab === "facebook" ? "active facebook" : ""}`}
          onClick={() => setActiveTab("facebook")}
        >
          Facebook
        </button>
      </div>

      {/* WhatsApp Tab */}
      {activeTab === "whatsapp" && (
        <>
          <div className="card">
            <h2>Status</h2>
            <div className="status">
              <span
                className={`badge ${waAuthenticated ? "success" : "warning"}`}
              >
                {waAuthenticated ? "Connected" : "Not Connected"}
              </span>
            </div>

            {!waAuthenticated ? (
              <button
                onClick={handleWaLogin}
                disabled={waLoading}
                className="btn primary"
              >
                {waLoading ? "Loading..." : "Login with WhatsApp"}
              </button>
            ) : (
              <button onClick={handleWaLogout} className="btn secondary">
                Logout
              </button>
            )}

            {waError && <div className="error">{waError}</div>}
          </div>

          {waAccessToken && (
            <div className="card">
              <h2>Access Token</h2>
              <code className="token access-token">{waAccessToken}</code>
            </div>
          )}

          {waSessionInfo && (
            <div className="card">
              <h2>Session Info</h2>
              {waSessionInfo.error ? (
                <div className="error-section">
                  <h3>Error Details</h3>
                  <table>
                    <tbody>
                      <tr>
                        <td>Error Message:</td>
                        <td>
                          <code>{waSessionInfo.error.message}</code>
                        </td>
                      </tr>
                      <tr>
                        <td>Error ID:</td>
                        <td>
                          <code>{waSessionInfo.error.errorId}</code>
                        </td>
                      </tr>
                      <tr>
                        <td>Session ID:</td>
                        <td>
                          <code>{waSessionInfo.error.sessionId}</code>
                        </td>
                      </tr>
                      <tr>
                        <td>Timestamp:</td>
                        <td>
                          <code>{waSessionInfo.error.timestamp}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <table>
                  <tbody>
                    <tr>
                      <td>WABA ID:</td>
                      <td>
                        <code>{waSessionInfo.wabaId || "-"}</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Phone Number ID:</td>
                      <td>
                        <code>{waSessionInfo.phoneNumberId || "-"}</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Phone Number:</td>
                      <td>
                        <code>{waSessionInfo.phoneNumber || "-"}</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Business ID:</td>
                      <td>
                        <code>{waSessionInfo.businessId || "-"}</code>
                      </td>
                    </tr>
                    {waSessionInfo.adAccountIds &&
                      waSessionInfo.adAccountIds.length > 0 && (
                        <tr>
                          <td>Ad Account IDs:</td>
                          <td>
                            <code>
                              {waSessionInfo.adAccountIds.join(", ")}
                            </code>
                          </td>
                        </tr>
                      )}
                    {waSessionInfo.pageIds &&
                      waSessionInfo.pageIds.length > 0 && (
                        <tr>
                          <td>Page IDs:</td>
                          <td>
                            <code>{waSessionInfo.pageIds.join(", ")}</code>
                          </td>
                        </tr>
                      )}
                    {waSessionInfo.datasetIds &&
                      waSessionInfo.datasetIds.length > 0 && (
                        <tr>
                          <td>Dataset IDs:</td>
                          <td>
                            <code>{waSessionInfo.datasetIds.join(", ")}</code>
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              )}

              {waSessionInfo.rawEvent && (
                <details className="raw-data">
                  <summary>Raw Event Data</summary>
                  <pre>{JSON.stringify(waSessionInfo.rawEvent, null, 2)}</pre>
                </details>
              )}
            </div>
          )}

          <div className="card info">
            <h2>Setup Guide</h2>
            <ol>
              <li>Create an app on Meta Developer</li>
              <li>Add WhatsApp Business Platform</li>
              <li>
                Configure Embedded Signup and get <code>config_id</code>
              </li>
              <li>
                Set <code>NEXT_PUBLIC_META_APP_ID</code> and{" "}
                <code>NEXT_PUBLIC_WA_CONFIG_ID</code> in <code>.env.local</code>
              </li>
              <li>
                Add{" "}
                <code>
                  {typeof window !== "undefined"
                    ? window.location.origin
                    : "http://localhost:3000"}
                </code>{" "}
                as Redirect URI
              </li>
            </ol>
          </div>
        </>
      )}

      {/* Facebook Tab */}
      {activeTab === "facebook" && (
        <>
          <div className="card">
            <h2>Status</h2>
            <div className="status">
              <span
                className={`badge ${fbAuthenticated ? "success" : "warning"}`}
              >
                {fbAuthenticated ? "Connected" : "Not Connected"}
              </span>
            </div>

            {!fbAuthenticated ? (
              <button
                onClick={handleFbLogin}
                disabled={fbLoading}
                className="btn facebook"
              >
                {fbLoading ? "Loading..." : "Login with Facebook"}
              </button>
            ) : (
              <button onClick={handleFbLogout} className="btn secondary">
                Logout
              </button>
            )}

            {fbError && <div className="error">{fbError}</div>}
          </div>

          {fbAccessToken && (
            <div className="card">
              <h2>Access Token</h2>
              <code className="token access-token">{fbAccessToken}</code>
            </div>
          )}

          {fbSessionInfo && (
            <div className="card">
              <h2>Session Info</h2>
              <table>
                <tbody>
                  <tr>
                    <td>User ID:</td>
                    <td>
                      <code>{fbSessionInfo.userId || "-"}</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Name:</td>
                    <td>
                      <code>{fbSessionInfo.name || "-"}</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Email:</td>
                    <td>
                      <code>{fbSessionInfo.email || "-"}</code>
                    </td>
                  </tr>
                  {fbSessionInfo.grantedPermissions &&
                    fbSessionInfo.grantedPermissions.length > 0 && (
                      <tr>
                        <td>Granted:</td>
                        <td>
                          <code>
                            {fbSessionInfo.grantedPermissions.join(", ")}
                          </code>
                        </td>
                      </tr>
                    )}
                  {fbSessionInfo.deniedPermissions &&
                    fbSessionInfo.deniedPermissions.length > 0 && (
                      <tr>
                        <td>Denied:</td>
                        <td>
                          <code>
                            {fbSessionInfo.deniedPermissions.join(", ")}
                          </code>
                        </td>
                      </tr>
                    )}
                  {fbSessionInfo.pages && fbSessionInfo.pages.length > 0 && (
                    <tr>
                      <td>Pages:</td>
                      <td>
                        <code>
                          {fbSessionInfo.pages
                            .map((p) => `${p.name} (${p.id})`)
                            .join(", ")}
                        </code>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="card info">
            <h2>Setup Guide</h2>
            <ol>
              <li>Create an app on Meta Developer</li>
              <li>Add Facebook Login product</li>
              <li>
                Set <code>NEXT_PUBLIC_META_APP_ID</code> in{" "}
                <code>.env.local</code>
              </li>
              <li>
                Configure <code>NEXT_PUBLIC_FB_SCOPE</code> for needed
                permissions
              </li>
              <li>
                Add{" "}
                <code>
                  {typeof window !== "undefined"
                    ? window.location.origin
                    : "http://localhost:3000"}
                </code>{" "}
                as Valid OAuth Redirect URI
              </li>
            </ol>
          </div>
        </>
      )}

      {/* Shared Event Logs */}
      <div className="card">
        <div className="logs-header">
          <h2>Event Logs</h2>
          <button onClick={clearLogs} className="btn small">
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
