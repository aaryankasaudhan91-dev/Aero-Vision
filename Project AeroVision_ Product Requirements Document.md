## **Project AeroVision** 

## **Product Requirements Document (PRD)** 

## **1. Executive Summary** 

Air pollution remains a critical public health hazard, responsible for millions of excess deaths annually. While the Air Quality Index (AQI) effectively communicates pollution levels into a single number, relying solely on ground stations is insufficient as most of the global population lives over 100 km away from them. Furthermore, Formaldehyde (HCHO) acts as a crucial indicator of volatile organic compounds (VOCs) and tropospheric ozone formation, particularly during biomass burning events like agricultural fires. 

Project AeroVision will develop satellite-derived spatial models to bridge this monitoring gap. The project directly aligns with the National Clean Air Programme (NCAP) targets, UN Sustainable Development Goal (SDG) 11.6, and ISRO/SAC mandates for environmental monitoring. 

## **2. Project Objectives** 

- **Objective 1: Surface AQI Modeling:** Produce daily spatial maps of surface AQI across India by developing a hybrid CNN-LSTM deep learning model trained on satellite and ground observations. 

- **Objective 2: HCHO Hotspot Detection:** Generate high-resolution HCHO hotspot maps during distinct biomass burning seasons, pinpoint major source regions (e.g., Indo-Gangetic Plain, forest fire zones), and analyze fire-HCHO transport pathways. 

## **3. Data Requirements** 

All modeling steps require rigorous temporal co-registration, spatial resampling, and quality-flag filtering. 

|**Dataset / Mission**|**Source Portal**|**Key Variables**|
|---|---|---|
|**INSAT-3D**|MOSDAC|AOD (550 nm)|
|**Sentinel-5P**|GEE / DLR|NO2, SO2, CO, O3,<br>HCHO|
|**CPCB Ground**|CPCB API|PM2.5, PM10, Criteria<br>Pollutants|
|**MODIS / VIIRS**|NASA FIRMS|Fire Radiative Power<br>(FRP)|
|**ERA5 / IMDAA**|Copernicus|Winds, Temp, RH, PBLH|



## **4. Phased Execution Strategy** 

## **Phase 1: Data Acquisition & Preprocessing (Weeks 1–3)** 

- **Harmonization:** Download all datasets and regrid them to daily means on a common 0.1° × 0.1° spatial grid using xarray. 

- **Quality Control:** Remove satellite pixels with a cloud fraction > 0.3 and a TROPOMI QA flag < 0.75. 

- **Data Splitting:** Divide data by geographic region into 70% training, 15% validation, and 15% testing splits to prevent spatial leakage. 

## **Phase 2: Surface AQI Modelling (Weeks 4–9)** 

- **Architecture:** Deploy a CNN-LSTM deep learning model. 2D CNN layers will extract spatial pollution patterns, which are then passed into an LSTM network to learn multi-day temporal dependencies. 

- **Training & Tuning:** Pre-train using data from high-density monitoring regions (NCR, Mumbai), followed by fine-tuning on sparse regions. Utilize Bayesian optimization for hyperparameter tuning. 

- **Standardization:** Convert predicted surface concentrations directly into India's National AQI (NAQI / CPCB) categories. 

- **Maintenance:** Retrain the model monthly to account for seasonal drifts in the AOD–PM2.5 relationship. 

## **Phase 3: HCHO Hotspot Analysis (Weeks 6–11)** 

- **Seasonality:** Extract daily FRP data during key biomass burning seasons: Kharif (Oct–Nov), Rabi (Apr–May), and Forest Fires (Mar–May). 

- **Detection Methodology:** Flag pixels exceeding the 95th percentile of the multi-year HCHO climatology. Group nearby elevated pixels using DBSCAN spatial clustering (epsilon = 50 km, min-samples = 5). 

- **Transport Analysis:** Use NOAA HYSPLIT back-trajectory models and ERA5 850 hPa wind vectors to map dominant transport pathways. 

## **Phase 4: Validation & Dissemination (Weeks 10–13)** 

- **Outputs:** Produce 0.1° resolution daily/seasonal-mean AQI maps and multi-year HCHO anomaly maps. 

- **Key Deliverables:** 

   - Technical methodology and results report. 

   - GIS shapefile/NetCDF data packages. 

   - Interactive web maps via Folium. 

   - Peer-reviewed journal manuscript. 

## **5. Technology Stack** 

- **Data Access:** Google Earth Engine, MOSDAC, CPCB API, FIRMS, Copernicus CDS. 

- **Data Processing:** Python, xarray, netCDF4, NumPy, Pandas, SciPy. 

- **Deep Learning:** TensorFlow / PyTorch, scikit-learn. 

- **Visualisation:** Matplotlib, Cartopy, GeoPandas, Folium, Plotly. 

## **6. Success Metrics & Evaluation** 

|**Feature**|**Key Evaluation Metrics**|
|---|---|
|**AQI Model**|RMSE, MAE, and spatial bias per<br>pollutant species.|
|**Correlation**|Pearson R correlation against CPCB<br>observations.|
|**Classifcation**|Confusion matrix assessing NAQI<br>category accuracy.|
|**HCHO Hotspots**|Recall and detection accuracy of<br>hotspot regions.|
|**Analysis**|Fire-HCHO correlation strength<br>(r-value, p-value).|



**Approval Signatures** 

**Project Lead:** Person **Date:** Date 

