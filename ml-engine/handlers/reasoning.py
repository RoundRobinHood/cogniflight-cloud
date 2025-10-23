import os
from influxdb_client import InfluxDBClient
from jsonrpc.utils import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from jsonrpc import dispatcher

from influx_config import url, token, org, bucket

# Measurement name for MQTT telemetry data
MEASUREMENT = "mqtt_consumer"

# Critical thresholds (from edge predictor)
CRITICAL_EAR_THRESHOLD = 0.15
CRITICAL_CLOSURE_DURATION = 1.0
CRITICAL_MICROSLEEP_THRESHOLD = 2
CRITICAL_YAWN_THRESHOLD = 3
CRITICAL_YAWN_DURATION = 2.0
CRITICAL_STRESS_INDEX = 0.75
CRITICAL_RMSSD_LOW = 20
CRITICAL_HR_TREND = 5

# Fusion score thresholds
FUSION_CRITICAL = 0.4
FUSION_MODERATE = 0.6

# Environmental thresholds
TEMP_HIGH = 30
TEMP_LOW = 15
HUMIDITY_HIGH = 80
HUMIDITY_LOW = 20
ALTITUDE_HIGH = 3000  # meters - hypoxia risk increases

# Physiological thresholds
HR_LOW = 50
HR_HIGH = 100
HR_ZERO_THRESHOLD = 10  # Consider <10 BPM as potential cardiac emergency

client = InfluxDBClient(url=url, token=token, org=org)
query_api = client.query_api()

PILOT_USERNAME_TAG = os.getenv('PILOT_USERNAME', 'demo_pilot')


@dispatcher.add_method
def analyze_edge_fatigue(edge_username: str, lookback_minutes: int = 10):
    """
    Analyze edge node telemetry and provide reasoning for fusion score and fatigue indicators.
    Designed for ATC/operator dashboard with actionable insights.

    Args:
        edge_username: Edge node identifier (e.g., "N420HH")
        lookback_minutes: Time window for trend analysis (default: 10 minutes)

    Returns:
        Dictionary containing reasoning, trends, and criticality assessment
    """
    lookback = f"-{lookback_minutes}m"

    # Query InfluxDB for telemetry data
    # Note: Using 'host' tag as edge identifier fallback, but primarily username tag
    query = f'''
    from(bucket: "{bucket}")
      |> range(start: {lookback})
      |> filter(fn: (r) => r._measurement == "{MEASUREMENT}")
      |> filter(fn: (r) => r.username == "{edge_username}" or r.host == "{edge_username}" or r.pilot_username == "{PILOT_USERNAME_TAG}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> keep(columns: ["_time", "username", "pilot_username", "flight_id",
                        "accel_x", "accel_y", "accel_z", 
                        "gyro_x", "gyro_y", "gyro_z",
                        "altitude", "pressure", "temperature", "humidity",
                        "heart_rate", "rr_interval", "baseline_deviation", "rmssd", "hr_trend", "stress_index",
                        "avg_ear", "mar", "eyes_closed", "closure_duration", 
                        "microsleep_count", "blink_rate", 
                        "yawning", "yawn_count", "yawn_duration",
                        "fusion_score", "confidence", "is_critical_event",
                        "system_state", "state_message",
                        "roll", "pitch", "yaw"])
      |> sort(columns: ["_time"])
    '''

    try:
        tables = query_api.query_data_frame(query)
    except Exception as e:
        return {
            "edge_username": edge_username,
            "status": "Query failed",
            "error": str(e),
            "reasoning": [f"Unable to retrieve data from InfluxDB: {str(e)}"],
            "successful": False,
        }

    # Handle multiple tables or single table
    if isinstance(tables, list):
        if not tables:
            return {
                "edge_username": edge_username,
                "status": "No data found",
                "reasoning": [f"No telemetry data found for edge node '{edge_username}' in the last {lookback_minutes} minutes"],
                "trend_summary": {},
                "fusion_score": None,
                "confidence": None,
                "criticality": "unknown",
                "immediate_action_required": False,
                "successful": False,
            }
        df = pd.concat(tables)
    else:
        df = tables

    if df.empty:
        return {
            "edge_username": edge_username,
            "status": "No data found",
            "reasoning": [f"No telemetry data found for edge node '{edge_username}' in the last {lookback_minutes} minutes"],
            "trend_summary": {},
            "fusion_score": None,
            "confidence": None,
            "criticality": "unknown",
            "immediate_action_required": False,
            "successful": False,
        }

    # Clean up dataframe
    df = df.drop(columns=["result", "table"], errors="ignore")
    df = df.rename(columns={"_time": "timestamp"})

    # Convert numeric columns
    numeric_cols = [c for c in df.columns if c not in [
        "timestamp", "username", "pilot_username", "flight_id", "system_state", "state_message"]]
    df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors="coerce")

    # Remove rows with critical missing data (fusion_score is essential)
    df = df.dropna(subset=["fusion_score"])

    if df.empty:
        return {
            "edge_username": edge_username,
            "status": "Insufficient data",
            "reasoning": ["Data received but missing critical fusion score information"],
            "trend_summary": {},
            "fusion_score": None,
            "confidence": None,
            "criticality": "unknown",
            "immediate_action_required": False,
            "successful": False,
        }

    # Check data freshness (last datapoint should be recent)
    latest_timestamp = df["timestamp"].iloc[-1]
    if isinstance(latest_timestamp, str):
        latest_timestamp = pd.to_datetime(latest_timestamp)
    data_age_seconds = (pd.Timestamp.now(tz='UTC') -
                        latest_timestamp).total_seconds()

    if data_age_seconds > 30:  # Data older than 30 seconds
        return {
            "edge_username": edge_username,
            "status": "Stale data",
            "reasoning": [f"Latest data is {data_age_seconds:.0f} seconds old - edge node may be disconnected"],
            "trend_summary": {},
            "fusion_score": None,
            "confidence": None,
            "criticality": "unknown",
            "immediate_action_required": True,
            "successful": False,
        }

    # Get current (latest) values
    current = df.iloc[-1]

    # Get pilot info
    pilot_username = current.get("pilot_username", "Unknown")
    flight_id = current.get("flight_id", "")

    # Calculate baselines (exclude last point to prevent bias)
    # Last 60 points (approx 2 minutes at 2s intervals)
    baseline_window = min(len(df), 60)
    recent_df = df.tail(baseline_window)

    if len(recent_df) > 1:
        baseline = recent_df.iloc[:-1].mean(numeric_only=True)
    else:
        baseline = recent_df.mean(numeric_only=True)

    # --- Calculate Trends (percentage change) ---
    def pct_change(current_val, base_val):
        if pd.isna(current_val) or pd.isna(base_val) or base_val == 0:
            return 0
        return ((current_val - base_val) / abs(base_val)) * 100

    trends = {
        "hr_trend": pct_change(current.get("heart_rate"), baseline.get("heart_rate")),
        "ear_trend": pct_change(current.get("avg_ear"), baseline.get("avg_ear")),
        "temp_trend": pct_change(current.get("temperature"), baseline.get("temperature")),
        "stress_trend": pct_change(current.get("stress_index"), baseline.get("stress_index")),
        "yawn_trend": pct_change(current.get("yawn_count"), baseline.get("yawn_count")),
        "microsleep_trend": pct_change(current.get("microsleep_count"), baseline.get("microsleep_count")),
        "blink_rate_trend": pct_change(current.get("blink_rate"), baseline.get("blink_rate")),
    }

    # --- Build Reasoning ---
    reasoning = []
    immediate_action = False
    criticality = "normal"

    # Extract current values (with safe defaults)
    fusion_score = current.get("fusion_score", 0.0)
    confidence = current.get("confidence", 0.0)
    avg_ear = current.get("avg_ear", 0.35)
    eyes_closed = current.get("eyes_closed", False)
    closure_duration = current.get("closure_duration", 0.0)
    microsleep_count = current.get("microsleep_count", 0)
    yawn_count = current.get("yawn_count", 0)
    yawn_duration = current.get("yawn_duration", 0.0)
    is_yawning = current.get("yawning", False)
    blink_rate = current.get("blink_rate", 15.0)
    heart_rate = current.get("heart_rate", 75.0)
    stress_index = current.get("stress_index", 0.05)
    rmssd = current.get("rmssd", 50.0)
    hr_trend_val = current.get("hr_trend", 0.0)
    temperature = current.get("temperature", 22.0)
    humidity = current.get("humidity", 45.0)
    altitude = current.get("altitude", 0.0)
    is_critical_event = current.get("is_critical_event", False)

    # === PRIORITY 1: CRITICAL MEDICAL EMERGENCIES ===

    # Cardiac emergency detection
    if pd.notna(heart_rate) and heart_rate < HR_ZERO_THRESHOLD:
        reasoning.append(
            f"CRITICAL: Heart rate extremely low ({heart_rate:.0f} BPM) - possible cardiac emergency, immediate medical attention required")
        immediate_action = True
        criticality = "critical"

    # Severe stress with cardiac indicators
    if pd.notna(stress_index) and stress_index >= CRITICAL_STRESS_INDEX:
        if pd.notna(heart_rate) and heart_rate > HR_HIGH:
            reasoning.append(
                f"CRITICAL: Severe physiological stress detected (stress index: {stress_index:.2f}, HR: {heart_rate:.0f} BPM) - potential medical event")
            immediate_action = True
            criticality = "critical"
        else:
            reasoning.append(
                f"High stress detected (stress index: {stress_index:.2f}) - monitor pilot closely for medical issues")
            if criticality != "critical":
                criticality = "moderate"

    # Very low HRV (autonomic dysfunction)
    if pd.notna(rmssd) and rmssd < CRITICAL_RMSSD_LOW:
        reasoning.append(
            f"Very low heart rate variability detected (RMSSD: {rmssd:.0f}ms) - indicates severe stress or fatigue")
        immediate_action = True
        if criticality == "normal":
            criticality = "moderate"

    # === PRIORITY 2: CRITICAL FATIGUE EVENTS ===

    # Prolonged eye closure (immediate danger)
    if pd.notna(closure_duration) and closure_duration >= CRITICAL_CLOSURE_DURATION:
        reasoning.append(
            f"CRITICAL: Eyes closed for {closure_duration:.1f} seconds - pilot may be unconscious or in microsleep")
        immediate_action = True
        criticality = "critical"

    # Severe EAR drop (eyes nearly closed)
    if pd.notna(avg_ear) and avg_ear < CRITICAL_EAR_THRESHOLD:
        reasoning.append(
            f"CRITICAL: Eye aspect ratio critically low ({avg_ear:.2f}) - severe drowsiness detected")
        immediate_action = True
        if criticality != "critical":
            criticality = "critical"

    # Multiple microsleep events
    if pd.notna(microsleep_count) and microsleep_count >= CRITICAL_MICROSLEEP_THRESHOLD:
        reasoning.append(
            f"CRITICAL: {int(microsleep_count)} microsleep events detected - pilot losing consciousness intermittently")
        immediate_action = True
        if criticality != "critical":
            criticality = "critical"

    # === PRIORITY 3: MODERATE FATIGUE INDICATORS ===

    # Fusion score assessment
    if pd.notna(fusion_score):
        if fusion_score >= FUSION_MODERATE:
            reasoning.append(
                f"Pilot appears alert (fusion score: {fusion_score:.2f})")
            # Keep criticality as-is (may have been elevated by other factors)
        elif fusion_score >= FUSION_CRITICAL:
            reasoning.append(
                f"Moderate fatigue detected (fusion score: {fusion_score:.2f}) - monitor pilot closely")
            if criticality == "normal":
                criticality = "moderate"
        else:
            reasoning.append(
                f"Critical fatigue level detected (fusion score: {fusion_score:.2f}) - immediate rest advised")
            immediate_action = True
            if criticality == "normal":
                criticality = "critical"

    # EAR trend analysis (gradual fatigue onset)
    if pd.notna(avg_ear):
        if avg_ear < 0.25 and trends["ear_trend"] < -10:
            reasoning.append(
                f"EAR decreasing significantly ({trends['ear_trend']:.1f}%) - fatigue developing over last few minutes")
            if criticality == "normal":
                criticality = "mild"
        elif avg_ear < 0.25:
            reasoning.append(
                f"Low EAR detected ({avg_ear:.2f}) - signs of drowsiness")
            if criticality == "normal":
                criticality = "mild"
        elif trends["ear_trend"] < -15:
            reasoning.append(
                f"EAR rapidly decreasing ({trends['ear_trend']:.1f}%) - early fatigue onset detected")
            if criticality == "normal":
                criticality = "mild"

    # Yawning analysis (fatigue indicator)
    if pd.notna(yawn_count):
        if yawn_count >= CRITICAL_YAWN_THRESHOLD:
            if pd.notna(yawn_duration) and yawn_duration > CRITICAL_YAWN_DURATION:
                reasoning.append(
                    f"Excessive yawning detected ({int(yawn_count)} yawns, current: {yawn_duration:.1f}s) - significant fatigue indicator")
                if criticality == "normal":
                    criticality = "moderate"
            else:
                reasoning.append(
                    f"Frequent yawning detected ({int(yawn_count)} yawns) - fatigue developing")
                if criticality == "normal":
                    criticality = "mild"
        elif yawn_count > 0:
            reasoning.append(
                f"{int(yawn_count)} yawn(s) detected - early fatigue indicator")

    # Microsleep analysis (single event)
    if pd.notna(microsleep_count) and microsleep_count == 1:
        reasoning.append(
            f"Microsleep event detected - monitor pilot closely for additional episodes")
        if criticality == "normal":
            criticality = "moderate"

    # Blink rate analysis
    if pd.notna(blink_rate):
        if blink_rate < 5:
            reasoning.append(
                f"Very low blink rate ({int(blink_rate)} blinks/min) - possible drowsiness")
            if criticality == "normal":
                criticality = "mild"
        elif blink_rate > 40:
            reasoning.append(
                f"Excessive blinking detected ({int(blink_rate)} blinks/min) - possible eye strain or stress")
        elif trends["blink_rate_trend"] < -30:
            reasoning.append(
                f"Blink rate decreasing ({trends['blink_rate_trend']:.1f}%) - fatigue may be developing")

    # === PRIORITY 4: CARDIOVASCULAR INDICATORS ===

    # Heart rate analysis
    if pd.notna(heart_rate):
        if heart_rate < HR_LOW:
            reasoning.append(
                f"Low heart rate detected ({heart_rate:.0f} BPM) - possible low alertness or relaxation")
        elif heart_rate > HR_HIGH:
            reasoning.append(
                f"Elevated heart rate ({heart_rate:.0f} BPM) - possible stress or workload")
            if criticality == "normal":
                criticality = "mild"
        elif trends["hr_trend"] > 10:
            reasoning.append(
                f"Heart rate increasing ({trends['hr_trend']:+.1f}%) - possible stress response")

    # Rapid HR trend (cardiac stress)
    if pd.notna(hr_trend_val) and hr_trend_val > CRITICAL_HR_TREND:
        reasoning.append(
            f"Rapid heart rate increase detected ({hr_trend_val:.1f} BPM/min) - monitor for medical issues")
        if criticality == "normal":
            criticality = "moderate"

    # === PRIORITY 5: ENVIRONMENTAL FACTORS ===

    # Altitude and hypoxia correlation
    if pd.notna(altitude) and altitude > ALTITUDE_HIGH:
        # Check for hypoxia symptoms
        hypoxia_symptoms = []

        if pd.notna(avg_ear) and avg_ear < 0.25:
            hypoxia_symptoms.append("reduced alertness")

        if pd.notna(heart_rate) and heart_rate > baseline.get("heart_rate", 75) * 1.15:
            hypoxia_symptoms.append("elevated heart rate")

        if pd.notna(stress_index) and stress_index > 0.3:
            hypoxia_symptoms.append("physiological stress")

        if hypoxia_symptoms:
            reasoning.append(
                f"High altitude detected ({altitude:.0f}m) with signs of hypoxia ({', '.join(hypoxia_symptoms)}) - consider descending or oxygen supplementation")
            immediate_action = True
            if criticality == "normal":
                criticality = "moderate"
        else:
            reasoning.append(
                f"High altitude operation ({altitude:.0f}m) - monitor for hypoxia symptoms")

    # Temperature analysis
    if pd.notna(temperature):
        if temperature > TEMP_HIGH:
            reasoning.append(
                f"High cabin temperature detected ({temperature:.1f}°C) - may cause discomfort and fatigue, consider cooling")
            if criticality == "normal":
                criticality = "mild"
        elif temperature < TEMP_LOW:
            reasoning.append(
                f"Low cabin temperature detected ({temperature:.1f}°C) - may cause discomfort")
        elif trends["temp_trend"] > 5:
            reasoning.append(
                f"Cabin temperature rising ({trends['temp_trend']:+.1f}%) - heat buildup may affect performance")

    # Humidity analysis
    if pd.notna(humidity):
        if humidity > HUMIDITY_HIGH:
            reasoning.append(
                f"High humidity detected ({humidity:.1f}%) - may affect comfort and alertness")
        elif humidity < HUMIDITY_LOW:
            reasoning.append(
                f"Low humidity detected ({humidity:.1f}%) - dry air may cause discomfort")

    # === CONFIDENCE ASSESSMENT ===
    if pd.notna(confidence) and confidence < 0.7:
        reasoning.append(
            f"Note: Prediction confidence is lower than normal ({confidence:.2f}) - sensor data may be incomplete")

    # === DEFAULT MESSAGE ===
    if not reasoning:
        reasoning.append(
            "All monitored parameters within normal ranges - pilot appears alert and healthy")

    # --- Format Trend Summary ---
    trend_summary = {
        "hr_trend": f"{trends['hr_trend']:+.1f}%",
        "ear_trend": f"{trends['ear_trend']:+.1f}%",
        "temp_trend": f"{trends['temp_trend']:+.1f}%",
        "stress_trend": f"{trends['stress_trend']:+.1f}%",
        "yawn_trend": f"{trends['yawn_trend']:+.1f}%",
        "microsleep_trend": f"{trends['microsleep_trend']:+.1f}%",
        "blink_rate_trend": f"{trends['blink_rate_trend']:+.1f}%"
    }

    # --- Build Final Response ---
    result = {
        "edge_username": edge_username,
        "pilot_username": pilot_username,
        "flight_id": flight_id,
        "timestamp": str(current.get("timestamp")),
        "fusion_score": round(float(fusion_score), 3) if pd.notna(fusion_score) else None,
        "confidence": round(float(confidence), 3) if pd.notna(confidence) else None,
        "criticality": criticality,
        "immediate_action_required": immediate_action,
        "reasoning": reasoning,
        "trend_summary": trend_summary,
        "data_age_seconds": round(data_age_seconds, 1),
        "successful": True,
    }

    return result


# --- Example Run ---
if __name__ == "__main__":
    # Test with sample edge username
    edge_username = "N420HH"  # Replace with actual edge username
    output = analyze_edge_fatigue(edge_username, lookback_minutes=5)
    print(json.dumps(output, indent=2))
