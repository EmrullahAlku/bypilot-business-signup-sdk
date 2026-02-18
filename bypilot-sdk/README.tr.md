# ByPilot Business Signup SDK

**Turkce | [English](README.md)**

Business hesaplar icin OAuth ve Embedded Signup SDK'si (WhatsApp, Instagram, Facebook vb.)

## Kurulum

```bash
npm install bypilot-business-signup-sdk
```

## Hizli Baslangic

### WhatsApp Provider

```typescript
import { WhatsAppProvider } from "bypilot-business-signup-sdk";

// Provider'i baslat
const whatsapp = new WhatsAppProvider({
  clientId: "meta_app_id_niz",
  configId: "embedded_signup_config_id_niz",
  redirectUri: window.location.origin,
  storage: "localStorage", // veya 'sessionStorage'
  graphApiVersion: "v24.0", // istege bagli
  sdkVersion: "v24.0", // istege bagli
});

// Popup ile giris yap
try {
  const result = await whatsapp.loginWithPopup();

  if (result.success) {
    console.log("Authorization Code:", result.token.code);
    console.log("Session Bilgisi:", result.raw?.sessionInfo);
  }
} catch (error) {
  console.error("Giris basarisiz:", error);
}

// Mevcut authorization code'u al
const code = whatsapp.getCode();
const isAuthenticated = whatsapp.isAuthenticated();

// Cikis yap
whatsapp.logout();
```

## Yapilandirma

### WhatsApp Provider Secenekleri

| Secenek           | Tip                                    | Gerekli | Aciklama                                         |
| ----------------- | -------------------------------------- | ------- | ------------------------------------------------ |
| `clientId`        | string                                 | Evet    | Meta App ID'niz                                  |
| `configId`        | string                                 | Evet    | Embedded Signup Configuration ID                 |
| `redirectUri`     | string                                 | Evet    | Yonlendirme URI'si (Meta App'te kayitli olmali)  |
| `storage`         | `'localStorage'` \| `'sessionStorage'` | Hayir   | Token saklama turu (varsayilan: `localStorage`)  |
| `graphApiVersion` | string                                 | Hayir   | Graph API versiyonu (varsayilan: `v24.0`)        |
| `sdkVersion`      | string                                 | Hayir   | Facebook SDK versiyonu (varsayilan: `v24.0`)     |

## API Referansi

### WhatsAppProvider

#### Metodlar

##### `loginWithPopup(): Promise<AuthResult>`

WhatsApp Business kimlik dogrulama icin popup acar.

**Donus:** `AuthResult` nesnesine cozumlenen Promise.

##### `logout(): void`

Saklanan token'lari ve session verilerini temizler.

##### `getCode(): string | null`

Mevcut authorization code'u dondurur, kimlik dogrulanmamissa null.

##### `isAuthenticated(): boolean`

Kullanici su anda kimlik dogrulanmissa true dondurur.

##### `getSessionInfoListener(callback: (info: WhatsAppSessionInfo) => void): () => void`

Session bilgisi guncellemelerini dinler.

**Donus:** Abonelikten cikma fonksiyonu.

#### Olaylar

Provider su olaylari yayar:

- `auth:start` - Kimlik dogrulama sureci baslatildi
- `auth:success` - Kimlik dogrulama basariyla tamamlandi
- `auth:error` - Kimlik dogrulama basarisiz
- `auth:cancel` - Kullanici kimlik dogrulamayi iptal etti

```typescript
// Olaylari dinle
const unsubscribe = whatsapp.on("auth:success", (result) => {
  console.log("Kimlik dogrulama basarili!", result);
});

// Dinlemeyi durdurmayı unutmayin
unsubscribe();
```

### Tip Tanimlamalari

#### AuthResult

```typescript
interface AuthResult {
  success: boolean;
  token?: {
    code: string;
    tokenType: string;
    scope?: string;
  };
  error?: string;
  raw?: Record<string, unknown>;
}
```

#### WhatsAppSessionInfo

```typescript
interface WhatsAppSessionInfo {
  code: string; // Authorization code (backend'de token'a cevrilmeli)
  wabaId?: string; // WhatsApp Business Account ID
  phoneNumberId?: string; // Telefon Numarasi ID
  phoneNumber?: string; // Telefon Numarasi
  businessId?: string; // Business Manager ID
}
```

## Kurulum Rehberi

### 1. Meta App Olustur

1. [Meta for Developers](https://developers.facebook.com/)'a git
2. Yeni bir app olustur
3. WhatsApp Business Platform urununu ekle

### 2. Embedded Signup Yapilandir

1. Meta app'inde WhatsApp > Configuration'a git
2. Embedded Signup'i ayarla
3. Domain'ini allowlist'e ekle
4. Configuration ID'ni al

### 3. Redirect URI Ayarla

Meta app ayarlarina redirect URI'nizi ekleyin:

- Gelistirme icin: `http://localhost:3000`
- Production icin: `https://yourdomain.com`

### 4. Uygulama

```typescript
const whatsapp = new WhatsAppProvider({
  clientId: "META_APP_ID_NIZ",
  configId: "CONFIG_ID_NIZ",
  redirectUri: window.location.origin,
});
```

## Hata Yonetimi

```typescript
try {
  const result = await whatsapp.loginWithPopup();

  if (!result.success) {
    console.error("Kimlik dogrulama basarisiz:", result.error);
  }
} catch (error) {
  console.error("Beklenmeyen hata:", error);
}
```

## Tarayici Destegi

- Chrome 80+
- Firefox 74+
- Safari 13.1+
- Edge 80+

## Lisans

MIT License - detaylar icin [LICENSE](../LICENSE) dosyasina bakin.

## Katkida Bulunma

Katki rehberi icin ana [repository README](../README.md) dosyasina bakin.
