# ByPilot Business Signup SDK

**[🇹🇷 Türkçe](README.tr.md) | 🇺🇸 English**

OAuth and Embedded Signup SDK for connecting business messaging channels (WhatsApp, Facebook, Instagram, Google, etc.)

## Provider Status

| Provider                            | Status                                | SDK Class          | Playground      |
| ----------------------------------- | ------------------------------------- | ------------------ | --------------- |
| WhatsApp Embedded Signup            | ✅ Fully Working                      | `WhatsAppProvider` | `/whatsapp`     |
| Facebook Login                      | ✅ Fully Working                      | `FacebookProvider` | `/facebook`     |
| Google OAuth                        | ✅ Fully Working                      | `GoogleProvider`   | `/google`       |
| Instagram (own OAuth)               | ⚠️ Playground ready, not fully tested | —                  | `/instagram`    |
| Instagram via FB Login for Business | ⚠️ Playground ready, not fully tested | —                  | `/instagram-fb` |

## Packages

```
bypiloy-business-signup-sdk/
├── bypilot-sdk/     # SDK package (published to npm)
└── playground/      # Next.js demo & test app
```

## Installation

```bash
npm install bypilot-business-signup-sdk
```

## Providers

### WhatsApp Embedded Signup

Uses Facebook SDK `FB.login()` with Embedded Signup flow. Returns WABA ID, Phone Number ID, and Business ID.

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

Uses Facebook SDK `FB.login()` with `response_type: 'code'`. Code is exchanged server-side for an access token.

```typescript
import { FacebookProvider } from "bypilot-business-signup-sdk";

const facebook = new FacebookProvider({
  clientId: process.env.NEXT_PUBLIC_META_APP_ID,
  configId: process.env.NEXT_PUBLIC_META_CONFIG_ID, // optional
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/facebook`,
  scope: "public_profile,email,pages_show_list",
  storage: "localStorage",
});

facebook.on("auth:success", (result) => {
  console.log("Auth code:", result.token?.code);
});

const result = await facebook.loginWithPopup();
```

### Google OAuth

Standard OAuth 2.0 code flow. Uses Format 2 (grouped by base URL) for permissions. The server exchanges the code for access + refresh tokens.

```typescript
import { GoogleProvider } from "bypilot-business-signup-sdk";

const google = new GoogleProvider({
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/google`,
  storage: "localStorage",
  // Format 2: grouped by base URL
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

**Permission formats** — all three resolve to an identical scope string:

```typescript
// Format 1 — simple string array (full URLs)
permissions: [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
]

// Format 2 — grouped by base URL  ← implemented in SDK
permissions: {
  "https://www.googleapis.com/auth": ["gmail.readonly", "userinfo.email"],
}

// Format 3 — mixed (concept, not implemented)
permissions: [
  "openid",
  { url: "https://www.googleapis.com/auth", scopes: ["gmail.readonly"] },
]
```

## Playground

A Next.js app for testing all providers end-to-end.

```bash
cd playground
cp .env.example .env.local   # fill in your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable                       | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `NEXT_PUBLIC_BASE_URL`         | Your app's base URL (e.g. `https://yourapp.com`) |
| `NEXT_PUBLIC_META_APP_ID`      | Meta App ID — WhatsApp & Facebook                |
| `META_APP_SECRET`              | Meta App Secret — server only                    |
| `NEXT_PUBLIC_WA_CONFIG_ID`     | WhatsApp Embedded Signup config_id               |
| `NEXT_PUBLIC_META_CONFIG_ID`   | Facebook Login config_id                         |
| `NEXT_PUBLIC_FB_SCOPE`         | Facebook permission scopes                       |
| `NEXT_PUBLIC_IG_APP_ID`        | Instagram App ID                                 |
| `IG_APP_SECRET`                | Instagram App Secret — server only               |
| `NEXT_PUBLIC_IG_SCOPE`         | Instagram (own OAuth) scopes                     |
| `NEXT_PUBLIC_IG_FB_SCOPE`      | Instagram via FB Login for Business scopes       |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID                           |
| `GOOGLE_CLIENT_SECRET`         | Google OAuth Client Secret — server only         |

## Development

```bash
# Build the SDK
cd bypilot-sdk && npm run build

# Run playground
cd playground && npm run dev

# Watch mode (SDK)
cd bypilot-sdk && npm run dev
```

## Architecture

```
BaseProvider (EventEmitter)
├── WhatsAppProvider   — FB SDK, Embedded Signup
├── FacebookProvider   — FB SDK, code flow
└── GoogleProvider     — standard OAuth 2.0, grouped permissions
```

**Popup flow (WhatsApp, Facebook, Google):**

1. `loginWithPopup()` opens OAuth popup
2. Popup redirects to `/api/connect/{provider}` — server exchanges code
3. Server redirects to `/connect/{provider}` — callback page
4. Callback page sends `postMessage({ type: 'bypilot_oauth_callback', payload })` to opener
5. `PopupManager.waitForCallback()` resolves → `handleCallback()` → `auth:success`

**Instagram flows** use a custom popup (no FB SDK) and their own `postMessage` types.

## License

MIT License — See [LICENSE](LICENSE) for details.
