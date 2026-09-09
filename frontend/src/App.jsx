import React, { useEffect, useState } from "react";
import API from "./api";
import HoneyChain from "./HoneyChain";
import VerifyBatch from "./VerifyBatch";

const navItems = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "hives", label: "Hives & IoT", icon: "" },
  { id: "harvests", label: "Harvests", icon: "" },
  { id: "batches", label: "Traceability", icon: "🔗" },
  { id: "products", label: "Inventory", icon: "" },
  { id: "orders", label: "Orders", icon: "🛒" },
  { id: "payments", label: "Payments", icon: "₹" },
  { id: "invoices", label: "Invoices", icon: "▤" },
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
    if (loginEmail === "admin@apis.ai" && loginPassword === "apisai") {
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

  const verifyMatch = window.location.pathname.match(/^\/verify\/batch\/([A-Za-z0-9-]+)/);
  if (verifyMatch) {
    return <VerifyBatch batchId={verifyMatch[1]} />;
  }

  if (!isLoggedIn) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09090b', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} className="login-form panel" style={{ margin: 'auto', width: '100%', maxWidth: '400px', padding: '32px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}>
          <div style={{ textAlign: "center", fontSize: "40px", marginBottom: "10px" }}></div>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', color: '#fafafa', fontSize: '28px' }}>APIS AI</h2>
          <p style={{ textAlign: 'center', color: '#a1a1aa', marginBottom: '24px', fontSize: '15px' }}>AI-Powered Smart Beekeeping & Honey Traceability</p>
          
          <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '18px' }}>Email</label>
          <input 
            type="email" 
            placeholder="admin@apis.ai" 
            value={loginEmail} 
            onChange={e => setLoginEmail(e.target.value)}
            style={{ width: '100%', marginBottom: '16px', padding: '12px', background: '#09090b', border: '1px solid #333', borderRadius: '8px', color: '#f4f4f5', boxSizing: 'border-box' }}
          />
          
          <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '18px' }}>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={loginPassword} 
            onChange={e => setLoginPassword(e.target.value)}
            style={{ width: '100%', marginBottom: '24px', padding: '12px', background: '#09090b', border: '1px solid #333', borderRadius: '8px', color: '#f4f4f5', boxSizing: 'border-box' }}
          />
          
          {loginError && <div style={{ color: '#ff4d4f', marginBottom: '16px', textAlign: 'center', fontSize: '18px', background: 'rgba(255,77,79,0.1)', padding: '8px', borderRadius: '6px' }}>{loginError}</div>}
          
          <button type="submit" className="primary-btn" style={{ width: '100%', padding: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Login</button>
          <p style={{ textAlign: 'center', color: '#666', marginTop: '24px', fontSize: '16px' }}>AI-powered apiary automation</p>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" ></div>
          <div>
            <strong >APIS AI</strong>
            <span>Smart Apiary Platform</span>
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
          <button className="settings-btn" onClick={() => alert("Settings coming next ")}>⚙ Settings</button>
          <button className="settings-btn" onClick={handleLogout} style={{ marginTop: '8px', color: '#ff4d4f' }}>🚪 Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">APIARY DASHBOARD</div>
            <h1>{title}</h1>
          </div>
          <div className="topbar-right">
            <div className="connection-pill">
              <span className={`status-dot ${backendStatus === "Connected" ? "online" : ""}`} />
              {backendStatus}
            </div>

          </div>
        </header>

        {active === "overview" && (
          <section>
            <div className="welcome-row">
              <div>
                <h2>{business?.name || "Golden Hive Honey Farm"}</h2>
                <p>Here's what is happening with your apiary today.</p>
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
                icon=""
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
            <div className="page-intro"><h2>Payments</h2><p>Monitor payments collected through ApisAI.</p></div>
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
                  <div className="product-image"></div>
                  <div className="product-info">
                    <span className="product-category">HONEY PRODUCT</span>
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


        {["hives", "harvests", "batches"].includes(active) && (
          <section>
            <div className="page-intro">
              <h2>ApisAI Subsystem</h2>
              <p>Blockchain-based traceability and smart beekeeping management.</p>
            </div>
            <HoneyChain activeSection={active} />
          </section>
        )}
      </main>

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
                          <li key={idx} style={{ padding: "6px 0", borderBottom: idx < order.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "18px" }}>
                             <span>
                               <span style={{ color: "#aaa", marginRight: "8px" }}>{it.quantity}x</span> {it.product}
                               {it.batch_id && (
                                 <a href={`/verify/batch/${it.batch_id}`} target="_blank" rel="noreferrer" style={{ marginLeft: "12px", fontSize: "13px", color: "#d97706", textDecoration: "none", background: "rgba(217, 119, 6, 0.1)", padding: "2px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    Verify Batch
                                 </a>
                               )}
                             </span>
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
                  <span title="Confirmed" style={{ color: "#52c41a", fontSize: "20px", marginRight: url ? "8px" : "0" }}></span>
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
