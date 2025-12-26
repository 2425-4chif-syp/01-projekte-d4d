// config.js

const isLocal = window.location.hostname === "localhost";
const protocol = window.location.protocol === "https:" ? "https" : "http";
const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";

export const API_URL = isLocal
  ? `${protocol}://localhost/api`
  : `${protocol}://vm10.htl-leonding.ac.at/api`;

// WebSocket URL - über nginx reverse proxy
export const WS_URL = isLocal
  ? `${wsProtocol}://localhost/ws`
  : `${wsProtocol}://vm10.htl-leonding.ac.at/ws`;
