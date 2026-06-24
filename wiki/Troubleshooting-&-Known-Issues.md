# 🔧 Troubleshooting & Known Issues

Common problems and solutions when running AeroVision.

---

## Backend Issues

### Supabase Connection `ENOTFOUND`

**Symptom:** Backend crashes on startup with `getaddrinfo ENOTFOUND` error.

**Cause:** Invalid `SUPABASE_URL` in `backend/.env`.

**Solution:**
1. Verify the URL includes `https://` prefix
2. Confirm the URL matches your Supabase dashboard (Settings → API → Project URL)
3. Check for typos — the format should be: `https://abcdefghijklmnop.supabase.co`

---

### GDAL Import Error

**Symptom:** `ModuleNotFoundError: No module named 'osgeo'` or GDAL build failure during `pip install`.

**Solution:**
- **Windows:** Install prebuilt wheels from [geospatial-wheels](https://github.com/cgohlke/geospatial-wheels/) or use conda:
  ```bash
  conda install -c conda-forge gdal=3.10
  ```
- **Linux:** Install system GDAL first:
  ```bash
  sudo apt-get install gdal-bin libgdal-dev
  pip install gdal==3.10.0
  ```
- **macOS:** `brew install gdal` then `pip install gdal`

---

### NetCDF Loading Fails (Emoji Path Issue)

**Symptom:** `xarray.open_dataset()` fails when the project is in a path containing emoji characters (e.g., `💖`).

**Cause:** The `netCDF4` C library cannot handle Unicode emoji in file paths on some systems.

**Solution:** Already handled in code — `ERA5Ingestion` in `data_ingestion.py` automatically copies NetCDF files to a safe `tempfile` directory before loading. Ensure your user account has write access to the system temp directory.

---

### GEE Authentication Failure

**Symptom:** `ee.Initialize()` fails with authentication error.

**Checklist:**
1. ✅ Service account JSON file exists at the path specified in `GEE_SERVICE_ACCOUNT_PATH`
2. ✅ Earth Engine API is enabled in your Google Cloud project
3. ✅ Service account email is registered at [signup.earthengine.google.com](https://signup.earthengine.google.com/#!/service_accounts)
4. ✅ `GEE_PROJECT_ID` matches your Google Cloud project ID

---

### FIRMS 429 Rate Limit

**Symptom:** NASA FIRMS API returns HTTP 429 error.

**Types:**
- **`minute_limit`**: Too many requests per minute → pipeline auto-retries after 20 seconds
- **`daily_limit`**: Daily download quota exceeded → wait until next day or request higher quota

---

### Port 8000 Already in Use

**Symptom:** `Address already in use` when starting uvicorn.

**Solution (Windows):**
```powershell
netstat -ano | findstr :8000
taskkill /PID <pid> /F
```

**Solution (Linux/macOS):**
```bash
lsof -i :8000
kill -9 <pid>
```

---

### Microsoft Visual C++ Build Error

**Symptom:** `error: Microsoft Visual C++ 14.0 or greater is required` during `pip install`.

**Solution:** Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) → select "Desktop development with C++".

---

## Frontend Issues

### Map Tiles Not Loading

**Symptom:** Map shows gray/empty background without tiles.

**Cause:** CARTO Voyager tile server requires internet connectivity.

**Solution:** Check network connection. The tiles load from `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`.

---

### Empty Dashboard Data

**Symptom:** Dashboard loads but shows "No Data" or empty charts.

**Checklist:**
1. ✅ Backend is running on port 8000
2. ✅ `VITE_API_BASE_URL` in `frontend/.env` is set to `http://localhost:8000/api`
3. ✅ Check browser DevTools → Network tab for failed API calls
4. ✅ Check browser DevTools → Console for CORS errors

---

### Three.js 3D Globe Black Screen

**Symptom:** 3D globe view shows a black screen.

**Cause:** WebGL is not enabled or supported in the browser.

**Solution:** Enable WebGL in browser settings. Test at [get.webgl.org](https://get.webgl.org/).

---

### CORS Errors

**Symptom:** Browser console shows `Access-Control-Allow-Origin` errors.

**Solution:** Update `CORS_ORIGINS` in `backend/.env` to include your frontend URL:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Data Issues

### Transport Dashboard Shows No Data

**Symptom:** Wind vectors and transport analysis panels are empty.

**Cause:** `meteorological_data` table has no entries for the selected date.

**Solution:** Run the ERA5 ingestion pipeline:
```python
from app.pipelines.data_ingestion import ERA5Ingestion
import asyncio
era5 = ERA5Ingestion()
asyncio.run(era5.ingest_from_netcdf("era5_2026-06-18.nc"))
```

---

### HCHO Hotspots Table Empty

**Symptom:** HCHO dashboard shows no detected hotspots.

**Cause:** Hotspot detection hasn't been run, or `tropomi_products` has no HCHO data.

**Solution:**
1. Verify `tropomi_products` has HCHO records: check Supabase for `product_type = 'HCHO'`
2. Run hotspot detection:
```python
from app.ml.hcho_hotspot import HCHOHotspotDetector
import asyncio
detector = HCHOHotspotDetector()
asyncio.run(detector.detect_hotspots("2026-06-01", "2026-06-22"))
```

---

### AQI Shows "No Data" for Selected Date/State

**Symptom:** AQI dashboard is empty for specific filter combinations.

**Cause:** `cpcb_observations` has no records matching the selected date and state.

**Solution:** Check Supabase for data availability. Run CPCB ingestion if needed:
```python
from app.pipelines.data_ingestion import CPCBIngestion
import asyncio
cpcb = CPCBIngestion()
# Fetch and ingest for a specific station
```

---

## Performance Tips

| Issue | Solution |
|---|---|
| Slow map rendering | Reduce IDW grid resolution or use Grid mode instead of Smooth |
| Backend response slow | Check Supabase query performance; add indexes on frequently filtered columns |
| Large NetCDF files | ERA5 ingestion subsamples every 4th grid point by default |
| Memory usage high | Batch sizes are capped at 500 records; reduce if needed |

---

**← [[Deployment Guide]]** | **Back to [[Home]] →**
