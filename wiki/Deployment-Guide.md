# 🚀 Deployment Guide

Production deployment instructions for AeroVision.

---

## Backend Deployment

### Docker (Recommended)

Create a `Dockerfile` in `backend/`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for GDAL, rasterio
RUN apt-get update && apt-get install -y \
    gdal-bin libgdal-dev gcc g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

```bash
docker build -t aerovision-backend .
docker run -d -p 8000:8000 --env-file .env aerovision-backend
```

### Uvicorn Production Settings

| Setting | Development | Production |
|---|---|---|
| `--host` | `127.0.0.1` | `0.0.0.0` |
| `--workers` | 1 | 4+ (CPU cores) |
| `--reload` | Yes | No |
| `--log-level` | `debug` | `warning` |

### Environment Variables

- Set `APP_ENV=production`
- Update `CORS_ORIGINS` to your production frontend domain
- Use a production Supabase project (not free tier for heavy loads)

### Cloud Deployment Options

| Platform | Notes |
|---|---|
| **Railway** | Easy Docker deployment, auto-scaling |
| **Google Cloud Run** | Serverless containers, pay-per-use |
| **AWS ECS/Fargate** | Full container orchestration |
| **Azure Container Apps** | Managed container service |
| **VPS (DigitalOcean/Linode)** | Direct Docker or systemd |

---

## Frontend Deployment

### Build for Production

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Static Hosting Options

| Platform | Deploy Command |
|---|---|
| **Vercel** | `npx vercel deploy` or Git push |
| **Netlify** | Drag & drop `dist/` or Git push |
| **Firebase Hosting** | `firebase deploy` |
| **GitHub Pages** | Push `dist/` to `gh-pages` branch |
| **Nginx** | Serve `dist/` as static files |

### Environment Variables at Build Time

Frontend env vars are embedded during `npm run build`:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api npm run build
```

> ⚠️ Vite variables are **not** configurable at runtime — they must be set before build.

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/aerovision/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Database (Supabase)

### Production Recommendations

| Setting | Recommendation |
|---|---|
| Plan | Pro tier for production workloads |
| Region | Mumbai (`ap-south-1`) for lowest latency |
| PostGIS | Enable via SQL: `CREATE EXTENSION IF NOT EXISTS postgis;` |
| Backups | Enable point-in-time recovery |
| RLS | Enable Row Level Security policies |

### Connection Pooling

For high-traffic production use, enable Supabase connection pooling (Supavisor) and use the pooled connection string.

---

## Monitoring

### Backend Logging

AeroVision uses **Loguru** for structured logging. Configure log levels via `APP_ENV`:
- `development`: DEBUG level, console output
- `production`: WARNING level, file output recommended

### API Health Check

Monitor `/api/health` endpoint:
```json
{ "status": "healthy", "version": "1.2.0" }
```

Set up uptime monitoring (e.g., UptimeRobot, Better Uptime) to ping this endpoint.

### Frontend Latency Tracking

The Axios interceptor automatically measures API round-trip time and displays it in the header. In production, consider logging these metrics to an analytics service.

---

## SSL/HTTPS

- Frontend: Handled by hosting provider (Vercel, Netlify auto-issue SSL)
- Backend: Use a reverse proxy (Nginx, Caddy) with Let's Encrypt certificates
- Supabase: HTTPS by default

---

**← [[AI Insights & Report Generation]]** | **Next: [[Troubleshooting & Known Issues]] →**
