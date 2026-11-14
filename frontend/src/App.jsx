import React, { useEffect, useState } from "react";
import API, { startKeepAliveHeartbeat } from "./api";
import HoneyChain from "./HoneyChain";
import VerifyBatch from "./VerifyBatch";

const NAV = [
  { id: "overview",  label: "Overview",      path: "/overview",     icon: "◉" },
  { id: "hives",     label: "Hives & IoT",   path: "/hives",        icon: "⬡" },
  { id: "harvests",  label: "Harvests",      path: "/harvests",     icon: "◈" },
  { id: "batches",   label: "Traceability",  path: "/traceability", icon: "⬡" },
  { id: "products",  label: "Inventory",     path: "/inventory",    icon: "▦" },
  { id: "orders",    label: "Orders",        path: "/orders",       icon: "◫" },
  { id: "payments",  label: "Payments",      path: "/payments",     icon: "₹" },
  { id: "invoices",  label: "Invoices",      path: "/invoices",     icon: "◳" },
];

const ROUTE_SEO = {
  overview: {
    title: "ApisAI Dashboard — Smart Apiary & Honey Intelligence",
    description: "Real-time apiary operations, daily harvest telemetry, revenue tracking, and AI-driven hive health monitoring for beekeeping MSMEs.",
    canonical: "/overview",
  },
  hives: {
    title: "Hives & IoT Telemetry — ApisAI",
    description: "Continuous sensor monitoring for beehives. Real-time temperature, humidity, weight telemetry, and AI colony swarming diagnostics.",
    canonical: "/hives",
  },
  harvests: {
    title: "Apiary Harvest Records & Yield — ApisAI",
    description: "Track honey harvest extractions by apiary yard, floral variety, batch weight, and laboratory quality certification grades.",
    canonical: "/harvests",
  },
  batches: {
    title: "Blockchain Honey Traceability & Verification — ApisAI HoneyChain",
    description: "Immutable SHA-256 cryptographic provenance chain for honey batches from hive extraction to retail shelf.",
    canonical: "/traceability",
  },
  products: {
    title: "Honey Product Catalog & Inventory — ApisAI",
    description: "Manage raw and specialty honey stock levels, pricing, packaging sizes, and direct retail distribution inventory.",
    canonical: "/inventory",
  },
  orders: {
    title: "Customer Orders & WhatsApp Fulfillment — ApisAI",
    description: "Automated order orchestration from WhatsApp conversational commerce through fulfillment and batch assignment.",
    canonical: "/orders",
  },
  payments: {
    title: "Payments & Revenue Settlement — ApisAI",
    description: "Monitor digital payment collections, gateway reconciliations, and customer transaction logs.",
    canonical: "/payments",
  },
  invoices: {
    title: "Automated Tax Invoicing & PDF Billing — ApisAI",
    description: "Generate compliant PDF invoices with GST calculations, automated line items, and cloud storage archival.",
    canonical: "/invoices",
  },
  settings: {
    title: "Apiary System Settings — ApisAI",
    description: "Configure apiary business profile, IoT gateway webhooks, alert thresholds, and WhatsApp bot integration parameters.",
    canonical: "/settings",
  },
  "404": {
    title: "404: Page Not Found — ApisAI",
    description: "The requested page could not be found on ApisAI. Explore our smart apiary dashboard or return to overview.",
    canonical: "/404",
  },
};

function getRouteFromPath(pathname) {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/overview") return { id: "overview", path: "/overview" };
  if (p === "/hives") return { id: "hives", path: "/hives" };
  if (p === "/harvests") return { id: "harvests", path: "/harvests" };
  if (p === "/traceability" || p === "/batches") return { id: "batches", path: "/traceability" };
  if (p === "/inventory" || p === "/products") return { id: "products", path: "/inventory" };
  if (p === "/orders") return { id: "orders", path: "/orders" };
  if (p === "/payments") return { id: "payments", path: "/payments" };
  if (p === "/invoices") return { id: "invoices", path: "/invoices" };
  if (p === "/settings") return { id: "settings", path: "/settings" };
  const verifyMatch = p.match(/^\/verify\/batch\/([A-Za-z0-9-]+)/);
  if (verifyMatch) return { id: "verify", batchId: verifyMatch[1], path: p };
  return { id: "404", path: p };
}

/* ─── helpers ─────────────────────────────────────── */
function fmt(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
function fmtTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}
function Empty({ text }) {
  return <div className="empty-state">{text}</div>;
}

/* ─── stat card ───────────────────────────────────── */
function StatCard({ label, value, sub, warn }) {
  return (
    <div className={"scard" + (warn ? " scard-warn" : "")}>
      <div className="scard-label">{label}</div>
      <div className="scard-value">{value}</div>
      {sub && <div className={"scard-sub" + (warn ? " warn" : "")}>{sub}</div>}
    </div>
  );
}

/* ─── activity ────────────────────────────────────── */
function ActivityList({ orders, payments, invoices }) {
  const all = [];
  (orders || []).forEach(o => {
    if (o.created_at || o.time) all.push({ title: "Order received", detail: o.item_name || o.product_name || "Order", amount: fmt(o.total ?? o.amount), time: o.created_at || o.time });
  });
  (payments || []).forEach(p => {
    if (p.created_at || p.time) all.push({ title: "Payment collected", detail: fmt(p.amount), amount: fmt(p.amount), time: p.created_at || p.time });
  });
  (invoices || []).forEach(i => {
    if (i.created_at || i.time) all.push({ title: "Invoice delivered", detail: i.invoice_number || i.id || "Invoice", amount: fmt(i.total ?? i.amount), time: i.created_at || i.time });
  });
  all.sort((a, b) => new Date(b.time) - new Date(a.time));
  const list = all.slice(0, 6);
  if (!list.length) return <Empty text="No activity yet." />;
  return (
    <div className="activity-list">
      {list.map((a, i) => (
        <div className="act-row" key={`act-${i}`}>
          <div className="act-left">
            <span className="act-title">{a.title}</span>
            <span className="act-detail">{a.detail}</span>
          </div>
          <div className="act-right">
            <span className="act-amount">{a.amount}</span>
            <time className="act-time">{fmtTime(a.time)}</time>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── bar chart ───────────────────────────────────── */
function BarChart({ data }) {
  if (!data || !data.length) return <Empty text="No revenue data for the last 7 days." />;
  const values = data.map(e => Number(typeof e === "object" ? e.value : e) || 0);
  const max = Math.max(...values, 1);
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div className="bar-chart">
      {values.map((v, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (values.length - 1 - i));
        return (
          <div className="bar-col" key={`bar-${i}`}>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${Math.round((v / max) * 100)}%` }} />
            </div>
            <span className="bar-label">{days[d.getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── orders table ────────────────────────────────── */
function OrdersTable({ orders, full }) {
  const [expanded, setExpanded] = useState(null);
  const rows = full ? orders : (orders || []).slice(0, 5);
  if (!rows.length) return <Empty text="No orders yet." />;
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Items</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o, i) => {
          const id = o.id || `order-${i}`;
          const open = expanded === id;
          const status = (o.status || "unknown").toLowerCase();
          return (
            <React.Fragment key={id}>
              <tr className="clickable" onClick={() => setExpanded(open ? null : id)}>
                <td>
                  <span className="cell-main">{o.customer_name || o.customer || "Customer"}</span>
                  <span className="cell-sub">WhatsApp</span>
                </td>
                <td>{o.items?.length ? `${o.items.length} item${o.items.length > 1 ? "s" : ""}` : "Order"} {open ? "▲" : "▼"}</td>
                <td><strong>{fmt(o.total ?? o.amount)}</strong></td>
                <td><span className={`badge badge-${status}`}>{o.status || "Unknown"}</span></td>
                <td className="dimmed">{fmtTime(o.created_at || o.time)}</td>
              </tr>
              {open && (
                <tr className="expanded-row">
                  <td colSpan={5}>
                    <div className="expanded-inner">
                      <div className="expanded-header">Order Items</div>
                      <ul className="item-list">
                        {(o.items || []).length ? o.items.map((it, j) => (
                          <li key={`item-${j}`} className="item-row">
                            <span><span className="dimmed">{it.quantity}×</span> {it.product}
                              {it.batch_id && (
                                <a className="verify-link" href={`/verify/batch/${it.batch_id}`} target="_blank" rel="noreferrer" title={`Verify batch ${it.batch_id}`}>Verify</a>
                              )}
                            </span>
                            <span className="dimmed">{fmt(it.total)}</span>
                          </li>
                        )) : <li className="dimmed">No items found</li>}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─── payments table ──────────────────────────────── */
function PaymentsTable({ payments }) {
  if (!payments?.length) return <Empty text="No payments yet." />;
  return (
    <table className="data-table">
      <thead><tr><th>Payment ID</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
      <tbody>
        {payments.map((p, i) => {
          const status = (p.status || "unknown").toLowerCase();
          return (
            <tr key={p.id || `pay-${i}`}>
              <td className="mono">{p.id || p.payment_id || "—"}</td>
              <td>{p.customer_name || p.customer || "—"}</td>
              <td><strong>{fmt(p.amount)}</strong></td>
              <td className="dimmed">{p.method || p.payment_method || "—"}</td>
              <td><span className={`badge badge-${status}`}>{p.status || "Unknown"}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─── invoices table ──────────────────────────────── */
function InvoicesTable({ invoices, onDelete }) {
  if (!invoices?.length) return <Empty text="No invoices yet." />;
  return (
    <table className="data-table">
      <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        {invoices.map((inv, i) => {
          const status = (inv.status || "unknown").toLowerCase();
          const url = inv.invoice_url || inv.file_url || inv.url;
          const cleanCustomer = (inv.customer_name || inv.customer || "Direct Customer").replace(/msme(\s*assist)?(\s*ai)?/gi, "ApisAI");
          const cleanInvNum = (inv.invoice_number || inv.invoice_id || inv.id || "—").replace(/msme(\s*assist)?(\s*ai)?/gi, "ApisAI");
          return (
            <tr key={inv.id || `inv-${i}`}>
              <td className="mono">{cleanInvNum}</td>
              <td>{cleanCustomer}</td>
              <td><strong>{fmt(inv.total ?? inv.amount)}</strong></td>
              <td><span className={`badge badge-${status}`}>{inv.status || "Unknown"}</span></td>
              <td>
                <div className="action-row">
                  {status === "pending" && onDelete && (
                    <button className="btn-danger-sm" onClick={() => onDelete(inv.id)}>Delete</button>
                  )}
                  {url && (
                    <button className="btn-ghost-sm" onClick={() => window.open(url, "_blank")}>PDF</button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─── products grid ───────────────────────────────── */
function ProductGrid({ products, onRemove, saving }) {
  if (!products.length) return <Empty text="No products in database." />;
  return (
    <div className="product-grid">
      {products.map((p, i) => (
        <div className="pcard" key={p.id || `prod-${i}`}>
          <div className="pcard-img">
            <span className="pcard-icon" role="img" aria-label={`${p.name} Honey Product Icon`}>⬡</span>
          </div>
          <div className="pcard-body">
            <span className="pcard-tag">HONEY PRODUCT</span>
            <h3 className="pcard-name">{p.name}</h3>
            <p className="pcard-desc">{p.description || "Available through WhatsApp ordering."}</p>
          </div>
          <div className="pcard-footer">
            <strong className="pcard-price">₹{p.price}</strong>
            <div className="pcard-actions">
              <span className={"pcard-stock" + (Number(p.stock) > 0 ? "" : " out")}>
                {Number(p.stock) > 0 ? `${p.stock} in stock` : "Out of stock"}
              </span>
              <button className="btn-danger-sm" onClick={() => onRemove(p)} disabled={saving}>Remove</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── page wrapper (Exact ONE H1 per page) ─────────── */
function Page({ title, subtitle, children }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ─── 404 NOT FOUND PAGE ──────────────────────────── */
function NotFoundPage({ currentPath, navigateTo }) {
  return (
    <Page title="404 — Page Not Found" subtitle="The requested page could not be located on this apiary platform.">
      <div className="panel" style={{ maxWidth: 680, textAlign: "center", padding: "52px 32px" }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.04em", color: "#ffffff", marginBottom: 12 }}>
          404
        </div>
        <p style={{ fontSize: 18, color: "var(--tx-1)", fontWeight: 500, marginBottom: 8 }}>
          The page you’re looking for can’t be found.
        </p>
        <p style={{ fontSize: 13.5, color: "var(--tx-2)", marginBottom: 28, lineHeight: 1.5 }}>
          The URL <code className="mono" style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>{currentPath}</code> does not correspond to any active apiary dashboard view or traceability certificate.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
          <button className="btn-primary" onClick={() => navigateTo("/overview")}>
            Return to Dashboard →
          </button>
          <button className="btn-ghost" onClick={() => navigateTo("/traceability")}>
            View Traceability
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 24, textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Explore Verified ApisAI Sections
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 13 }}>
            <a href="/hives" onClick={(e) => { e.preventDefault(); navigateTo("/hives"); }} style={{ color: "var(--apple-blue)" }}>
              → Hives &amp; IoT Telemetry
            </a>
            <a href="/harvests" onClick={(e) => { e.preventDefault(); navigateTo("/harvests"); }} style={{ color: "var(--apple-blue)" }}>
              → Harvest Records
            </a>
            <a href="/inventory" onClick={(e) => { e.preventDefault(); navigateTo("/inventory"); }} style={{ color: "var(--apple-blue)" }}>
              → Honey Inventory
            </a>
            <a href="/orders" onClick={(e) => { e.preventDefault(); navigateTo("/orders"); }} style={{ color: "var(--apple-blue)" }}>
              → Customer Orders
            </a>
          </div>
        </div>
      </div>
    </Page>
  );
}

/* ─── SYSTEM SETTINGS PAGE ────────────────────────── */
function SettingsView({ business }) {
  const [name, setName] = useState(business?.name || "Golden Hive Honey Farm");
  const [location, setLocation] = useState(business?.location || "Apiary Ridge, Sector 4, Shimla");
  const [phone, setPhone] = useState(business?.phone || "+91 98765 43210");
  const [fssai, setFssai] = useState("10022011000492");
  const [tempAlert, setTempAlert] = useState("38.5");
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    localStorage.setItem("apisai_settings", JSON.stringify({ name, location, phone, fssai, tempAlert }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  return (
    <Page title="System Settings" subtitle="Configure apiary metadata, IoT diagnostic alert thresholds, and operational integrations.">
      <div className="panel" style={{ maxWidth: 780 }}>
        <div className="panel-hd">
          <span className="panel-title">Apiary Business Profile</span>
          <span className="panel-sub">Active Apiary Workspace</span>
        </div>
        <form onSubmit={handleSave} style={{ padding: "24px 26px" }}>
          {saved && (
            <div className="invoice-success" style={{ marginBottom: 18 }}>
              ✓ Settings saved successfully. Changes are now active across your apiary network.
            </div>
          )}
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">Apiary Business Name</label>
              <input className="field-input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="field-label">Primary Location</label>
              <input className="field-input" value={location} onChange={e => setLocation(e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">Official Support Phone / WhatsApp</label>
              <input className="field-input" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="field-label">FSSAI / Organic License #</label>
              <input className="field-input" value={fssai} onChange={e => setFssai(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-dim)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 12 }}>IoT Telemetry &amp; Diagnostics</div>
            <div className="form-row">
              <div className="form-field">
                <label className="field-label">High-Temp Swarm Alert Threshold (°C)</label>
                <input className="field-input" type="number" step="0.1" value={tempAlert} onChange={e => setTempAlert(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="field-label">Sensor Polling Frequency</label>
                <input className="field-input" value="Real-time (30s telemetry sync)" disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-dim)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Integrations &amp; Infrastructure</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--tx-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span>WhatsApp AI Assistant</span>
                <strong style={{ color: "var(--apple-green)" }}>Google Gemini 2.5 Flash (Active)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span>Cloud Invoice Storage</span>
                <span className="mono">invoices (Supabase Storage)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span>Cryptographic Ledger</span>
                <strong style={{ color: "var(--tx-1)" }}>SHA-256 HoneyChain</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <button className="btn-primary" type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </Page>
  );
}

/* ─── MAIN APP COMPONENT ──────────────────────────── */
function App() {
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("apisai_logged_in") === "true" || localStorage.getItem("msmeassist_logged_in") === "true"
  );
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const initialRoute = getRouteFromPath(window.location.pathname);
  const [active, setActive] = useState(initialRoute.id);
  const [currentPath, setCurrentPath] = useState(initialRoute.path);
  const [batchIdParam, setBatchIdParam] = useState(initialRoute.batchId || null);

  const [status, setStatus] = useState("Connecting…");
  const [business, setBusiness] = useState(null);
  const [summary, setSummary] = useState({});
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [pForm, setPForm] = useState({ name: "", description: "", price: "", stock: "" });
  const [pSaving, setPSaving] = useState(false);
  const [pError, setPError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Clean URL Slug Navigation
  function navigateTo(path) {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    const r = getRouteFromPath(path);
    setActive(r.id);
    setCurrentPath(r.path);
    if (r.batchId) setBatchIdParam(r.batchId);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const r = getRouteFromPath(window.location.pathname);
      setActive(r.id);
      setCurrentPath(r.path);
      if (r.batchId) setBatchIdParam(r.batchId);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Dynamic SEO metadata synchronization
  useEffect(() => {
    const seo = ROUTE_SEO[active] || ROUTE_SEO["404"];
    document.title = seo.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", seo.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://apis.ai${seo.canonical}`);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", seo.title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", seo.description);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", `https://apis.ai${seo.canonical}`);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute("content", seo.title);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute("content", seo.description);
  }, [active]);

  useEffect(() => {
    let live = true;
    const stopHeartbeat = startKeepAliveHeartbeat(4 * 60 * 1000);

    async function load() {
      const wakeTimer = setTimeout(() => {
        if (live) setStatus("Waking server…");
      }, 2500);

      try {
        let connected = false;
        for (let attempt = 1; attempt <= 3 && !connected && live; attempt++) {
          try {
            await API.get("/health", { timeout: 35000 });
            connected = true;
          } catch (err) {
            if (attempt < 3 && live) {
              setStatus(`Waking server (${attempt}/3)…`);
              await new Promise(r => setTimeout(r, 2500));
            } else {
              throw err;
            }
          }
        }
        clearTimeout(wakeTimer);
        if (!live) return;
        setStatus("Connected");

        const safeGet = async (url, ms = 20000) => {
          try {
            const r = await API.get(url, { timeout: ms });
            return r.data;
          } catch (e) {
            console.warn("API request failed:", url, e.message);
            return null;
          }
        };
        const [b, pr, sm, or, py, inv] = await Promise.all([
          safeGet("/business"),
          safeGet("/products"),
          safeGet("/dashboard/summary"),
          safeGet("/dashboard/orders"),
          safeGet("/dashboard/payments"),
          safeGet("/dashboard/invoices"),
        ]);
        if (!live) return;
        if (b) setBusiness(b);
        const productList = Array.isArray(pr) ? pr : (pr?.products || pr?.data || []);
        setProducts(productList);
        setSummary(sm?.summary || sm || {});
        setOrders(or?.orders || or || []);
        setPayments(py?.payments || py || []);
        setInvoices(inv?.invoices || inv || []);
      } catch (e) {
        clearTimeout(wakeTimer);
        if (live) setStatus(e.code === "ERR_NETWORK" ? "Network error" : `Error ${e.response?.status || ""}`);
      }
    }
    load();
    return () => {
      live = false;
      stopHeartbeat();
    };
  }, []);

  function login(e) {
    e.preventDefault();
    if (email === "admin@apis.ai" && pass === "apisai") {
      localStorage.setItem("apisai_logged_in", "true");
      localStorage.removeItem("msmeassist_logged_in");
      setLoggedIn(true);
    } else {
      setLoginErr("Invalid email or password");
    }
  }

  function logout() {
    localStorage.removeItem("apisai_logged_in");
    localStorage.removeItem("msmeassist_logged_in");
    setLoggedIn(false);
  }

  async function deleteInvoice(id) {
    if (!window.confirm("Delete this order/invoice?")) return;
    try {
      await API.delete(`/orders/${id}`);
      setInvoices(prev => prev.filter(i => i.id !== id));
      setOrders(prev => prev.filter(o => o.id !== id));
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch { alert("Failed to delete."); }
  }

  async function addProduct(e) {
    e.preventDefault();
    setPError("");
    const { name, description, price, stock } = pForm;
    if (!name.trim() || price === "" || stock === "") { setPError("Name, price and stock are required."); return; }
    try {
      setPSaving(true);
      await API.post("/products", { name: name.trim(), description: description.trim(), price: Number(price), stock: Number(stock) }, { timeout: 15000 });
      setPForm({ name: "", description: "", price: "", stock: "" });
      const r = await API.get("/products", { timeout: 10000 });
      setProducts(r.data || []);
    } catch (err) {
      const d = err.response?.data;
      setPError(Array.isArray(d?.detail) ? d.detail.map(x => x.msg).join(", ") : d?.detail || d?.message || err.message || "Failed to add.");
    } finally { setPSaving(false); }
  }

  async function removeProduct(p) {
    if (!p.id || !window.confirm(`Remove "${p.name}"?`)) return;
    try {
      setPSaving(true);
      await API.delete(`/products/${p.id}`);
      const r = await API.get("/products", { timeout: 10000 });
      setProducts(r.data || []);
    } catch (err) { setPError(err.response?.data?.detail || "Could not remove."); }
    finally { setPSaving(false); }
  }

  /* verify route (public without login required) */
  if (active === "verify" && batchIdParam) {
    return <VerifyBatch batchId={batchIdParam} />;
  }

  /* login screen with single H1 */
  if (!loggedIn) return (
    <div className="login-screen">
      <div className="login-card">
        <div className="apple-login-header">
          <div className="apple-login-logo" style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <svg role="img" aria-label="ApisAI Insignia" viewBox="0 0 64 64" width="46" height="46" fill="none">
              <path d="M32 10L49 20V40L32 50L15 40V20L32 10Z" stroke="#f5f5f7" strokeWidth="2.5" strokeLinejoin="round" fill="rgba(255,255,255,0.06)" />
              <circle cx="32" cy="30" r="4.5" fill="#f5f5f7" />
              <line x1="32" y1="10" x2="32" y2="25.5" stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="40" x2="28" y2="32" stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round" />
              <line x1="49" y1="40" x2="36" y2="32" stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="login-logo">Sign in to ApisAI</h1>
          <p className="login-tagline">Smart Apiary &amp; Honey Traceability Platform</p>
        </div>
        <form onSubmit={login}>
          <div className="form-field">
            <label className="field-label">Account</label>
            <input className="field-input" type="email" placeholder="admin@apis.ai" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="form-field">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" required />
          </div>
          {loginErr && <div className="login-err">{loginErr}</div>}
          <button className="login-btn" type="submit">Sign in to ApisAI →</button>
        </form>
        <p className="login-footer">ApisAI Smart Apiary Platform</p>
      </div>
    </div>
  );

  const pageTitle = NAV.find(n => n.id === active)?.label || (active === "settings" ? "Settings" : "Not Found");

  return (
    <div className="shell">
      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── GLOBAL NAVIGATION BAR ── */}
      <header className="apple-global-nav">
        <div className="apple-nav-inner">
          <div className="apple-brand" onClick={() => navigateTo("/overview")}>
            <svg role="img" aria-label="ApisAI Logo" className="apple-logo-icon" viewBox="0 0 64 64" width="20" height="20" fill="none">
              <path d="M32 10L49 20V40L32 50L15 40V20L32 10Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="rgba(255,255,255,0.06)" />
              <circle cx="32" cy="30" r="4.5" fill="currentColor" />
              <line x1="32" y1="10" x2="32" y2="25.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="15" y1="40" x2="28" y2="32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="49" y1="40" x2="36" y2="32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="apple-brand-title">ApisAI</span>
          </div>

          <nav className="apple-nav-items" aria-label="Primary Navigation">
            {NAV.map(n => (
              <a
                key={n.id}
                href={n.path}
                className={"apple-nav-link" + (active === n.id ? " active" : "")}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(n.path);
                }}
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="apple-nav-right">
            <div className={"apple-live-status" + (status === "Connected" ? " ok" : "")}>
              <span className="status-dot-pulse" aria-hidden="true" />
              <span>{status}</span>
            </div>
            <button className="apple-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation menu">
              <span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OUT MENU ── */}
      <aside className={"sidebar" + (sidebarOpen ? " open" : "")} aria-label="Mobile Navigation Sidebar">
        <div className="brand">
          <div className="brand-icon">
            <svg role="img" aria-label="ApisAI Insignia" viewBox="0 0 64 64" width="16" height="16" fill="none">
              <path d="M32 10L49 20V40L32 50L15 40V20L32 10Z" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
              <circle cx="32" cy="30" r="4.5" fill="#000000" />
              <line x1="32" y1="10" x2="32" y2="25.5" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
              <line x1="15" y1="40" x2="28" y2="32" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
              <line x1="49" y1="40" x2="36" y2="32" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="brand-name">ApisAI</div>
            <div className="brand-sub">Smart Apiary Platform</div>
          </div>
        </div>

        <div className="nav-section-label">Navigation</div>
        <nav aria-label="Sidebar Navigation">
          {NAV.map(n => (
            <a
              key={n.id}
              href={n.path}
              className={"nav-btn" + (active === n.id ? " active" : "")}
              onClick={(e) => {
                e.preventDefault();
                navigateTo(n.path);
              }}
            >
              <span className="nav-ico" aria-hidden="true">{n.icon}</span>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="ai-pill">
            <span className="pulse-dot" aria-hidden="true" />
            <div>
              <div className="ai-pill-title">Intelligence</div>
              <div className="ai-pill-sub">WhatsApp automation active</div>
            </div>
          </div>
          <button className="foot-btn" onClick={() => navigateTo("/settings")}>
            <span aria-hidden="true">⚙</span> Settings
          </button>
          <button className="foot-btn danger" onClick={logout}>↩ Sign out</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main">
        {/* Subnav / Breadcrumb bar */}
        <div className="apple-subnav">
          <div className="apple-subnav-inner">
            <nav className="apple-breadcrumb" aria-label="Breadcrumb">
              <a href="/overview" className="apple-crumb-app" onClick={(e) => { e.preventDefault(); navigateTo("/overview"); }}>
                ApisAI
              </a>
              <span className="apple-crumb-sep" aria-hidden="true">/</span>
              <span className="apple-crumb-page" aria-current="page">{pageTitle}</span>
            </nav>
            <div className="apple-subnav-actions">
              <button
                className="apple-subnav-link"
                style={{ background: "none", color: active === "settings" ? "var(--tx-1)" : "var(--tx-3)", fontSize: 12, marginRight: 8 }}
                onClick={() => navigateTo("/settings")}
              >
                Settings
              </button>
              <button className="apple-signout-btn" onClick={logout}>Sign out</button>
            </div>
          </div>
        </div>

        {/* 404 NOT FOUND */}
        {active === "404" && (
          <NotFoundPage currentPath={currentPath} navigateTo={navigateTo} />
        )}

        {/* SETTINGS VIEW */}
        {active === "settings" && (
          <SettingsView business={business} />
        )}

        {/* OVERVIEW */}
        {active === "overview" && (
          <Page title={business?.name || "Golden Hive Honey Farm"} subtitle="Here's what is happening with your apiary today.">
            <div className="overview-cta">
              <button className="btn-primary" onClick={() => navigateTo("/orders")}>View Orders →</button>
            </div>

            <div className="stats-row">
              <StatCard label="Today's Revenue" value={fmt(summary.today_revenue)} />
              <StatCard label="Orders Today" value={summary.today_orders ?? 0} />
              <StatCard label="Pending Payments" value={summary.pending_payments ?? 0} sub="Needs attention" warn />
              <StatCard label="Products" value={summary.total_products ?? products.length ?? 0} />
            </div>

            <div className="two-col">
              <div className="panel">
                <div className="panel-hd"><span className="panel-title">Revenue</span><span className="panel-sub">Last 7 days</span></div>
                <BarChart data={summary.revenue_last_7_days} />
              </div>
              <div className="panel">
                <div className="panel-hd"><span className="panel-title">AI Activity</span><span className="live-badge">LIVE</span></div>
                <ActivityList orders={orders} payments={payments} invoices={invoices} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-hd">
                <span className="panel-title">Recent Orders</span>
                <button className="btn-ghost" onClick={() => navigateTo("/orders")}>View all →</button>
              </div>
              <OrdersTable orders={orders} />
            </div>
          </Page>
        )}

        {/* ORDERS */}
        {active === "orders" && (
          <Page title="Customer Orders" subtitle="Track WhatsApp orders from customer conversation to payment fulfillment.">
            <div className="panel"><OrdersTable orders={orders} full /></div>
          </Page>
        )}

        {/* PAYMENTS */}
        {active === "payments" && (
          <Page title="Payments &amp; Settlement" subtitle="Monitor payments collected through ApisAI and payment reconciliation.">
            <div className="stats-row">
              <StatCard label="Collected This Month" value={fmt(summary.month_revenue ?? summary.collected_amount)} />
              <StatCard label="Pending Amount" value={fmt(summary.pending_amount)} warn />
              <StatCard label="Success Rate" value={summary.payment_success_rate !== undefined ? `${Number(summary.payment_success_rate).toFixed(1)}%` : "0%"} />
            </div>
            <div className="panel"><PaymentsTable payments={payments} /></div>
          </Page>
        )}

        {/* INVOICES */}
        {active === "invoices" && (
          <Page title="Invoices &amp; Billing" subtitle="Generate and download compliant PDF invoices with automated GST calculations.">
            <InvoiceGenerator products={products} />
            <div className="panel"><InvoicesTable invoices={invoices} onDelete={deleteInvoice} /></div>
          </Page>
        )}

        {/* PRODUCTS / INVENTORY */}
        {active === "products" && (
          <Page title="Honey Inventory" subtitle="Manage honey varieties, stock levels, and packaging specifications.">
            <div className="panel">
              <div className="panel-hd"><span className="panel-title">Add Honey Product</span></div>
              <form className="product-form" onSubmit={addProduct}>
                <div className="form-row">
                  <div className="form-field">
                    <label className="field-label">Name</label>
                    <input className="field-input" value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder="Product name" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Description</label>
                    <input className="field-input" value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} placeholder="Short description" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label className="field-label">Price (₹)</label>
                    <input className="field-input" type="number" min="0" step="0.01" value={pForm.price} onChange={e => setPForm({ ...pForm, price: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Stock</label>
                    <input className="field-input" type="number" min="0" value={pForm.stock} onChange={e => setPForm({ ...pForm, stock: e.target.value })} placeholder="0" />
                  </div>
                </div>
                {pError && <div className="form-err">{pError}</div>}
                <button className="btn-primary" type="submit" disabled={pSaving}>{pSaving ? "Saving…" : "Add Product"}</button>
              </form>
            </div>
            <ProductGrid products={products} onRemove={removeProduct} saving={pSaving} />
          </Page>
        )}

        {/* HIVES & IOT */}
        {active === "hives" && (
          <Page title="Hives &amp; IoT Telemetry" subtitle="Continuous sensor telemetry for internal temperature, humidity, weight gain, and AI diagnostics.">
            <HoneyChain activeSection="hives" />
          </Page>
        )}

        {/* HARVESTS */}
        {active === "harvests" && (
          <Page title="Apiary Harvest Records" subtitle="Traceable extraction logs by yard, floral variety, batch weight, and lab quality grades.">
            <HoneyChain activeSection="harvests" />
          </Page>
        )}

        {/* TRACEABILITY / BATCHES */}
        {active === "batches" && (
          <Page title="HoneyChain Traceability" subtitle="Cryptographically linked SHA-256 provenance ledgers and public QR verification certificates.">
            <HoneyChain activeSection="batches" />
          </Page>
        )}
      </main>
    </div>
  );
}

/* ─── invoice generator ───────────────────────────── */
function InvoiceGenerator({ products }) {
  const [customer, setCustomer] = useState("");
  const [items, setItems] = useState([{ name: "", quantity: 1, price: "" }]);
  const [gst, setGst] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("apisai_invoices") || "[]"); } catch { return []; }
  });

  function addRow() { setItems([...items, { name: "", quantity: 1, price: "" }]); }
  function removeRow(i) { if (items.length > 1) setItems(items.filter((_, j) => j !== i)); }
  function updateRow(i, field, val) { setItems(items.map((r, j) => j === i ? { ...r, [field]: val } : r)); }

  function pickProduct(i, productName) {
    const p = (products || []).find(x => x.name === productName);
    if (p) {
      updateRow(i, "name", p.name);
      updateRow(i, "price", p.price);
    }
  }

  function subtotal() { return items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0); }

  function downloadBase64(b64, filename) {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function generate(e) {
    e.preventDefault();
    setError(""); setResult(null);
    if (!customer.trim()) { setError("Customer name is required."); return; }
    const validItems = items.filter(it => it.name.trim() && Number(it.price) > 0);
    if (!validItems.length) { setError("Add at least one item with a price."); return; }

    setGenerating(true);
    try {
      const res = await API.post("/invoice/generate", {
        business_name: "ApisAI",
        customer_name: customer.trim(),
        items: validItems.map(it => ({ name: it.name.trim(), quantity: Number(it.quantity) || 1, price: Number(it.price) })),
        gst_percent: Number(gst) || 0,
        discount: Number(discount) || 0,
        create_payment: false,
      }, { timeout: 30000 });

      if (res.data.success) {
        setResult(res.data);
        const newHist = [res.data, ...history].slice(0, 20);
        setHistory(newHist);
        localStorage.setItem("apisai_invoices", JSON.stringify(newHist));
        if (res.data.pdf_base64) {
          downloadBase64(res.data.pdf_base64, `Invoice-${res.data.invoice_number}.pdf`);
        }
      } else {
        setError(res.data.message || "Failed to generate invoice.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to generate invoice.");
    } finally {
      setGenerating(false);
    }
  }

  const sub = subtotal();
  const gstAmt = (sub * (Number(gst) || 0)) / 100;
  const grandTotal = Math.max(0, sub + gstAmt - (Number(discount) || 0));

  return (
    <div className="panel">
      <div className="panel-hd">
        <span className="panel-title">Generate ApisAI PDF Invoice</span>
        <span className="panel-sub">ApisAI Billing Engine</span>
      </div>
      <form onSubmit={generate} style={{ padding: "20px 24px" }}>
        {error && <div className="form-err">{error}</div>}
        {result && (
          <div className="invoice-success">
            Invoice {result.invoice_number} generated &amp; downloaded successfully! (Total: {fmt(result.grand_total)})
          </div>
        )}

        <div className="form-row">
          <div className="form-field">
            <label className="field-label">Customer Name</label>
            <input className="field-input" placeholder="e.g. Ramesh Kumar" value={customer} onChange={e => setCustomer(e.target.value)} required />
          </div>
          <div className="form-field">
            <label className="field-label">Platform / Issuer</label>
            <input className="field-input" value="ApisAI" disabled style={{ opacity: 0.85, color: "#ffffff", fontWeight: 600 }} />
          </div>
        </div>

        <div style={{ margin: "16px 0 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label className="field-label" style={{ margin: 0 }}>Invoice Items</label>
            <button type="button" className="btn-ghost-sm" onClick={addRow}>+ Add Item</button>
          </div>

          {items.map((it, i) => (
            <div key={`line-${i}`} className="invoice-line">
              <div className="invoice-line-inputs">
                {(products || []).length > 0 && (
                  <select className="field-input" style={{ flex: 1 }} value={it.name} onChange={e => pickProduct(i, e.target.value)}>
                    <option value="">Select from inventory…</option>
                    {(products || []).map((p, pIdx) => <option key={`prod-opt-${pIdx}`} value={p.name}>{p.name} (₹{p.price})</option>)}
                  </select>
                )}
                <input className="field-input" style={{ flex: 2 }} placeholder="Product or service name" value={it.name} onChange={e => updateRow(i, "name", e.target.value)} required />
                <input className="field-input" style={{ width: 80 }} type="number" min="1" placeholder="Qty" value={it.quantity} onChange={e => updateRow(i, "quantity", e.target.value)} required />
                <input className="field-input" style={{ width: 110 }} type="number" min="0" step="0.01" placeholder="Price (₹)" value={it.price} onChange={e => updateRow(i, "price", e.target.value)} required />
                {items.length > 1 && (
                  <button type="button" className="btn-danger-sm" onClick={() => removeRow(i)} aria-label="Remove item">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <div className="form-field">
            <label className="field-label">GST Tax (%)</label>
            <input className="field-input" type="number" min="0" max="100" step="0.1" placeholder="e.g. 5 or 12" value={gst} onChange={e => setGst(e.target.value)} />
          </div>
          <div className="form-field">
            <label className="field-label">Discount (₹)</label>
            <input className="field-input" type="number" min="0" step="1" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
          </div>
        </div>

        <div className="invoice-totals">
          <div className="invoice-total-row"><span>Subtotal:</span><strong>{fmt(sub)}</strong></div>
          {Number(gst) > 0 && <div className="invoice-total-row"><span>GST ({gst}%):</span><strong>+{fmt(gstAmt)}</strong></div>}
          {Number(discount) > 0 && <div className="invoice-total-row"><span>Discount:</span><strong style={{ color: "var(--apple-green)" }}>-{fmt(discount)}</strong></div>}
          <div className="invoice-total-row total"><span>Grand Total:</span><strong>{fmt(grandTotal)}</strong></div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn-primary" type="submit" disabled={generating}>
            {generating ? "Generating PDF & Uploading…" : "Download PDF Invoice →"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;
