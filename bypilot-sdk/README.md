# ByPilot Business Signup SDK

**[🇹🇷 Türkçe](README.tr.md) | 🇺🇸 English**

OAuth and Embedded Signup SDK for business accounts (WhatsApp, Instagram, Facebook, etc.)

## 🚀 Installation

```bash
npm install bypilot-business-signup-sdk
```

## 📝 Quick Start

### WhatsApp Provider

```typescript
import { WhatsAppProvider } from 'bypilot-business-signup-sdk';

// Initialize the provider
const whatsapp = new WhatsAppProvider({
  clientId: 'your_meta_app_id',
  configId: 'your_embedded_signup_config_id',
  redirectUri: window.location.origin,
  storage: 'localStorage', // or 'sessionStorage'
  graphApiVersion: 'v21.0', // optional
  sdkVersion: 'v21.0' // optional
});

// Login with popup
try {
  const result = await whatsapp.loginWithPopup();
  
  if (result.success) {
    console.log('Access Token:', result.token.accessToken);
    console.log('Session Info:', result.sessionInfo);
  }
} catch (error) {
  console.error('Login failed:', error);
}

// Get current session
const token = whatsapp.getAccessToken();
const isAuthenticated = whatsapp.isAuthenticated();

// Logout
whatsapp.logout();
```

## 🔧 Configuration

### WhatsApp Provider Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | string | ✅ | Your Meta App ID |
| `configId` | string | ✅ | Embedded Signup Configuration ID |
| `redirectUri` | string | ✅ | Redirect URI (must be registered in Meta App) |
| `storage` | `'localStorage'` \| `'sessionStorage'` | ❌ | Token storage type (default: `localStorage`) |
| `graphApiVersion` | string | ❌ | Graph API version (default: `v21.0`) |
| `sdkVersion` | string | ❌ | Facebook SDK version (default: `v21.0`) |

## 📚 API Reference

### WhatsAppProvider

#### Methods

##### `loginWithPopup(): Promise<AuthResult>`
Opens a popup for WhatsApp Business authentication.

**Returns:** Promise that resolves to an `AuthResult` object.

##### `logout(): void`
Clears stored tokens and session data.

##### `getAccessToken(): string | null`
Returns the current access token or null if not authenticated.

##### `isAuthenticated(): boolean`
Returns true if user is currently authenticated.

##### `getSessionInfoListener(callback: (info: WhatsAppSessionInfo) => void): () => void`
Listens for session information updates.

**Returns:** Unsubscribe function.

#### Events

The provider emits the following events:

- `auth:start` - Authentication process started
- `auth:success` - Authentication completed successfully
- `auth:error` - Authentication failed
- `auth:cancel` - User cancelled authentication

```typescript
// Listen to events
const unsubscribe = whatsapp.on('auth:success', (result) => {
  console.log('Authentication successful!', result);
});

// Don't forget to unsubscribe
unsubscribe();
```

### Type Definitions

#### AuthResult

```typescript
interface AuthResult {
  success: boolean;
  token?: {
    accessToken: string;
    expiresIn?: number;
  };
  sessionInfo?: WhatsAppSessionInfo;
  error?: string;
}
```

#### WhatsAppSessionInfo

```typescript
interface WhatsAppSessionInfo {
  wabaId?: string;          // WhatsApp Business Account ID
  phoneNumberId?: string;   // Phone Number ID
  phoneNumber?: string;     // Phone Number
  businessId?: string;      // Business Manager ID
}
```

## 🏗️ Setup Guide

### 1. Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app
3. Add WhatsApp Business Platform product

### 2. Configure Embedded Signup

1. In your Meta app, go to WhatsApp → Configuration
2. Set up Embedded Signup
3. Add your domain to the allowlist
4. Get your Configuration ID

### 3. Set Redirect URI

Add your redirect URI to your Meta app settings:
- For development: `http://localhost:3000`
- For production: `https://yourdomain.com`

### 4. Implementation

```typescript
const whatsapp = new WhatsAppProvider({
  clientId: 'YOUR_META_APP_ID',
  configId: 'YOUR_CONFIG_ID',
  redirectUri: window.location.origin
});
```

## 🔍 Error Handling

```typescript
try {
  const result = await whatsapp.loginWithPopup();
  
  if (!result.success) {
    console.error('Authentication failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## 🎯 Browser Support

- Chrome 80+
- Firefox 74+
- Safari 13.1+
- Edge 80+

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

## 🤝 Contributing

See the main [repository README](../README.md) for contribution guidelines.