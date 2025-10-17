import os
import time
import random
from datetime import datetime
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS


# Influx connection
INFLUX_URL = os.getenv("INFLUX_URL", "http://cogniflight.exequtech.com:8086")
INFLUX_TOKEN = os.getenv(
    "INFLUX_TOKEN", "Xc2RuEnqtcv-mVDoVzr0mK19tI8ZedkZnl5drIviW9YFun_RdC6wBruKGqcnyzgXhKRsJWS11aIygo18CfO99w==")
INFLUX_ORG = os.getenv("INFLUX_ORG", "cogniflight")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "telegraf")

MEASUREMENT = "cloud_synthetic"
PILOT_ID = "P001"


def random_in_range(mean, deviation):
    return round(random.uniform(mean - deviation, mean + deviation), 3)


def generate_sample():
    # Simulate sensor data realistically
    accel = {f"accel_{axis}": random_in_range(
        0, 1.0) for axis in ["x", "y", "z"]}
    gyro = {f"gyro_{axis}": random_in_range(
        0, 180.0) for axis in ["x", "y", "z"]}
    env = {
        "temperature": random_in_range(25, 3),
        "humidity": random_in_range(50, 15),
        "pressure": random_in_range(1013, 5)
    }
    phys = {
        "hr": random_in_range(70, 15),
        "rmssd": random_in_range(35, 10),
        "rr_interval": random_in_range(0.85, 0.2),
        "stress_index": random_in_range(50, 10)
    }
    vision = {
        "avg_ear": random_in_range(0.25, 0.1),
        "closure_duration": random_in_range(0.2, 1.5),
        "microsleep_count": random.randint(0, 2),
        "blink_rate_per_minute": random_in_range(10, 15)
    }

    # Fusion & confidence (random for now)
    fusion_score = random_in_range(0.5, 0.3)
    confidence = random_in_range(0.8, 0.1)

    # Combine all fields
    fields = {
        **accel, **gyro, **env, **phys, **vision,
        "fusion_score": fusion_score,
        "confidence": confidence
    }
    return fields


def main_loop(poll_interval=2.0):
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    print(
        f"Streaming synthetic edge data into '{MEASUREMENT}' every {poll_interval}s...")
    try:
        while True:
            fields = generate_sample()
            point = Point(MEASUREMENT).tag("pilot_id", PILOT_ID)
            for k, v in fields.items():
                point = point.field(k, v)
            point.time(datetime.utcnow(), WritePrecision.NS)

            write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)
            print(f"[{datetime.utcnow().isoformat()}] Data written: fusion={fields['fusion_score']:.2f}, avg_ear={fields['avg_ear']:.2f}, hr={fields['hr']:.0f}")
            time.sleep(poll_interval)
    except KeyboardInterrupt:
        print("\nStopping stream.")
    finally:
        client.close()


if __name__ == "__main__":
    main_loop()
