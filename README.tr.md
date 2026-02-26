# ByPilot Business Signup SDK

**🇹🇷 Türkçe | [🇺🇸 English](README.md)**

İşletme mesajlaşma kanallarını bağlamak için OAuth ve Embedded Signup SDK'sı (WhatsApp, Facebook, Instagram, Google vb.)

## Provider Durumu

| Provider | Durum | SDK Sınıfı | Playground |
|---|---|---|---|
| WhatsApp Embedded Signup | ✅ Tam Çalışıyor | `WhatsAppProvider` | `/whatsapp` |
| Facebook Login | ✅ Tam Çalışıyor | `FacebookProvider` | `/facebook` |
| Google OAuth | ✅ Tam Çalışıyor | `GoogleProvider` | `/google` |
| Instagram (kendi OAuth'u) | ⚠️ Playground hazır, tam test edilmedi | — | `/instagram` |
| Instagram via FB Login for Business | ⚠️ Playground hazır, tam test edilmedi | — | `/instagram-fb` |

## Paketler

```
bypiloy-business-signup-sdk/
├── bypilot-sdk/     # SDK paketi (npm'de yayınlı)
└── playground/      # Next.js demo & test uygulaması
```

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
  clientId: process.env.NEXT_PUBLIC_META_APP_ID,
  configId: process.env.NEXT_PUBLIC_WA_CONFIG_ID,
  redirectUri: process.env.NEXT_PUBLIC_BASE_URL,
  storage: "localStorage",
});

whatsapp.on("auth:success", (result) => {
  const info = whatsapp.getLastSessionInfo();
  console.log("WABA ID:", info?.wabaId);
  console.log("Phone Number ID:", info?.phoneNumberId);
});

const result = await whatsapp.loginWithPopup();
```

### Facebook Login

Facebook SDK `FB.login()` ile `response_type: 'code'` kullanır. Kod, server tarafında access token ile değiştirilir.

```typescript
import { FacebookProvider } from "bypilot-business-signup-sdk";

const facebook = new FacebookProvider({
  clientId: process.env.NEXT_PUBLIC_META_APP_ID,
  configId: process.env.NEXT_PUBLIC_META_CONFIG_ID, // isteğe bağlı
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/facebook`,
  scope: "public_profile,email,pages_show_list",
  storage: "localStorage",
});

facebook.on("auth:success", (result) => {
  console.log("Auth kodu:", result.token?.code);
});

const result = await facebook.loginWithPopup();
```

### Google OAuth

Standart OAuth 2.0 code flow. İzinler için Format 2 (base URL'e göre gruplandırılmış) kullanır. Server, kodu access + refresh token ile değiştirir.

```typescript
import { GoogleProvider } from "bypilot-business-signup-sdk";

const google = new GoogleProvider({
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/google`,
  storage: "localStorage",
  // Format 2: base URL'e göre gruplandırılmış
  permissions: {
    "https://www.googleapis.com/auth": [
      "business.manage",
      "gmail.readonly",
      "userinfo.email",
      "userinfo.profile",
    ],
  },
});

google.on("auth:success", (result) => {
  const session = google.getLastSessionInfo();
  console.log("Access token:", session?.accessToken);
  console.log("Refresh token:", session?.refreshToken);
  console.log("Scope:", google.getResolvedScope());
});

const result = await google.loginWithPopup();
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
}

// Format 3 — karışık (konsept, implement edilmemiş)
permissions: [
  "openid",
  { url: "https://www.googleapis.com/auth", scopes: ["gmail.readonly"] },
]
```

## Playground

Tüm provider'ları uçtan uca test etmek için Next.js uygulaması.

```bash
cd playground
cp .env.example .env.local   # kimlik bilgilerini doldur
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini aç.

### Ortam Değişkenleri

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | Uygulamanın base URL'i (örn. `https://yourapp.com`) |
| `NEXT_PUBLIC_META_APP_ID` | Meta App ID — WhatsApp & Facebook |
| `META_APP_SECRET` | Meta App Secret — sadece server |
| `NEXT_PUBLIC_WA_CONFIG_ID` | WhatsApp Embedded Signup config_id |
| `NEXT_PUBLIC_META_CONFIG_ID` | Facebook Login config_id |
| `NEXT_PUBLIC_FB_SCOPE` | Facebook izin scope'ları |
| `NEXT_PUBLIC_IG_APP_ID` | Instagram App ID |
| `IG_APP_SECRET` | Instagram App Secret — sadece server |
| `NEXT_PUBLIC_IG_SCOPE` | Instagram (kendi OAuth'u) scope'ları |
| `NEXT_PUBLIC_IG_FB_SCOPE` | Instagram via FB Login for Business scope'ları |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret — sadece server |

## Geliştirme

```bash
# SDK'yı build et
cd bypilot-sdk && npm run build

# Playground'u çalıştır
cd playground && npm run dev

# Watch modu (SDK)
cd bypilot-sdk && npm run dev
```

## Mimari

```
BaseProvider (EventEmitter)
├── WhatsAppProvider   — FB SDK, Embedded Signup
├── FacebookProvider   — FB SDK, code flow
└── GoogleProvider     — standart OAuth 2.0, gruplandırılmış izinler
```

**Popup akışı (WhatsApp, Facebook, Google):**
1. `loginWithPopup()` OAuth popup'ı açar
2. Popup `/api/connect/{provider}` adresine yönlenir — server kodu değiştirir
3. Server `/connect/{provider}` adresine yönlenir — callback sayfası
4. Callback sayfası opener'a `postMessage({ type: 'bypilot_oauth_callback', payload })` gönderir
5. `PopupManager.waitForCallback()` çözümlenir → `handleCallback()` → `auth:success`

**Instagram akışları** kendi popup yönetimini (FB SDK olmadan) ve kendi `postMessage` tiplerini kullanır.

## Lisans

MIT Lisansı — Detaylar için [LICENSE](LICENSE) dosyasına bakın.
