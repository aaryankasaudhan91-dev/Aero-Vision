# 🔑 Environment Variables & API Keys

Complete guide to obtaining and configuring all credentials required by AeroVision.

---

## Backend `.env` Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values below.

### 🗄️ Supabase (Required)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase anonymous (public) API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | Direct PostgreSQL connection string |

**How to obtain:**
1. Go to [supabase.com](https://supabase.com) → your project → **Settings → API**
2. Copy **Project URL** → `SUPABASE_URL`
3. Copy **`anon` public key** → `SUPABASE_KEY`
4. Copy **`service_role` secret** → `SUPABASE_SERVICE_ROLE_KEY`
5. **Settings → Database** → Connection string → `DATABASE_URL`

> ⚠️ `SUPABASE_URL` must include `https://` prefix. Missing it causes `ENOTFOUND` errors.

---

### 🌍 Google Earth Engine (Required for Satellite Data)

| Variable | Description |
|---|---|
| `GEE_PROJECT_ID` | Google Cloud project ID with Earth Engine API enabled |
| `GEE_SERVICE_ACCOUNT_PATH` | Path to GEE service account JSON |

**How to obtain:**
1. [Google Cloud Console](https://console.cloud.google.com) → create/select project
2. Enable **Earth Engine API** (APIs & Services → Library)
3. IAM → Service Accounts → Create → Download JSON key
4. Place JSON in `backend/credentials/`
5. Register at [signup.earthengine.google.com](https://signup.earthengine.google.com/#!/service_accounts)

---

### 🔥 NASA FIRMS (Required for Fire Data)

| Variable | Description |
|---|---|
| `FIRMS_MAP_KEY` | NASA FIRMS active fire API key |

**How to obtain:**
1. Go to [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/) → "Get Map Key"
2. Enter email → receive key via email

> Rate limits: 10 req/min + daily cap. Pipeline handles 429 errors automatically.

---

### 🌦️ Copernicus CDS (Required for ERA5 Weather)

| Variable | Description |
|---|---|
| `CDS_API_KEY` | Copernicus CDS API key (format: `UID:API-KEY`) |
| `CDS_API_URL` | `https://cds.climate.copernicus.eu/api` |

**How to obtain:** Register at [CDS](https://cds.climate.copernicus.eu) → accept ERA5 license → User Profile → API key.

---

### 🤖 Google Gemini (Required for AI Insights)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini generative AI key |

**How to obtain:** [Google AI Studio](https://aistudio.google.com/apikey) → Create API Key.

---

### 🛰️ MOSDAC (Optional — INSAT-3D AOD)

| Variable | Description |
|---|---|
| `MOSDAC_USERNAME` | MOSDAC account email |
| `MOSDAC_PASSWORD` | MOSDAC password |

Register at [mosdac.gov.in](https://mosdac.gov.in).

---

### ⚙️ Application Settings

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | `development` or `production` |
| `APP_HOST` | `0.0.0.0` | Server bind address |
| `APP_PORT` | `8000` | Server port |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated frontend URLs |

---

## Frontend `.env`

| Variable | Default |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` |

> `VITE_` prefixed variables are embedded at **build time**.

---

## MOSDAC `config.json` (Standalone Downloader)

The `mdapi.py` tool uses `config.json` (not `.env`). See `config.json` in the project root. **Never commit real credentials** — it's in `.gitignore`.

---

## Credential Checklist

| Service | Required? | Impact if Missing |
|---|---|---|
| Supabase | ✅ Critical | App won't start |
| Google Earth Engine | ✅ High | No TROPOMI data |
| NASA FIRMS | ✅ High | No fire data |
| Copernicus CDS | ✅ High | No ERA5 weather data |
| Google Gemini | ✅ High | No AI insights |
| MOSDAC | ⚡ Optional | No INSAT-3D AOD |

---

**← [[Installation & Setup]]** | **Next: [[System Architecture]] →**
