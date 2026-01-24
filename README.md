# ByPilot Business Signup SDK

Business hesaplar için OAuth ve Embedded Signup SDK'sı (WhatsApp, Instagram, Facebook vb.)

## 📦 Paketler

Bu monorepo 2 paket içerir:

- **`bypilot-sdk/`** - Ana SDK paketi
- **`playground/`** - Test ve demo uygulaması

## 🚀 Kurulum

```bash
# Tüm bağımlılıkları yükle
npm install

# SDK'yı build et
npm run build

# Local geliştirme için link'le
npm run link:local
```

## 🔧 Geliştirme

```bash
# SDK'yı watch modda çalıştır
npm run dev:sdk

# Playground'u geliştirici modunda çalıştır
npm run dev:playground

# Her ikisini birden build et
npm run build:all
```

## 📝 Kullanım

### NPM'den Yükleme

```bash
npm install bypilot-business-signup-sdk
```

### WhatsApp Provider

```typescript
import { WhatsAppProvider } from "bypilot-business-signup-sdk";

const whatsapp = new WhatsAppProvider({
  clientId: "your_client_id",
  configId: "your_config_id",
  redirectUri: window.location.origin,
  storage: "localStorage",
});

// Login with popup
const result = await whatsapp.loginWithPopup();
```

## 🏗️ Playground

Playground, SDK'yı test etmek için hazır React uygulamasıdır:

```bash
cd playground
npm run dev
```

## 📚 API Dokümantasyonu

Detaylı API dokümantasyonu için `bypilot-sdk/` klasörüne bakın.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.
