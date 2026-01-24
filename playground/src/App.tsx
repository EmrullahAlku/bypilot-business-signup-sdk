import { useState, useEffect, useCallback } from "react";
import {
  WhatsAppProvider,
  type AuthResult,
  type WhatsAppSessionInfo,
} from "bypilot-business-signup-sdk";
import "./App.css";

// WhatsApp Provider instance (config değerlerini kendi Meta App bilgilerinle değiştir)
const whatsapp = new WhatsAppProvider({
  clientId: "your_client_id", // Meta Developer'dan al
  configId: "your_config_id", // Embedded Signup config ID
  redirectUri: window.location.origin,
  storage: "localStorage",
  graphApiVersion: "v24.0", // 🆕 Graph API version (default: v21.0)
  sdkVersion: "v24.0",
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<WhatsAppSessionInfo | null>(
    null,
  );
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  useEffect(() => {
    // Mevcut token'ı kontrol et
    const token = whatsapp.getAccessToken();
    if (token) {
      setAccessToken(token);
      setIsAuthenticated(true);
      addLog("Mevcut token bulundu");
    }

    // Event listener'ları ekle
    const unsubSuccess = whatsapp.on("auth:success", (result: unknown) => {
      const authResult = result as AuthResult;
      addLog(
        `✅ Auth başarılı: ${authResult.token?.accessToken?.substring(0, 20)}...`,
      );
    });

    const unsubError = whatsapp.on("auth:error", (err: unknown) => {
      const errorData = err as { error?: string };
      addLog(`❌ Auth hatası: ${errorData?.error || "Bilinmeyen hata"}`);
    });

    const unsubCancel = whatsapp.on("auth:cancel", () => {
      addLog("⚠️ Kullanıcı iptal etti");
    });

    const unsubStart = whatsapp.on("auth:start", () => {
      addLog("🚀 Auth başlatıldı");
    });

    // Session info listener (WhatsApp Embedded Signup)
    const unsubSession = whatsapp.getSessionInfoListener((info) => {
      addLog(
        `📱 Session info alındı: WABA=${info.wabaId}, Phone=${info.phoneNumberId}`,
      );
      setSessionInfo(info);
    });

    return () => {
      unsubSuccess();
      unsubError();
      unsubCancel();
      unsubStart();
      unsubSession();
    };
  }, [addLog]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      addLog("Login popup açılıyor...");
      const result = await whatsapp.loginWithPopup();

      if (result.success && result.token) {
        setAccessToken(result.token.accessToken);
        setIsAuthenticated(true);
        addLog("Login başarılı!");
      } else {
        setError(result.error || "Login başarısız");
        addLog(`Login başarısız: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(message);
      addLog(`Hata: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    whatsapp.logout();
    setAccessToken(null);
    setIsAuthenticated(false);
    setSessionInfo(null);
    addLog("Logout yapıldı");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="container">
      <h1>🔌 ByPilot SDK Test</h1>
      <p className="subtitle">WhatsApp Embedded Signup Test Ortamı</p>

      <div className="card">
        <h2>Durum</h2>
        <div className="status">
          <span className={`badge ${isAuthenticated ? "success" : "warning"}`}>
            {isAuthenticated ? "✓ Bağlı" : "○ Bağlı Değil"}
          </span>
        </div>

        {!isAuthenticated ? (
          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn primary"
          >
            {loading ? "Bekleniyor..." : "🔐 WhatsApp ile Giriş Yap"}
          </button>
        ) : (
          <button onClick={handleLogout} className="btn secondary">
            🚪 Çıkış Yap
          </button>
        )}

        {error && <div className="error">{error}</div>}
      </div>

      {accessToken && (
        <div className="card">
          <h2>Access Token</h2>
          <code className="token">{accessToken}</code>
        </div>
      )}

      {sessionInfo && (
        <div className="card">
          <h2>Session Bilgileri</h2>
          <table>
            <tbody>
              <tr>
                <td>WABA ID:</td>
                <td>
                  <code>{sessionInfo.wabaId || "-"}</code>
                </td>
              </tr>
              <tr>
                <td>Phone Number ID:</td>
                <td>
                  <code>{sessionInfo.phoneNumberId || "-"}</code>
                </td>
              </tr>
              <tr>
                <td>Phone Number:</td>
                <td>
                  <code>{sessionInfo.phoneNumber || "-"}</code>
                </td>
              </tr>
              <tr>
                <td>Business ID:</td>
                <td>
                  <code>{sessionInfo.businessId || "-"}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="logs-header">
          <h2>Event Logları</h2>
          <button onClick={clearLogs} className="btn small">
            Temizle
          </button>
        </div>
        <div className="logs">
          {logs.length === 0 ? (
            <p className="empty">Henüz log yok</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="log-line">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card info">
        <h2>📋 Kurulum</h2>
        <ol>
          <li>Meta Developer'dan bir uygulama oluştur</li>
          <li>WhatsApp Business Platform'u ekle</li>
          <li>
            Embedded Signup'ı yapılandır ve <code>config_id</code> al
          </li>
          <li>
            Bu sayfadaki <code>clientId</code> ve <code>configId</code>{" "}
            değerlerini güncelle
          </li>
          <li>
            Redirect URI olarak <code>{window.location.origin}</code> ekle
          </li>
        </ol>
      </div>
    </div>
  );
}

export default App;
