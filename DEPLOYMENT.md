# 🚀 Deployment Guide - PNL.onl

Guía completa para desplegar PNL.onl en producción.

## 📋 Requisitos Previos

- Ubuntu 20.04+ / Debian 11+
- 2GB RAM mínimo (4GB recomendado)
- Docker y Docker Compose
- MongoDB (local o MongoDB Atlas)
- Helius API Key

## 🐳 Docker Deployment

### 1. Instalar Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Configurar .env
```bash
cp .env.example .env
nano .env
```

### 3. Iniciar Servicios
```bash
docker compose up -d
```

### 4. Verificar
```bash
curl http://localhost:3000/health
```

## 📊 Monitoreo

- Health: `/health`
- Metrics: `/metrics`
- Logs: `docker compose logs -f app`

