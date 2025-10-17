from influxdb_client import InfluxDBClient
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

url = "http://cogniflight.exequtech.com:8086"
token = "Xc2RuEnqtcv-mVDoVzr0mK19tI8ZedkZnl5drIviW9YFun_RdC6wBruKGqcnyzgXhKRsJWS11aIygo18CfO99w=="
org = "cogniflight"
bucket = "telegraf"

client = InfluxDBClient(url=url, token=token, org=org)
query_api = client.query_api()


def analyze_pilot_fatigue(pilot_id: str, lookback_minutes: int = 10):
    """
    Analyze a pilot's fatigue and environmental reasoning based on recent InfluxDB data.
    Includes trend analysis and reasoning causes.
    """
    lookback = f"-{lookback_minutes}m"

    query = f'''
    from(bucket: "{bucket}")
      |> range(start: {lookback})
      |> filter(fn: (r) => r._measurement == "cloud_synthetic" and r.pilot_id == "{pilot_id}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> keep(columns: ["_time", "pilot_id", "accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z",
                        "altitude", "hr", "rmssd", "rr_interval", "stress_index", "avg_ear",
                        "confidence", "fusion_score", "temperature", "humidity", "pressure"])
      |> sort(columns: ["_time"])
    '''
    tables = query_api.query_data_frame(query)

    if isinstance(tables, list):
        df = pd.concat(tables)
    else:
        df = tables

    if df.empty:
        return {
            "pilot_id": pilot_id,
            "status": "No data found for pilot",
            "reasoning": [],
            "trend_summary": {},
            "cloud_fusion_score": None
        }

    df = df.drop(columns=["result", "table"], errors="ignore")
    df = df.rename(columns={"_time": "timestamp"})
    numeric_cols = [c for c in df.columns if c not in [
        "timestamp", "pilot_id"]]
    df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors="coerce")
    df = df.dropna(subset=["fusion_score"])

    # --- Calculate Baselines ---
    baseline_window = min(len(df), 60)  # limit to ~60 points
    recent_df = df.tail(baseline_window)
    current = recent_df.iloc[-1]

    # Compute means of the last N-1 points (exclude last to prevent bias)
    baseline = recent_df.iloc[:-1].mean(numeric_only=True)

    # --- Compute trends (percentage change) ---
    def pct_change(current_val, base_val):
        if base_val == 0 or np.isnan(base_val):
            return 0
        return ((current_val - base_val) / base_val) * 100

    trends = {
        "hr_trend": pct_change(current.hr, baseline.hr),
        "ear_trend": pct_change(current.avg_ear, baseline.avg_ear),
        "temp_trend": pct_change(current.temperature, baseline.temperature),
        "stress_trend": pct_change(current.stress_index, baseline.stress_index)
    }

    # --- Build reasoning ---
    reasoning = []

    # Fatigue reasoning (eye + hr)
    if current.avg_ear < 0.25:
        reasoning.append(
            "Low EAR detected — possible drowsiness or eye closure.")
    elif trends["ear_trend"] < -10:
        reasoning.append("EAR decreasing — signs of growing fatigue.")

    # Heart rate reasoning
    if current.hr < 50:
        reasoning.append(
            "Low heart rate — potential relaxation or low alertness.")
    elif current.hr > 100:
        reasoning.append("High heart rate — potential stress or workload.")
    elif trends["hr_trend"] > 10:
        reasoning.append(
            "Heart rate increasing compared to baseline — possible rising stress.")

    # Stress index reasoning
    if current.stress_index > 80:
        reasoning.append(
            "High stress index — cognitive load or discomfort likely.")
    elif trends["stress_trend"] > 15:
        reasoning.append("Stress index rising — potential workload increase.")

    # Environmental reasoning
    if current.temperature > 30:
        reasoning.append("High cabin temperature — may be causing discomfort.")
    elif current.temperature < 15:
        reasoning.append("Low cabin temperature — possible cold discomfort.")
    elif trends["temp_trend"] > 5:
        reasoning.append("Cabin temperature rising — possible heat buildup.")

    if current.humidity > 80:
        reasoning.append("High humidity detected — may affect comfort.")
    elif current.humidity < 20:
        reasoning.append("Low humidity — possible dry air discomfort.")

    # --- Fusion score reasoning ---
    cloud_fusion_score = round(float(current.fusion_score), 2)
    if cloud_fusion_score < 40:
        reasoning.append(
            "Overall fatigue level critical — immediate rest advised.")
    elif cloud_fusion_score < 60:
        reasoning.append("Moderate fatigue level — monitor pilot closely.")
    else:
        reasoning.append("Normal fatigue level — pilot appears alert.")

    # --- Trend summary ---
    trend_summary = {
        "hr_trend": f"{trends['hr_trend']:+.1f}%",
        "ear_trend": f"{trends['ear_trend']:+.1f}%",
        "temp_trend": f"{trends['temp_trend']:+.1f}%",
        "stress_trend": f"{trends['stress_trend']:+.1f}%"
    }

    # --- Final result ---
    result = {
        "pilot_id": pilot_id,
        "timestamp": str(current.timestamp),
        "cloud_fusion_score": cloud_fusion_score,
        "reasoning": reasoning,
        "trend_summary": trend_summary,
        "latest_values": current.to_dict()
    }

    print(f"Reasoning generated for pilot {pilot_id}")
    return result


# --- Example Run ---
if __name__ == "__main__":
    pilot_id = "P001"  # example, adjust to your data
    output = analyze_pilot_fatigue(pilot_id, lookback_minutes=10)
    print(output)
