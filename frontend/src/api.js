import axios from "axios";

const API = axios.create({
  baseURL: "https://predator-rocker-bronzing.ngrok-free.dev",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export default API;
