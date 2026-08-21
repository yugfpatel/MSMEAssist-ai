import React, { useEffect, useState } from "react";
import API from "./api";

export default function HoneyChain() {
  const [activeTab, setActiveTab] = useState("overview");
  const [hives, setHives] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [batches, setBatches] = useState([]);
  const [insights, setInsights] = useState({});
  const [sensorData, setSensorData] = useState({});
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [hRes, harvRes, bRes] = await Promise.all([
        API.get("/api/honey/hives"),
        API.get("/api/honey/harvests"),
        API.get("/api/honey/batches")
      ]);
      setHives(hRes.data.hives || []);
      setHarvests(harvRes.data.harvests || []);
      setBatches(bRes.data.batches || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadInsights(hiveId) {
    try {
      const [insRes, sensRes] = await Promise.all([
        API.get(`/api/honey/insights/${hiveId}`),
        API.get(`/api/honey/hives/${hiveId}/sensor-data`)
      ]);
      setInsights(prev => ({ ...prev, [hiveId]: insRes.data.insight }));
      setSensorData(prev => ({ ...prev, [hiveId]: sensRes.data.readings }));
    } catch (e) {
      console.error(e);
    }
  }

  async function demoIoT(hiveId) {
    await API.post(`/api/honey/hives/${hiveId}/sensor-data`, {
      temperature: 34 + Math.random() * 5,
      humidity: 50 + Math.random() * 20,
      weight: 45 + Math.random() * 2,
      activity_level: "High",
      battery_level: 95
    });
    loadInsights(hiveId);
  }

  return (
    <div className="honey-chain-module">
      <div className="tabs" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {["overview", "hives", "harvests", "batches"].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ padding: "8px 16px", background: activeTab === tab ? "#d97706" : "#eee", color: activeTab === tab ? "#fff" : "#000", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p>Loading Honey Chain data...</p>}

      {!loading && activeTab === "overview" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2>Honey Chain Dashboard</h2>
            <button 
              onClick={async () => {
                if(!window.confirm("Generate demo hives, harvests, and batches?")) return;
                setLoading(true);
                try {
                  const hiveRes = await API.post("/api/honey/hives", { apiary_location: "Gir Forest Edge", latitude: 21.1, longitude: 70.8, colony_type: "Apis cerana indica", installation_date: "2026-01-15", status: "Active", queen_status: "Healthy" });
                  if(hiveRes.data.hive) {
                    const harvRes = await API.post("/api/honey/harvests", { hive_id: hiveRes.data.hive.id, harvest_date: "2026-08-10", honey_type: "Wildflower", quantity: 15.5, quality_grade: "A+", moisture_percentage: 17.2 });
                    if(harvRes.data.harvest) {
                      await API.post("/api/honey/batches", { batch_id: "HC-DEMO-" + Math.floor(Math.random()*10000), harvest_id: harvRes.data.harvest.id, hive_id: hiveRes.data.hive.id, product_name: "Pure Gir Honey", honey_variety: "Wildflower", quantity: 15, harvest_date: "2026-08-10", packaging_date: "2026-08-12", quality_info: "Raw, Unfiltered, Lab Tested A+", status: "Available" });
                    }
                  }
                  await loadData();
                } catch(e) { console.error(e); }
                setLoading(false);
              }}
              style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              🪄 Generate Demo Data
            </button>
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #ddd", minWidth: "150px" }}>
              <h3>Total Hives</h3>
              <p style={{ fontSize: "24px", margin: 0 }}>{hives.length}</p>
            </div>
            <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #ddd", minWidth: "150px" }}>
              <h3>Harvests</h3>
              <p style={{ fontSize: "24px", margin: 0 }}>{harvests.length}</p>
            </div>
            <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #ddd", minWidth: "150px" }}>
              <h3>Honey Batches</h3>
              <p style={{ fontSize: "24px", margin: 0 }}>{batches.length}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === "hives" && (
        <div>
          <h2>Hive Management</h2>
          {hives.map(hive => (
            <div key={hive.id} style={{ background: "#fff", padding: "15px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }}>
              <h3>{hive.apiary_location} - {hive.colony_type}</h3>
              <p>Status: {hive.status} | Queen: {hive.queen_status}</p>
              <button onClick={() => demoIoT(hive.id)}>Simulate Demo IoT Data</button>
              <button onClick={() => loadInsights(hive.id)} style={{ marginLeft: "10px" }}>Get AI Insights</button>
              
              {sensorData[hive.id] && sensorData[hive.id].length > 0 && (
                <div style={{ marginTop: "10px", fontSize: "0.9em", background: "#f9f9f9", padding: "10px" }}>
                  <strong>Latest Sensor:</strong> Temp: {sensorData[hive.id][0].temperature.toFixed(1)}°C, Hum: {sensorData[hive.id][0].humidity.toFixed(1)}%, Wt: {sensorData[hive.id][0].weight.toFixed(1)}kg
                </div>
              )}
              
              {insights[hive.id] && (
                <div style={{ marginTop: "10px", background: "#f0fdf4", padding: "10px", borderRadius: "4px", border: "1px solid #bbf7d0" }}>
                  <strong>🤖 AI Insight ({insights[hive.id].risk_level} Risk):</strong> {insights[hive.id].health_summary}
                  <br /><em>Recommendation:</em> {insights[hive.id].recommended_action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "harvests" && (
        <div>
          <h2>Harvest Records</h2>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th>Date</th>
                <th>Hive Location</th>
                <th>Honey Type</th>
                <th>Quantity</th>
                <th>Quality Grade</th>
              </tr>
            </thead>
            <tbody>
              {harvests.map(h => (
                <tr key={h.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{h.harvest_date}</td>
                  <td>{h.hives?.apiary_location}</td>
                  <td>{h.honey_type}</td>
                  <td>{h.quantity} {h.unit}</td>
                  <td>{h.quality_grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeTab === "batches" && (
        <div>
          <h2>Honey Batches (Traceability)</h2>
          {batches.map(b => (
            <div key={b.id} style={{ background: "#fff", padding: "15px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3>{b.batch_id} - {b.product_name}</h3>
                <span style={{ padding: "4px 8px", background: "#d97706", color: "#fff", borderRadius: "12px", fontSize: "0.8em" }}>{b.status}</span>
              </div>
              <p>Variety: {b.honey_variety} | Packaged: {b.packaging_date} | Quality: {b.quality_info}</p>
              <div style={{ marginTop: "10px" }}>
                <a href={`/verify/batch/${b.batch_id}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "6px 12px", background: "#000", color: "#fff", textDecoration: "none", borderRadius: "4px" }}>
                  Scan QR / View Public Traceability
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
