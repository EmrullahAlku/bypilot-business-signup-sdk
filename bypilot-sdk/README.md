# ByPilot Business Signup SDK

**[🇹🇷 Türkçe](README.tr.md) | 🇺🇸 English**

OAuth and Embedded Signup SDK for connecting business messaging channels (WhatsApp, Facebook, Instagram, Google, etc.)

## Provider Status

| Provider | Status | SDK Class |
|---|---|---|
| WhatsApp Embedded Signup | ✅ Fully Working | `WhatsAppProvider` |
| Facebook Login | ✅ Fully Working | `FacebookProvider` |
| Google OAuth | ✅ Fully Working | `GoogleProvider` |
| Instagram (own OAuth) | ⚠️ Playground ready, not fully tested | — |
| Instagram via FB Login for Business | ⚠️ Playground ready, not fully tested | — |

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
  clientId: "YOUR_META_APP_ID",
  configId: "YOUR_WA_CONFIG_ID",
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
whatsapp.on("auth:cancel", () => console.log("Cancelled"));

const result = await whatsapp.loginWithPopup();
if (result.success) {
  const code = whatsapp.getCode(); // exchange on your backend
}
```

**`WhatsAppSessionInfo`**

```typescript
interface WhatsAppSessionInfo {
  code: string;          // authorization code — exchange on backend
  wabaId?: string;       // WhatsApp Business Account ID
  phoneNumberId?: string;
  phoneNumber?: string;
  businessId?: string;
}
```

---

### Facebook Login

Uses Facebook SDK `FB.login()` with `response_type: 'code'`. The authorization code must be exchanged server-side for an access token.

```typescript
import { FacebookProvider } from "bypilot-business-signup-sdk";

const facebook = new FacebookProvider({
  clientId: "YOUR_META_APP_ID",
  configId: "YOUR_CONFIG_ID",       // optional
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/facebook`,
  scope: "public_profile,email,pages_show_list",
  storage: "localStorage",
  graphApiVersion: "v24.0",
  sdkVersion: "v24.0",
});

facebook.on("auth:success", (result) => {
  console.log("Auth code:", result.token?.code);
});

const result = await facebook.loginWithPopup();
if (result.success) {
  const code = facebook.getCode(); // exchange on your backend
  const sessionInfo = facebook.getLastSessionInfo();
  console.log("Granted permissions:", sessionInfo?.grantedPermissions);
}
```

---

### Google OAuth

Standard OAuth 2.0 code flow. Uses Format 2 (grouped by base URL) for permissions. Requires a server-side route to exchange the code for access + refresh tokens. Compatible with `BaseProvider.loginWithPopup()` via `bypilot_oauth_callback` postMessage.

```typescript
import { GoogleProvider } from "bypilot-business-signup-sdk";

const google = new GoogleProvider({
  clientId: "YOUR_GOOGLE_CLIENT_ID",
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/google`,
  storage: "localStorage",
  accessType: "offline",   // returns refresh_token
  prompt: "consent",
  // Format 2 — grouped by base URL
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
  console.log("Expires in:", session?.expiresIn);
});

const result = await google.loginWithPopup();
console.log("Resolved scope:", google.getResolvedScope());
```

**Permission formats** — all three produce an identical scope string:

```typescript
// Format 1 — simple string array (full URLs)
permissions: [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
]

// Format 2 — grouped by base URL  ← implemented in SDK
permissions: {
  "https://www.googleapis.com/auth": ["gmail.readonly", "userinfo.email"],
  "": ["openid"],  // empty key = absolute scopes
}

// Format 3 — mixed (concept, not implemented)
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

## Common API

All providers extend `BaseProvider` and share the same interface:

```typescript
provider.loginWithPopup(config?)  // → Promise<AuthResult>
provider.loginWithRedirect()      // redirect-based flow
provider.logout()                 // clear stored token
provider.getCode()                // → string | null
provider.isAuthenticated()        // → boolean
provider.getToken()               // → OAuthToken | null
provider.on(event, callback)      // subscribe to events → returns unsubscribe fn
provider.setStorageStrategy(s)    // 'localStorage' | 'sessionStorage' | 'memory'
```

**Events:** `auth:start` · `auth:success` · `auth:error` · `auth:cancel` · `token:expire`

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

## Architecture

```
BaseProvider (EventEmitter)
├── WhatsAppProvider   — FB SDK, Embedded Signup, session info
├── FacebookProvider   — FB SDK, code flow, page info
└── GoogleProvider     — standard OAuth 2.0, Format 2 permissions
```

**Popup flow (WhatsApp, Facebook, Google):**
1. `loginWithPopup()` generates state, opens OAuth popup via `PopupManager`
2. Popup redirects to `/api/connect/{provider}` — server exchanges code for token
3. Server redirects to `/connect/{provider}` — client callback page
4. Callback page sends `postMessage({ type: 'bypilot_oauth_callback', payload })` to opener
5. `PopupManager.waitForCallback()` resolves → state validated → `handleCallback()` → `auth:success`

## Browser Support

Chrome 80+ · Firefox 74+ · Safari 13.1+ · Edge 80+

## License

MIT License — see [LICENSE](../LICENSE) for details.
