# 🚀 Deployment Guide

## Overview

This project consists of two parts:
1. **Frontend** (React) - Can be deployed to Vercel
2. **Backend** (Express + Socket.IO) - Needs a service that supports persistent servers

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- Backend deployed and running (see Backend Deployment)

### Steps

1. **Connect your GitHub repository to Vercel**

2. **Set Environment Variables in Vercel:**
   - Go to your project settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://your-backend-url.com/api
     VITE_SOCKET_URL=https://your-backend-url.com
     ```

3. **Deploy:**
   - Vercel will automatically deploy on every push to main
   - Or manually trigger from Vercel dashboard

## Backend Deployment

Vercel **cannot** run persistent servers (Express + Socket.IO). You need to deploy the backend to a service that supports it.

### Option 1: Railway (Recommended)

1. **Sign up at [railway.app](https://railway.app)**

2. **Create a new project:**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Initialize
   railway init
   ```

3. **Configure:**
   - Set start command: `npm run start:web`
   - Set root directory: `.`
   - Add environment variables:
     - `PORT=3001` (Railway will set this automatically)
     - `HOST=0.0.0.0`
     - Add your RPC URL if needed

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get your URL:**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Use this URL in Vercel environment variables

### Option 2: Render

1. **Sign up at [render.com](https://render.com)**

2. **Create a new Web Service:**
   - Connect your GitHub repository
   - Build command: `npm install && cd web && npm install && cd .. && npm run build:web`
   - Start command: `npm run start:web`
   - Environment: `Node`

3. **Environment Variables:**
   - `PORT=3001`
   - `HOST=0.0.0.0`
   - Add your RPC URL if needed

4. **Deploy:**
   - Render will automatically deploy

### Option 3: Fly.io

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create app:**
   ```bash
   fly launch
   ```

3. **Configure `fly.toml`:**
   ```toml
   [build]
     builder = "paketobuildpacks/builder:base"
   
   [env]
     PORT = "3001"
     HOST = "0.0.0.0"
   
   [[services]]
     internal_port = 3001
     protocol = "tcp"
   ```

4. **Deploy:**
   ```bash
   fly deploy
   ```

## Environment Variables

### Frontend (Vercel)
- `VITE_API_URL` - Backend API URL (e.g., `https://your-backend.railway.app/api`)
- `VITE_SOCKET_URL` - Socket.IO server URL (e.g., `https://your-backend.railway.app`)

### Backend (Railway/Render/Fly.io)
- `PORT` - Server port (usually auto-set by platform)
- `HOST` - Server host (`0.0.0.0` for all interfaces)
- `RPC_URL` - Solana RPC endpoint (optional)

## Testing Deployment

1. **Check backend is running:**
   ```bash
   curl https://your-backend-url.com/api/health
   ```

2. **Check frontend can connect:**
   - Open browser console
   - Should see: `✅ Connected to server`
   - Should NOT see: `❌ Connection error`

## Troubleshooting

### "Connection Lost" in Vercel
- ✅ Backend is deployed and running
- ✅ Environment variables are set in Vercel
- ✅ CORS is enabled in backend (already configured)
- ✅ Backend URL is correct (no trailing slash)

### Socket.IO Connection Issues
- Check that WebSocket is supported by your backend host
- Railway and Render support WebSockets
- Some free tiers may have limitations

### CORS Errors
- Backend already has CORS enabled for all origins
- If issues persist, check backend logs

## Quick Start

1. Deploy backend to Railway/Render
2. Get backend URL
3. Set `VITE_API_URL` and `VITE_SOCKET_URL` in Vercel
4. Deploy frontend to Vercel
5. Test connection


