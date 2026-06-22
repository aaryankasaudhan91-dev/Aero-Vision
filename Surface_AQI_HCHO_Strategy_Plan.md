Project Strategy Plan — Surface AQI & HCHO Hotspot Detection over India 

## **PROJECT STRATEGY PLAN** 

Development of Surface Air Quality Index (AQI) & Identification of HCHO Hotspots over India using Satellite Data 

ISRO / SAC Collaboration  |  Satellite Remote Sensing & Deep Learning 

## **1. Project Overview** 

Air pollution is a critical public health hazard responsible for millions of excess deaths annually. The Air Quality Index (AQI) transforms weighted values of individual pollutants into a single communicable number. However, most of the global population lives more than 100 km from ground monitoring stations, making satellite-derived AQI essential for spatial coverage. 

Formaldehyde (HCHO) is a key indicator of volatile organic compound (VOC) emissions and plays an important role in tropospheric ozone formation. During biomass burning events — agricultural residue burning and forest fires — large VOC releases produce enhanced HCHO concentrations detectable from space. 

This project directly supports the National Clean Air Programme (NCAP), SDG target 11.6 (reduce adverse environmental impact in cities), and ISRO/SAC national priorities for air quality monitoring. 

## **Project Objectives** 

- Objective 1: Develop a surface AQI from satellite data — produce daily spatial maps of surface AQI across India using a CNN-LSTM deep learning model trained on INSAT-3D, TROPOMI, and CPCB observations. 

- Objective 2: Produce high-resolution HCHO hotspot maps during biomass burning seasons; identify major source regions (Indo-Gangetic Plain, forest fire zones); analyse fire–HCHO transport. 

## **2. Datasets** 

The following datasets are required across both objectives: 

|**Dataset**|**Source / Portal**|**Variables**|
|---|---|---|
|INSAT-3D|MOSDAC (mosdac.gov.in)|AOD (550 nm)|
|Sentinel-5P TROPOMI|Google Earth Engine / DLR|NO2, SO2, CO, O3, HCHO|
|CPCB Ground Stations|airquality.cpcb.gov.in|PM2.5, PM10, all criteria|



ISRO / SAC Collaboration 

Page PAGE 

Project Strategy Plan — Surface AQI & HCHO Hotspot Detection over India 

|||pollutants|
|---|---|---|
|MODIS / VIIRS Fire|NASA FIRMS|Fire radiative power, fire<br>counts|
|ERA5 / IMDAA / MERRA-2|Copernicus CDS / NCMRWF / NASA|Wind, T, RH, PBL height|



Note: Temporal co-registration, spatial resampling, and quality-flag filtering will be applied uniformly before any modelling step. 

## **3. Strategy Plan** 

## **Phase 1 — Data Acquisition & Preprocessing** 

Weeks 1–3 

All input datasets are downloaded, harmonised, and split into training / validation / test sets by region and season. Key preprocessing steps: 

- Download INSAT-3D Level-2 AOD from MOSDAC, TROPOMI Level-3 daily composites from GEE/DLR, and CPCB hourly surface observations. 

- Temporal alignment: regrid all products to daily means on a common 0.1° × 0.1° grid (native TROPOMI ~5.5 km) using xarray. 

- Cloud masking and QA filtering: remove pixels with cloud fraction > 0.3 and TROPOMI QA < 0.75. 

- Derive meteorological predictors from ERA5/IMDAA: 10-m wind speed/direction, 2-m temperature, relative humidity, PBLH, and total precipitation. 

- Train / validation / test split: 70 / 15 / 15 by geographic region to prevent spatial leakage. 

## **Phase 2 — Surface AQI Modelling (Objective 1)** 

Weeks 4–9 

## **Model Architecture: CNN-LSTM** 

The hybrid CNN-LSTM model combines spatial pattern extraction (CNN) with temporal dependency modelling (LSTM). The architecture is designed as follows: 

- Input: A spatial patch of columnar satellite retrievals (AOD, NO2, SO2, CO, O3) centred on each CPCB station, plus collocated meteorological predictors. Input shape: (time_steps × H × W × channels). 

- CNN block: 2D convolutional layers extract spatially coherent pollution patterns from the satellite patch at each time step. Batch normalisation and ReLU activation. 

- LSTM block: The CNN spatial embeddings are passed as a sequence into an LSTM network to learn multi-day temporal evolution of the pollution episode. 

- Output: Predicted surface concentrations of PM2.5, NO2, SO2, CO, and O3, which are then converted to national NAQI (CPCB) AQI sub-indices and an overall AQI value. 

## **Training Strategy** 

- Transfer learning: pre-train on high-density monitoring regions (NCR, Mumbai, Pune), then finetune on sparse regions. 

- Regularisation: dropout (p = 0.3), L2 weight decay, early stopping on validation RMSE. 

ISRO / SAC Collaboration 

Page PAGE 

Project Strategy Plan — Surface AQI & HCHO Hotspot Detection over India 

- Hyperparameter tuning: learning rate, number of LSTM units, CNN filter count via Bayesian optimisation. 

- Retraining cadence: monthly update with new CPCB observations to account for seasonal AOD– PM2.5 relationship drift. 

## **Validation** 

Predicted surface concentrations are validated against held-out CPCB stations using RMSE, MAE, Pearson R, bias, and Index of Agreement (IOA). AQI category accuracy is reported via a confusion matrix across six NAQI categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe). 

## **Phase 3 — HCHO Hotspot Analysis (Objective 2)** 

Weeks 6–11 

## **Biomass Burning Period Extraction** 

- Extract daily MODIS/VIIRS fire radiative power (FRP) and fire count composites over India. 

- • Define biomass burning seasons: Kharif residue burning (October–November, Punjab/Haryana); Rabi burning (April–May); and forest fire season (March–May, Central/Northeast India). 

- Composite daily TROPOMI HCHO columns for fire and non-fire periods separately to isolate the fire signal. 

## **Hotspot Detection Methods** 

- Statistical threshold: flag pixels exceeding the 90th and 95th percentile of the multi-year HCHO climatology over India as hotspots. 

- Spatial clustering: apply DBSCAN to group nearby elevated pixels into persistent hotspot regions, parameterised by epsilon = 50 km and min-samples = 5. 

- Temporal persistence: retain hotspots active for >= 3 consecutive days to exclude transient noise. 

## **Fire–HCHO Correlation & Transport Analysis** 

- Compute Pearson and Spearman correlations between area-averaged FRP and HCHO column within identified hotspot regions, with 0–5 day lag analysis. 

- Use ERA5 850 hPa wind vectors to diagnose dominant transport pathways from source regions. 

- • Apply NOAA HYSPLIT back-trajectory model to confirm receptor-source linkages (IGP transport to Indo-Gangetic cities, trans-boundary plumes). 

## **Phase 4 — Validation, Visualisation & Dissemination** 

Weeks 10–13 

## **Spatial Maps and Visualisation** 

- Daily and seasonal-mean surface AQI maps of India at 0.1° resolution, colour-coded by NAQI category, using Cartopy/Matplotlib. 

- Multi-year climatological and anomaly HCHO hotspot maps for each burning season. 

- Interactive web maps using Folium for stakeholder dissemination. 

## **Key Deliverables** 

- Technical report with methodology, results, and validation statistics. 

- GIS shapefile/NetCDF data package of AQI and HCHO products. 

ISRO / SAC Collaboration 

Page PAGE 

Project Strategy Plan — Surface AQI & HCHO Hotspot Detection over India 

- Peer-reviewed journal manuscript (suggested: Atmospheric Environment, Remote Sensing of Environment). 

- Presentation for NCAP/ISRO review committee. 

## **4. Technology Stack** 

|**Category**|**Tools / Libraries**|
|---|---|
|**Data access**|Google Earth Engine · MOSDAC · CPCB API · FIRMS · Copernicus CDS|
|**Processing**|Python · xarray · netCDF4 · NumPy · Pandas · SciPy|
|**Deep learning**|TensorFlow / PyTorch · CNN-LSTM architecture · scikit-learn|
|**Visualisation**|Matplotlib · Cartopy · GeoPandas · Folium · Plotly|
|**Transport**|HYSPLIT back-trajectory model · ERA5 wind fields|



## **5. Evaluation Criteria** 

|**Objective 1 — AQI Model**|**Objective 2 — HCHO Hotspots**|
|---|---|
|RMSE and MAE per pollutant species|Hotspot detection accuracy and recall|
|Pearson R vs CPCB observations|Fire–HCHO correlation (r, p-value, lag)|
|Spatial bias and error maps|Source region identification vs literature|
|AQI category accuracy (confusion matrix)|Visualisation quality — spatial maps, time series|



Note: For AQI classification, India's National AQI (NAQI) breakpoints as defined by CPCB are used — not the US EPA AQI standard. 

## **6. Project Timeline** 

**==> picture [469 x 87] intentionally omitted <==**

**----- Start of picture text -----**<br>
W1 W2 W3 W4 W5 W6 W7 W8 W9 W10 W11 W12 W13<br>Phase 1<br>Phase 2<br>Phase 3<br>Phase 4<br>**----- End of picture text -----**<br>


Phases 2 and 3 run in parallel from Week 6 onward. Phase 4 consolidates outputs from both objectives from Week 10. 

ISRO / SAC Collaboration 

Page PAGE 

Project Strategy Plan — Surface AQI & HCHO Hotspot Detection over India 

## **7. Key Technical Decisions** 

The following design decisions should be locked in at project start to avoid rework: 

|**Decision**|**Recommendation**|
|---|---|
|**AQI standard**|India NAQI (CPCB) breakpoints — 6 categories from Good to<br>Severe|
|**Spatial grid**|0.1° × 0.1° common grid; TROPOMI native ~5.5 km resampled to<br>this|
|**HCHO hotspot threshold**|95th percentile of multi-year HCHO climatology over India domain|
|**Model retraining**|Monthly, given seasonal drift in AOD–PM2.5 relationship|
|**Cloud masking**|Exclude pixels with cloud fraction > 0.3 and TROPOMI QA flag <<br>0.75|
|**Burning seasons**|Kharif: Oct–Nov; Rabi: Apr–May; Forest fires: Mar–May (Central/NE<br>India)|



## **8. National & ISRO Priority Alignment** 

- National Clean Air Programme (NCAP): supports the 20–40% pollution reduction target in nonattainment cities through enhanced spatial AQI coverage. 

- SDG 11.6: addresses reduction of adverse environmental effects in cities through satellitederived air quality monitoring. 

- Chintan Shivir 2.0: aligned with urban climate, air quality, and sustainable development targets. 

- ISRO mandate: demonstrates operational use of INSAT-3D and TROPOMI for societal applications in health and environment. 

ISRO / SAC Collaboration 

Page PAGE 

