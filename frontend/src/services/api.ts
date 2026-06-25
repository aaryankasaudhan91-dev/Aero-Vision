/**
 * Centralized API service layer using Axios.
 * All API calls go through this service — no hardcoded URLs anywhere.
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    (config as any).metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with retry logic
apiClient.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any).metadata?.startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      window.dispatchEvent(new CustomEvent('api-latency', { detail: { duration } }));
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number; metadata?: { startTime: number } };
    const startTime = config?.metadata?.startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      window.dispatchEvent(new CustomEvent('api-latency', { detail: { duration } }));
    }

    if (!config) return Promise.reject(error);

    config._retryCount = config._retryCount || 0;
    if (config._retryCount >= 2) return Promise.reject(error);

    config._retryCount += 1;
    await new Promise((r) => setTimeout(r, 1000 * config._retryCount!));
    // Reset start time for retry
    config.metadata = { startTime: Date.now() };
    return apiClient(config);
  }
);

// ── AQI API ──
export const aqiApi = {
  getOverview: (params?: { date?: string; state?: string; city?: string }) =>
    apiClient.get('/aqi/', { params }),
  getStations: (params?: { state?: string; city?: string; is_active?: boolean }) =>
    apiClient.get('/aqi/stations', { params }),
  getObservations: (params?: { station_id?: string; start_date?: string; end_date?: string; state?: string; city?: string; limit?: number }) =>
    apiClient.get('/aqi/observations', { params }),
  getPredictions: (params?: { date?: string; start_date?: string; end_date?: string; model_name?: string; state?: string }) =>
    apiClient.get('/aqi/predictions', { params }),
  getMaps: (params?: { map_type?: string; date?: string; region_type?: string; region_name?: string }) =>
    apiClient.get('/aqi/maps', { params }),
  getTrends: (params: { start_date: string; end_date: string; state?: string; city?: string; pollutant?: string }) =>
    apiClient.get('/aqi/trends', { params }),
  getPollutantMaps: (params: { pollutant: string; date?: string }) =>
    apiClient.get('/aqi/pollutant-maps', { params }),
  getModelEvaluations: () =>
    apiClient.get('/aqi/models/evaluation'),
  getSummary: () =>
    apiClient.get('/aqi/summary'),
};

// ── HCHO API ──
export const hchoApi = {
  getOverview: (params?: { date?: string; state?: string; season?: string }) =>
    apiClient.get('/hcho/', { params }),
  getConcentrations: (params?: { start_date?: string; end_date?: string; state?: string }) =>
    apiClient.get('/hcho/concentrations', { params }),
  getHotspots: (params?: { start_date?: string; end_date?: string; method?: string; season?: string; state?: string; period_type?: string }) =>
    apiClient.get('/hcho/hotspots', { params }),
  getHotspotRegions: () =>
    apiClient.get('/hcho/hotspots/regions'),
  getSeasonalHotspots: (params: { season: string; year?: number }) =>
    apiClient.get('/hcho/hotspots/seasonal', { params }),
  getTrends: (params: { start_date: string; end_date: string; state?: string }) =>
    apiClient.get('/hcho/trends', { params }),
  getClimatology: (params?: { state?: string }) =>
    apiClient.get('/hcho/climatology', { params }),
};

// ── Fire API ──
export const fireApi = {
  getOverview: (params?: { date?: string; state?: string; source?: string }) =>
    apiClient.get('/fire/', { params }),
  getRecords: (params?: { start_date?: string; end_date?: string; state?: string; source?: string; fire_type?: string }) =>
    apiClient.get('/fire/records', { params }),
  getCorrelation: (params?: { region?: string; state?: string; season?: string }) =>
    apiClient.get('/fire/correlation', { params }),
  getCorrelationTimeseries: (params: { region: string; start_date: string; end_date: string }) =>
    apiClient.get('/fire/correlation/timeseries', { params }),
  getTrends: (params: { start_date: string; end_date: string; state?: string; granularity?: string }) =>
    apiClient.get('/fire/trends', { params }),
  getHeatmap: (params?: { start_date?: string; end_date?: string; resolution?: number }) =>
    apiClient.get('/fire/heatmap', { params }),
};

// ── Transport API ──
export const transportApi = {
  getOverview: (params?: { date?: string; source_region?: string }) =>
    apiClient.get('/transport/', { params }),
  getWindVectors: (params: { date: string; level?: string; bounds?: string }) =>
    apiClient.get('/transport/wind-vectors', { params }),
  getPathways: (params: { start_date: string; end_date: string; source_region?: string }) =>
    apiClient.get('/transport/pathways', { params }),
  getSourceAttribution: (params: { receptor_lat: number; receptor_lon: number; date: string; hours_back?: number }) =>
    apiClient.get('/transport/source-attribution', { params }),
};

// ── Insights API ──
export const insightsApi = {
  getAll: (params?: { insight_type?: string; region?: string; severity?: string; limit?: number }) =>
    apiClient.get('/insights/', { params }),
  getExecutiveSummary: () =>
    apiClient.get('/insights/summary'),
  generate: () =>
    apiClient.post('/insights/generate'),
  getAQIInsights: () =>
    apiClient.get('/insights/aqi'),
  getHCHOInsights: () =>
    apiClient.get('/insights/hcho'),
  getFireInsights: () =>
    apiClient.get('/insights/fire'),
  getTransportInsights: () =>
    apiClient.get('/insights/transport'),
};

// ── Reports API ──
export const reportsApi = {
  list: (params?: { report_type?: string; search?: string; start_date?: string; end_date?: string; limit?: number }) =>
    apiClient.get('/reports/', { params }),
  generate: (data: { report_type: string; title: string; include_sections?: string[] }) =>
    apiClient.post('/reports/generate', data),
  get: (id: number) =>
    apiClient.get(`/reports/${id}`),
  download: (id: number) =>
    apiClient.get(`/reports/${id}/download`),
  getDownloadUrl: (id: number) =>
    `${API_BASE_URL}/reports/${id}/download`,
};

// ── Weather API ──
export const weatherApi = {
  getForecast: (params: { start_date: string; variable?: string }) =>
    apiClient.get('/weather/forecast', { params }),
  getForecastCommentary: (params: { start_date: string; variable?: string }) =>
    apiClient.get('/weather/forecast/commentary', { params }),
  triggerForecast: (start_date: string) =>
    apiClient.post('/weather/forecast/trigger', { start_date }),
};

// ── Health Check ──
export const healthApi = {
  check: () => apiClient.get('/health'),
};

export default apiClient;
