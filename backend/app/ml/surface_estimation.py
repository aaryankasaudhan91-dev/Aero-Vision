"""
Surface Pollutant Estimation — Module 3
ML/DL models: Random Forest, XGBoost, LSTM, CNN-LSTM hybrid.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from loguru import logger
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from scipy.stats import pearsonr
import joblib
import json
from app.database import supabase


FEATURE_COLS = [
    "sat_no2", "sat_so2", "sat_co", "sat_o3", "sat_hcho", "aod_550nm",
    "temperature_2m", "relative_humidity", "wind_speed_10m",
    "wind_direction", "pbl_height", "month_sin", "month_cos",
    "doy_sin", "doy_cos",
]

TARGET_COLS = ["pm25", "no2", "so2", "co", "o3"]


def prepare_features(df: pd.DataFrame) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
    """Extract feature matrix and target arrays."""
    available_features = [c for c in FEATURE_COLS if c in df.columns]
    X = df[available_features].fillna(0).values

    targets = {}
    for col in TARGET_COLS:
        if col in df.columns:
            targets[col] = df[col].values
    return X, targets


def evaluate_model(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Compute RMSE, MAE, R², Pearson r."""
    mask = ~(np.isnan(y_true) | np.isnan(y_pred))
    yt, yp = y_true[mask], y_pred[mask]
    if len(yt) < 10:
        return {"rmse": None, "mae": None, "r_squared": None, "pearson_r": None}

    rmse = float(np.sqrt(mean_squared_error(yt, yp)))
    mae = float(mean_absolute_error(yt, yp))
    r2 = float(r2_score(yt, yp))
    pr, _ = pearsonr(yt, yp)
    return {"rmse": round(rmse, 4), "mae": round(mae, 4),
            "r_squared": round(r2, 4), "pearson_r": round(float(pr), 4)}


class RandomForestModel:
    """Random Forest Regressor for surface pollutant estimation."""

    def __init__(self, n_estimators: int = 200, max_depth: int = 20):
        self.models = {}
        self.params = {"n_estimators": n_estimators, "max_depth": max_depth}

    def train(self, X_train, y_train_dict, X_val, y_val_dict) -> Dict:
        """Train one RF model per target pollutant."""
        results = {}
        for target, y_train in y_train_dict.items():
            mask = ~np.isnan(y_train)
            if mask.sum() < 50:
                logger.warning(f"RF: Insufficient data for {target}, skipping")
                continue

            model = RandomForestRegressor(
                n_estimators=self.params["n_estimators"],
                max_depth=self.params["max_depth"],
                min_samples_split=5, min_samples_leaf=2,
                n_jobs=-1, random_state=42
            )
            model.fit(X_train[mask], y_train[mask])
            self.models[target] = model

            # Evaluate on validation
            if target in y_val_dict:
                y_pred = model.predict(X_val)
                metrics = evaluate_model(y_val_dict[target], y_pred)
                metrics["feature_importance"] = dict(zip(
                    FEATURE_COLS[:X_train.shape[1]],
                    [round(float(fi), 4) for fi in model.feature_importances_]
                ))
                results[target] = metrics
                logger.info(f"RF {target}: R²={metrics['r_squared']}, RMSE={metrics['rmse']}")

        return results

    def predict(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        predictions = {}
        for target, model in self.models.items():
            predictions[target] = model.predict(X)
        return predictions

    def save(self, path: str = "models/random_forest"):
        import os
        os.makedirs(path, exist_ok=True)
        for target, model in self.models.items():
            joblib.dump(model, f"{path}/rf_{target}.joblib")

    def load(self, path: str = "models/random_forest"):
        import os
        for target in TARGET_COLS:
            fpath = f"{path}/rf_{target}.joblib"
            if os.path.exists(fpath):
                self.models[target] = joblib.load(fpath)


class XGBoostModel:
    """XGBoost Regressor for surface pollutant estimation."""

    def __init__(self, n_estimators: int = 300, max_depth: int = 8, learning_rate: float = 0.05):
        self.models = {}
        self.params = {"n_estimators": n_estimators, "max_depth": max_depth, "learning_rate": learning_rate}

    def train(self, X_train, y_train_dict, X_val, y_val_dict) -> Dict:
        import xgboost as xgb
        results = {}
        for target, y_train in y_train_dict.items():
            mask = ~np.isnan(y_train)
            if mask.sum() < 50:
                continue

            model = xgb.XGBRegressor(
                n_estimators=self.params["n_estimators"],
                max_depth=self.params["max_depth"],
                learning_rate=self.params["learning_rate"],
                subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0,
                n_jobs=-1, random_state=42, verbosity=0
            )
            val_mask = ~np.isnan(y_val_dict.get(target, np.array([])))
            if target in y_val_dict and val_mask.sum() > 0:
                model.fit(
                    X_train[mask], y_train[mask],
                    eval_set=[(X_val[val_mask], y_val_dict[target][val_mask])],
                    verbose=False
                )
            else:
                model.fit(X_train[mask], y_train[mask])

            self.models[target] = model

            if target in y_val_dict:
                y_pred = model.predict(X_val)
                metrics = evaluate_model(y_val_dict[target], y_pred)
                importance = model.feature_importances_
                metrics["feature_importance"] = dict(zip(
                    FEATURE_COLS[:X_train.shape[1]],
                    [round(float(fi), 4) for fi in importance]
                ))
                results[target] = metrics
                logger.info(f"XGBoost {target}: R²={metrics['r_squared']}, RMSE={metrics['rmse']}")

        return results

    def predict(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        predictions = {}
        for target, model in self.models.items():
            predictions[target] = model.predict(X)
        return predictions

    def save(self, path: str = "models/xgboost"):
        import os
        os.makedirs(path, exist_ok=True)
        for target, model in self.models.items():
            model.save_model(f"{path}/xgb_{target}.json")

    def load(self, path: str = "models/xgboost"):
        import os, xgboost as xgb
        for target in TARGET_COLS:
            fpath = f"{path}/xgb_{target}.json"
            if os.path.exists(fpath):
                model = xgb.XGBRegressor()
                model.load_model(fpath)
                self.models[target] = model


def build_lstm_model(input_shape: Tuple[int, int], output_dim: int = 1):
    """Build LSTM model using TensorFlow/Keras."""
    import tensorflow as tf
    model = tf.keras.Sequential([
        tf.keras.layers.LSTM(128, return_sequences=True, input_shape=input_shape,
                             dropout=0.3, recurrent_dropout=0.2),
        tf.keras.layers.LSTM(64, dropout=0.3),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(output_dim),
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                  loss="mse", metrics=["mae"])
    return model


def build_cnn_lstm_model(time_steps: int, height: int, width: int, channels: int, output_dim: int = 5):
    """
    Build CNN-LSTM hybrid model.
    Input: (batch, time_steps, H, W, channels) — satellite spatial patches over time.
    CNN extracts spatial features per timestep; LSTM models temporal evolution.
    Output: Surface concentrations [PM2.5, NO2, SO2, CO, O3].
    """
    import tensorflow as tf
    from tensorflow.keras import layers, Model

    inp = layers.Input(shape=(time_steps, height, width, channels))

    # TimeDistributed CNN block
    x = layers.TimeDistributed(layers.Conv2D(32, (3, 3), padding="same", activation="relu"))(inp)
    x = layers.TimeDistributed(layers.BatchNormalization())(x)
    x = layers.TimeDistributed(layers.MaxPooling2D((2, 2)))(x)

    x = layers.TimeDistributed(layers.Conv2D(64, (3, 3), padding="same", activation="relu"))(x)
    x = layers.TimeDistributed(layers.BatchNormalization())(x)
    x = layers.TimeDistributed(layers.GlobalAveragePooling2D())(x)

    # LSTM block
    x = layers.LSTM(128, return_sequences=True, dropout=0.3)(x)
    x = layers.LSTM(64, dropout=0.3)(x)

    # Dense output
    x = layers.Dense(64, activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(32, activation="relu")(x)
    out = layers.Dense(output_dim, name="pollutant_output")(x)

    model = Model(inputs=inp, outputs=out)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="mse",
        metrics=["mae"],
    )
    return model


class ModelTrainer:
    """Orchestrates training, evaluation, and selection of all models."""

    def __init__(self):
        self.rf = RandomForestModel()
        self.xgb = XGBoostModel()

    async def train_all_models(self, df_train, df_val, df_test) -> Dict:
        """Train all models and compare performance."""
        X_train, y_train = prepare_features(df_train)
        X_val, y_val = prepare_features(df_val)
        X_test, y_test = prepare_features(df_test)

        all_results = {}

        # Train Random Forest
        logger.info("Training Random Forest...")
        rf_results = self.rf.train(X_train, y_train, X_val, y_val)
        all_results["random_forest"] = rf_results
        self.rf.save()

        # Train XGBoost
        logger.info("Training XGBoost...")
        xgb_results = self.xgb.train(X_train, y_train, X_val, y_val)
        all_results["xgboost"] = xgb_results
        self.xgb.save()

        # Evaluate on test set
        logger.info("Evaluating on test set...")
        test_results = {}
        for model_name, model in [("random_forest", self.rf), ("xgboost", self.xgb)]:
            preds = model.predict(X_test)
            for target, y_pred in preds.items():
                if target in y_test:
                    metrics = evaluate_model(y_test[target], y_pred)
                    test_results[f"{model_name}_{target}"] = metrics

        all_results["test_evaluation"] = test_results

        # Store model metadata in Supabase
        await self._store_metadata(all_results)

        # Select best model
        best = self._select_best_model(all_results)
        all_results["best_model"] = best

        return all_results

    async def _store_metadata(self, results: Dict):
        """Store model training results in Supabase."""
        from datetime import datetime
        for model_name in ["random_forest", "xgboost"]:
            model_results = results.get(model_name, {})
            for target, metrics in model_results.items():
                if isinstance(metrics, dict) and "rmse" in metrics:
                    record = {
                        "model_name": model_name,
                        "model_version": "1.0",
                        "target_variable": target,
                        "training_date": datetime.utcnow().isoformat(),
                        "rmse": metrics.get("rmse"),
                        "mae": metrics.get("mae"),
                        "r_squared": metrics.get("r_squared"),
                        "pearson_r": metrics.get("pearson_r"),
                        "hyperparameters": json.dumps(
                            self.rf.params if model_name == "random_forest" else self.xgb.params
                        ),
                        "feature_importance": json.dumps(metrics.get("feature_importance", {})),
                        "model_path": f"models/{model_name}/{model_name}_{target}",
                        "is_active": False,
                    }
                    try:
                        supabase.table("model_metadata").insert(record).execute()
                    except Exception as e:
                        logger.error(f"Error storing model metadata: {e}")

    def _select_best_model(self, results: Dict) -> Dict:
        """Select the best model based on average R² across targets."""
        best_model = None
        best_avg_r2 = -float("inf")

        for model_name in ["random_forest", "xgboost"]:
            model_results = results.get(model_name, {})
            r2_values = [m["r_squared"] for m in model_results.values()
                        if isinstance(m, dict) and m.get("r_squared") is not None]
            if r2_values:
                avg_r2 = sum(r2_values) / len(r2_values)
                if avg_r2 > best_avg_r2:
                    best_avg_r2 = avg_r2
                    best_model = model_name

        if best_model:
            # Activate best model in DB
            try:
                supabase.table("model_metadata").update(
                    {"is_active": True}
                ).eq("model_name", best_model).execute()
            except Exception as e:
                logger.error(f"Error activating best model: {e}")

        return {"model_name": best_model, "avg_r_squared": round(best_avg_r2, 4)}
