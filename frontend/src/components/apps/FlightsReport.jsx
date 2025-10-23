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
import { parse } from "yaml";
import "../../styles/apps/app-base.css";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/flights-report.css";

export default function FlightsReport({ instanceData }) {
  const client = usePipeClient();
  const { addNotification, systemState } = useSystem();
  const flight = instanceData?.flight;
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //TODO - change to use helper/function from backend, not Mqtt data.
  // Fetch sensor/telemetry data for the flight (edge-node = tail number)
  useEffect(() => {
    if (!client || !flight) return;

    async function loadTelemetry() {
      try {
        setLoading(true);
        setError(null);

        const node =
          flight.edge_id || flight.tail_number || flight.flight_number;

        const fluxQuery = `
  import "influxdata/influxdb/schema"
  from(bucket: "telegraf")
    |> range(start: 0)
    |> filter(fn: (r) => 
      r._measurement == "mqtt_consumer" and
      r.flight_id == "${flight.flight_number}" and
      (
        r._field == "heart_rate" or
        r._field == "blink_rate" or
        r._field == "cabin_temp" or
        r._field == "oxygen_level"
      )
    )
    |> keep(columns: ["_time", "_field", "_value"])
    |> sort(columns: ["_time"])
`;

        const cmd = await client.run_command("flux", StringIterator(fluxQuery));
        //const cmd = await client.run_command(`flux query '${fluxQuery}'`);

        if (cmd.command_result !== 0) {
          throw new Error(
            cmd.error || "Failed to fetch telemetry data from Flux"
          );
        }

        // Parse YAML from backend
        const fluxEntries = parse(cmd.output || "[]");

        // Transform Flux data into chart-ready format
        const grouped = {};
        for (const entry of fluxEntries) {
          const t = new Date(entry._time).toLocaleTimeString();
          if (!grouped[t]) grouped[t] = { timestamp: t };
          grouped[t][entry._field] = entry._value;
        }

        const formattedData = Object.values(grouped);
        console.log("Loaded telemetry data:", formattedData);
        setSensorData(formattedData);
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

      // --- Logo + Title Header ---
      const logo = new Image();
      logo.src = "/logo_full.png";
      await new Promise((resolve) => (logo.onload = resolve));

      // maintain logo aspect ratio
      const maxLogoHeight = 20; // slightly taller logo looks balanced
      const aspectRatio = logo.width / logo.height;
      const logoHeight = maxLogoHeight;
      const logoWidth = logoHeight * aspectRatio;

      // draw logo top-left
      pdf.addImage(logo, "PNG", 15, 12, logoWidth, logoHeight);

      // now align the title **vertically centered** with the logo
      const titleY = 12 + logoHeight / 2 + 4; // 4px tweak centers nicely
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Flight Report", 15 + logoWidth + 10, titleY);

      // draw line under header
      pdf.setLineWidth(0.3);
      pdf.line(15, 12 + logoHeight + 8, 195, 12 + logoHeight + 8);

      // Flight info
      // adjust start Y for details to appear below the line
      let y = 12 + logoHeight + 18;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(`Flight Number: ${flight.flight_number || "-"}`, 15, y);
      y += 7;
      pdf.text(`Pilot: ${flight.pilot || "-"}`, 15, y);
      y += 7;
      pdf.text(`Tail Number (Edge Node): ${flight.tail_number || "-"}`, 15, y);
      y += 7;
      pdf.text(
        `Origin: ${flight.origin || "-"} → Destination: ${
          flight.destination || "-"
        }`,
        15,
        y
      );
      y += 7;
      pdf.text(
        `Departure: ${flight.departure_time || "-"}   Arrival: ${
          flight.arrival_time || "-"
        }`,
        15,
        y
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
      const username = systemState?.userProfile?.username || "unknown";
      const dirPath = `/home/${username}/FlightData`;
      const filePath = `${dirPath}/${safeFlightNo}_FlightReport.pdf`;

      // ensure directory exists
      await client.run_command(`mkdir -p "${dirPath}"`);

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
