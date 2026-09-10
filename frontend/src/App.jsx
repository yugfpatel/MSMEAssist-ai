import React, { useEffect, useState } from "react";
import API from "./api";
import HoneyChain from "./HoneyChain";
import VerifyBatch from "./VerifyBatch";

const NAV = [
  { id: "overview",  label: "Overview",      icon: "◉" },
  { id: "hives",     label: "Hives & IoT",   icon: "⬡" },
  { id: "harvests",  label: "Harvests",      icon: "◈" },
  { id: "batches",   label: "Traceability",  icon: "⬡" },
  { id: "products",  label: "Inventory",     icon: "▦" },
  { id: "orders",    label: "Orders",        icon: "◫" },
  { id: "payments",  label: "Payments",      icon: "₹" },
  { id: "invoices",  label: "Invoices",      icon: "◳" },
];

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
        <div className="act-row" key={i}>
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
          <div className="bar-col" key={i}>
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
          const id = o.id || i;
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
                          <li key={j} className="item-row">
                            <span><span className="dimmed">{it.quantity}×</span> {it.product}
                              {it.batch_id && (
                                <a className="verify-link" href={`/verify/batch/${it.batch_id}`} target="_blank" rel="noreferrer">Verify</a>
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
            <tr key={p.id || i}>
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
          return (
            <tr key={inv.id || i}>
              <td className="mono">{inv.invoice_number || inv.invoice_id || inv.id || "—"}</td>
              <td>{inv.customer_name || inv.customer || "—"}</td>
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
      {products.map(p => (
        <div className="pcard" key={p.id || p.name}>
          <div className="pcard-img">
            <span className="pcard-icon">⬡</span>
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

/* ─── page wrapper ────────────────────────────────── */
function Page({ title, subtitle, children }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">{title}</h2>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ─── main app ────────────────────────────────────── */
function App() {
  const [loggedIn, setLoggedIn] = useState(localStorage.getItem("msmeassist_logged_in") === "true");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [active, setActive] = useState("overview");
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

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        await API.get("/", { timeout: 10000 });
        if (!live) return;
        setStatus("Connected");
        const safeGet = async (url, ms = 15000) => { try { const r = await API.get(url, { timeout: ms }); return r.data; } catch (e) { console.warn("safeGet failed:", url, e.message); return null; } };
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
        if (live) setStatus(e.code === "ERR_NETWORK" ? "Network error" : `Error ${e.response?.status || ""}`);
      }
    }
    load();
    return () => { live = false; };
  }, []);

  function login(e) {
    e.preventDefault();
    if (email === "admin@apis.ai" && pass === "apisai") {
      localStorage.setItem("msmeassist_logged_in", "true");
      setLoggedIn(true);
    } else {
      setLoginErr("Invalid email or password");
    }
  }

  function logout() {
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

  /* verify route */
  const m = window.location.pathname.match(/^\/verify\/batch\/([A-Za-z0-9-]+)/);
  if (m) return <VerifyBatch batchId={m[1]} />;

  /* login screen */
  if (!loggedIn) return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">APIS AI</div>
        <p className="login-tagline">AI-Powered Smart Beekeeping &amp; Honey Traceability</p>
        <form onSubmit={login}>
          <label className="field-label">Email</label>
          <input className="field-input" type="email" placeholder="admin@apis.ai" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <label className="field-label">Password</label>
          <input className="field-input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
          {loginErr && <div className="login-err">{loginErr}</div>}
          <button className="login-btn" type="submit">Sign in →</button>
        </form>
        <p className="login-footer">AI-powered apiary automation</p>
      </div>
    </div>
  );

  const pageTitle = NAV.find(n => n.id === active)?.label || "Overview";

  return (
    <div className="shell">
      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <div className="brand-name">APIS AI</div>
            <div className="brand-sub">Smart Apiary Platform</div>
          </div>
        </div>

        <div className="nav-section-label">Workspace</div>
        <nav>
          {NAV.map(n => (
            <button key={n.id} className={"nav-btn" + (active === n.id ? " active" : "")} onClick={() => { setActive(n.id); setSidebarOpen(false); }}>
              <span className="nav-ico">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="ai-pill">
            <span className="pulse-dot" />
            <div>
              <div className="ai-pill-title">AI Assistant</div>
              <div className="ai-pill-sub">WhatsApp automation active</div>
            </div>
          </div>
          <button className="foot-btn" onClick={() => alert("Settings coming soon")}>⚙ Settings</button>
          <button className="foot-btn danger" onClick={logout}>↩ Sign out</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <div>
              <div className="topbar-eye">APIARY DASHBOARD</div>
              <h1 className="topbar-title">{pageTitle}</h1>
            </div>
          </div>
          <div className={"status-pill" + (status === "Connected" ? " ok" : "")}>
            <span className="status-dot" />
            {status}
          </div>
        </header>

        {/* OVERVIEW */}
        {active === "overview" && (
          <Page title={business?.name || "Golden Hive Honey Farm"} subtitle="Here's what is happening with your apiary today.">
            <div className="overview-cta">
              <button className="btn-primary" onClick={() => setActive("orders")}>View Orders →</button>
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
                <button className="btn-ghost" onClick={() => setActive("orders")}>View all →</button>
              </div>
              <OrdersTable orders={orders} />
            </div>
          </Page>
        )}

        {/* ORDERS */}
        {active === "orders" && (
          <Page title="Orders" subtitle="Track WhatsApp orders from conversation to payment.">
            <div className="panel"><OrdersTable orders={orders} full /></div>
          </Page>
        )}

        {/* PAYMENTS */}
        {active === "payments" && (
          <Page title="Payments" subtitle="Monitor payments collected through ApisAI.">
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
          <Page title="Invoices" subtitle="Invoices generated automatically after successful payment.">
            <div className="panel"><InvoicesTable invoices={invoices} onDelete={deleteInvoice} /></div>
          </Page>
        )}

        {/* PRODUCTS */}
        {active === "products" && (
          <Page title="Inventory" subtitle="Add or remove products from your Supabase database.">
            <div className="panel">
              <div className="panel-hd"><span className="panel-title">Add Product</span></div>
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

        {/* HONEYCHAIN SUBSYSTEMS */}
        {["hives", "harvests", "batches"].includes(active) && (
          <Page title="ApisAI Subsystem" subtitle="Blockchain-based traceability and smart beekeeping management.">
            <HoneyChain activeSection={active} />
          </Page>
        )}
      </main>
    </div>
  );
}

export default App;
