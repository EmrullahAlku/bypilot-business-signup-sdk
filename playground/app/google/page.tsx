"use client";

import { useState, useCallback, useMemo } from "react";
import { GoogleProvider } from "bypilot-business-signup-sdk";

// ─── Permission Format Examples ───────────────────────────────────────────────
// All 3 formats solve the same problem differently.
// Only Format 2 is implemented in GoogleProvider.

const FORMAT_1_CODE = `// Format 1 — Simple string array (full scope URLs)
// Verbose but explicit. Works with any scope system.
const google = new GoogleProvider({
  clientId: "GOOGLE_CLIENT_ID",
  redirectUri: "https://...",
  permissions: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
});

// Gmail demo — show last 10 mails:
const res = await fetch(
  "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10",
  { headers: { Authorization: \`Bearer \${accessToken}\` } }
);`;

const FORMAT_2_CODE = `// Format 2 — Grouped by base URL  ← Used in this demo
// Avoids repeating the base URL. Scope names are relative paths.
const google = new GoogleProvider({
  clientId: "GOOGLE_CLIENT_ID",
  redirectUri: "https://...",
  permissions: {
    "https://www.googleapis.com/auth": [
      "gmail.readonly",     // → .../auth/gmail.readonly
      "userinfo.email",     // → .../auth/userinfo.email
      "userinfo.profile",   // → .../auth/userinfo.profile
    ],
  },
});

// Resolves to:
// "https://www.googleapis.com/auth/gmail.readonly
//  https://www.googleapis.com/auth/userinfo.email
//  https://www.googleapis.com/auth/userinfo.profile"

// Gmail demo — show last 10 mails:
const res = await fetch(
  "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10",
  { headers: { Authorization: \`Bearer \${accessToken}\` } }
);`;

const FORMAT_3_CODE = `// Format 3 — Mixed (not implemented in SDK — shown as alternative design)
// Combines absolute scopes and grouped objects in one array.
const google = new GoogleProvider({
  clientId: "GOOGLE_CLIENT_ID",
  redirectUri: "https://...",
  permissions: [
    "openid",
    {
      url: "https://www.googleapis.com/auth",
      scopes: ["gmail.readonly", "userinfo.email"],
    },
  ],
});

// Gmail demo — same API call regardless of format:
const res = await fetch(
  "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10",
  { headers: { Authorization: \`Bearer \${accessToken}\` } }
);`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface GoogleSessionInfo {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}

// ─── Gmail API helpers ────────────────────────────────────────────────────────

async function fetchLastEmails(
  accessToken: string,
): Promise<GmailEmail[]> {
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const listData = await listRes.json();
  if (!listData.messages) return [];

  const messages = await Promise.all(
    (listData.messages as { id: string }[]).map(async ({ id }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const msg = await msgRes.json();
      const headers: { name: string; value: string }[] =
        msg.payload?.headers ?? [];
      const h = (name: string) =>
        headers.find((x) => x.name === name)?.value ?? "—";
      return {
        id,
        subject: h("Subject"),
        from: h("From"),
        date: h("Date"),
        snippet: msg.snippet ?? "",
      };
    }),
  );

  return messages;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GooglePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [session, setSession] = useState<GoogleSessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [emails, setEmails] = useState<GmailEmail[] | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [activeFormat, setActiveFormat] = useState<1 | 2 | 3>(2);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const google = useMemo(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const provider = new GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      redirectUri: `${baseUrl}/api/connect/google`,
      storage: "localStorage",
      // Format 2 — grouped by base URL
      permissions: {
        "https://www.googleapis.com/auth": [
          "gmail.readonly",
          "userinfo.email",
          "userinfo.profile",
        ],
      },
    });

    provider.on("auth:start", () => addLog("[Google] Auth started"));
    provider.on("auth:success", () => addLog("[Google] Auth successful"));
    provider.on("auth:error", (e: unknown) => {
      const err = e as { error?: string };
      addLog(`[Google] Auth error: ${err?.error ?? "unknown"}`);
    });
    provider.on("auth:cancel", () => addLog("[Google] Cancelled by user"));

    return provider;
  }, [addLog]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setEmails(null);

    const result = await google.loginWithPopup();

    if (result.success && result.token?.code) {
      const sessionInfo = google.getLastSessionInfo();
      setSession({
        accessToken: result.token.code,
        refreshToken: sessionInfo?.refreshToken,
        expiresIn: sessionInfo?.expiresIn ?? 3600,
        scope: sessionInfo?.scope ?? result.token.scope ?? "",
      });
      setAuthenticated(true);
      addLog(
        `[Google] Access token: ${result.token.code.substring(0, 24)}...`,
      );
      addLog(`[Google] Scope: ${result.token.scope}`);
    } else if (!result.success) {
      if (
        result.error !== "cancelled" &&
        !result.error?.includes("closed")
      ) {
        setError(result.error ?? "Login failed");
      }
    }

    setLoading(false);
  };

  const handleLogout = () => {
    google.logout();
    setAuthenticated(false);
    setSession(null);
    setEmails(null);
    addLog("[Google] Logged out");
  };

  const handleFetchEmails = async () => {
    if (!session?.accessToken) return;
    setEmailLoading(true);
    addLog("[Google] Fetching last 10 Gmail messages...");
    try {
      const mails = await fetchLastEmails(session.accessToken);
      setEmails(mails);
      addLog(`[Google] Fetched ${mails.length} messages`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "fetch_failed";
      setError(msg);
      addLog(`[Google] Gmail fetch error: ${msg}`);
    } finally {
      setEmailLoading(false);
    }
  };

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/connect/google`;

  const formatCodes: Record<1 | 2 | 3, string> = {
    1: FORMAT_1_CODE,
    2: FORMAT_2_CODE,
    3: FORMAT_3_CODE,
  };

  return (
    <div className="page">
      <h1>Google OAuth</h1>
      <p className="subtitle">
        OAuth 2.0 code flow · Format 2 grouped permissions · Gmail demo
      </p>

      {/* ── Permission Formats ───────────────────────────────────────────── */}
      <div className="card">
        <h2>Permission Format Comparison</h2>
        <p style={{ color: "#888", fontSize: "0.88rem", marginBottom: "1rem" }}>
          3 ways to declare scopes — GoogleProvider implements{" "}
          <strong style={{ color: "#4285F4" }}>Format 2</strong>.
          All 3 produce identical OAuth scope strings.
        </p>

        {/* Format tabs */}
        <div className="tabs">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => setActiveFormat(n)}
              className={`tab${activeFormat === n ? " active" : ""}`}
              style={
                activeFormat === n
                  ? { color: "#4285F4", borderColor: "#4285F4" }
                  : {}
              }
            >
              Format {n}
              {n === 2 && (
                <span
                  style={{
                    marginLeft: "0.4rem",
                    fontSize: "0.7rem",
                    background: "#4285F4",
                    color: "#fff",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  used
                </span>
              )}
              {n === 3 && (
                <span
                  style={{
                    marginLeft: "0.4rem",
                    fontSize: "0.7rem",
                    background: "#555",
                    color: "#ccc",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  concept
                </span>
              )}
            </button>
          ))}
        </div>
        <pre className="code-block">{formatCodes[activeFormat]}</pre>
      </div>

      {/* ── Status / Login ───────────────────────────────────────────────── */}
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
            className="btn google"
          >
            {loading ? "Connecting..." : "Sign in with Google"}
          </button>
        ) : (
          <button onClick={handleLogout} className="btn secondary">
            Sign out
          </button>
        )}
        {error && <div className="error">{error}</div>}
      </div>

      {/* ── Session Info ─────────────────────────────────────────────────── */}
      {session && (
        <div className="card">
          <h2>Session</h2>
          <h3
            style={{ color: "#aaa", fontSize: "0.8rem", margin: "0 0 0.4rem" }}
          >
            Access Token
          </h3>
          <code className="token access-token">{session.accessToken}</code>
          <table style={{ marginTop: "1rem" }}>
            <tbody>
              <tr>
                <td>Expires in:</td>
                <td>
                  <code>{session.expiresIn}s</code>
                </td>
              </tr>
              {session.refreshToken && (
                <tr>
                  <td>Refresh token:</td>
                  <td>
                    <code>{session.refreshToken.substring(0, 20)}...</code>
                  </td>
                </tr>
              )}
              <tr>
                <td>Scope:</td>
                <td>
                  <code style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>
                    {session.scope}
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Gmail Demo ───────────────────────────────────────────────────── */}
      {authenticated && session && (
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ margin: 0 }}>Gmail — Last 10 Emails</h2>
            <button
              onClick={handleFetchEmails}
              disabled={emailLoading}
              className="btn google"
              style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
            >
              {emailLoading ? "Loading..." : emails ? "Refresh" : "Fetch Emails"}
            </button>
          </div>

          {emails === null && !emailLoading && (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              Click "Fetch Emails" to read from Gmail API using{" "}
              <code>gmail.readonly</code> scope.
            </p>
          )}

          {emails && emails.length === 0 && (
            <p style={{ color: "#888" }}>No messages found.</p>
          )}

          {emails && emails.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              {emails.map((mail) => (
                <div
                  key={mail.id}
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#e0e0e0",
                        fontSize: "0.9rem",
                      }}
                    >
                      {mail.subject}
                    </span>
                    <span
                      style={{
                        color: "#555",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {mail.date.split(" ").slice(0, 4).join(" ")}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "#4285F4",
                      fontSize: "0.78rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {mail.from}
                  </div>
                  <div
                    style={{
                      color: "#666",
                      fontSize: "0.82rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {mail.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Setup Guide ──────────────────────────────────────────────────── */}
      <div className="card info">
        <h2>Setup Guide</h2>
        <ol>
          <li>
            Go to{" "}
            <strong>Google Cloud Console → APIs & Services → Credentials</strong>
          </li>
          <li>
            Create an <strong>OAuth 2.0 Client ID</strong> (Web application)
          </li>
          <li>
            Add Authorized Redirect URI:
            <br />
            <code>{redirectUri}</code>
          </li>
          <li>
            Enable <strong>Gmail API</strong> in APIs & Services → Library
          </li>
          <li>
            Set env vars: <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>,{" "}
            <code>GOOGLE_CLIENT_SECRET</code>
          </li>
        </ol>
        <h3 style={{ marginTop: "1rem" }}>Resolved scope string (Format 2)</h3>
        <code style={{ display: "block", fontSize: "0.82rem", color: "#4285F4", wordBreak: "break-all" }}>
          {google.getResolvedScope()}
        </code>
      </div>

      {/* ── Event Logs ───────────────────────────────────────────────────── */}
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
