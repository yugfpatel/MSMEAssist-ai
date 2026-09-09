import QRCode from "react-qr-code";
import React, { useEffect, useState } from "react";
import API from "./api";

const EVENT_TYPES = [
  { value: "Quality Tested",       label: "Quality Tested",         icon: "🧪", desc: "Lab or field quality check completed" },
  { value: "Packed",               label: "Packed",                  icon: "📦", desc: "Batch sealed and packaged" },
  { value: "Labelled",             label: "Labelled",                icon: "🏷️",  desc: "Labels applied, batch ready for sale" },
  { value: "Out for Sales",        label: "Out for Sales",           icon: "🛒", desc: "Dispatched to retail / WhatsApp orders" },
  { value: "In Transit",           label: "In Transit",              icon: "🚚", desc: "Batch en route to destination" },
  { value: "Delivered",            label: "Delivered",               icon: "✅", desc: "Delivered to customer or retailer" },
  { value: "Storage",              label: "Storage",                 icon: "🏭", desc: "Moved to cold / dry storage" },
  { value: "Inspection Passed",    label: "Inspection Passed",       icon: "🔬", desc: "Government / FSSAI inspection passed" },
  { value: "Export Cleared",       label: "Export Cleared",          icon: "✈️",  desc: "Cleared for international export" },
  { value: "Returned",             label: "Returned",                icon: "↩️",  desc: "Returned by customer or retailer" },
  { value: "Custom Event",         label: "Custom Event",            icon: "⚡", desc: "Enter a custom event name below" },
];

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HoneyChain({ activeSection = "overview" }) {
  const [hives, setHives]       = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [batches, setBatches]   = useState([]);
  const [insights, setInsights] = useState({});
  const [sensorData, setSensorData] = useState({});
  const [loading, setLoading]   = useState(false);
  const [analyzing, setAnalyzing] = useState({});

  // Batch create form
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batch_id: "", product_name: "", honey_variety: "", quantity: 0,
    harvest_date: "", packaging_date: "", quality_info: ""
  });

  // Add Event form
  const [showEventForm, setShowEventForm]     = useState(false);
  const [selectedBatch, setSelectedBatch]     = useState("");
  const [selectedEventType, setSelectedEventType] = useState(EVENT_TYPES[0].value);
  const [customEvent, setCustomEvent]         = useState("");
  const [eventNote, setEventNote]             = useState("");
  const [eventSaving, setEventSaving]         = useState(false);
  const [eventSuccess, setEventSuccess]       = useState("");
  const [eventError, setEventError]           = useState("");

  // batch-level timeline
  const [batchTimeline, setBatchTimeline] = useState({});
  const [expandedBatch, setExpandedBatch] = useState(null);

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
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function loadInsights(hiveId) {
    setAnalyzing(prev => ({ ...prev, [hiveId]: true }));
    try {
      const [insRes, sensRes] = await Promise.all([
        API.get(`/api/honey/insights/${hiveId}`),
        API.get(`/api/honey/hives/${hiveId}/sensor-data`)
      ]);
      setInsights(prev  => ({ ...prev, [hiveId]: insRes.data.insight }));
      setSensorData(prev => ({ ...prev, [hiveId]: sensRes.data.readings }));
    } catch (e) { console.error(e); }
    setAnalyzing(prev => ({ ...prev, [hiveId]: false }));
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

  async function handleAIGenerateBatch() {
    const prompt = aiPrompt || "Generate a realistic 20kg batch of Premium Wildflower Honey harvested today.";
    setIsGeneratingBatch(true);
    try {
      const res = await API.post("/api/honey/ai-generate-batch", { prompt });
      if (res.data.success && res.data.batch) setBatchForm(prev => ({ ...prev, ...res.data.batch }));
    } catch (e) { alert("Failed to generate batch from AI."); }
    setIsGeneratingBatch(false);
  }

  async function handleSaveBatch() {
    try {
      if (!batchForm.batch_id || !batchForm.product_name) return alert("Missing required fields");
      await API.post("/api/honey/batches", { ...batchForm, status: "Available" });
      setShowBatchForm(false);
      setBatchForm({ batch_id: "", product_name: "", honey_variety: "", quantity: 0, harvest_date: "", packaging_date: "", quality_info: "" });
      setAiPrompt("");
      loadData();
    } catch (e) { alert("Failed to save batch."); }
  }

  async function loadBatchTimeline(batchId) {
    try {
      const res = await API.get(`/api/honey/blockchain/verify/${batchId}`);
      setBatchTimeline(prev => ({ ...prev, [batchId]: res.data.records || [] }));
    } catch (e) { console.error(e); }
  }

  async function toggleTimeline(batchId) {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
    } else {
      setExpandedBatch(batchId);
      if (!batchTimeline[batchId]) await loadBatchTimeline(batchId);
    }
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    setEventError("");
    setEventSuccess("");
    if (!selectedBatch) { setEventError("Please select a batch."); return; }
    const eventType = selectedEventType === "Custom Event" ? customEvent.trim() : selectedEventType;
    if (!eventType) { setEventError("Please enter a custom event name."); return; }

    setEventSaving(true);
    try {
      await API.post("/api/honey/blockchain/record", {
        batch_id: selectedBatch,
        event_type: eventType,
        event_data: {
          note: eventNote.trim() || null,
          recorded_by: "admin@apis.ai",
          timestamp: new Date().toISOString(),
        }
      });
      setEventSuccess(`"${eventType}" event recorded on the blockchain for ${selectedBatch}`);
      setEventNote("");
      setCustomEvent("");
      // refresh timeline if it was open
      if (batchTimeline[selectedBatch]) await loadBatchTimeline(selectedBatch);
    } catch (err) {
      setEventError(err.response?.data?.detail || err.message || "Failed to record event.");
    }
    setEventSaving(false);
  }

  if (loading) return <p style={{ color: "#555", padding: 24 }}>Loading apiary data…</p>;

  /* ───────────────── HIVES ───────────────── */
  if (activeSection === "hives") return (
    <div>
      <div className="panel-grid">
        {hives.length === 0 && <p style={{ color: "#555", fontSize: 13 }}>No hives registered.</p>}
        {hives.map(hive => (
          <div key={hive.id} className="hive-card">
            <div className="hive-card-top">
              <div>
                <div className="hive-name">{hive.apiary_location}</div>
                <div className="hive-sub">{hive.colony_type}</div>
              </div>
              <span className="badge badge-completed">{hive.status}</span>
            </div>
            <div className="hive-meta">Queen status: <strong style={{ color: "#d4d4d4" }}>{hive.queen_status}</strong></div>
            <div className="hive-actions">
              <button className="btn-ghost" onClick={() => demoIoT(hive.id)}>Ping IoT</button>
              <button className="btn-ghost" onClick={() => loadInsights(hive.id)} disabled={analyzing[hive.id]}>
                {analyzing[hive.id] ? "Analyzing…" : "AI Analyze"}
              </button>
            </div>
            {sensorData[hive.id]?.length > 0 && (
              <div className="sensor-box">
                <div className="sensor-title">Live Sensors</div>
                <div className="sensor-row">
                  <span>Temp <strong>{sensorData[hive.id][0].temperature?.toFixed(1)}°C</strong></span>
                  <span>Humidity <strong>{sensorData[hive.id][0].humidity?.toFixed(1)}%</strong></span>
                  <span>Weight <strong>{sensorData[hive.id][0].weight?.toFixed(1)} kg</strong></span>
                </div>
              </div>
            )}
            {insights[hive.id] && (
              <div className="insight-box">
                <div className="insight-title">AI Insight — {insights[hive.id].risk_level} Risk</div>
                <p className="insight-body">{insights[hive.id].health_summary}</p>
                <p className="insight-action">Action: {insights[hive.id].recommended_action}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  /* ───────────────── HARVESTS ───────────────── */
  if (activeSection === "harvests") return (
    <div className="panel">
      <div className="panel-hd"><span className="panel-title">Harvest Records</span></div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Apiary</th><th>Type</th><th>Yield</th><th>Quality</th>
          </tr>
        </thead>
        <tbody>
          {harvests.length === 0 && (
            <tr><td colSpan={5} className="empty-state">No harvest records yet.</td></tr>
          )}
          {harvests.map(h => (
            <tr key={h.id}>
              <td className="mono">{h.harvest_date}</td>
              <td><span className="cell-main">{h.hives?.apiary_location || "—"}</span></td>
              <td>{h.honey_type}</td>
              <td><strong style={{ color: "#fff" }}>{h.quantity} {h.unit || "kg"}</strong></td>
              <td><span className="badge badge-completed">{h.quality_grade}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* ───────────────── TRACEABILITY / BATCHES ───────────────── */
  if (activeSection === "batches") return (
    <div>

      {/* ── Top action bar ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={() => { setShowBatchForm(!showBatchForm); setShowEventForm(false); }}>
          {showBatchForm ? "✕ Cancel" : "+ Create Batch"}
        </button>
        <button className="btn-ghost" onClick={() => { setShowEventForm(!showEventForm); setShowBatchForm(false); }}>
          {showEventForm ? "✕ Cancel" : "⬡ Add Event to Batch"}
        </button>
      </div>

      {/* ── Create Batch Form ── */}
      {showBatchForm && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-hd"><span className="panel-title">New Honey Batch</span></div>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, padding: 16, background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 8 }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Log a new 20kg batch of Premium Mustard Honey harvested today"
                className="field-input"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <button className="btn-ghost" onClick={handleAIGenerateBatch} disabled={isGeneratingBatch} style={{ flexShrink: 0, color: "#c084fc", borderColor: "rgba(168,85,247,0.3)" }}>
                {isGeneratingBatch ? "Generating…" : "✨ AI Autofill"}
              </button>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Batch ID</label>
                <input className="field-input" placeholder="e.g. HC-001" value={batchForm.batch_id} onChange={e => setBatchForm({ ...batchForm, batch_id: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="field-label">Product Name</label>
                <input className="field-input" placeholder="e.g. Pure Gir Honey" value={batchForm.product_name} onChange={e => setBatchForm({ ...batchForm, product_name: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="field-label">Variety</label>
                <input className="field-input" placeholder="e.g. Wildflower" value={batchForm.honey_variety} onChange={e => setBatchForm({ ...batchForm, honey_variety: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="field-label">Quantity (kg)</label>
                <input className="field-input" type="number" min="0" value={batchForm.quantity || ""} onChange={e => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })} />
              </div>
              <div className="form-field">
                <label className="field-label">Harvest Date</label>
                <input className="field-input" type="date" value={batchForm.harvest_date} onChange={e => setBatchForm({ ...batchForm, harvest_date: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="field-label">Packaging Date</label>
                <input className="field-input" type="date" value={batchForm.packaging_date} onChange={e => setBatchForm({ ...batchForm, packaging_date: e.target.value })} />
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: 20 }}>
              <label className="field-label">Quality Info</label>
              <input className="field-input" placeholder="e.g. Lab Tested A+" value={batchForm.quality_info} onChange={e => setBatchForm({ ...batchForm, quality_info: e.target.value })} />
            </div>
            <div style={{ textAlign: "right" }}>
              <button className="btn-primary" onClick={handleSaveBatch}>Save & Mint on Blockchain</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Event Form ── */}
      {showEventForm && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-hd"><span className="panel-title">Record Blockchain Event</span><span className="panel-sub">Permanently recorded · SHA-256 hash-chained</span></div>
          <form onSubmit={handleAddEvent} style={{ padding: "20px 24px" }}>

            {/* Batch selector */}
            <div className="form-field" style={{ marginBottom: 20 }}>
              <label className="field-label">Select Batch</label>
              <select className="field-input" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} style={{ marginBottom: 0 }}>
                <option value="">— Choose a batch —</option>
                {batches.map(b => (
                  <option key={b.batch_id} value={b.batch_id}>{b.batch_id} — {b.product_name}</option>
                ))}
              </select>
            </div>

            {/* Event type grid */}
            <div className="form-field" style={{ marginBottom: 20 }}>
              <label className="field-label">Event Type</label>
              <div className="event-type-grid">
                {EVENT_TYPES.map(ev => (
                  <button
                    key={ev.value}
                    type="button"
                    className={"event-type-btn" + (selectedEventType === ev.value ? " selected" : "")}
                    onClick={() => setSelectedEventType(ev.value)}
                    title={ev.desc}
                  >
                    <span className="event-type-icon">{ev.icon}</span>
                    <span className="event-type-label">{ev.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom event name */}
            {selectedEventType === "Custom Event" && (
              <div className="form-field" style={{ marginBottom: 20 }}>
                <label className="field-label">Custom Event Name</label>
                <input className="field-input" placeholder="e.g. Gifted to KVIC Exhibition" value={customEvent} onChange={e => setCustomEvent(e.target.value)} />
              </div>
            )}

            {/* Note */}
            <div className="form-field" style={{ marginBottom: 20 }}>
              <label className="field-label">Note (optional)</label>
              <input className="field-input" placeholder="e.g. Dispatched via BlueDart, AWB 123456789" value={eventNote} onChange={e => setEventNote(e.target.value)} />
            </div>

            {eventError   && <div className="form-err">{eventError}</div>}
            {eventSuccess && <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>✓ {eventSuccess}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-primary" type="submit" disabled={eventSaving}>
                {eventSaving ? "Recording…" : "Record on Blockchain →"}
              </button>
              <span style={{ color: "#444", fontSize: 12, alignSelf: "center" }}>Immutable · Hash-chained · Timestamped</span>
            </div>
          </form>
        </div>
      )}

      {/* ── Batch Cards ── */}
      <div className="batch-grid">
        {batches.length === 0 && <div className="empty-state">No batches yet. Create your first batch above.</div>}
        {batches.map(b => {
          const isOpen = expandedBatch === b.batch_id;
          const timeline = batchTimeline[b.batch_id] || [];
          return (
            <div key={b.id || b.batch_id} className="batch-card">
              <div className="batch-card-top">
                <div>
                  <div className="batch-name">{b.product_name}</div>
                  <div className="batch-id">{b.batch_id}</div>
                </div>
                <span className="badge badge-completed">{b.status}</span>
              </div>

              <div className="batch-meta">
                <div className="batch-meta-row"><span>Variety</span><strong>{b.honey_variety || "—"}</strong></div>
                <div className="batch-meta-row"><span>Packaged</span><strong>{fmtDate(b.packaging_date)}</strong></div>
                <div className="batch-meta-row"><span>Quality</span><strong>{b.quality_info || "—"}</strong></div>
                <div className="batch-meta-row"><span>Quantity</span><strong>{b.quantity ? `${b.quantity} kg` : "—"}</strong></div>
              </div>

              <div className="batch-qr">
                <QRCode value={`${window.location.origin}/verify/batch/${b.batch_id}`} size={100} fgColor="#ffffff" bgColor="#000000" />
              </div>

              <div className="batch-card-footer">
                <a className="btn-ghost" href={`/verify/batch/${b.batch_id}`} target="_blank" rel="noreferrer">
                  View Certificate →
                </a>
                <button className="btn-ghost" onClick={() => toggleTimeline(b.batch_id)}>
                  {isOpen ? "Hide Timeline ▲" : "Timeline ▼"}
                </button>
              </div>

              {/* In-card timeline */}
              {isOpen && (
                <div className="batch-timeline">
                  <div className="batch-timeline-title">Blockchain Journey ({timeline.length} events)</div>
                  {timeline.length === 0 && <p style={{ color: "#555", fontSize: 12 }}>No events recorded yet.</p>}
                  {timeline.map((rec, i) => (
                    <div key={i} className="bt-item">
                      <div className="bt-dot" />
                      {i < timeline.length - 1 && <div className="bt-line" />}
                      <div className="bt-content">
                        <div className="bt-event">{rec.event_type}</div>
                        <div className="bt-time">{fmtDateTime(rec.created_at)}</div>
                        {rec.event_data?.note && <div className="bt-note">{rec.event_data.note}</div>}
                        <div className="bt-hash">#{rec.current_hash?.slice(0, 20)}…</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ───────────────── overview fallback ───────────────── */
  return (
    <div className="stats-row">
      <div className="scard">
        <div className="scard-label">Active Hives</div>
        <div className="scard-value">{hives.length}</div>
      </div>
      <div className="scard">
        <div className="scard-label">Total Harvests</div>
        <div className="scard-value">{harvests.length}</div>
      </div>
      <div className="scard">
        <div className="scard-label">Traceable Batches</div>
        <div className="scard-value">{batches.length}</div>
      </div>
    </div>
  );
}
