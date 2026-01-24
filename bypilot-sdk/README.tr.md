# ByPilot Business Signup SDK

**🇹🇷 Türkçe | [🇺🇸 English](README.md)**

Business hesaplar için OAuth ve Embedded Signup SDK'sı (WhatsApp, Instagram, Facebook vb.)

## 🚀 Kurulum

```bash
npm install bypilot-business-signup-sdk
```

## 📝 Hızlı Başlangıç

### WhatsApp Provider

```typescript
import { WhatsAppProvider } from 'bypilot-business-signup-sdk';

// Provider'ı başlat
const whatsapp = new WhatsAppProvider({
  clientId: 'meta_app_id_niz',
  configId: 'embedded_signup_config_id_niz',
  redirectUri: window.location.origin,
  storage: 'localStorage', // veya 'sessionStorage'
  graphApiVersion: 'v21.0', // isteğe bağlı
  sdkVersion: 'v21.0' // isteğe bağlı
});

// Popup ile giriş yap
try {
  const result = await whatsapp.loginWithPopup();
  
  if (result.success) {
    console.log('Access Token:', result.token.accessToken);
    console.log('Session Bilgisi:', result.sessionInfo);
  }
} catch (error) {
  console.error('Giriş başarısız:', error);
}

// Mevcut session'ı al
const token = whatsapp.getAccessToken();
const isAuthenticated = whatsapp.isAuthenticated();

// Çıkış yap
whatsapp.logout();
```

## 🔧 Yapılandırma

### WhatsApp Provider Seçenekleri

| Seçenek | Tip | Gerekli | Açıklama |
|---------|-----|---------|----------|
| `clientId` | string | ✅ | Meta App ID'niz |
| `configId` | string | ✅ | Embedded Signup Configuration ID |
| `redirectUri` | string | ✅ | Yönlendirme URI'si (Meta App'te kayıtlı olmalı) |
| `storage` | `'localStorage'` \| `'sessionStorage'` | ❌ | Token saklama türü (varsayılan: `localStorage`) |
| `graphApiVersion` | string | ❌ | Graph API versiyonu (varsayılan: `v21.0`) |
| `sdkVersion` | string | ❌ | Facebook SDK versiyonu (varsayılan: `v21.0`) |

## 📚 API Referansı

### WhatsAppProvider

#### Metodlar

##### `loginWithPopup(): Promise<AuthResult>`
WhatsApp Business kimlik doğrulama için popup açar.

**Dönüş:** `AuthResult` nesnesine çözümlenen Promise.

##### `logout(): void`
Saklanan token'ları ve session verilerini temizler.

##### `getAccessToken(): string | null`
Mevcut access token'ı döndürür, kimlik doğrulanmamışsa null.

##### `isAuthenticated(): boolean`
Kullanıcı şu anda kimlik doğrulanmışsa true döndürür.

##### `getSessionInfoListener(callback: (info: WhatsAppSessionInfo) => void): () => void`
Session bilgisi güncellemelerini dinler.

**Dönüş:** Abonelikten çıkma fonksiyonu.

#### Olaylar

Provider şu olayları yayar:

- `auth:start` - Kimlik doğrulama süreci başlatıldı
- `auth:success` - Kimlik doğrulama başarıyla tamamlandı
- `auth:error` - Kimlik doğrulama başarısız
- `auth:cancel` - Kullanıcı kimlik doğrulamayı iptal etti

```typescript
// Olayları dinle
const unsubscribe = whatsapp.on('auth:success', (result) => {
  console.log('Kimlik doğrulama başarılı!', result);
});

// Dinlemeyi durdurmayı unutmayın
unsubscribe();
```

### Tip Tanımlamaları

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
  phoneNumberId?: string;   // Telefon Numarası ID
  phoneNumber?: string;     // Telefon Numarası
  businessId?: string;      // Business Manager ID
}
```

## 🏗️ Kurulum Rehberi

### 1. Meta App Oluştur

1. [Meta for Developers](https://developers.facebook.com/)'a git
2. Yeni bir app oluştur
3. WhatsApp Business Platform ürününü ekle

### 2. Embedded Signup Yapılandır

1. Meta app'inde WhatsApp → Configuration'a git
2. Embedded Signup'ı ayarla
3. Domain'ini allowlist'e ekle
4. Configuration ID'ni al

### 3. Redirect URI Ayarla

Meta app ayarlarına redirect URI'nizi ekleyin:
- Geliştirme için: `http://localhost:3000`
- Production için: `https://yourdomain.com`

### 4. Uygulama

```typescript
const whatsapp = new WhatsAppProvider({
  clientId: 'META_APP_ID_NIZ',
  configId: 'CONFIG_ID_NIZ',
  redirectUri: window.location.origin
});
```

## 🔍 Hata Yönetimi

```typescript
try {
  const result = await whatsapp.loginWithPopup();
  
  if (!result.success) {
    console.error('Kimlik doğrulama başarısız:', result.error);
  }
} catch (error) {
  console.error('Beklenmeyen hata:', error);
}
```

## 🎯 Tarayıcı Desteği

- Chrome 80+
- Firefox 74+
- Safari 13.1+
- Edge 80+

## 📄 Lisans

MIT License - detaylar için [LICENSE](../LICENSE) dosyasına bakın.

## 🤝 Katkıda Bulunma

Katkı rehberi için ana [repository README](../README.md) dosyasına bakın.