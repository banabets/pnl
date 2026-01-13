# 🌐 Web Interface Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd web
npm install
cd ..
```

### 2. Build Everything

```bash
# Build TypeScript backend
npm run build

# Build React frontend
npm run build:web
```

### 3. Start the Server

```bash
# Start the web server (runs on port 3001)
npm run start:web
```

### 4. Access the Web Interface

Open your browser and go to:
```
http://localhost:3001
```

## 📁 Project Structure

```
bund/
├── server/
│   └── index.ts          # Express.js backend server
├── web/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── utils/       # API utilities
│   │   └── App.tsx      # Main app component
│   └── package.json      # Frontend dependencies
└── package.json          # Backend dependencies
```

## 🎯 Features

### Dashboard
- Real-time statistics
- Wallet overview
- Recent activity
- Charts and metrics

### Wallets Management
- Generate trading wallets
- View wallet balances
- Cleanup wallets

### Pump.fun Bot
- Configure pump parameters
- Execute pumps
- View results and signatures
- Real-time updates via WebSocket

### Master Wallet
- Create master wallet
- Distribute funds
- Recover funds
- Withdraw funds

### Configuration
- Toggle simulation mode
- View current settings

## 🔧 Development Mode

For development with hot reload:

```bash
# Terminal 1: Start backend
npm run dev:web

# Terminal 2: Start frontend dev server
cd web
npm run dev
```

Frontend will run on `http://localhost:3000` and proxy API calls to backend on `http://localhost:3001`.

## 📡 API Endpoints

All API endpoints are prefixed with `/api`:

- `GET /api/health` - Health check
- `GET /api/config` - Get configuration
- `POST /api/config/simulation` - Toggle simulation mode
- `GET /api/wallets` - Get wallets
- `POST /api/wallets/generate` - Generate wallets
- `POST /api/wallets/cleanup` - Cleanup wallets
- `GET /api/master-wallet` - Get master wallet info
- `POST /api/master-wallet/create` - Create master wallet
- `POST /api/master-wallet/withdraw` - Withdraw from master
- `POST /api/funds/distribute-from-master` - Distribute funds
- `POST /api/funds/recover-to-master` - Recover funds
- `POST /api/pumpfun/execute` - Execute pump.fun bot
- `POST /api/pumpfun/stop` - Stop pump.fun bot

## 🔌 WebSocket Events

The server broadcasts events via Socket.IO:

- `wallets:generated` - Wallets generated
- `wallets:cleaned` - Wallets cleaned
- `master-wallet:created` - Master wallet created
- `master-wallet:withdrawn` - Funds withdrawn
- `funds:distributed` - Funds distributed
- `funds:recovered` - Funds recovered
- `pumpfun:completed` - Pump execution completed
- `pumpfun:error` - Pump execution error
- `pumpfun:stopped` - Pump execution stopped
- `config:updated` - Configuration updated

## 🛠️ Troubleshooting

### Port Already in Use
If port 3001 is already in use, set a different port:
```bash
PORT=3002 npm run start:web
```

### Frontend Not Loading
Make sure you've built the frontend:
```bash
npm run build:web
```

### API Calls Failing
Check that the backend server is running and accessible at `http://localhost:3001`.

### WebSocket Not Connecting
Check browser console for connection errors. Make sure CORS is properly configured.

## 🔒 Security Notes

- The web interface runs **locally only** by default
- All data stays on your machine
- No external connections (except to Solana RPC)
- Private keys never leave your system

## 📝 Next Steps

1. **Customize the UI**: Edit components in `web/src/components/`
2. **Add Features**: Extend the API in `server/index.ts`
3. **Add Charts**: Use Recharts (already included) for more visualizations
4. **Add Authentication**: If you want to expose it to your network

---

**Enjoy your local web interface! 🎉**

