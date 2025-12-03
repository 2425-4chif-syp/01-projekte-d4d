import { keycloakConfig } from "./keycloak-config.js";
import { API_URL } from "./config.js";
import { sessionManager } from "./session-manager.js";

// Use global Keycloak from script tag
const Keycloak = window.Keycloak;

if (!Keycloak) {
  console.error(
    "Keycloak library not loaded! Check your internet connection or script tag."
  );
}

const keycloak = new Keycloak(keycloakConfig);

const initOptions = {
  onLoad: "check-sso",
  enableLogging: true,
  checkLoginIframe: false,
  silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
  pkceMethod: "S256",
};

let isInitialized = false;

export async function initKeycloak() {
  if (isInitialized) return;

  try {
    console.log("Initializing Keycloak...");
    console.log("Keycloak config:", keycloakConfig);
    const authenticated = await keycloak.init(initOptions);
    isInitialized = true;
    console.log(`Keycloak init success. Authenticated: ${authenticated}`);

    if (authenticated) {
      console.log("User is authenticated, syncing with backend...");
      await syncWithBackend(keycloak.token);
    } else {
      console.log("User is not authenticated");
    }
  } catch (error) {
    console.error("Failed to initialize Keycloak:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      keycloakConfig: keycloakConfig,
    });

    // If init failed with a code in URL, it's likely a stale/invalid code.
    // Clean up and reload to try again fresh.
    const url = new URL(window.location.href);
    if (url.searchParams.has("code")) {
      console.log("Detected failed callback. Cleaning URL and reloading...");
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("session_state");
      url.searchParams.delete("iss");
      window.history.replaceState({}, document.title, url.toString());
      // Don't reload immediately to avoid loops
      setTimeout(() => window.location.reload(), 1000);
      return;
    }
    isInitialized = true; // Mark as initialized even if failed to prevent loops
  }
}

export async function loginKeycloak() {
  await keycloak.login();
}

export async function logoutKeycloak() {
  await keycloak.logout({
    redirectUri: window.location.origin + "/index.html",
  });
}

export function isKeycloakAuthenticated() {
  return keycloak.authenticated;
}

async function syncWithBackend(token) {
  try {
    const response = await fetch(`${API_URL}/user/keycloak`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (response.ok) {
      const username = await response.text();
      console.log("Keycloak login successful, user:", username);

      if (sessionManager) {
        sessionManager.username = username;
        sessionManager.isAnonymous = false;
      }

      // Dispatch event to update UI
      window.dispatchEvent(
        new CustomEvent("userChanged", {
          detail: { username: username, state: "user" },
        })
      );
    } else {
      console.error("Backend sync failed", await response.text());
    }
  } catch (error) {
    console.error("Error syncing with backend:", error);
  }
}
