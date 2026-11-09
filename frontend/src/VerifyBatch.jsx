import QRCode from "react-qr-code";
import React, { useEffect, useState } from "react";
import API from "./api";

function fmt(v) {
  if (!v) return "—";
  return v;
}

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Row({ label, value, mono }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={mono ? { ...styles.rowValue, ...styles.mono } : styles.rowValue}>{value || "—"}</span>
    </div>
  );
}

export default function VerifyBatch({ batchId }) {
  const [batch, setBatch] = useState(null);
  const [blockchain, setBlockchain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setError("Could not load batch. It may not exist or the server is unavailable.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batchId]);

  if (loading) return (
    <div style={styles.screen}>
      <div style={styles.loadingBox}>
        <div style={styles.spinner} />
        <p style={{ color: "#888", marginTop: 16, fontSize: 14 }}>Verifying traceability chain…</p>
      </div>
    </div>
  );

  if (error || !batch) return (
    <div style={styles.screen}>
      <div style={styles.errorBox}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✕</div>
        <p style={{ color: "#f87171", fontWeight: 600 }}>{error || `Batch ${batchId} not found.`}</p>
      </div>
    </div>
  );

  const verified = blockchain?.verified === true;
  const records  = blockchain?.records || [];

  return (
    <div style={styles.screen}>
      <div style={styles.card}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.logo}>APIS AI</div>
          <div style={styles.certLabel}>Certificate of Authenticity</div>

          <div style={verified ? styles.verifiedBadge : styles.failedBadge}>
            <span style={{ marginRight: 8 }}>{verified ? "✓" : "✕"}</span>
            {verified ? "Cryptographically Verified" : "Verification Failed"}
          </div>
        </div>

        {/* ── QR ── */}
        <div style={styles.qrWrap}>
          <QRCode
            value={window.location.href}
            size={100}
            fgColor="#ffffff"
            bgColor="#0a0a0a"
          />
          <p style={styles.qrLabel}>Scan to verify</p>
        </div>

        <div style={styles.divider} />

        {/* ── Batch Details ── */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Batch Details</div>
          <Row label="Batch ID"       value={batch.batch_id} mono />
          <Row label="Product"        value={batch.product_name} />
          <Row label="Variety"        value={batch.honey_variety} />
          <Row label="Quantity"       value={batch.quantity ? `${batch.quantity} kg` : null} />
          <Row label="Quality Grade"  value={batch.quality_info} />
          <Row label="Status"         value={batch.status} />
        </div>

        <div style={styles.divider} />

        {/* ── Dates ── */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Dates</div>
          <Row label="Harvest Date"   value={fmtDate(batch.harvest_date)} />
          <Row label="Processing Date" value={fmtDate(batch.processing_date)} />
          <Row label="Packaging Date" value={fmtDate(batch.packaging_date)} />
          <Row label="Expiry Date"    value={fmtDate(batch.expiry_date)} />
          <Row label="Created At"     value={fmtDateTime(batch.created_at)} />
        </div>

        <div style={styles.divider} />

        {/* ── Blockchain ── */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Blockchain Integrity</div>
          <Row label="Chain Valid"  value={verified ? "Yes — all hashes match" : "Failed — chain broken"} />
          <Row label="Events"       value={`${records.length} recorded`} />
          {blockchain?.chain_length && <Row label="Chain Length" value={`${blockchain.chain_length} blocks`} />}
        </div>

        <div style={styles.divider} />

        {/* ── Journey Timeline ── */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Journey Timeline</div>

          {records.length === 0 && (
            <p style={{ color: "#555", fontSize: 13, marginTop: 12 }}>No journey records found.</p>
          )}

          <div style={styles.timeline}>
            {records.map((rec, i) => (
              <div key={i} style={styles.timelineItem}>
                <div style={styles.timelineDot} />
                {i < records.length - 1 && <div style={styles.timelineLine} />}
                <div style={styles.timelineContent}>
                  <div style={styles.timelineEvent}>{rec.event_type}</div>
                  <div style={styles.timelineDate}>{fmtDateTime(rec.created_at)}</div>
                  {rec.event_data?.product_name && (
                    <div style={styles.timelineDetail}>Product: {rec.event_data.product_name}</div>
                  )}
                  {rec.event_data?.quantity && (
                    <div style={styles.timelineDetail}>Quantity: {rec.event_data.quantity} kg</div>
                  )}
                  <div style={styles.hash}>
                    <span style={{ color: "#555", marginRight: 6 }}>Hash:</span>
                    {rec.current_hash?.slice(0, 32)}…
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={styles.footer}>
          Secured by SHA-256 Cryptographic Hash-chain · APIS AI Blockchain Traceability
        </div>
      </div>
    </div>
  );
}

/* ── All styles in one place, pure dark theme ── */
const styles = {
  screen: {
    minHeight: "100vh",
    backgroundColor: "#000000",
    backgroundImage: "radial-gradient(1000px circle at 50% 0%, rgba(120, 119, 198, 0.1), transparent 75%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "48px 18px 80px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", -system-ui, sans-serif',
    WebkitFontSmoothing: "antialiased",
  },
  card: {
    width: "100%",
    maxWidth: 620,
    background: "rgba(22, 22, 27, 0.72)",
    backdropFilter: "blur(24px) saturate(190%)",
    WebkitBackdropFilter: "blur(24px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.14), 0 24px 64px -12px rgba(0, 0, 0, 0.85)",
  },
  header: {
    textAlign: "center",
    padding: "40px 32px 28px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
  },
  logo: {
    fontSize: 24,
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.03em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  certLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#86868b",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 22,
  },
  verifiedBadge: {
    display: "inline-block",
    background: "rgba(48, 209, 88, 0.1)",
    border: "1px solid rgba(48, 209, 88, 0.3)",
    color: "#30d158",
    padding: "8px 22px",
    borderRadius: 9999,
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    boxShadow: "0 0 20px rgba(48, 209, 88, 0.15)",
  },
  failedBadge: {
    display: "inline-block",
    background: "rgba(255, 69, 58, 0.1)",
    border: "1px solid rgba(255, 69, 58, 0.3)",
    color: "#ff453a",
    padding: "8px 22px",
    borderRadius: 9999,
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  qrWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "26px 32px",
    gap: 12,
    borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
  },
  qrLabel: {
    fontSize: 11,
    color: "#555",
    fontWeight: 500,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.05)",
    margin: 0,
  },
  section: {
    padding: "24px 32px",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#86868b",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 16,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "11px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    gap: 16,
  },
  rowLabel: {
    fontSize: 13,
    color: "#86868b",
    fontWeight: 500,
    flexShrink: 0,
    minWidth: 130,
  },
  rowValue: {
    fontSize: 13,
    color: "#f5f5f7",
    fontWeight: 600,
    textAlign: "right",
    wordBreak: "break-word",
  },
  mono: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontSize: 12,
    color: "#64d2ff",
  },
  timeline: {
    marginTop: 16,
    paddingLeft: 16,
  },
  timelineItem: {
    position: "relative",
    paddingLeft: 28,
    paddingBottom: 28,
  },
  timelineDot: {
    position: "absolute",
    left: 0,
    top: 4,
    width: 10,
    height: 10,
    background: "#30d158",
    borderRadius: "50%",
    boxShadow: "0 0 0 4px rgba(48,209,88,0.2)",
  },
  timelineLine: {
    position: "absolute",
    left: 4,
    top: 14,
    bottom: 0,
    width: 1,
    background: "rgba(48,209,88,0.25)",
  },
  timelineContent: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "14px 18px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  },
  timelineEvent: {
    fontSize: 14,
    fontWeight: 700,
    color: "#f5f5f7",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: "#86868b",
    marginBottom: 8,
    fontFamily: "'JetBrains Mono', monospace",
  },
  timelineDetail: {
    fontSize: 12.5,
    color: "#d1d1d6",
    marginBottom: 4,
  },
  hash: {
    fontSize: 11,
    color: "#6e6e73",
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    marginTop: 8,
    wordBreak: "break-all",
    lineHeight: 1.5,
  },
  footer: {
    padding: "18px 32px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    textAlign: "center",
    fontSize: 11.5,
    color: "#6e6e73",
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 60,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(255,255,255,0.08)",
    borderTopColor: "#22c55e",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    textAlign: "center",
    padding: 60,
    color: "#888",
  },
};
