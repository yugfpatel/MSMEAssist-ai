import React, { useEffect, useState } from "react";
import API from "./api";

export default function HoneyChain({ activeSection = "overview" }) {
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
      {loading && <p style={{ color: "#8f96a2" }}>Loading apiary data...</p>}

      {!loading && activeSection === "overview" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", color: "#f59e0b" }}>Apiary Overview</h2>
            <button 
              className="ghost-btn"
              onClick={async () => {
                if(!window.confirm("Generate demo hives, harvests, and batches?")) return;
                setLoading(true);
                try {
                  const hiveRes = await API.post("/api/honey/hives", { apiary_location: "Gir Forest Edge", latitude: 21.1, longitude: 70.8, colony_type: "Apis cerana indica", installation_date: "2026-01-15", status: "Active", queen_status: "Healthy" });
                  if(hiveRes.data.hive) {
                    const harvRes = await API.post("/api/honey/harvests", { hive_id: hiveRes.data.hive.id, harvest_date: "2026-08-10", honey_type: "Wildflower", quantity: 15.5, quality_grade: "Premium", moisture_percentage: 17.2 });
                    if(harvRes.data.harvest) {
                      await API.post("/api/honey/batches", { batch_id: "HC-DEMO-" + Math.floor(Math.random()*10000), harvest_id: harvRes.data.harvest.id, hive_id: hiveRes.data.hive.id, product_name: "Pure Gir Honey", honey_variety: "Wildflower", quantity: 15, harvest_date: "2026-08-10", packaging_date: "2026-08-12", quality_info: "Raw, Unfiltered, Lab Tested", status: "Available" });
                    }
                  }
                  await loadData();
                } catch(e) { console.error(e); }
                setLoading(false);
              }}
              style={{ color: "#10b981", borderColor: "#10b981" }}
            >
              🪄 Generate Demo Data
            </button>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>🐝</div>
              <div className="stat-label">Active Hives</div>
              <div className="stat-value">{hives.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>🍯</div>
              <div className="stat-label">Total Harvests</div>
              <div className="stat-value">{harvests.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>📦</div>
              <div className="stat-label">Traceable Batches</div>
              <div className="stat-value">{batches.length}</div>
            </div>
          </div>
        </div>
      )}

      {!loading && activeSection === "hives" && (
        <div>
          <h2 style={{ fontSize: "20px", color: "#f59e0b", marginBottom: "16px" }}>Hive Management</h2>
          <div className="product-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {hives.map(hive => (
              <div key={hive.id} className="panel product-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ color: "#fff", margin: 0 }}>{hive.apiary_location}</h3>
                    <span style={{ color: "#8f96a2", fontSize: "13px" }}>{hive.colony_type}</span>
                  </div>
                  <span className="live-badge" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>{hive.status}</span>
                </div>
                
                <div style={{ fontSize: "14px", color: "#d7dbe1" }}>Queen: {hive.queen_status}</div>
                
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button className="ghost-btn" onClick={() => demoIoT(hive.id)} style={{ flex: 1, fontSize: "12px" }}>📶 Ping IoT</button>
                  <button className="ghost-btn" onClick={() => loadInsights(hive.id)} style={{ flex: 1, fontSize: "12px", color: "#a855f7", borderColor: "rgba(168,85,247,0.3)" }}>✨ AI Analyze</button>
                </div>
                
                {sensorData[hive.id] && sensorData[hive.id].length > 0 && (
                  <div style={{ marginTop: "4px", fontSize: "12px", background: "#171a20", padding: "10px", borderRadius: "8px", border: "1px solid #292e36", color: "#9aa1ad" }}>
                    <div style={{ marginBottom: "4px", color: "#f5f7fa" }}><strong>Live Sensors</strong></div>
                    Temp: {sensorData[hive.id][0].temperature.toFixed(1)}°C | Hum: {sensorData[hive.id][0].humidity.toFixed(1)}% | Wt: {sensorData[hive.id][0].weight.toFixed(1)}kg
                  </div>
                )}
                
                {insights[hive.id] && (
                  <div style={{ marginTop: "4px", background: "rgba(168,85,247,0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(168,85,247,0.2)", fontSize: "13px" }}>
                    <strong style={{ color: "#c084fc", display: "block", marginBottom: "4px" }}>🤖 AI Insight ({insights[hive.id].risk_level} Risk)</strong> 
                    <span style={{ color: "#d7dbe1", display: "block", marginBottom: "6px" }}>{insights[hive.id].health_summary}</span>
                    <em style={{ color: "#9aa1ad" }}>Action: {insights[hive.id].recommended_action}</em>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeSection === "harvests" && (
        <div className="panel table-panel">
          <h2 style={{ fontSize: "20px", color: "#f59e0b", marginBottom: "16px" }}>Harvest Records</h2>
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>APIARY</th>
                <th>HONEY TYPE</th>
                <th>YIELD</th>
                <th>QUALITY</th>
              </tr>
            </thead>
            <tbody>
              {harvests.map(h => (
                <tr key={h.id}>
                  <td>{h.harvest_date}</td>
                  <td><strong style={{ color: "#f0f2f5" }}>{h.hives?.apiary_location}</strong></td>
                  <td>{h.honey_type}</td>
                  <td style={{ color: "#f59e0b", fontWeight: "bold" }}>{h.quantity} {h.unit}</td>
                  <td><span className="status completed" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>{h.quality_grade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeSection === "batches" && (
        <div>
          <h2 style={{ fontSize: "20px", color: "#f59e0b", marginBottom: "16px" }}>Traceability Batches</h2>
          <div className="product-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {batches.map(b => (
              <div key={b.id} className="panel product-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#f5f7fa", fontSize: "18px" }}>{b.product_name}</h3>
                    <span style={{ color: "#f59e0b", fontSize: "13px", fontFamily: "monospace", letterSpacing: "1px" }}>{b.batch_id}</span>
                  </div>
                  <span className="live-badge" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>{b.status}</span>
                </div>
                
                <div style={{ fontSize: "14px", color: "#9da4af", marginBottom: "16px", lineHeight: "1.6" }}>
                  <div><strong>Variety:</strong> {b.honey_variety}</div>
                  <div><strong>Packaged:</strong> {b.packaging_date}</div>
                  <div><strong>Quality:</strong> {b.quality_info}</div>
                </div>
                
                <a href={`/verify/batch/${b.batch_id}`} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "10px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", textDecoration: "none", borderRadius: "8px", fontWeight: "bold", border: "1px solid rgba(245, 158, 11, 0.2)", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background="rgba(245, 158, 11, 0.2)"} onMouseOut={e => e.currentTarget.style.background="rgba(245, 158, 11, 0.1)"}>
                  🔍 View Public Traceability
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
