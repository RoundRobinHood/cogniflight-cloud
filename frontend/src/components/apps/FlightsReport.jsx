import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { usePipeClient, StringIterator } from "../../api/socket";
import { useSystem } from "../useSystem";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../../styles/apps/app-base.css";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/flights-report.css";

export default function FlightReport({ instanceData }) {
  const client = usePipeClient();
  const { addNotification } = useSystem();
  const flight = instanceData?.flight;

  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sensor/telemetry data for the flight (edge-node = tail number)
  useEffect(() => {
    if (!client || !flight) return;

    async function loadTelemetry() {
      try {
        setLoading(true);
        setError(null);

        const node = flight.tail_number || flight.flight_number;
        const cmd = await client.run_command(`telemetry "${node}"`);

        if (cmd.command_result !== 0)
          throw new Error(cmd.error || "Failed to fetch telemetry data");

        const parsed = JSON.parse(cmd.output || "[]");
        console.log("Loaded telemetry data:", parsed);
        setSensorData(parsed);
      } catch (err) {
        console.error("Telemetry fetch error:", err);
        setError("Unable to load flight telemetry data.");
      } finally {
        setLoading(false);
      }
    }

    loadTelemetry();
  }, [client, flight]);

  // Generate full PDF report with chart and details & save to File Explorer
  const handleGeneratePDF = async () => {
    try {
      const chartEl = document.querySelector(".chart-container");
      if (!chartEl) {
        addNotification("No chart to export yet.", "error");
        return;
      }

      addNotification("Generating PDF report...", "info");

      // Capture chart section
      const canvas = await html2canvas(chartEl, { backgroundColor: "#111" });
      const chartImg = canvas.toDataURL("image/png");

      // Initialize PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add CogniFlight logo
      const logo = new Image();
      logo.src = "/logo_full.png"; // Adjust if your logo is in a different folder
      await new Promise((resolve) => {
        logo.onload = resolve;
      });
      pdf.addImage(logo, "PNG", 15, 10, 30, 12);

      // Report title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Flight Report", 50, 20);

      // Flight info
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(`Flight Number: ${flight.flight_number || "-"}`, 15, 35);
      pdf.text(`Pilot: ${flight.pilot || "-"}`, 15, 42);
      pdf.text(`Tail Number (Edge Node): ${flight.tail_number || "-"}`, 15, 49);
      pdf.text(
        `Origin: ${flight.origin || "-"} → Destination: ${
          flight.destination || "-"
        }`,
        15,
        56
      );
      pdf.text(
        `Departure: ${flight.departure_time || "-"}   Arrival: ${
          flight.arrival_time || "-"
        }`,
        15,
        63
      );

      // Insert captured chart image
      pdf.addImage(chartImg, "PNG", 15, 75, 180, 100);

      // Footer timestamp
      const timestamp = new Date().toLocaleString();
      pdf.setFontSize(10);
      pdf.text(`Generated on ${timestamp}`, 15, 190);

      // Convert to binary (to send to backend)
      const pdfBlob = pdf.output("blob");
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Backend save path
      const safeFlightNo =
        flight.flight_number?.replace(/[^a-zA-Z0-9_-]/g, "_") || "Flight";
      const filePath = `/home/Documents/FlightData/${safeFlightNo}_FlightReport.pdf`;

      // Save via socket client
      const result = await client.run_command(
        `tee "${filePath}" >/dev/null`,
        StringIterator(uint8Array)
      );

      if (result.command_result === 0) {
        addNotification(`Report saved to ${filePath}`, "success");
      } else {
        throw new Error(result.error || "Failed to save report");
      }

      // Also download locally (browser)
      pdf.save(`${safeFlightNo}_FlightReport.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
      addNotification("Failed to generate PDF report.", "error");
    }
  };

  return (
    <div className="app-base flight-report">
      <header className="report-header">
        <h2>Flight Report — {flight.flight_number}</h2>
        <p>
          {flight.pilot && (
            <>
              <strong>Pilot:</strong> {flight.pilot}
            </>
          )}
          {flight.tail_number && (
            <>
              {" "}
              | <strong>Edge Node:</strong> {flight.tail_number}
            </>
          )}
        </p>
      </header>

      <div className="report-content">
        {loading ? (
          <p>Loading telemetry data...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : sensorData.length === 0 ? (
          <p>No telemetry data found for this flight.</p>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10 }}
                  minTickGap={20}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="heart_rate"
                  name="Heart Rate (bpm)"
                />
                <Line
                  type="monotone"
                  dataKey="blink_rate"
                  name="Blink Rate (per min)"
                />
                <Line
                  type="monotone"
                  dataKey="cabin_temp"
                  name="Cabin Temp (°C)"
                />
                <Line
                  type="monotone"
                  dataKey="oxygen_level"
                  name="Cabin O₂ (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <footer className="app-footer">
        <button className="btn btn-primary" onClick={handleGeneratePDF}>
          Export to PDF
        </button>
      </footer>
    </div>
  );
}
