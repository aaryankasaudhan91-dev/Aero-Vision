# 🤖 AI Insights & Report Generation

How AeroVision uses Google Gemini AI for automated analysis and generates scientific PDF reports.

---

## AI Insights Engine

**Service:** `insights_service.py` (15.4KB)  
**Router:** `insights.py`  
**Table:** `ai_insights`

### How It Works

1. **Data Collection:** Aggregates current AQI readings, fire records, HCHO hotspot data, and weather conditions
2. **Prompt Construction:** Builds a domain-specific prompt with real-time atmospheric data for the target region
3. **Gemini API Call:** Sends the enriched prompt to Google Gemini for analysis
4. **Response Parsing:** Extracts structured insights including title, summary, detailed analysis, and severity
5. **Storage:** Saves to `ai_insights` table with region, date, and severity tagging

### Insight Types

| Type | Description |
|---|---|
| **Anomaly Alert** | Unusual atmospheric conditions detected (e.g., sudden AQI spike) |
| **Executive Summary** | Daily/weekly overview of atmospheric conditions |
| **Health Advisory** | Domain-specific health risk communications |
| **Environmental Alert** | Fire events, HCHO anomalies, transport pathway warnings |

### Severity Levels

| Level | Trigger |
|---|---|
| `low` | Informational — normal conditions |
| `medium` | Elevated pollutant levels |
| `high` | Significant anomalies detected |
| `critical` | Immediate health/environmental risk |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/insights/` | Retrieve stored insights |
| `POST` | `/api/insights/generate` | Trigger fresh Gemini analysis |

### Frontend Integration

`InsightsDashboard.tsx` (6.2KB) displays:
- Insight cards with severity-colored badges
- Chronological alert timeline
- "Generate New Insight" action button
- Expandable detailed analysis view

---

## Scientific Report Generator

**Service:** `report_service.py` (29KB) — *largest service file*  
**Router:** `reports.py`  
**Table:** `reports`  
**Library:** ReportLab

### Report Sections

Generated PDF reports contain these auto-populated sections:

| Section | Content |
|---|---|
| **Title Page** | Report title, date, AeroVision branding, watermark |
| **Executive Summary** | High-level atmospheric conditions overview |
| **Methodology** | Data sources, algorithms used, time period |
| **Data Analysis** | Statistical tables, pollutant breakdowns |
| **Spatial Maps** | Geographic distribution visualizations |
| **Trend Analysis** | Time-series plots and patterns |
| **Conclusions** | Key findings and recommendations |

### Features

- **Auto-generation:** All sections are populated from live database data
- **Watermark:** Professional watermark overlay on every page
- **Peer-quality:** Formatted to academic/scientific report standards
- **Instant download:** PDF generated on-demand via API

### API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/reports/generate` | Generate and download PDF report |

**Request body:** Report type, region, date range  
**Response:** PDF file download or metadata with `pdf_path`

### Frontend Integration

`ReportsDashboard.tsx` (19.7KB) provides:
- Report configuration form (type, region, date range selectors)
- Report history list with status badges (generating, ready, failed)
- PDF preview window
- Download button
- Generation progress indicator

### Report Storage

| Column | Description |
|---|---|
| `report_type` | Type of report |
| `title` | Report title |
| `abstract` | Brief summary |
| `content` | Full report data (JSONB) |
| `pdf_path` | Path to generated PDF file |
| `generated_at` | Generation timestamp |
| `status` | `generating`, `completed`, `failed` |

---

**← [[Health Impact Early Warning System]]** | **Next: [[Deployment Guide]] →**
