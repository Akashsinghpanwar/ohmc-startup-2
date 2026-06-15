"""
Backtesting harness for the carbon estimation engine (SCAFFOLD).

The ONLY credible way to claim the estimates are "validated" is to compare them
against known, independently-verified WCC / Peatland Code projects and report
error bounds. This script does exactly that — once you provide a labelled
dataset. Without one it explains the format required (it does not fabricate
accuracy numbers).

Usage:
    python -m validation.backtest path/to/labelled_projects.csv
    # or set BACKTEST_DATASET=path/to/labelled_projects.csv

Required CSV columns:
    pathway            "wcc" | "peatland"
    area_ha            float  (eligible area)
    condition          peatland condition category (peatland rows)
    species            "broadleaf" | "conifer" (wcc rows, optional)
    productivity       "high" | "medium" | "low" (wcc rows, optional)
    crediting_years    int (optional; defaults to code standard)
    actual_net_tco2e   float  (the verified/known net units — the ground truth)

Outputs MAE, RMSE, mean bias and MAPE of predicted vs actual net units.
"""
import csv
import os
import sys
import math
from pathlib import Path

# Make the backend package importable when run directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.schemas import CarbonPathway          # noqa: E402
from services.carbon_calculator import estimate_carbon, CarbonInputs  # noqa: E402


def _predict(row: dict) -> float:
    pathway = CarbonPathway.PEATLAND if row["pathway"].strip().lower() == "peatland" else CarbonPathway.WCC
    inp = CarbonInputs(
        eligible_area_ha=float(row["area_ha"]),
        pathway=pathway,
        peatland_condition=(row.get("condition") or "default").strip() or "default",
        woodland_species=(row.get("species") or "broadleaf").strip() or "broadleaf",
        woodland_productivity=(row.get("productivity") or "medium").strip() or "medium",
        crediting_override=int(row["crediting_years"]) if row.get("crediting_years") else None,
    )
    return float(estimate_carbon(inp)["net_units_tco2e"])


def run(dataset_path: str) -> int:
    rows = list(csv.DictReader(open(dataset_path, newline="", encoding="utf-8")))
    if not rows:
        print(f"No rows in {dataset_path}")
        return 1

    errs, abs_errs, sq_errs, pct_errs = [], [], [], []
    print(f"{'pathway':<9} {'area_ha':>8} {'actual':>10} {'predicted':>10} {'error':>10}")
    for r in rows:
        actual = float(r["actual_net_tco2e"])
        pred = _predict(r)
        e = pred - actual
        errs.append(e); abs_errs.append(abs(e)); sq_errs.append(e * e)
        if actual:
            pct_errs.append(abs(e) / actual)
        print(f"{r['pathway']:<9} {float(r['area_ha']):>8.1f} {actual:>10.0f} {pred:>10.0f} {e:>+10.0f}")

    n = len(errs)
    mae = sum(abs_errs) / n
    rmse = math.sqrt(sum(sq_errs) / n)
    bias = sum(errs) / n
    mape = (sum(pct_errs) / len(pct_errs) * 100) if pct_errs else float("nan")
    print("\n-- Error metrics (predicted net tCO2e vs verified) --")
    print(f"  n projects : {n}")
    print(f"  MAE        : {mae:,.0f} tCO2e")
    print(f"  RMSE       : {rmse:,.0f} tCO2e")
    print(f"  Mean bias  : {bias:+,.0f} tCO2e  ({'over' if bias > 0 else 'under'}-estimating)")
    print(f"  MAPE       : {mape:.1f}%")
    print("\nNote: a low MAPE here means the SCREENING estimate tracks verified outcomes;")
    print("it never replaces independent validation/verification.")
    return 0


def main():
    dataset = sys.argv[1] if len(sys.argv) > 1 else os.getenv("BACKTEST_DATASET")
    if not dataset or not Path(dataset).exists():
        print(__doc__)
        print("No labelled dataset provided.\n")
        print("To validate accuracy, supply a CSV of known/verified projects with the")
        print("columns listed above (e.g. exported from the WCC/Peatland Code registry),")
        print("then run:  python -m validation.backtest projects.csv")
        return 2
    return run(dataset)


if __name__ == "__main__":
    raise SystemExit(main())
