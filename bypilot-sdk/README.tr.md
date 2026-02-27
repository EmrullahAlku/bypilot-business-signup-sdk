# ByPilot Business Signup SDK

**🇹🇷 Türkçe | [🇺🇸 English](README.md)**

İşletme mesajlaşma kanallarını bağlamak için OAuth ve Embedded Signup SDK'sı (WhatsApp, Facebook, Instagram, Google vb.)

## Provider Durumu

| Provider | Durum | SDK Sınıfı |
|---|---|---|
| WhatsApp Embedded Signup | ✅ Tam Çalışıyor | `WhatsAppProvider` |
| Facebook Login | ✅ Tam Çalışıyor | `FacebookProvider` |
| Google OAuth | ✅ Tam Çalışıyor | `GoogleProvider` |
| Instagram (kendi OAuth'u) | ⚠️ Playground hazır, tam test edilmedi | — |
| Instagram via FB Login for Business | ⚠️ Playground hazır, tam test edilmedi | — |

## Kurulum

```bash
npm install bypilot-business-signup-sdk
```

## Provider'lar

### WhatsApp Embedded Signup

Facebook SDK `FB.login()` ile Embedded Signup akışı kullanır. WABA ID, Phone Number ID ve Business ID döner.

```typescript
import { WhatsAppProvider } from "bypilot-business-signup-sdk";

const whatsapp = new WhatsAppProvider({
  clientId: "META_APP_ID",
  configId: "WA_CONFIG_ID",
  redirectUri: process.env.NEXT_PUBLIC_BASE_URL,
  storage: "localStorage",
  graphApiVersion: "v24.0",
  sdkVersion: "v24.0",
});

whatsapp.on("auth:success", (result) => {
  const info = whatsapp.getLastSessionInfo();
  console.log("WABA ID:", info?.wabaId);
  console.log("Phone Number ID:", info?.phoneNumberId);
  console.log("Business ID:", info?.businessId);
});

whatsapp.on("auth:error", (err) => console.error(err));
whatsapp.on("auth:cancel", () => console.log("İptal edildi"));

const result = await whatsapp.loginWithPopup();
if (result.success) {
  const code = whatsapp.getCode(); // backend'de token ile değiştir
}
```

**`WhatsAppSessionInfo`**

```typescript
interface WhatsAppSessionInfo {
  code: string;           // authorization code — backend'de değiştirilmeli
  wabaId?: string;        // WhatsApp Business Account ID
  phoneNumberId?: string;
  phoneNumber?: string;
  businessId?: string;
}
```

---

### Facebook Login

Facebook SDK `FB.login()` ile `response_type: 'code'` kullanır. Authorization code, server tarafında access token ile değiştirilmelidir.

```typescript
import { FacebookProvider } from "bypilot-business-signup-sdk";

const facebook = new FacebookProvider({
  clientId: "META_APP_ID",
  configId: "CONFIG_ID",           // isteğe bağlı
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/facebook`,
  scope: "public_profile,email,pages_show_list",
  storage: "localStorage",
  graphApiVersion: "v24.0",
  sdkVersion: "v24.0",
});

facebook.on("auth:success", (result) => {
  console.log("Auth kodu:", result.token?.code);
});

const result = await facebook.loginWithPopup();
if (result.success) {
  const code = facebook.getCode(); // backend'de token ile değiştir
  const sessionInfo = facebook.getLastSessionInfo();
  console.log("Verilen izinler:", sessionInfo?.grantedPermissions);
}
```

---

### Google OAuth

Standart OAuth 2.0 code flow. İzinler için Format 2 (base URL'e göre gruplandırılmış) kullanır. Access + refresh token alabilmek için server tarafında bir exchange route gerekir. `BaseProvider.loginWithPopup()` ile `bypilot_oauth_callback` postMessage üzerinden uyumludur.

```typescript
import { GoogleProvider } from "bypilot-business-signup-sdk";

const google = new GoogleProvider({
  clientId: "GOOGLE_CLIENT_ID",
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/google`,
  storage: "localStorage",
  accessType: "offline",   // refresh_token döner
  prompt: "consent",
  // Format 2 — base URL'e göre gruplandırılmış
  permissions: {
    "https://www.googleapis.com/auth": [
      "business.manage",
      "gmail.readonly",
      "userinfo.email",
      "userinfo.profile",
    ],
  },
});

google.on("auth:success", () => {
  const session = google.getLastSessionInfo();
  console.log("Access token:", session?.accessToken);
  console.log("Refresh token:", session?.refreshToken);
  console.log("Süre:", session?.expiresIn);
});

const result = await google.loginWithPopup();
console.log("Çözümlenen scope:", google.getResolvedScope());
```

**İzin formatları** — her üçü de aynı scope string'ine çözümlenir:

```typescript
// Format 1 — basit string dizisi (tam URL'ler)
permissions: [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
]

// Format 2 — base URL'e göre gruplandırılmış  ← SDK'da implement edilmiş
permissions: {
  "https://www.googleapis.com/auth": ["gmail.readonly", "userinfo.email"],
  "": ["openid"],  // boş key = absolute scope'lar
}

// Format 3 — karışık (konsept, implement edilmemiş)
permissions: [
  "openid",
  { url: "https://www.googleapis.com/auth", scopes: ["gmail.readonly"] },
]
```

**`GoogleSessionInfo`**

```typescript
interface GoogleSessionInfo {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  idToken?: string;
}
```

---

## Ortak API

Tüm provider'lar `BaseProvider`'ı extend eder ve aynı arayüzü paylaşır:

```typescript
provider.loginWithPopup(config?)  // → Promise<AuthResult>
provider.loginWithRedirect()      // redirect tabanlı akış
provider.logout()                 // saklanan token'ı temizle
provider.getCode()                // → string | null
provider.isAuthenticated()        // → boolean
provider.getToken()               // → OAuthToken | null
provider.on(event, callback)      // olayı dinle → unsubscribe fn döner
provider.setStorageStrategy(s)    // 'localStorage' | 'sessionStorage' | 'memory'
```

**Olaylar:** `auth:start` · `auth:success` · `auth:error` · `auth:cancel` · `token:expire`

**`AuthResult`**

```typescript
interface AuthResult {
  success: boolean;
  token?: { code: string; tokenType: string; expiresAt?: number; scope?: string };
  error?: string;
  errorDescription?: string;
  raw?: Record<string, unknown>;
}
```

---

## Mimari

```
BaseProvider (EventEmitter)
├── WhatsAppProvider   — FB SDK, Embedded Signup, session info
├── FacebookProvider   — FB SDK, code flow, page info
└── GoogleProvider     — standart OAuth 2.0, Format 2 izinler
```

**Popup akışı (WhatsApp, Facebook, Google):**
1. `loginWithPopup()` state üretir, `PopupManager` ile OAuth popup'ı açar
2. Popup `/api/connect/{provider}` adresine yönlenir — server kodu token ile değiştirir
3. Server `/connect/{provider}` adresine yönlenir — client callback sayfası
4. Callback sayfası opener'a `postMessage({ type: 'bypilot_oauth_callback', payload })` gönderir
5. `PopupManager.waitForCallback()` çözümlenir → state doğrulanır → `handleCallback()` → `auth:success`

## Tarayıcı Desteği

Chrome 80+ · Firefox 74+ · Safari 13.1+ · Edge 80+

## Lisans

MIT Lisansı — detaylar için [LICENSE](../LICENSE) dosyasına bakın.
