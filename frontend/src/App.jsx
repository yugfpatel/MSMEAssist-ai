import React, { useEffect, useState } from "react";
import API from "./api";

const navItems = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "orders", label: "Orders", icon: "🛒" },
  { id: "payments", label: "Payments", icon: "₹" },
  { id: "invoices", label: "Invoices", icon: "▤" },
  { id: "products", label: "Products", icon: "📦" },
  { id: "appointments", label: "Appointments", icon: "◷" },
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("msmeassist_logged_in") === "true");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [active, setActive] = useState("overview");
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [backendStatus, setBackendStatus] = useState("Connecting...");
  const [summary, setSummary] = useState({});
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", stock: "" });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setBackendStatus("Connecting...");

        const homeResponse = await API.get("/", { timeout: 10000 });
        console.log("BACKEND HOME RESPONSE:", homeResponse.data);

        if (cancelled) return;
        setBackendStatus("Connected");

        try {
          const businessResponse = await API.get("/business", { timeout: 5000 });
          if (!cancelled) setBusiness(businessResponse.data);
        } catch (businessError) {
          console.error("BUSINESS API ERROR:", businessError);
          if (!cancelled) setBusiness(null);
        }

        try {
          const productsResponse = await API.get("/products", { timeout: 10000 });
          if (!cancelled) setProducts(productsResponse.data || []);
        } catch (productsError) {
          console.error("PRODUCTS API ERROR:", productsError);
          if (!cancelled) setProducts([]);
        }

        try {
          const summaryResponse = await API.get("/dashboard/summary", { timeout: 5000 });
          if (!cancelled) setSummary(summaryResponse.data?.summary || summaryResponse.data || {});
        } catch (error) {
          console.error("SUMMARY API ERROR:", error);
        }

        try {
          const ordersResponse = await API.get("/dashboard/orders", { timeout: 5000 });
          if (!cancelled) setOrders(ordersResponse.data?.orders || ordersResponse.data || []);
        } catch (error) {
          console.error("ORDERS API ERROR:", error);
        }

        try {
          const paymentsResponse = await API.get("/dashboard/payments", { timeout: 5000 });
          if (!cancelled) setPayments(paymentsResponse.data?.payments || paymentsResponse.data || []);
        } catch (error) {
          console.error("PAYMENTS API ERROR:", error);
        }

        try {
          const invoicesResponse = await API.get("/dashboard/invoices", { timeout: 5000 });
          if (!cancelled) setInvoices(invoicesResponse.data?.invoices || invoicesResponse.data || []);
        } catch (error) {
          console.error("INVOICES API ERROR:", error);
        }
      } catch (error) {
        console.error("BACKEND ERROR:", error);
        console.error("BACKEND CODE:", error.code);
        console.error("BACKEND MESSAGE:", error.message);
        console.error("BACKEND STATUS:", error.response?.status);
        console.error("BACKEND DATA:", error.response?.data);
        console.error("BACKEND URL:", error.config?.baseURL, error.config?.url);
        if (!cancelled) {
          setBackendStatus(
            error.response
              ? `Backend HTTP ${error.response.status}`
              : error.code === "ERR_NETWORK"
                ? "Network/CORS error"
                : `Backend error: ${error.message || "Request failed"}`
          );
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    if (loginEmail === import.meta.env.VITE_DASHBOARD_EMAIL && loginPassword === import.meta.env.VITE_DASHBOARD_PASSWORD) {
      localStorage.setItem("msmeassist_logged_in", "true");
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Invalid email or password");
    }
  }

  function handleLogout() {
    localStorage.removeItem("msmeassist_logged_in");
    setIsLoggedIn(false);
  }

  async function refreshProducts() {
    const response = await API.get("/products", {
      timeout: 10000,
    });
    setProducts(response.data || []);
  }

  async function handleDeleteInvoice(invoiceId) {
    if (!window.confirm("Are you sure you want to delete this pending invoice/order?")) return;
    try {
      await API.delete(`/orders/${invoiceId}`);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      setOrders((prev) => prev.filter((ord) => ord.id !== invoiceId));
      setPayments((prev) => prev.filter((pay) => pay.id !== invoiceId));
      
      const summaryResponse = await API.get("/dashboard/summary");
      setSummary(summaryResponse.data?.summary || summaryResponse.data || {});
    } catch (err) {
      console.error("Error deleting invoice", err);
      alert("Failed to delete. Please try again.");
    }
  }

  async function addProduct(event) {
    event.preventDefault();
    setProductError("");

    const name = productForm.name.trim();
    const description = productForm.description.trim();
    const price = Number(productForm.price);
    const stock = Number(productForm.stock);

    if (!name || productForm.price === "" || productForm.stock === "") {
      setProductError("Name, price and availability are required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setProductError("Enter a valid price.");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setProductError("Enter a valid availability value.");
      return;
    }

    try {
      setProductSaving(true);

      const response = await API.post(
        "/products",
        {
          name,
          description,
          price,
          stock,
        },
        {
          timeout: 15000,
        }
      );

      console.log("ADD PRODUCT RESPONSE:", response.data);
      setProductForm({ name: "", description: "", price: "", stock: "" });
      await refreshProducts();
    } catch (error) {
      console.error("ADD PRODUCT ERROR:", error);
      console.error("CODE:", error.code);
      console.error("MESSAGE:", error.message);
      console.error("STATUS:", error.response?.status);
      console.error("DATA:", error.response?.data);
      console.error(
        "URL:",
        `${error.config?.baseURL || ""}${error.config?.url || ""}`
      );

      if (error.response) {
        const detail = error.response.data?.detail;
        const message = error.response.data?.message;
        const backendMessage = Array.isArray(detail)
          ? detail.map((item) => item?.msg || JSON.stringify(item)).join(", ")
          : detail || message;
        setProductError(
          backendMessage || `Backend returned HTTP ${error.response.status}.`
        );
      } else if (error.code === "ERR_NETWORK") {
        setProductError("Network/CORS error: browser cannot reach the backend.");
      } else {
        setProductError(error.message || "Could not add product.");
      }
    } finally {
      setProductSaving(false);
    }
  }

  async function removeProduct(product) {
    if (!product.id) {
      setProductError("This product has no database ID and cannot be removed.");
      return;
    }

    if (!window.confirm(`Remove ${product.name}?`)) return;

    try {
      setProductError("");
      setProductSaving(true);
      await API.delete(`/products/${product.id}`);
      await refreshProducts();
    } catch (error) {
      console.error("REMOVE PRODUCT ERROR:", error);
      setProductError(error.response?.data?.detail || error.response?.data?.message || "Could not remove product.");
    } finally {
      setProductSaving(false);
    }
  }

  const totalProducts = products.length;

  const title = navItems.find((item) => item.id === active)?.label || "Overview";

  if (!isLoggedIn) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} className="login-form panel" style={{ margin: 'auto', width: '100%', maxWidth: '400px', padding: '32px', background: '#141414', border: '1px solid #222', borderRadius: '12px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', color: '#fff', fontSize: '28px' }}>MSMEAssist AI</h2>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: '24px', fontSize: '18px' }}>Business Dashboard</p>
          
          <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '18px' }}>Email</label>
          <input 
            type="email" 
            placeholder="admin@msmeassist.ai" 
            value={loginEmail} 
            onChange={e => setLoginEmail(e.target.value)}
            style={{ width: '100%', marginBottom: '16px', padding: '12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
          />
          
          <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '18px' }}>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={loginPassword} 
            onChange={e => setLoginPassword(e.target.value)}
            style={{ width: '100%', marginBottom: '24px', padding: '12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
          />
          
          {loginError && <div style={{ color: '#ff4d4f', marginBottom: '16px', textAlign: 'center', fontSize: '18px', background: 'rgba(255,77,79,0.1)', padding: '8px', borderRadius: '6px' }}>{loginError}</div>}
          
          <button type="submit" className="primary-btn" style={{ width: '100%', padding: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Login</button>
          <p style={{ textAlign: 'center', color: '#666', marginTop: '24px', fontSize: '16px' }}>AI-powered business automation</p>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MSMEAssist AI</strong>
            <span>AI Business OS</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="ai-card">
            <div className="ai-dot" />
            <div>
              <strong>AI Assistant</strong>
              <span>WhatsApp automation active</span>
            </div>
          </div>
          <button className="settings-btn" onClick={() => alert("Settings coming next 🚀")}>⚙ Settings</button>
          <button className="settings-btn" onClick={handleLogout} style={{ marginTop: '8px', color: '#ff4d4f' }}>🚪 Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">BUSINESS DASHBOARD</div>
            <h1>{title}</h1>
          </div>
          <div className="topbar-right">
            <div className="connection-pill">
              <span className={`status-dot ${backendStatus === "Connected" ? "online" : ""}`} />
              {backendStatus}
            </div>
            <div className="avatar">Y</div>
          </div>
        </header>

        {active === "overview" && (
          <section>
            <div className="welcome-row">
              <div>
                <h2>{business?.name || "Shree Restaurant"}</h2>
                <p>Here's what is happening with your business today.</p>
              </div>
              <button className="primary-btn" onClick={() => setActive("orders")}>View Orders →</button>
            </div>

            <div className="stats-grid">
              <StatCard
                label="Today's Revenue"
                value={formatCurrency(summary.today_revenue)}
                change=""
                icon="₹"
              />
              <StatCard
                label="Orders Today"
                value={summary.today_orders ?? 0}
                change=""
                icon="🛒"
              />
              <StatCard
                label="Pending Payments"
                value={summary.pending_payments ?? 0}
                change="Needs attention"
                icon="◷"
                warning
              />
              <StatCard
                label="Products"
                value={summary.total_products ?? totalProducts ?? 0}
                change=""
                icon="📦"
              />
            </div>

            <div className="dashboard-grid">
              <div className="panel large-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Revenue overview</h3>
                    <span>Last 7 days</span>
                  </div>
                </div>
                {Array.isArray(summary.revenue_last_7_days) && summary.revenue_last_7_days.length ? (
                  <div className="chart">
                    {summary.revenue_last_7_days.map((entry, index) => {
                      let value = typeof entry === "object" && entry !== null ? entry.value : entry;
                      value = Number(value) || 0;
                      // Normalize to percentage for bar height (relative to max)
                      const max = Math.max(...summary.revenue_last_7_days.map(e => typeof e === "object" && e !== null ? Number(e.value) || 0 : Number(e) || 0), 1);
                      const height = max ? Math.round((value / max) * 100) : 0;
                      
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - index));
                      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                      
                      return (
                        <div className="chart-col" key={index}>
                          <div className="bar" style={{ height: `${height}%` }} />
                          <span>{dayName}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState text="No revenue data for the last 7 days." />
                )}
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>AI activity</h3>
                    <span>WhatsApp automation</span>
                  </div>
                  <span className="live-badge">LIVE</span>
                </div>
                <div className="activity-list">
                  <ActivityList orders={orders} payments={payments} invoices={invoices} />
                </div>
              </div>
            </div>

            <div className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h3>Recent orders</h3>
                  <span>Latest customer activity</span>
                </div>
                <button className="ghost-btn" onClick={() => setActive("orders")}>View all →</button>
              </div>
              <OrdersTable orders={orders} />
            </div>
          </section>
        )}

        {active === "orders" && (
          <section>
            <div className="page-intro"><h2>Orders</h2><p>Track WhatsApp orders from conversation to payment.</p></div>
            <div className="panel table-panel"><OrdersTable orders={orders} full /></div>
          </section>
        )}

        {active === "payments" && (
          <section>
            <div className="page-intro"><h2>Payments</h2><p>Monitor payments collected through MSMEAssist.</p></div>
            <div className="stats-grid">
              <StatCard
                label="Collected"
                value={formatCurrency(summary.month_revenue ?? summary.collected_amount)}
                change="This month"
                icon="₹"
              />
              <StatCard
                label="Pending"
                value={formatCurrency(summary.pending_amount)}
                change=""
                icon="◷"
                warning
              />
              <StatCard
                label="Success rate"
                value={
                  summary.payment_success_rate !== undefined && summary.payment_success_rate !== null
                    ? `${Number(summary.payment_success_rate).toFixed(1)}%`
                    : "0%"
                }
                change=""
                icon="✓"
              />
            </div>
            <div className="panel table-panel"><PaymentsTable payments={payments} /></div>
          </section>
        )}

        {active === "invoices" && (
          <section>
            <div className="page-intro"><h2>Invoices</h2><p>Invoices generated automatically after successful payment.</p></div>
            <div className="panel table-panel"><InvoicesTable invoices={invoices} onDelete={handleDeleteInvoice} /></div>
          </section>
        )}

        {active === "products" && (
          <section>
            <div className="page-intro"><h2>Products</h2><p>Add or remove products directly from your Supabase database.</p></div>

            <div className="panel product-manager">
              <div className="panel-heading">
                <div>
                  <h3>Add product</h3>
                  <span>Changes are saved directly to the database.</span>
                </div>
              </div>

              <form className="product-form" onSubmit={addProduct}>
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Product name"
                />
                <input
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Description"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="Price"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="Availability (0 = not available)"
                />
                <button className="primary-btn" type="submit" disabled={productSaving}>
                  {productSaving ? "Saving..." : "Add product"}
                </button>
              </form>

              {productError && <div className="product-error">{productError}</div>}
            </div>

            <div className="product-grid">
              {products.length ? products.map((product) => (
                <div className="product-card" key={product.id || product.name}>
                  <div className="product-image">🍽️</div>
                  <div className="product-info">
                    <span className="product-category">MENU ITEM</span>
                    <h3>{product.name}</h3>
                    <p>{product.description || "Available through WhatsApp ordering."}</p>
                    <div className="product-footer">
                      <strong>₹{product.price}</strong>
                      <div className="product-actions">
                        <span className={Number(product.stock) > 0 ? "stock" : "stock low"}>
                          {Number(product.stock) > 0 ? "Available" : "Not available"}
                        </span>
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => removeProduct(product)}
                          disabled={productSaving}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )) : <EmptyState text="No products found in Supabase." />}
            </div>
          </section>
        )}

        {active === "appointments" && (
          <section>
            <div className="page-intro"><h2>Appointments</h2><p>Google Calendar bookings created by your AI assistant.</p></div>
            <div className="appointment-hero panel">
              <div className="calendar-icon">◷</div>
              <div><h3>Calendar automation</h3><p>Connect Google Calendar and let MSMEAssist handle appointment requests from WhatsApp.</p></div>
              <button className="primary-btn" onClick={() => window.open("http://localhost:8000/auth/google", "_blank")}>Connect Calendar</button>
            </div>
          </section>
        )}
      </main>

      <style>{`
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b0d10; color: #f5f7fa; }
button { font: inherit; }
.app-shell { min-height: 100vh; display: flex; background: #0b0d10; color: #f5f7fa; }
.sidebar { width: 250px; background: #080a0d; color: #f5f7fa; padding: 24px 16px; display: flex; flex-direction: column; position: fixed; inset: 0 auto 0 0; border-right: 1px solid #20242b; }
.brand { display: flex; align-items: center; gap: 11px; padding: 4px 10px 30px; }
.brand-mark { width: 38px; height: 38px; border-radius: 11px; background: #f5f7fa; color: #080a0d; display: grid; place-items: center; font-weight: 900; font-size: 24px; }
.brand strong { display: block; font-size: 20px; letter-spacing: -.3px; color: #f5f7fa; }
.brand span { display: block; color: #8b929e; font-size: 15px; margin-top: 2px; }
.sidebar-label { color: #727985; font-size: 14px; font-weight: 800; letter-spacing: 1.2px; padding: 0 12px 9px; }
nav { display: grid; gap: 5px; }
.nav-item { border: 0; color: #9ba2ae; background: transparent; width: 100%; padding: 11px 12px; border-radius: 9px; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer; font-size: 17px; font-weight: 600; }
.nav-item:hover { background: #171a20; color: #ffffff; }
.nav-item.active { background: #f5f7fa; color: #0b0d10; }
.nav-icon { width: 20px; text-align: center; font-size: 19px; }
.sidebar-bottom { margin-top: auto; }
.ai-card { border: 1px solid #252a32; border-radius: 12px; padding: 13px; display: flex; gap: 10px; margin-bottom: 10px; background: #111419; }
.ai-dot { width: 8px; height: 8px; background: #45d483; border-radius: 50%; margin-top: 5px; box-shadow: 0 0 0 4px rgba(69,212,131,.1); }
.ai-card strong, .ai-card span { display: block; }
.ai-card strong { font-size: 16px; color: #f5f7fa; }
.ai-card span { color: #8b929e; font-size: 14px; margin-top: 3px; }
.settings-btn { background: transparent; border: 0; color: #8b929e; padding: 10px 12px; cursor: pointer; font-size: 16px; }
.main-content { margin-left: 250px; width: calc(100% - 250px); padding: 0 38px 50px; }
.topbar { height: 96px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #20242b; margin-bottom: 30px; }
.eyebrow { color: #8b929e; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; }
h1, h2, h3 { color: #f5f7fa; }
h1 { margin: 4px 0 0; font-size: 29px; letter-spacing: -.7px; }
h2 { margin: 0; font-size: 25px; letter-spacing: -.5px; }
h3 { margin: 0; font-size: 18px; letter-spacing: -.2px; }
p { color: #a1a8b3; font-size: 16px; line-height: 1.6; margin: 6px 0 0; }
.topbar-right { display: flex; align-items: center; gap: 15px; }
.connection-pill { background: #111419; border: 1px solid #292e37; border-radius: 30px; padding: 8px 12px; font-size: 15px; color: #c0c5ce; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #e2a23b; margin-right: 6px; }
.status-dot.online { background: #35bd75; }
.avatar { width: 34px; height: 34px; border-radius: 50%; background: #f5f7fa; color: #111318; display: grid; place-items: center; font-size: 16px; font-weight: 700; }
.welcome-row, .page-intro { margin-bottom: 24px; }
.welcome-row { display: flex; justify-content: space-between; align-items: end; }
.primary-btn { background: #f5f7fa; color: #0b0d10; border: 0; padding: 10px 15px; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
.primary-btn:hover { transform: translateY(-1px); background: #ffffff; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.stat-card, .panel, .product-card { background: #111419; border: 1px solid #242932; border-radius: 12px; }
.stat-card { padding: 17px; position: relative; }
.stat-icon { position: absolute; right: 15px; top: 15px; width: 30px; height: 30px; border-radius: 8px; background: #1b1f26; display: grid; place-items: center; font-size: 17px; color: #f5f7fa; }
.stat-label { color: #9aa1ad; font-size: 14px; font-weight: 600; }
.stat-value { color: #f5f7fa; font-size: 27px; font-weight: 800; margin-top: 8px; letter-spacing: -.7px; }
.stat-change { margin-top: 6px; color: #45d483; font-size: 13px; font-weight: 700; }
.stat-change.warning { color: #e2a23b; }
.dashboard-grid { display: grid; grid-template-columns: 1.65fr 1fr; gap: 18px; margin-bottom: 18px; }
.panel { padding: 20px; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.panel-heading span { color: #9299a5; font-size: 14px; }
.ghost-btn { border: 1px solid #30353e; background: #171a20; border-radius: 7px; padding: 7px 10px; color: #c4c9d2; font-size: 14px; cursor: pointer; }
.ghost-btn:hover { background: #20242b; }
.live-badge { color: #45d483 !important; background: #10261b; border-radius: 20px; padding: 4px 7px; font-weight: 800; font-size: 12px !important; }
.chart { height: 220px; display: flex; align-items: end; justify-content: space-around; gap: 12px; border-bottom: 1px solid #292e36; padding: 10px 12px 0; }
.chart-col { height: 100%; flex: 1; display: flex; flex-direction: column; justify-content: end; align-items: center; gap: 8px; }
.bar { width: min(32px, 65%); background: #f5f7fa; border-radius: 5px 5px 0 0; min-height: 12px; }
.chart-col span { font-size: 13px; color: #8f96a2; padding-bottom: 8px; }
.activity-list { display: grid; }
.activity { padding: 13px 0; border-bottom: 1px solid #22262e; display: flex; justify-content: space-between; gap: 10px; }
.activity:last-child { border-bottom: 0; }
.activity strong, .activity span { display: block; }
.activity strong { font-size: 14px; color: #f0f2f5; }
.activity span { font-size: 13px; color: #9299a5; margin-top: 3px; }
.activity time { font-size: 13px; color: #7f8793; white-space: nowrap; }
.table-panel { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; color: #8f96a2; font-size: 13px; font-weight: 700; padding: 10px 8px; border-bottom: 1px solid #292e36; }
td { padding: 13px 8px; border-bottom: 1px solid #22262e; font-size: 14px; color: #d7dbe1; }
.customer-cell strong { display: block; font-size: 14px; color: #f0f2f5; }
.customer-cell span { color: #8f96a2; font-size: 13px; }
.status { display: inline-block; border-radius: 20px; padding: 5px 8px; font-size: 12px; font-weight: 800; }
.status.paid { background: #10291c; color: #45d483; }
.status.pending { background: #30230f; color: #e2a23b; }
.status.completed { background: #1b2037; color: #9ca8ff; }
.product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.product-card { overflow: hidden; }
.product-image { height: 130px; display: grid; place-items: center; font-size: 46px; background: #191c22; }
.product-info { padding: 16px; }
.product-category { font-size: 12px; font-weight: 800; color: #8f96a2; letter-spacing: 1px; }
.product-info h3 { margin-top: 5px; color: #f5f7fa; }
.product-info p { color: #9da4af; }
.product-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
.product-manager { margin-bottom: 18px; }
.product-form { display: grid; grid-template-columns: 1.2fr 1.5fr .8fr 1fr auto; gap: 10px; align-items: center; }
.product-form input { width: 100%; border: 1px solid #30353e; border-radius: 8px; padding: 10px 11px; font-size: 15px; outline: none; background: #0d1014; color: #f5f7fa !important; -webkit-text-fill-color: #f5f7fa !important; }
.product-form input::placeholder { color: #8f96a2 !important; -webkit-text-fill-color: #8f96a2 !important; opacity: 1 !important; }
.product-form input:focus { border-color: #f5f7fa; }
.product-form button:disabled, .delete-btn:disabled { opacity: .55; cursor: not-allowed; }
.product-error { margin-top: 10px; color: #ff8d8d; background: #2b1517; border: 1px solid #54282b; border-radius: 8px; padding: 9px 11px; font-size: 14px; }
.product-actions { display: flex; align-items: center; gap: 10px; }
.delete-btn { border: 1px solid #54282b; background: #241315; color: #ff8d8d; border-radius: 7px; padding: 6px 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
.product-footer strong { font-size: 21px; color: #f5f7fa; }
.stock { font-size: 13px; color: #45d483; font-weight: 700; }
.stock.low { color: #e2a23b; }
.appointment-hero { display: flex; align-items: center; gap: 18px; }
.appointment-hero > div:nth-child(2) { flex: 1; }
.calendar-icon { width: 48px; height: 48px; border-radius: 12px; background: #191c22; display: grid; place-items: center; font-size: 26px; color: #f5f7fa; }
.page-intro h2 { margin-bottom: 3px; }
.empty { padding: 50px; text-align: center; color: #8f96a2; font-size: 16px; }
@media (max-width: 1000px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .dashboard-grid { grid-template-columns: 1fr; } .product-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) {
  .sidebar { width: 70px; padding: 20px 8px; }
  .brand div:last-child, .sidebar-label, .ai-card div { display: none; }
  .brand { justify-content: center; padding: 4px 0 25px; }
  .nav-item { justify-content: center; font-size: 0; padding: 11px 0; }
  .settings-btn { font-size: 0; padding: 10px 0; }
  .settings-btn::before { content: '⚙'; font-size: 18px; }
  .settings-btn[style*="color: #ff4d4f"]::before { content: '🚪'; }
  .main-content { margin-left: 70px; width: calc(100% - 70px); padding: 0 16px 30px; }
  .stats-grid, .product-grid { grid-template-columns: 1fr; }
  .welcome-row { align-items: start; gap: 15px; flex-direction: column; }
  .product-form { grid-template-columns: 1fr; }
  .topbar { flex-direction: column; align-items: flex-start; justify-content: center; gap: 12px; height: auto; padding: 15px 0; }
  .appointment-hero { flex-direction: column; text-align: center; }
}
      `}</style>
    </div>
  );
}

function StatCard({ label, value, change, icon, warning }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-change ${warning ? "warning" : ""}`}>{change}</div>
    </div>
  );
}

function Activity({ title, detail, time }) {
  return (
    <div className="activity">
      <div><strong>{title}</strong><span>{detail}</span></div>
      <time>{time}</time>
    </div>
  );
}


function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function OrdersTable({ orders, full = false }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!orders || !orders.length) {
    return <EmptyState text="No orders yet." />;
  }

  const displayOrders = full ? orders : orders.slice(0, 5);

  return (
    <table>
      <thead>
        <tr>
          <th>CUSTOMER</th>
          <th>ORDER</th>
          <th>AMOUNT</th>
          <th>STATUS</th>
          <th>TIME</th>
        </tr>
      </thead>
      <tbody>
        {displayOrders.map((order, index) => {
          const customer =
            order.customer_name ||
            order.customer ||
            order.name ||
            "Customer";
          
          let itemSummary = "Order";
          if (order.items && order.items.length > 0) {
            itemSummary = `${order.items.length} item${order.items.length > 1 ? 's' : ''}`;
          }

          const amount = formatCurrency(order.total ?? order.amount ?? 0);
          const status = (order.status || "Unknown").toLowerCase();
          const rawTime = order.created_at || order.time || "";
          const isExpanded = expandedId === (order.id || index);

          return (
            <React.Fragment key={order.id || index}>
              <tr 
                onClick={() => setExpandedId(isExpanded ? null : (order.id || index))}
                style={{ cursor: "pointer", borderBottom: isExpanded ? "none" : "" }}
                className="hover-row"
              >
                <td className="customer-cell">
                  <strong>{customer}</strong>
                  <span>WhatsApp</span>
                </td>
                <td>{itemSummary} <span style={{ fontSize: '14px', opacity: 0.6, marginLeft: '4px' }}>{isExpanded ? '▲' : '▼'}</span></td>
                <td>
                  <strong>{amount}</strong>
                </td>
                <td>
                  <span className={`status ${status}`}>{order.status || "Unknown"}</span>
                </td>
                <td>{formatTime(rawTime)}</td>
              </tr>
              {isExpanded && (
                <tr className="expanded-row" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <td colSpan="5" style={{ padding: "16px 24px", paddingTop: 0, borderBottom: "1px solid #333" }}>
                    <div style={{ marginTop: "12px", marginBottom: "8px", fontWeight: "600", fontSize: "16px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Order Items</div>
                    <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => (
                          <li key={idx} style={{ padding: "6px 0", borderBottom: idx < order.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                             <span><span style={{ color: "#aaa", marginRight: "8px" }}>{it.quantity}x</span> {it.product}</span>
                             <span style={{ color: "#aaa" }}>{formatCurrency(it.total)}</span>
                          </li>
                        ))
                      ) : (
                        <li style={{ padding: "4px 0", fontSize: "18px", color: "#666" }}>No items found</li>
                      )}
                    </ul>
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

function PaymentsTable({ payments }) {
  if (!payments || !payments.length) {
    return <EmptyState text="No payments yet." />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>PAYMENT</th>
          <th>CUSTOMER</th>
          <th>AMOUNT</th>
          <th>METHOD</th>
          <th>STATUS</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment, index) => {
          const paymentId = payment.id || payment.payment_id || "—";
          const customer = payment.customer_name || payment.customer || "—";
          const amount = formatCurrency(payment.amount);
          const method = payment.method || payment.payment_method || "—";
          const status = (payment.status || "Unknown").toLowerCase();
          return (
            <tr key={payment.id || index}>
              <td>{paymentId}</td>
              <td>{customer}</td>
              <td>{amount}</td>
              <td>{method}</td>
              <td>
                <span className={`status ${status}`}>{payment.status || "Unknown"}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function InvoicesTable({ invoices, onDelete }) {
  if (!invoices || !invoices.length) {
    return <EmptyState text="No invoices yet." />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>INVOICE</th>
          <th>CUSTOMER</th>
          <th>AMOUNT</th>
          <th>STATUS</th>
          <th>ACTION</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice, index) => {
          const invoiceId =
            invoice.invoice_number ||
            invoice.invoice_id ||
            invoice.id ||
            "—";
          const customer = invoice.customer_name || invoice.customer || "—";
          const amount = formatCurrency(invoice.total ?? invoice.amount ?? 0);
          const status = (invoice.status || "Unknown").toLowerCase();
          const url = invoice.invoice_url || invoice.file_url || invoice.url;
          return (
            <tr key={invoice.id || index}>
              <td>
                <strong>{invoiceId}</strong>
              </td>
              <td>{customer}</td>
              <td>{amount}</td>
              <td>
                <span className={`status ${status}`}>{invoice.status || "Unknown"}</span>
              </td>
              <td>
                {status === "pending" ? (
                  <button
                    className="icon-btn"
                    onClick={() => onDelete && onDelete(invoice.id)}
                    title="Delete"
                    style={{ color: "#ff4d4f", background: "none", border: "none", cursor: "pointer", fontSize: "20px", marginRight: url ? "8px" : "0" }}
                  >
                    🗑️
                  </button>
                ) : status === "confirmed" || status === "paid" ? (
                  <span title="Confirmed" style={{ color: "#52c41a", fontSize: "20px", marginRight: url ? "8px" : "0" }}>✅</span>
                ) : null}
                {url ? (
                  <button
                    className="ghost-btn"
                    onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                  >
                    Open PDF
                  </button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EmptyState({ text }) {
  return <div className="empty">{text}</div>;
}

export default App;
function ActivityList({ orders, payments, invoices }) {
  // Gather all activities from orders, payments, invoices with timestamps and amounts
  const activities = [];
  if (Array.isArray(orders)) {
    for (const order of orders) {
      const ts = order.created_at || order.time;
      if (ts) {
        activities.push({
          type: "order",
          title: "Order received",
          detail:
            (order.quantity ? `${order.quantity} × ` : "") +
            (order.item_name || order.product_name || order.item || "Order"),
          amount: order.total ?? order.amount ?? 0,
          time: ts,
        });
      }
    }
  }
  if (Array.isArray(payments)) {
    for (const payment of payments) {
      const ts = payment.created_at || payment.time;
      if (ts) {
        activities.push({
          type: "payment",
          title: "Payment collected",
          detail:
            formatCurrency(payment.amount) +
            (payment.method || payment.payment_method
              ? ` • ${payment.method || payment.payment_method}`
              : ""),
          amount: payment.amount || 0,
          time: ts,
        });
      }
    }
  }
  if (Array.isArray(invoices)) {
    for (const invoice of invoices) {
      const ts = invoice.created_at || invoice.time;
      if (ts) {
        activities.push({
          type: "invoice",
          title: "Invoice delivered",
          detail: (invoice.invoice_number ||
            invoice.invoice_id ||
            invoice.id ||
            "Invoice") +
            (invoice.invoice_url || invoice.file_url || invoice.url
              ? " • WhatsApp PDF"
              : ""),
          amount: invoice.total ?? invoice.amount ?? 0,
          time: ts,
        });
      }
    }
  }
  // Sort by time descending
  activities.sort((a, b) => {
    const ta = new Date(a.time).getTime();
    const tb = new Date(b.time).getTime();
    return tb - ta;
  });
  const latest = activities.slice(0, 5);
  if (!latest.length) {
    return <EmptyState text="No activity yet." />;
  }
  return (
    <>
      {latest.map((activity, idx) => (
        <Activity
          key={idx}
          title={activity.title}
          detail={activity.detail}
          time={formatTime(activity.time)}
        />
      ))}
    </>
  );
}
