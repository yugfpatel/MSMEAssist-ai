import React, { useEffect, useState } from "react";
import API from "./api";
import "./App.css"; // Reuse existing styles if possible

export default function VerifyBatch({ batchId }) {
  const [batch, setBatch] = useState(null);
  const [blockchain, setBlockchain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [batchRes, bcRes] = await Promise.all([
          API.get(`/api/honey/batches/${batchId}`),
          API.get(`/api/honey/blockchain/verify/${batchId}`)
        ]);
        setBatch(batchRes.data.batch);
        setBlockchain(bcRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batchId]);

  if (loading) return <div className="app-container"><div className="loading">Verifying Traceability...</div></div>;
  if (!batch) return <div className="app-container"><div className="error-message">Batch {batchId} not found or invalid.</div></div>;

  return (
    <div className="verify-container" style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ color: "#d97706" }}>Honey Traceability</h1>
        <div style={{ background: blockchain?.verified ? "#dcfce7" : "#fee2e2", color: blockchain?.verified ? "#166534" : "#991b1b", padding: "10px", borderRadius: "8px", fontWeight: "bold", display: "inline-block" }}>
          {blockchain?.verified ? "✓ Blockchain Verified" : "⚠️ Traceability Verification Failed"}
        </div>
      </div>

      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
        <h2>Batch Information</h2>
        <p><strong>Batch ID:</strong> {batch.batch_id}</p>
        <p><strong>Product:</strong> {batch.product_name}</p>
        <p><strong>Variety:</strong> {batch.honey_variety}</p>
        <p><strong>Quality:</strong> {batch.quality_info}</p>
      </div>

      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h2>Traceability Timeline</h2>
        <div className="timeline" style={{ borderLeft: "2px solid #d97706", paddingLeft: "15px", marginLeft: "10px" }}>
          {(blockchain?.records || []).map((rec, i) => (
            <div key={i} style={{ marginBottom: "15px", position: "relative" }}>
              <div style={{ position: "absolute", left: "-21px", top: "2px", width: "10px", height: "10px", background: "#d97706", borderRadius: "50%" }}></div>
              <strong>{rec.event_type}</strong>
              <div style={{ fontSize: "0.85em", color: "#666" }}>{new Date(rec.created_at).toLocaleString()}</div>
              <div style={{ fontSize: "0.75em", color: "#999", wordBreak: "break-all" }}>Hash: {rec.current_hash.substring(0, 16)}...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
