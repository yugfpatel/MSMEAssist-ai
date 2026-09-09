import QRCode from "react-qr-code";

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
    <div className="verify-container" style={{ padding: "40px 20px", maxWidth: "600px", margin: "0 auto", fontFamily: "'Inter', sans-serif", background: "#faf9f6", minHeight: "100vh", color: "#2d2724" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{ fontSize: "48px", marginBottom: "10px" }}>🍯</div>
        <h1 style={{ color: "#d97706", margin: "0 0 5px 0", fontSize: "32px", fontWeight: "800" }}>ApisAI</h1>
        <p style={{ color: "#6b635e", margin: "0 0 24px 0", fontSize: "15px", fontWeight: "500" }}>Verified Farm-to-Table Traceability</p>
        <div style={{ background: blockchain?.verified ? "#ecfdf5" : "#fef2f2", color: blockchain?.verified ? "#059669" : "#dc2626", border: `1px solid ${blockchain?.verified ? "#a7f3d0" : "#fecaca"}`, padding: "12px 24px", borderRadius: "8px", fontWeight: "600", display: "inline-block", marginBottom: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          {blockchain?.verified ? "✓ Cryptographically Verified" : "⚠️ Traceability Verification Failed"}
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", padding: "15px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e0d8", width: "fit-content", margin: "0 auto", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <QRCode value={window.location.href} size={110} fgColor="#2d2724" />
        </div>
      </div>

      <div style={{ background: "#ffffff", padding: "28px", borderRadius: "16px", border: "1px solid #e5e0d8", marginBottom: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        <h2 style={{ margin: "0 0 16px 0", color: "#d97706", fontSize: "18px", fontWeight: "700" }}>Batch Details</h2>
        <div style={{ display: "grid", gap: "12px", color: "#6b635e", fontSize: "15px" }}>
          <p style={{ margin: 0 }}><strong>Batch ID:</strong> <span style={{ color: "#2d2724", fontWeight: "500" }}>{batch.batch_id}</span></p>
          <p style={{ margin: 0 }}><strong>Product:</strong> <span style={{ color: "#2d2724", fontWeight: "500" }}>{batch.product_name}</span></p>
          <p style={{ margin: 0 }}><strong>Variety:</strong> <span style={{ color: "#2d2724", fontWeight: "500" }}>{batch.honey_variety}</span></p>
          <p style={{ margin: 0 }}><strong>Harvest Date:</strong> <span style={{ color: "#2d2724", fontWeight: "500" }}>{batch.harvest_date}</span></p>
          <p style={{ margin: 0 }}><strong>Packaging Date:</strong> <span style={{ color: "#2d2724", fontWeight: "500" }}>{batch.packaging_date}</span></p>
          <p style={{ margin: 0 }}><strong>Quality Grade:</strong> <span style={{ color: "#2d2724", fontWeight: "500" }}>{batch.quality_info}</span></p>
        </div>
      </div>

      <div style={{ background: "#ffffff", padding: "28px", borderRadius: "16px", border: "1px solid #e5e0d8", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        <h2 style={{ margin: "0 0 24px 0", color: "#d97706", fontSize: "18px", fontWeight: "700" }}>Journey Timeline</h2>
        <div className="timeline" style={{ borderLeft: "2px solid #fcd34d", paddingLeft: "24px", marginLeft: "12px" }}>
          {(blockchain?.records || []).map((rec, i) => (
            <div key={i} style={{ marginBottom: "24px", position: "relative" }}>
              <div style={{ position: "absolute", left: "-31px", top: "4px", width: "12px", height: "12px", background: "#d97706", borderRadius: "50%", boxShadow: "0 0 0 4px #fef3c7" }}></div>
              <strong style={{ display: "block", color: "#2d2724", fontSize: "16px", marginBottom: "4px" }}>{rec.event_type}</strong>
              <div style={{ fontSize: "13px", color: "#6b635e", marginBottom: "6px", fontWeight: "500" }}>{new Date(rec.created_at).toLocaleString()}</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "monospace", wordBreak: "break-all", background: "#f9fafb", padding: "6px", borderRadius: "4px", border: "1px solid #f3f4f6" }}>Hash: {rec.current_hash}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", marginTop: "24px", fontWeight: "500" }}>Secured by SHA-256 Cryptographic Hash-chain</p>
      </div>
    </div>
  );
}
