import React, { useState, useEffect } from "react";
import VitalsCard from "../components/ui/VitalsCard";

function PilotDashboard() {
  //variable declaration & initialisation
  const [heartRate, setHeartRate] = useState(78);
  const [blinkRate, setBlinkRate] = useState(12);
  const [fatigueLevel, setFatigueLevel] = useState("Moderate");
  //const[oxygenLeve, setOxygenLevel] = useState("Normal");
  const [temperature, setTemperature] = useState(23);
  const [humidity, setHumidity] = useState(45);
  const [yawning, setYawning] = useState(0);
  const [alert, setAlert] = useState("");

  //Code to simulate data from sensors: temporary - to be replaced with connection to sensors

  useEffect(() => {
    const interval = setInterval(() => {
      setHeartRate(70 + Math.floor(Math.random() * 20));
      setBlinkRate(10 + Math.floor(Math.random() * 10));

      //second[] used as index to access a value from the array
      setFatigueLevel(
        ["Low", "Moderate", "High"][Math.floor(Math.random() * 3)]
      );
      //setOxygenLevel(["Normal", "Slightly Low", "Critical"][Math.floor(Math.Random()*3)]);
      setTemperature(22 + Math.floor(Math.random() * 5));
      setYawning(Math.floor(Math.random() * 4));

      //reset alert
      setAlert("");
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (
      fatigueLevel == "High" ||
      yawning >= 3 ||
      blinkRate >= 20 ||
      blinkRate <= 10
    ) {
      setAlert("Pilot fatigue critical. Take action!");
    }
  }, [fatigueLevel, yawning, blinkRate]);

  return (
    <div className="dashboard-wrapper">
      <header className="header">
        <h1>CogniFlight Pilot Dashboard</h1>
        <span>Pilot: Capt. John Smith</span>
      </header>

      <main className="vitals-grid">
        <VitalsCard label="Temperature" value={temperature} unit=" degrees C" />
        <VitalsCard label="Humidity" value={humidity} unit="%" />
        {/* <VitalsCard label="Oxygen" value={oxygen}/> */}
        <VitalsCard label="Heart Rate" value={heartRate} unit="bpm" />
        <VitalsCard
          label="Blink Rate"
          value={blinkRate}
          unit=" blinks/minute"
        />
        <VitalsCard label="Fatigue Level" value={fatigueLevel} />
        <VitalsCard label="Alert" value="***" alert={alert} />
      </main>
    </div>
  );
}

export default PilotDashboard;
