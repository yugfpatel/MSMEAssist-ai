import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

/**
 * Fires a lightweight health check to wake up the backend if cold
 * and collect live status.
 */
export async function pingHealth(timeoutMs = 12000) {
  try {
    const res = await API.get("/health", { timeout: timeoutMs });
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/**
 * Periodic browser heartbeat that keeps the backend warm (prevents Render
 * 15-minute idle spin-down) as long as any user has the tab open.
 */
export function startKeepAliveHeartbeat(intervalMs = 4 * 60 * 1000) {
  // Fire immediate background warm-up
  pingHealth(15000);

  const timerId = setInterval(() => {
    if (!document.hidden) {
      pingHealth(15000);
    }
  }, intervalMs);

  return () => clearInterval(timerId);
}

export default API;
