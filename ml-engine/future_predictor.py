import pandas as pd
import numpy as np
import uuid
import random
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

# ------------------------------
# Data Generation Functions
# ------------------------------

def get_phase(t, total_time):
    """Rough segmentation of flight phases based on elapsed time."""
    pct = t / total_time
    if pct < 0.05:
        return "preflight"
    elif pct < 0.15:
        return "climb"
    elif pct < 0.80:
        return "cruise"
    elif pct < 0.95:
        return "descent"
    else:
        return "landing"

def generate_pilot_baseline():
    return {
        "hr": random.randint(60, 80),
        "ear": round(random.uniform(0.25, 0.35), 3),
        "rmssd": random.randint(30, 60),
        "stress_index": random.uniform(0.2, 0.5),
    }

def generate_flight_data(pilot_id, license_nr, initial_hours, baseline, flight_id, start_time, duration_hours):
    rows = []
    total_seconds = duration_hours * 3600
    sampling_rate = 10  # seconds
    num_samples = int(total_seconds / sampling_rate)

    for i in range(num_samples):
        ts = start_time + timedelta(seconds=i * sampling_rate)
        phase = get_phase(i * sampling_rate, total_seconds)

        # Simulated signals with noise
        hr = np.random.normal(baseline["hr"], 5)
        rr_interval = 60.0 / hr
        rmssd = np.random.normal(baseline["rmssd"], 5)
        stress_index = max(0, np.random.normal(baseline["stress_index"], 0.05))
        avg_ear = np.random.normal(baseline["ear"], 0.05)

        # Simulated sensors
        accel = np.random.normal(0, 1, 3)
        gyro = np.random.normal(0, 20, 3)
        altitude = max(0, np.random.normal(10000 if phase == "cruise" else 1000, 2000))
        pressure = 1013.2 - altitude / 100  # crude model

        # Fusion score
        fusion_score = max(0, min(1, np.random.normal(0.4 + (i / num_samples) * 0.2, 0.1)))
        fatigue_level = "Low"
        if fusion_score > 0.7:
            fatigue_level = "High"
        elif fusion_score > 0.5:
            fatigue_level = "Mild"

        row = {
            "timestamp": ts.isoformat(),
            "phase": phase,
            "pilot_id": pilot_id,
            "flight_id": flight_id,
            "license_nr": license_nr,
            "initial_flight_hours": initial_hours,
            "hr": round(hr, 1),
            "rr_interval": round(rr_interval, 3),
            "rmssd": round(rmssd, 1),
            "stress_index": round(stress_index, 3),
            "avg_ear": round(avg_ear, 3),
            "altitude": round(altitude, 1),
            "pressure": round(pressure, 1),
            "accel_x": round(accel[0], 3),
            "accel_y": round(accel[1], 3),
            "accel_z": round(accel[2], 3),
            "gyro_x": round(gyro[0], 2),
            "gyro_y": round(gyro[1], 2),
            "gyro_z": round(gyro[2], 2),
            "fusion_score": round(fusion_score, 3),
            "fatigue_level": fatigue_level,
        }
        rows.append(row)

    return rows

def generate_dataset(num_pilots=10, flights_per_pilot=(3, 5)):
    all_rows = []
    for _ in range(num_pilots):
        pilot_id = str(uuid.uuid4())
        license_nr = "LIC" + str(random.randint(10000, 99999))
        initial_hours = random.randint(200, 5000)
        baseline = generate_pilot_baseline()

        num_flights = random.randint(*flights_per_pilot)
        for f in range(num_flights):
            flight_id = str(uuid.uuid4())
            start_time = datetime(2025, 9, 22, 8, 0, 0) + timedelta(days=random.randint(0, 30))
            duration_hours = random.randint(1, 4)
            rows = generate_flight_data(
                pilot_id, license_nr, initial_hours, baseline, flight_id, start_time, duration_hours)
            all_rows.extend(rows)

    df = pd.DataFrame(all_rows)
    df.to_csv("fatigue_dataset.csv", index=False)
    print(f"Generated dataset with {len(df)} rows")
    return df

# ------------------------------
# Future Fatigue Prediction Model
# ------------------------------

class FatiguePredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = []
        
    def load_and_preprocess(self, file_path):
        """Load and preprocess the fatigue dataset"""
        df = pd.read_csv(file_path)
        
        # Convert timestamp to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Sort by pilot and timestamp
        df = df.sort_values(['pilot_id', 'timestamp'])
        
        # Feature Engineering
        df = self._engineer_features(df)
        
        return df
    
    def _engineer_features(self, df):
        """Create meaningful features for fatigue prediction"""
        
        # Time-based features
        df['hour_of_day'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Flight duration features (per flight)
        flight_duration = df.groupby('flight_id')['timestamp'].transform(
            lambda x: (x.max() - x.min()).total_seconds() / 3600
        )
        df['flight_duration'] = flight_duration
        
        # Time into flight (normalized)
        df['time_into_flight'] = df.groupby('flight_id').apply(
            lambda x: (x['timestamp'] - x['timestamp'].min()).dt.total_seconds() / 3600
        ).reset_index(level=0, drop=True)
        
        # Rolling features for physiological signals
        window_size = 6  # 1 minute window (6 samples * 10 seconds)
        
        for signal in ['hr', 'rmssd', 'stress_index', 'avg_ear']:
            df[f'{signal}_rolling_mean'] = df.groupby('pilot_id')[signal].transform(
                lambda x: x.rolling(window=window_size, min_periods=1).mean()
            )
            df[f'{signal}_rolling_std'] = df.groupby('pilot_id')[signal].transform(
                lambda x: x.rolling(window=window_size, min_periods=1).std()
            )
            df[f'{signal}_change'] = df.groupby('pilot_id')[signal].transform(
                lambda x: x.diff().fillna(0)
            )
        
        # Phase encoding
        phase_mapping = {'preflight': 0, 'climb': 1, 'cruise': 2, 'descent': 3, 'landing': 4}
        df['phase_encoded'] = df['phase'].map(phase_mapping)
        
        # Target variable: High fatigue (1 if fusion_score > 0.6, else 0)
        df['high_fatigue'] = (df['fusion_score'] > 0.6).astype(int)
        
        # Future prediction target: Will experience high fatigue in next 30 minutes
        df['future_fatigue_30min'] = self._create_future_target(df, minutes_ahead=30)
        
        return df
    

    
    def _create_future_target(self, df, minutes_ahead=30):
        # Create target variable for future fatigue prediction 
        future_fatigue = []
        
        for pilot_id in df['pilot_id'].unique():
            pilot_data = df[df['pilot_id'] == pilot_id].copy().sort_values('timestamp')
            pilot_data = pilot_data.reset_index(drop=True)
            
            pilot_future_fatigue = []
            
            for i in range(len(pilot_data)):
                current_time = pilot_data.loc[i, 'timestamp']
                
                # Find data points within the next 30 minutes
                future_mask = (
                    (pilot_data['timestamp'] > current_time) & 
                    (pilot_data['timestamp'] <= current_time + timedelta(minutes=minutes_ahead))
                )
                
                future_points = pilot_data[future_mask]
                
                # Mark as 1 if ANY future point has high fatigue, else 0
                if len(future_points) > 0 and (future_points['fusion_score'] > 0.6).any():
                    pilot_future_fatigue.append(1)
                else:
                    pilot_future_fatigue.append(0)
            
            future_fatigue.extend(pilot_future_fatigue)
        
        return future_fatigue

    def prepare_features(self, df):
        """Prepare features for model training"""
        
        # Select features for modeling
        feature_columns = [
            'initial_flight_hours', 'hour_of_day', 'day_of_week', 'is_weekend',
            'flight_duration', 'time_into_flight', 'phase_encoded',
            'hr', 'rmssd', 'stress_index', 'avg_ear', 'altitude', 'pressure',
            'hr_rolling_mean', 'hr_rolling_std', 'hr_change',
            'rmssd_rolling_mean', 'rmssd_rolling_std', 'rmssd_change',
            'stress_index_rolling_mean', 'stress_index_rolling_std', 'stress_index_change',
            'avg_ear_rolling_mean', 'avg_ear_rolling_std', 'avg_ear_change',
            'accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z'
        ]
        
        self.feature_columns = feature_columns
        
        X = df[feature_columns].copy()
        y = df['future_fatigue_30min']  # Predict future fatigue
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        return X, y

    def train_model(self, X, y):
        """Train the fatigue prediction model"""
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'  # Handle class imbalance
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        
        print("Model Performance:")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': self.feature_columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Feature Importances:")
        print(feature_importance.head(10))
        
        return X_test_scaled, y_test, y_pred
    
    def predict_future_fatigue(self, current_data):
        """Predict future fatigue probability for current pilot data"""
        if self.model is None:
            raise ValueError("Model not trained yet. Call train_model first.")
        
        # Prepare current data for prediction
        current_features = current_data[self.feature_columns].fillna(
            current_data[self.feature_columns].mean()
        )
        
        # Scale features
        current_scaled = self.scaler.transform(current_features)
        
        # Predict probabilities
        probabilities = self.model.predict_proba(current_scaled)[:, 1]
        
        return probabilities
    
    def create_alert_system(self, df, threshold=0.7):
        """Create a real-time alert system for fatigue prediction"""
        
        predictions = self.predict_future_fatigue(df)
        df['fatigue_probability'] = predictions
        df['fatigue_alert'] = (predictions > threshold).astype(int)
        
        # Generate alerts
        alerts = df[df['fatigue_alert'] == 1].copy()
        
        if len(alerts) > 0:
            print(f"\n🚨 FATIGUE ALERTS GENERATED ({len(alerts)} instances):")
            for _, alert in alerts.head(5).iterrows():
                print(f"Pilot {alert['pilot_id'][:8]}... - "
                      f"Time: {alert['timestamp']} - "
                      f"Probability: {alert['fatigue_probability']:.3f} - "
                      f"Phase: {alert['phase']}")
        else:
            print("\n✅ No fatigue alerts generated")
        
        return df

# ------------------------------
# Simplified Demo Function
# ------------------------------

def demo_fatigue_prediction():
    """Demonstrate the fatigue prediction system"""
    
    # Generate sample data
    print("Generating sample fatigue data...")
    df = generate_dataset(num_pilots=5, flights_per_pilot=(2, 3))
    
    # Initialize predictor
    predictor = FatiguePredictor()
    
    # Preprocess data
    print("\nPreprocessing data and engineering features...")
    processed_df = predictor.load_and_preprocess('fatigue_dataset.csv')
    
    print(f"Processed dataset shape: {processed_df.shape}")
    print(f"High fatigue instances: {processed_df['high_fatigue'].sum()}")
    print(f"Future fatigue instances: {processed_df['future_fatigue_30min'].sum()}")
    
    # Prepare features
    X, y = predictor.prepare_features(processed_df)
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Class distribution: {y.value_counts().to_dict()}")
    
    # Train model
    print("\nTraining fatigue prediction model...")
    predictor.train_model(X, y)
    
    # Demonstrate real-time prediction
    print("\n" + "="*50)
    print("REAL-TIME FATIGUE PREDICTION DEMO")
    print("="*50)
    
    # Select a random pilot for demonstration
    sample_pilot = processed_df['pilot_id'].iloc[0]
    pilot_data = processed_df[processed_df['pilot_id'] == sample_pilot].tail(10)
    
    print(f"\nDemo for Pilot: {sample_pilot[:8]}...")
    print(f"Analyzing {len(pilot_data)} recent data points...")
    
    # Predict fatigue probabilities
    probabilities = predictor.predict_future_fatigue(pilot_data)
    
    for i, (idx, row) in enumerate(pilot_data.iterrows()):
        print(f"\nTime: {row['timestamp']} | Phase: {row['phase']} | "
              f"Current Fatigue: {row['fatigue_level']} | "
              f"Future Fatigue Probability: {probabilities[i]:.3f}")
        
        if probabilities[i] > 0.7:
            print("🚨 HIGH RISK OF FUTURE FATIGUE - INTERVENTION RECOMMENDED!")
        elif probabilities[i] > 0.5:
            print("⚠️  Moderate risk of future fatigue - Monitor closely")
        else:
            print("✅ Low risk of future fatigue")
    
    return predictor, processed_df

# ------------------------------
# Run the demo
# ------------------------------

if __name__ == "__main__":
    # Run the fatigue prediction demo
    try:
        predictor, data = demo_fatigue_prediction()
        
        print("\n" + "="*50)
        print("SYSTEM READY FOR FUTURE PREDICTIONS")
        print("="*50)
        
        
    except Exception as e:
        print(f"Error: {e}")
        print("Running simplified test...")
        
        # Simple test
        df = generate_dataset(num_pilots=2, flights_per_pilot=(1, 2))
        print(f"Data generated successfully with {len(df)} rows")
        print(df[['pilot_id', 'timestamp', 'phase', 'fatigue_level', 'fusion_score']].head())