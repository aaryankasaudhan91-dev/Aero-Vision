-- Project AeroVision — Schema Part 2: Predictions, Hotspots, Analysis

-- 7. Model Predictions
CREATE TABLE IF NOT EXISTS model_predictions (
    id BIGSERIAL PRIMARY KEY,
    model_name TEXT NOT NULL,
    prediction_date DATE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    pm25_predicted DOUBLE PRECISION,
    no2_predicted DOUBLE PRECISION,
    so2_predicted DOUBLE PRECISION,
    co_predicted DOUBLE PRECISION,
    o3_predicted DOUBLE PRECISION,
    aqi_predicted INTEGER,
    aqi_category TEXT,
    confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_predictions_geom ON model_predictions USING GIST (geom);
CREATE INDEX idx_predictions_date ON model_predictions (prediction_date);
CREATE INDEX idx_predictions_model ON model_predictions (model_name);

-- 8. AQI Maps
CREATE TABLE IF NOT EXISTS aqi_maps (
    id BIGSERIAL PRIMARY KEY,
    map_type TEXT NOT NULL,
    map_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    region_type TEXT NOT NULL,
    region_name TEXT,
    state TEXT,
    boundary_geom GEOMETRY(MultiPolygon, 4326),
    avg_aqi DOUBLE PRECISION,
    max_aqi DOUBLE PRECISION,
    min_aqi DOUBLE PRECISION,
    dominant_pollutant TEXT,
    aqi_category TEXT,
    pm25_avg DOUBLE PRECISION,
    no2_avg DOUBLE PRECISION,
    so2_avg DOUBLE PRECISION,
    co_avg DOUBLE PRECISION,
    o3_avg DOUBLE PRECISION,
    station_count INTEGER,
    raster_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_aqi_maps_date ON aqi_maps (map_date);
CREATE INDEX idx_aqi_maps_region ON aqi_maps (region_type, region_name);

-- 9. HCHO Hotspots
CREATE TABLE IF NOT EXISTS hcho_hotspots (
    id BIGSERIAL PRIMARY KEY,
    detection_method TEXT NOT NULL,
    hotspot_date DATE NOT NULL,
    period_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    cluster_id INTEGER,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    centroid_geom GEOMETRY(Point, 4326),
    hotspot_geom GEOMETRY(MultiPolygon, 4326),
    area_sq_km DOUBLE PRECISION,
    mean_hcho DOUBLE PRECISION,
    max_hcho DOUBLE PRECISION,
    percentile_rank DOUBLE PRECISION,
    z_score DOUBLE PRECISION,
    p_value DOUBLE PRECISION,
    pixel_count INTEGER,
    region_name TEXT,
    state TEXT,
    season TEXT,
    fire_association BOOLEAN DEFAULT FALSE,
    confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hcho_geom ON hcho_hotspots USING GIST (centroid_geom);
CREATE INDEX idx_hcho_date ON hcho_hotspots (hotspot_date);
CREATE INDEX idx_hcho_method ON hcho_hotspots (detection_method);
CREATE INDEX idx_hcho_season ON hcho_hotspots (season);

-- 10. Fire-HCHO Correlations
CREATE TABLE IF NOT EXISTS fire_hcho_correlations (
    id BIGSERIAL PRIMARY KEY,
    region_name TEXT NOT NULL,
    state TEXT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    season TEXT,
    pearson_r DOUBLE PRECISION,
    pearson_p DOUBLE PRECISION,
    spearman_r DOUBLE PRECISION,
    spearman_p DOUBLE PRECISION,
    optimal_lag_days INTEGER,
    lag_correlation DOUBLE PRECISION,
    fire_count INTEGER,
    mean_frp DOUBLE PRECISION,
    mean_hcho DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_corr_region ON fire_hcho_correlations (region_name);

-- 11. Transport Analysis
CREATE TABLE IF NOT EXISTS transport_analysis (
    id BIGSERIAL PRIMARY KEY,
    analysis_date DATE NOT NULL,
    source_lat DOUBLE PRECISION NOT NULL,
    source_lon DOUBLE PRECISION NOT NULL,
    source_geom GEOMETRY(Point, 4326),
    wind_u_850 DOUBLE PRECISION,
    wind_v_850 DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    transport_distance_km DOUBLE PRECISION,
    source_region TEXT,
    receptor_region TEXT,
    trajectory_geom GEOMETRY(LineString, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transport_date ON transport_analysis (analysis_date);
CREATE INDEX idx_transport_source ON transport_analysis USING GIST (source_geom);

-- 12. Model Metadata
CREATE TABLE IF NOT EXISTS model_metadata (
    id BIGSERIAL PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    target_variable TEXT NOT NULL,
    training_date TIMESTAMPTZ NOT NULL,
    training_samples INTEGER,
    rmse DOUBLE PRECISION,
    mae DOUBLE PRECISION,
    r_squared DOUBLE PRECISION,
    pearson_r DOUBLE PRECISION,
    hyperparameters JSONB,
    feature_importance JSONB,
    model_path TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_meta_active ON model_metadata (is_active);

-- 13. AI Insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id BIGSERIAL PRIMARY KEY,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detailed_text TEXT,
    region TEXT,
    state TEXT,
    period_start DATE,
    period_end DATE,
    severity TEXT,
    metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_insights_type ON ai_insights (insight_type);

-- 14. Reports
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    report_type TEXT NOT NULL,
    title TEXT NOT NULL,
    abstract TEXT,
    content JSONB,
    pdf_path TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'generated'
);

-- 15. India Boundaries
CREATE TABLE IF NOT EXISTS india_boundaries (
    id BIGSERIAL PRIMARY KEY,
    boundary_type TEXT NOT NULL,
    state_name TEXT NOT NULL,
    district_name TEXT,
    state_code TEXT,
    geom GEOMETRY(MultiPolygon, 4326),
    area_sq_km DOUBLE PRECISION,
    centroid_lat DOUBLE PRECISION,
    centroid_lon DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_boundaries_geom ON india_boundaries USING GIST (geom);
CREATE INDEX idx_boundaries_state ON india_boundaries (state_name);

-- Auto-compute geometry trigger
CREATE OR REPLACE FUNCTION set_geom_from_latlon()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cpcb_geom BEFORE INSERT OR UPDATE ON cpcb_stations FOR EACH ROW EXECUTE FUNCTION set_geom_from_latlon();
CREATE TRIGGER trg_aod_geom BEFORE INSERT OR UPDATE ON satellite_aod FOR EACH ROW EXECUTE FUNCTION set_geom_from_latlon();
CREATE TRIGGER trg_tropomi_geom BEFORE INSERT OR UPDATE ON tropomi_products FOR EACH ROW EXECUTE FUNCTION set_geom_from_latlon();
CREATE TRIGGER trg_meteo_geom BEFORE INSERT OR UPDATE ON meteorological_data FOR EACH ROW EXECUTE FUNCTION set_geom_from_latlon();
CREATE TRIGGER trg_fire_geom BEFORE INSERT OR UPDATE ON fire_records FOR EACH ROW EXECUTE FUNCTION set_geom_from_latlon();
CREATE TRIGGER trg_pred_geom BEFORE INSERT OR UPDATE ON model_predictions FOR EACH ROW EXECUTE FUNCTION set_geom_from_latlon();

CREATE OR REPLACE FUNCTION set_centroid_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.centroid_lat IS NOT NULL AND NEW.centroid_lon IS NOT NULL THEN
        NEW.centroid_geom := ST_SetSRID(ST_MakePoint(NEW.centroid_lon, NEW.centroid_lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hcho_geom BEFORE INSERT OR UPDATE ON hcho_hotspots FOR EACH ROW EXECUTE FUNCTION set_centroid_geom();

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
