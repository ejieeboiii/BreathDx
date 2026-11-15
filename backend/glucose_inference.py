"""Inference with the supplied acetone-to-glucose SVR pipeline."""

import math
import os
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.svm import SVR

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "glucose_svr.pkl"
MODEL_PATH = Path(os.environ.get("BREATHDX_SVR_MODEL_PATH", str(DEFAULT_MODEL_PATH)))

_model: Optional[Pipeline] = None


class GlucoseModelError(RuntimeError):
    """Raised when the configured SVR model cannot make a prediction."""


def _load_model() -> Pipeline:
    global _model
    if _model is not None:
        return _model

    if not MODEL_PATH.is_file():
        raise GlucoseModelError(f"SVR model file not found: {MODEL_PATH}")

    try:
        model = joblib.load(MODEL_PATH)
    except Exception as exc:
        raise GlucoseModelError(f"Could not load SVR model from {MODEL_PATH}") from exc

    if (
        not isinstance(model, Pipeline)
        or not model.steps
        or not isinstance(model.steps[-1][1], SVR)
    ):
        raise GlucoseModelError(
            "Configured glucose model must be an sklearn Pipeline ending in SVR."
        )

    feature_names = getattr(model, "feature_names_in_", None)
    if feature_names is None or list(feature_names) != ["Acetone"]:
        raise GlucoseModelError("SVR model must accept the single feature 'Acetone'.")

    _model = model
    return model


def estimate_glucose(acetone_ppm: float) -> float:
    """Return the SVR glucose estimate for acetone in the model's training units."""
    acetone_ppm = float(acetone_ppm)
    if not math.isfinite(acetone_ppm) or acetone_ppm < 0:
        raise ValueError("Acetone concentration must be a finite, non-negative value.")

    model = _load_model()
    try:
        predicted = float(
            model.predict(pd.DataFrame({"Acetone": [acetone_ppm]}))[0]
        )
    except Exception as exc:
        raise GlucoseModelError("SVR prediction failed.") from exc

    if not math.isfinite(predicted):
        raise GlucoseModelError("SVR returned a non-finite glucose estimate.")

    return round(predicted, 2)
