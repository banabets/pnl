# Vercel Configuration for pnl.onl

## Assigned Domains

Your Vercel project has the following domains:
- **Production**: `www.pnl.onl`
- **Preview**: `pnl-snowy-zeta.vercel.app`
- **Team**: `pnl-banabets-projects.vercel.app`

## Required Environment Variables

### In Vercel Dashboard:

Go to: **Settings → Environment Variables**

Add these variables for **Production**, **Preview**, and **Development**:

```
VITE_API_URL=https://your-backend-url.com/api
VITE_SOCKET_URL=https://your-backend-url.com
```

**Important**: Replace `your-backend-url.com` with your actual backend URL (Railway, Render, etc.)

## Backend Deployment Required

⚠️ **Critical**: Vercel cannot run the backend server (Express + Socket.IO).

You **must** deploy the backend separately to:
- Railway (recommended)
- Render
- Fly.io
- Or any service that supports persistent Node.js servers

## Quick Setup Steps

1. **Deploy Backend** (if not done):
   ```bash
   # Railway example
   railway login
   railway init
   railway up
   ```

2. **Get Backend URL**:
   - Railway: `https://your-app.railway.app`
   - Render: `https://your-app.onrender.com`

3. **Set Environment Variables in Vercel**:
   - `VITE_API_URL=https://your-backend.railway.app/api`
   - `VITE_SOCKET_URL=https://your-backend.railway.app`

4. **Redeploy**:
   - Vercel will auto-deploy on next push
   - Or manually trigger from dashboard

## Testing

After deployment, test:
1. Visit `www.pnl.onl`
2. Open browser console
3. Should see: `✅ Connected to server`
4. Should NOT see: `❌ Connection error`

## Custom Domain Setup

If you want to use `pnl.onl` (without www):
1. Go to Vercel Dashboard → Settings → Domains
2. Add `pnl.onl` as a domain
3. Configure DNS records as instructed by Vercel

## Troubleshooting

### "Connection Lost" still appears
- ✅ Verify backend is deployed and running
- ✅ Check backend URL is correct in environment variables
- ✅ Ensure no trailing slashes in URLs
- ✅ Test backend health: `curl https://your-backend-url.com/api/health`

### CORS Errors
- Backend already has CORS enabled
- Check backend logs if issues persist

### Socket.IO not connecting
- Verify WebSocket support on backend host
- Check that `VITE_SOCKET_URL` uses `https://` (not `http://`)
- Some free tiers may limit WebSocket connections

