# ByPilot Business Signup SDK

**[🇹🇷 Türkçe](README.tr.md) | 🇺🇸 English**

OAuth and Embedded Signup SDK for business accounts (WhatsApp, Instagram, Facebook, etc.)

## 📦 Packages

This monorepo contains 2 packages:

- **`bypilot-sdk/`** - Main SDK package
- **`playground/`** - Test and demo application

## 🚀 Installation

```bash
# Install all dependencies
npm install

# Build the SDK
npm run build

# Link for local development
npm run link:local
```

## 🔧 Development

```bash
# Run SDK in watch mode
npm run dev:sdk

# Run playground in development mode
npm run dev:playground

# Build both packages
npm run build:all
```

## 📝 Usage

### Install from NPM

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

The playground is a ready-to-use React application for testing the SDK:

```bash
cd playground
npm run dev
```

## 📚 API Documentation

For detailed API documentation, see the `bypilot-sdk/` folder.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.
