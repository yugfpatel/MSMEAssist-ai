import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://predator-rocker-bronzing.ngrok-free.dev",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export default API;
