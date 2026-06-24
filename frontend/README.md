# AeroVision — Frontend

React 19 + TypeScript + Vite single-page application for the AeroVision geospatial intelligence platform.

## Tech Stack

- **React 19** + **TypeScript 6**
- **Vite 8** (dev server + production build)
- **Tailwind CSS v4** (utility-first styling)
- **Leaflet + react-leaflet** (2D interactive maps)
- **Three.js** (3D globe rendering)
- **Recharts** (Area, Line, Bar, Radar charts)
- **Axios** (HTTP client with request-time interceptors)

## Development

```bash
npm install
npm run dev       # Start dev server at http://localhost:5173
npm run build     # TypeScript compile + Vite production bundle
npm run lint      # ESLint check
npm run preview   # Preview the production build locally
```

## Environment

Create a `.env` file from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Dashboard Modules

| Component | Route Tab | Data Source |
|---|---|---|
| `AqiDashboard.tsx` | `aqi` | CPCB ground stations |
| `PollutantDashboard.tsx` | `pollutants` | CPCB observations |
| `HealthDashboard.tsx` | `health` | AQI + NASA FIRMS + TROPOMI combined |
| `HchoDashboard.tsx` | `hcho` | TROPOMI HCHO satellite |
| `FireDashboard.tsx` | `fire` | NASA FIRMS active fires |
| `TransportDashboard.tsx` | `transport` | ERA5 wind vectors |
| `WeatherDashboard.tsx` | `weather` | FourCastNet AI forecast |
| `InsightsDashboard.tsx` | `insights` | Gemini AI alerts |
| `ReportsDashboard.tsx` | `reports` | PDF report service |

## Real-Time Architecture

- `api.ts` interceptors track per-request round-trip latency and broadcast `api-latency` events
- `App.tsx` listens to latency events and updates the header's Server Latency & Last Sync indicators
- A 15-second interval dispatches `refresh-active-dashboard` events
- Each dashboard component subscribes to `refresh-active-dashboard` to silently re-fetch data
