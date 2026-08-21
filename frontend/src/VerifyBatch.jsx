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
    <div className="verify-container" style={{ padding: "30px 20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", background: "#171311", minHeight: "100vh", color: "#fdfbf9" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🐝</div>
        <h1 style={{ color: "#f59e0b", margin: "0 0 5px 0" }}>Honey Chain</h1>
        <p style={{ color: "#a39791", margin: "0 0 20px 0", fontSize: "14px" }}>AI-Powered Smart Beekeeping & Honey Traceability</p>
        <div style={{ background: blockchain?.verified ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: blockchain?.verified ? "#10b981" : "#ef4444", border: `1px solid ${blockchain?.verified ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`, padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", display: "inline-block" }}>
          {blockchain?.verified ? "✓ Blockchain Traceability Verified" : "⚠️ Traceability Verification Failed"}
        </div>
      </div>

      <div style={{ background: "#1c1714", padding: "24px", borderRadius: "12px", border: "1px solid #2a211e", marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 15px 0", color: "#f59e0b", fontSize: "18px" }}>Batch Information</h2>
        <div style={{ display: "grid", gap: "10px", color: "#d6cfc9" }}>
          <p style={{ margin: 0 }}><strong>Batch ID:</strong> <span style={{ color: "#fdfbf9" }}>{batch.batch_id}</span></p>
          <p style={{ margin: 0 }}><strong>Product:</strong> <span style={{ color: "#fdfbf9" }}>{batch.product_name}</span></p>
          <p style={{ margin: 0 }}><strong>Variety:</strong> <span style={{ color: "#fdfbf9" }}>{batch.honey_variety}</span></p>
          <p style={{ margin: 0 }}><strong>Harvest Date:</strong> <span style={{ color: "#fdfbf9" }}>{batch.harvest_date}</span></p>
          <p style={{ margin: 0 }}><strong>Packaging Date:</strong> <span style={{ color: "#fdfbf9" }}>{batch.packaging_date}</span></p>
          <p style={{ margin: 0 }}><strong>Quality:</strong> <span style={{ color: "#fdfbf9" }}>{batch.quality_info}</span></p>
        </div>
      </div>

      <div style={{ background: "#1c1714", padding: "24px", borderRadius: "12px", border: "1px solid #2a211e" }}>
        <h2 style={{ margin: "0 0 20px 0", color: "#f59e0b", fontSize: "18px" }}>Traceability Timeline</h2>
        <div className="timeline" style={{ borderLeft: "2px solid rgba(245, 158, 11, 0.3)", paddingLeft: "20px", marginLeft: "10px" }}>
          {(blockchain?.records || []).map((rec, i) => (
            <div key={i} style={{ marginBottom: "20px", position: "relative" }}>
              <div style={{ position: "absolute", left: "-27px", top: "4px", width: "12px", height: "12px", background: "#f59e0b", borderRadius: "50%", boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.1)" }}></div>
              <strong style={{ display: "block", color: "#fdfbf9", fontSize: "16px", marginBottom: "4px" }}>{rec.event_type}</strong>
              <div style={{ fontSize: "13px", color: "#a39791", marginBottom: "4px" }}>{new Date(rec.created_at).toLocaleString()}</div>
              <div style={{ fontSize: "12px", color: "#8a7c76", fontFamily: "monospace", wordBreak: "break-all" }}>Hash: {rec.current_hash}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: "12px", color: "#a39791", marginTop: "20px", fontStyle: "italic" }}>Tamper-evident hash-chain prototype.</p>
      </div>
    </div>
  );
}
