// config.js

const isLocal = window.location.hostname === "localhost";

export const API_URL = isLocal
  ? "http://localhost/api"
  : "http://vm10.htl-leonding.ac.at/api";
