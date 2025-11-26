// session-manager.js - Session & Cookie Management

import { API_URL } from "./config.js";

/**
 * Session-Manager für anonyme und eingeloggte User
 */
class SessionManager {
  constructor() {
    this.sessionId = null;
    this.isAnonymous = true;
    this.username = null;
    this.offers = [];
    this.demands = [];
  }

  /**
   * Initialisiert die Session beim Laden
   */
  async init() {
    // Prüfe ob Session-Cookie existiert
    this.sessionId = this.getCookie("d4d_session_id");

    console.log(
      "🔍 Session-Manager Init: Cookie gefunden?",
      this.sessionId ? "Ja: " + this.sessionId : "Nein"
    );

    if (this.sessionId) {
      // Validiere existierende Session
      const isValid = await this.validateSession();
      console.log("✓ Session valid?", isValid);
      if (!isValid) {
        this.sessionId = null;
      }
    }

    // Erstelle neue Session falls keine vorhanden
    if (!this.sessionId) {
      await this.createSession();
    }

    // Lade Session-Daten
    await this.loadSession();

    console.log("📋 Session-Manager Status:", {
      sessionId: this.sessionId,
      isAnonymous: this.isAnonymous,
      username: this.username,
    });

    return this;
  }

  /**
   * Erstellt eine neue Session
   */
  async createSession() {
    try {
      const response = await fetch(`${API_URL}/session/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.sessionId = data.sessionId;
        this.isAnonymous = data.isAnonymous;

        // Speichere in Cookie (24h)
        this.setCookie("d4d_session_id", this.sessionId, 1);

        console.log("✓ Neue Session erstellt:", this.sessionId);
      }
    } catch (error) {
      console.error("Fehler beim Erstellen der Session:", error);
    }
  }

  /**
   * Validiert eine existierende Session
   */
  async validateSession() {
    try {
      const response = await fetch(`${API_URL}/session/${this.sessionId}`, {
        credentials: "include",
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Lädt Session-Daten vom Server
   */
  async loadSession() {
    if (!this.sessionId) return;

    try {
      const response = await fetch(`${API_URL}/session/${this.sessionId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        this.isAnonymous = data.isAnonymous;
        this.username = data.username || null;

        // Backend gibt offers/demands als ID-Arrays zurück
        this.offers = data.offers || [];
        this.demands = data.demands || [];

        console.log("📦 Session geladen:", {
          offers: this.offers,
          demands: this.demands,
          username: this.username,
        });

        // Sync mit localStorage für Kompatibilität
        if (this.username) {
          localStorage.setItem("d4d_user_name", this.username);
        }
      }
    } catch (error) {
      console.error("Fehler beim Laden der Session:", error);
    }
  }

  /**
   * Speichert Angebote/Gesuche in der Session
   * @param {Array<number>} offers - Array von Service-IDs
   * @param {Array<number>} demands - Array von Service-IDs
   */
  async saveServices(offers, demands) {
    if (!this.sessionId) {
      await this.createSession();
    }

    try {
      const response = await fetch(
        `${API_URL}/session/${this.sessionId}/services`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            offers: offers,
            demands: demands,
          }),
        }
      );

      if (response.ok) {
        this.offers = offers;
        this.demands = demands;
        console.log("✓ Services in Session gespeichert:", { offers, demands });
        return true;
      }
    } catch (error) {
      console.error("Fehler beim Speichern der Services:", error);
      return false;
    }
  }

  /**
   * Verknüpft Session mit User (bei Login)
   */
  async attachUser(username) {
    if (!this.sessionId) return false;

    try {
      const response = await fetch(
        `${API_URL}/session/${this.sessionId}/attach-user`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: username }),
        }
      );

      if (response.ok) {
        this.username = username;
        this.isAnonymous = false;
        localStorage.setItem("d4d_user_name", username);
        console.log("✓ User mit Session verknüpft");
        return true;
      }
    } catch (error) {
      console.error("Fehler beim Verknüpfen des Users:", error);
    }
    return false;
  }

  /**
   * Konvertiert Session-Daten zu Market-Einträgen (nach Login)
   * Übernimmt sowohl offers als auch demands ins User-Profil
   */
  async convertToMarkets() {
    if (!this.sessionId || this.isAnonymous) {
      console.warn("Session muss mit User verknüpft sein");
      return false;
    }

    try {
      console.log("🔄 Konvertiere Session zu Markets:", {
        sessionId: this.sessionId,
        username: this.username,
        offers: this.offers,
        demands: this.demands,
      });

      const response = await fetch(
        `${API_URL}/session/${this.sessionId}/convert-to-markets`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✓ Session zu Markets konvertiert:", result);

        // Lösche alte Session-Daten
        this.offers = [];
        this.demands = [];

        // Erstelle neue Session für weitere Nutzung
        await this.createSession();
        return true;
      } else {
        const errorText = await response.text();
        console.error("❌ Fehler beim Konvertieren:", errorText);
      }
    } catch (error) {
      console.error("❌ Fehler beim Konvertieren:", error);
    }
    return false;
  }

  /**
   * Löscht die Session
   */
  async deleteSession() {
    if (!this.sessionId) return;

    try {
      await fetch(`${API_URL}/session/${this.sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      this.deleteCookie("d4d_session_id");
      this.sessionId = null;
      this.isAnonymous = true;
      this.offers = [];
      this.demands = [];

      console.log("✓ Session gelöscht");
    } catch (error) {
      console.error("Fehler beim Löschen der Session:", error);
    }
  }

  /**
   * Cookie-Helper: Setzen
   */
  setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  /**
   * Cookie-Helper: Lesen
   */
  getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  /**
   * Cookie-Helper: Löschen
   */
  deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  /**
   * Prüft ob User eingeloggt ist
   */
  isLoggedIn() {
    return !this.isAnonymous && this.username !== null;
  }

  /**
   * Gibt Session-Info zurück
   */
  getInfo() {
    return {
      sessionId: this.sessionId,
      isAnonymous: this.isAnonymous,
      username: this.username,
      offers: this.offers,
      demands: this.demands,
      isLoggedIn: this.isLoggedIn(),
    };
  }
}

// Singleton-Instanz
let sessionManagerInstance = null;

/**
 * Holt die SessionManager-Instanz (Singleton)
 */
export async function getSessionManager() {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
    await sessionManagerInstance.init();
  }
  return sessionManagerInstance;
}

// Auto-init für direkte Verwendung
const sessionManager = new SessionManager();
sessionManager.init();

// Export für direkte Nutzung
export { SessionManager, sessionManager };
