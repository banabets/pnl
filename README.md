# 🚀 Pump.fun Trading Bot & Token Explorer

A comprehensive Solana trading bot and token explorer for pump.fun, featuring real-time token discovery, candlestick charts, and automated trading capabilities.

## ✨ Features

### 🔍 Token Explorer
- **Real-time Token Discovery**: Automatically discovers new tokens from pump.fun
- **Multiple Data Sources**: Integrates with pump.fun API, DexScreener, and WebSocket listeners
- **Candlestick Charts**: Japanese candlestick charts with OHLCV data
- **Token Filtering**: Filters out generic tokens and prioritizes recent listings
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 🤖 Trading Bot
- **Automated Trading**: Configure and execute trades on pump.fun tokens
- **Multiple Wallets**: Manage multiple trading wallets
- **Master Wallet**: Central wallet for fund management
- **Real-time Monitoring**: Track trades and positions in real-time

### 📊 Dashboard
- **Portfolio Overview**: View balances, P&L, and trading statistics
- **Transaction History**: Complete history of all trades
- **Wallet Management**: Create, manage, and recover wallets

## 🛠️ Tech Stack

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - REST API server
- **Socket.IO** - Real-time WebSocket communication
- **@solana/web3.js** - Solana blockchain interaction
- **@coral-xyz/anchor** - Solana program interaction

### Frontend
- **React** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Chart visualization
- **Socket.IO Client** - Real-time updates

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- A Solana RPC endpoint (Helius, QuickNode, etc.)

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bund
   ```

2. **Install dependencies**:
   ```bash
   # Root dependencies
   npm install
   
   # Frontend dependencies
   cd web
   npm install
   cd ..
   ```

3. **Configure environment** (optional):
   ```bash
   # Create .env file if needed
   # RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## 🚀 Running the Application

### Development Mode

Start the backend server:
```bash
npm run start:web
```

The server will start on `http://localhost:3001` and serve both the API and the React frontend.

### Production Mode

1. Build the frontend:
   ```bash
   cd web
   npm run build
   cd ..
   ```

2. Start the server:
   ```bash
   npm run start:web
   ```

## 📁 Project Structure

```
bund/
├── server/              # Backend server (Express + Socket.IO)
│   ├── index.ts        # Main server file
│   ├── config-persistence.ts
│   └── ...
├── web/                # Frontend React app
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── utils/      # Utilities
│   │   └── ...
│   └── ...
├── src/                # Shared source code
│   ├── pumpfun/        # Pump.fun integration
│   └── ...
└── package.json
```

## 🔌 API Endpoints

### Token Explorer
- `GET /api/pumpfun/tokens` - Get recent tokens
- `GET /api/pumpfun/token/:mint` - Get token details
- `GET /api/pumpfun/token/:mint/chart` - Get chart data
- `GET /api/pumpfun/token/:mint/trades` - Get trade history

### Trading
- `POST /api/pumpfun/trade` - Execute a trade
- `GET /api/wallets` - List trading wallets
- `POST /api/wallets/create` - Create new wallet
- `GET /api/master-wallet` - Get master wallet info

### WebSocket Events
- `token:new` - New token discovered
- `trade:update` - Trade execution update
- `balance:update` - Wallet balance update

## 🔒 Security

- **Private Keys**: Never commit private keys or keypairs to the repository
- **RPC Keys**: Keep your RPC API keys secure
- **Environment Variables**: Use `.env` files for sensitive configuration
- **Keypair Management**: Keypairs are stored locally and never transmitted

## ⚠️ Important Notes

- **Use at your own risk**: This is for educational purposes
- **Test thoroughly**: Always test with small amounts first
- **Not financial advice**: This tool is for learning and experimentation
- **Check regulations**: Trading bots may have legal implications in your jurisdiction

## 🐛 Known Issues

See [BUGS.md](./BUGS.md) for a complete list of known bugs and issues.

## 📝 Documentation

- [BUGS.md](./BUGS.md) - Known bugs and issues
- [FEATURES_ROADMAP.md](./FEATURES_ROADMAP.md) - Planned features
- [WEBSOCKET_API_COMPARISON.md](./WEBSOCKET_API_COMPARISON.md) - WebSocket API documentation
- [PUMPFUN_GUIDE.md](./PUMPFUN_GUIDE.md) - Pump.fun integration guide

## 🤝 Contributing

Contributions are welcome! Please:
- Test thoroughly before submitting PRs
- Follow the existing code style
- Document security considerations
- Update documentation as needed

## 📄 License

MIT License - See LICENSE file for details.

---

**⚠️ Disclaimer**: This software is provided "as is" without warranty. Use at your own risk. Always test with minimal amounts and understand the risks involved in automated trading.
