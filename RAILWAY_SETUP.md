# 🚂 Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI** (optional but recommended):
   ```bash
   npm install -g @railway/cli
   ```

## Quick Start

### Option 1: Using Railway CLI (Recommended)

```bash
# 1. Login to Railway
railway login

# 2. Initialize Railway project (from project root)
cd /Users/g/Desktop/bund
railway init

# 3. Link to existing project (if you already created one in dashboard)
# railway link

# 4. Deploy
railway up
```

### Option 2: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `banabets/pnl`
5. Railway will automatically detect it's a Node.js project
6. Configure the service:
   - **Root Directory**: `.` (root of repo)
   - **Build Command**: `npm install && npm run build:server`
   - **Start Command**: `npm run start:server`
   - **Watch Paths**: `server/**`

## Environment Variables

Railway will automatically set `PORT` and `HOST`. You may need to add:

### Required Variables

Go to **Railway Dashboard → Your Service → Variables** and add:

```
HOST=0.0.0.0
PORT=3001
```

### Optional Variables

If you need custom RPC endpoints or other config:

```
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NODE_ENV=production
```

## Configuration Files

The project includes:
- **`railway.json`**: Railway-specific configuration
- **`package.json`**: Contains build and start scripts

## Build Process

Railway will:
1. Install dependencies: `npm install`
2. Build TypeScript: `npm run build:server` (compiles to `dist/`)
3. Start server: `npm run start:server` (runs `ts-node server/index.ts`)

## Getting Your Backend URL

After deployment:

1. Go to **Railway Dashboard → Your Service**
2. Click on the service
3. Go to **Settings → Networking**
4. Click **"Generate Domain"** (if not auto-generated)
5. Copy the URL (e.g., `https://your-app.railway.app`)

## Update Vercel Environment Variables

Once you have your Railway URL:

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Add/Update:
   ```
   VITE_API_URL=https://your-app.railway.app/api
   VITE_SOCKET_URL=https://your-app.railway.app
   ```
3. Redeploy Vercel (or wait for auto-deploy)

## Monitoring

### View Logs
```bash
railway logs
```

Or in Railway Dashboard:
- Go to **Your Service → Deployments → Click on latest deployment → View Logs**

### Check Health
```bash
curl https://your-app.railway.app/api/health
```

## Troubleshooting

### Build Fails
- ✅ Check that all dependencies are in `package.json`
- ✅ Verify TypeScript compiles: `npm run build:server`
- ✅ Check Railway logs for specific errors

### Server Won't Start
- ✅ Verify `PORT` is set (Railway sets this automatically)
- ✅ Check `HOST=0.0.0.0` is set
- ✅ Review logs: `railway logs`

### Connection Issues from Frontend
- ✅ Verify Railway URL is correct
- ✅ Check CORS is enabled (already configured in `server/index.ts`)
- ✅ Ensure WebSocket is supported (Railway supports it)
- ✅ Test backend directly: `curl https://your-app.railway.app/api/health`

### TypeScript Errors
- ✅ Run locally first: `npm run build:server`
- ✅ Fix any TypeScript errors before deploying
- ✅ Check `tsconfig.json` includes all necessary files

## Railway Free Tier Limits

- **$5 credit/month** (usually enough for small projects)
- **500 hours/month** of usage
- **Auto-sleep** after inactivity (wakes on request)

### Keep Server Awake (Optional)

If you want to prevent auto-sleep, you can:
1. Upgrade to paid plan
2. Use a cron job to ping your server
3. Use Railway's "Always On" feature (if available)

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Get Railway URL
3. ✅ Update Vercel environment variables
4. ✅ Test connection from `www.pnl.onl`
5. ✅ Verify Socket.IO connection works

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)

