import axios from "axios";

const defaultBaseURL = import.meta.env.PROD
  ? "https://hospnow.onrender.com"
  : "http://localhost:8080";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
});
