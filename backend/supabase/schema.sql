-- Project AeroVision — Supabase PostgreSQL Schema
-- Surface AQI & HCHO Hotspot Detection over India

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 1. CPCB Ground Stations
CREATE TABLE IF NOT EXISTS cpcb_stations (
    id BIGSERIAL PRIMARY KEY,
    station_id TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    elevation_m DOUBLE PRECISION,
    station_type TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cpcb_stations_geom ON cpcb_stations USING GIST (geom);
CREATE INDEX idx_cpcb_stations_state ON cpcb_stations (state);

-- 2. CPCB Observations
CREATE TABLE IF NOT EXISTS cpcb_observations (
    id BIGSERIAL PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES cpcb_stations(station_id),
    observed_at TIMESTAMPTZ NOT NULL,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    nh3 DOUBLE PRECISION,
    aqi INTEGER,
    aqi_category TEXT,
    prominent_pollutant TEXT,
    quality_flag INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(station_id, observed_at)
);
CREATE INDEX idx_cpcb_obs_time ON cpcb_observations (observed_at);
CREATE INDEX idx_cpcb_obs_station_time ON cpcb_observations (station_id, observed_at);

-- 3. Satellite AOD (INSAT-3D)
CREATE TABLE IF NOT EXISTS satellite_aod (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'INSAT-3D',
    observed_date DATE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    aod_550nm DOUBLE PRECISION NOT NULL,
    cloud_fraction DOUBLE PRECISION,
    qa_flag DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sat_aod_geom ON satellite_aod USING GIST (geom);
CREATE INDEX idx_sat_aod_date ON satellite_aod (observed_date);

-- 4. TROPOMI Products
CREATE TABLE IF NOT EXISTS tropomi_products (
    id BIGSERIAL PRIMARY KEY,
    product_type TEXT NOT NULL,
    observed_date DATE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    column_value DOUBLE PRECISION NOT NULL,
    column_unit TEXT NOT NULL,
    tropospheric_column DOUBLE PRECISION,
    qa_value DOUBLE PRECISION,
    cloud_fraction DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tropomi_geom ON tropomi_products USING GIST (geom);
CREATE INDEX idx_tropomi_type_date ON tropomi_products (product_type, observed_date);

-- 5. Meteorological Data
CREATE TABLE IF NOT EXISTS meteorological_data (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    observed_date DATE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    temperature_2m DOUBLE PRECISION,
    relative_humidity DOUBLE PRECISION,
    wind_speed_10m DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    u_wind_10m DOUBLE PRECISION,
    v_wind_10m DOUBLE PRECISION,
    u_wind_850hpa DOUBLE PRECISION,
    v_wind_850hpa DOUBLE PRECISION,
    pbl_height DOUBLE PRECISION,
    total_precipitation DOUBLE PRECISION,
    surface_pressure DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_meteo_geom ON meteorological_data USING GIST (geom);
CREATE INDEX idx_meteo_source_date ON meteorological_data (source, observed_date);

-- 6. Fire Records (MODIS + VIIRS)
CREATE TABLE IF NOT EXISTS fire_records (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    detected_date DATE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    frp DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    satellite TEXT,
    daynight TEXT,
    state TEXT,
    district TEXT,
    fire_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fire_geom ON fire_records USING GIST (geom);
CREATE INDEX idx_fire_date ON fire_records (detected_date);
CREATE INDEX idx_fire_source ON fire_records (source);
