// navbar.js - Dynamische Navbar mit Admin-Erkennung

import { API_URL } from "./config.js";
import { sessionManager } from "./session-manager.js";

let currentUser = null;
let currentUserState = "guest"; // 'guest', 'user', 'admin'

document.addEventListener("DOMContentLoaded", async function () {
  await checkUserStatus();
  renderNavbar();
  setActiveNavButton();
});

/**
 * Rendert die Navbar basierend auf User-Status
 */
function renderNavbar() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  // Logo (immer gleich)
  const logoHTML = `
        <div class="logo">
            <button onclick="window.location.href='index.html'" class="logo-button">
                <i class="fas fa-handshake"></i>
                <span>D4D</span>
            </button>
        </div>
    `;

  let navButtonsHTML = "";
  let profileHTML = "";

  if (currentUserState === "guest") {
    // GUEST: Ich suche | Ich gebe | Matches | Markt — Anmelden (kein Chat!)
    navButtonsHTML = `
            <div class="nav-buttons">
                <button class="${
                  currentPage === "requestServices.html" ? "active" : ""
                }" onclick="window.location.href='requestServices.html'">
                    <i class="fas fa-graduation-cap"></i>
                    Ich suche
                </button>
                <button class="${
                  currentPage === "offerServices.html" ? "active" : ""
                }" onclick="window.location.href='offerServices.html'">
                    <i class="fas fa-chalkboard-teacher"></i>
                    Ich gebe
                </button>
                <button class="${
                  currentPage === "showUserServices.html" ? "active" : ""
                }" onclick="window.location.href='showUserServices.html'">
                    <i class="fas fa-heart"></i>
                    Matches
                </button>
                <button class="${
                  currentPage === "showOffers.html" ? "active" : ""
                }" onclick="window.location.href='showOffers.html'">
                    <i class="fas fa-store"></i>
                    Markt
                </button>
            </div>
        `;

    profileHTML = `
            <div class="profile-section">
                <button class="login-button" id="loginBtn">
                    <i class="fas fa-sign-in-alt"></i>
                    Anmelden
                </button>
            </div>
        `;
  } else if (currentUserState === "admin") {
    // ADMIN: Chats | Verwaltung | Marktplatz — Profil (Admin + Abmelden)
    navButtonsHTML = `
            <div class="nav-buttons">
                <button class="${
                  currentPage === "chats_page.html" ? "active" : ""
                }" onclick="window.location.href='chats_page.html'">
                    <i class="fas fa-comments"></i>
                    Chats
                </button>
                <button class="${
                  currentPage === "manageServiceTypes.html" ? "active" : ""
                }" onclick="window.location.href='manageServiceTypes.html'">
                    <i class="fas fa-cog"></i>
                    Verwaltung
                </button>
                <button class="${
                  currentPage === "showOffers.html" ? "active" : ""
                }" onclick="window.location.href='showOffers.html'">
                    <i class="fas fa-store"></i>
                    Marktplatz
                </button>
            </div>
        `;

    profileHTML = `
            <div class="profile-section">
                <div class="profile-dropdown">
                    <button class="profile-button">
                        <i class="fas fa-user-shield"></i>
                        <span class="profile-name">Admin</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="profile-menu">
                        <button class="inbox-btn" onclick="window.location.href='posteingang.html'">
                            <i class="fas fa-inbox"></i>
                            Postfach
                            <span class="notification-dot" id="inboxNotification" style="display: none;"></span>
                        </button>
                        <button class="logout-btn" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i>
                            Abmelden
                        </button>
                    </div>
                </div>
            </div>
        `;
  } else {
    // NORMAL USER: Ich suche | Ich gebe | Chat | Matches | Markt — Profil (Name + Abmelden)
    navButtonsHTML = `
            <div class="nav-buttons">
                <button class="${
                  currentPage === "requestServices.html" ? "active" : ""
                }" onclick="window.location.href='requestServices.html'">
                    <i class="fas fa-graduation-cap"></i>
                    Ich suche
                </button>
                <button class="${
                  currentPage === "offerServices.html" ? "active" : ""
                }" onclick="window.location.href='offerServices.html'">
                    <i class="fas fa-chalkboard-teacher"></i>
                    Ich gebe
                </button>
                <button class="${
                  currentPage === "chats_page.html" ? "active" : ""
                }" onclick="window.location.href='chats_page.html'">
                    <i class="fas fa-comments"></i>
                    Chat
                </button>
                <button class="${
                  currentPage === "showUserServices.html" ? "active" : ""
                }" onclick="window.location.href='showUserServices.html'">
                    <i class="fas fa-heart"></i>
                    Matches
                </button>
                <button class="${
                  currentPage === "showOffers.html" ? "active" : ""
                }" onclick="window.location.href='showOffers.html'">
                    <i class="fas fa-store"></i>
                    Markt
                </button>
            </div>
        `;

    profileHTML = `
            <div class="profile-section">
                <div class="profile-dropdown">
                    <button class="profile-button">
                        <i class="fas fa-user"></i>
                        <span class="profile-name">${
                          currentUser || "User"
                        }</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="profile-menu">
                        <button class="inbox-btn" onclick="window.location.href='posteingang.html'">
                            <i class="fas fa-inbox"></i>
                            Postfach
                            <span class="notification-dot" id="inboxNotification" style="display: none;"></span>
                        </button>
                        <button class="logout-btn" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i>
                            Abmelden
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  navbar.innerHTML = logoHTML + navButtonsHTML + profileHTML;

  // Event Listeners hinzufügen
  attachNavbarEvents();
  
  // Check for inbox notifications
  if (currentUser && currentUser !== 'Gast-Modus' && currentUser !== 'guest') {
    checkInboxNotifications(currentUser);
  }
}

/**
 * Fügt Event Listeners zur Navbar hinzu
 */
function attachNavbarEvents() {
  // Login Button (nur für Gäste)
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", showLoginPrompt);
  }

  // Logout Button (für eingeloggte User und Admin)
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Profile Dropdown Toggle
  const profileButton = document.querySelector(".profile-button");
  if (profileButton) {
    profileButton.addEventListener("click", toggleProfileMenu);
  }

  // Schließe Dropdown beim Klick außerhalb
  document.addEventListener("click", function (event) {
    const profileDropdown = document.querySelector(".profile-dropdown");
    if (profileDropdown && !profileDropdown.contains(event.target)) {
      profileDropdown.classList.remove("open");
    }
  });
}

/**
 * Zeigt Login-Prompt für Gäste
 */
function showLoginPrompt() {
  const username = prompt("Bitte gib deinen Benutzernamen ein:");
  if (username && username.trim()) {
    setActiveUser(username.trim());
  }
}

/**
 * Logout Handler
 */
async function handleLogout() {
  try {
    // Lösche Session
    if (sessionManager && sessionManager.sessionId) {
      await sessionManager.deleteSession();
    }

    // Reset State
    currentUser = null;
    currentUserState = "guest";

    // Render Navbar neu
    renderNavbar();

    showNotification("✓ Erfolgreich abgemeldet", "success");

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent("userChanged", {
        detail: { username: null, state: "guest" },
      })
    );

    // Reload page after successful logout to update all content
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error("Fehler beim Abmelden:", error);
    showNotification("Fehler beim Abmelden", "error");
  }
}

/**
 * Toggle Profile Menu
 */
function toggleProfileMenu(event) {
  event.stopPropagation();
  const dropdown = document.querySelector(".profile-dropdown");
  if (dropdown) {
    dropdown.classList.toggle("open");
  }
}

/**
 * Setzt den aktiven User
 */
async function setActiveUser(username) {
  try {
    const response = await fetch(`${API_URL}/user`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username }),
    });

    if (response.ok) {
      console.log("✓ Login erfolgreich:", username);

      // Aktualisiere SessionManager mit User
      if (sessionManager) {
        sessionManager.username = username;
        sessionManager.isAnonymous = false;

        // Verknüpfe Session mit User und konvertiere gespeicherte Services
        if (sessionManager.sessionId) {
          try {
            // Lade aktuelle Session-Daten um zu prüfen ob es gespeicherte Services gibt
            await sessionManager.loadSession();
            const hasOffers =
              sessionManager.offers && sessionManager.offers.length > 0;
            const hasDemands =
              sessionManager.demands && sessionManager.demands.length > 0;

            if (hasOffers || hasDemands) {
              console.log("📦 Guest hat gespeicherte Services:", {
                offers: sessionManager.offers,
                demands: sessionManager.demands,
              });

              // Verknüpfe Session mit User
              await sessionManager.attachUser(username);

              // Konvertiere Session zu Markets (übernimmt offers und demands ins Profil)
              const converted = await sessionManager.convertToMarkets();
              if (converted) {
                let message = "Deine gespeicherten ";
                if (hasOffers && hasDemands) {
                  message += "Angebote und Nachfragen wurden";
                } else if (hasOffers) {
                  message += "Angebote wurden";
                } else {
                  message += "Nachfragen wurden";
                }
                message += " übernommen!";
                showNotification(message, "success");
              }

              // Nach convertToMarkets: Neue Session wurde erstellt
              // Diese muss AUCH mit dem User verknüpft werden!
              if (sessionManager.sessionId) {
                await sessionManager.attachUser(username);
                sessionManager.username = username;
                sessionManager.isAnonymous = false;
              }
            } else {
              // Keine gespeicherten Services, nur User verknüpfen
              await sessionManager.attachUser(username);
            }
          } catch (err) {
            console.error("Fehler bei Session-Konvertierung:", err);
            showNotification(
              "Warnung: Einige Daten konnten nicht übernommen werden",
              "warning"
            );
          }
        }
      }

      // Setze User State
      currentUser = username;
      currentUserState = username === "Admin" ? "admin" : "user";

      // Render Navbar neu
      renderNavbar();

      // Dispatch event für andere Scripts
      window.dispatchEvent(
        new CustomEvent("userChanged", {
          detail: { username: username, state: currentUserState },
        })
      );

      showNotification(`✓ Angemeldet als ${username}`, "success");

      // Reload page after successful login to update all content
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const errorText = await response.text();
      showNotification(errorText || "Benutzer nicht gefunden", "error");
    }
  } catch (error) {
    console.error("Fehler beim Setzen des Users:", error);
    showNotification("Verbindungsfehler", "error");
  }
}

/**
 * Prüft den User-Status beim Laden
 */
async function checkUserStatus() {
  try {
    const response = await fetch(`${API_URL}/user`, {
      credentials: "include",
    });
    console.log("🔍 Check User Status Response:", response.status);
    if (response.ok) {
      const username = await response.text();
      console.log("👤 Username vom Backend:", username);
      if (
        username &&
        username.trim() !== "" &&
        username !== "guest" &&
        username !== "Gast-Modus"
      ) {
        // User ist eingeloggt
        currentUser = username;
        currentUserState = username === "Admin" ? "admin" : "user";

        // Sync mit SessionManager
        if (sessionManager) {
          sessionManager.username = username;
          sessionManager.isAnonymous = false;
        }
        return;
      }
    }
  } catch (error) {
    console.error("Fehler beim Prüfen des User-Status:", error);
  }

  // Gast-Modus
  console.log("🔓 Gast-Modus aktiviert");
  currentUser = null;
  currentUserState = "guest";

  // Session sollte bereits von session-manager.js initialisiert sein
  if (sessionManager && !sessionManager.sessionId) {
    await sessionManager.init();
  }
}

/**
 * Setzt den aktiven Button in der Navbar basierend auf der aktuellen Seite
 */
function setActiveNavButton() {
  // Wird jetzt in renderNavbar() direkt erledigt
}

/**
 * Zeigt eine Notification
 */
function showNotification(message, type = "info") {
  // Entferne alte Notifications
  const oldNotification = document.querySelector(".notification");
  if (oldNotification) {
    oldNotification.remove();
  }

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <i class="fas fa-${
          type === "success"
            ? "check-circle"
            : type === "error"
            ? "exclamation-circle"
            : "info-circle"
        }"></i>
        <span>${message}</span>
    `;

  document.body.appendChild(notification);

  // Animiere ein
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Entferne nach 3 Sekunden
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Check for inbox notifications (new requests or status changes)
 */
async function checkInboxNotifications(username) {
  try {
    // Fetch both received and sent requests
    const [receivedResponse, sentResponse] = await Promise.all([
      fetch(`${API_URL}/service-requests/inbox/${encodeURIComponent(username)}`, {
        credentials: 'include'
      }),
      fetch(`${API_URL}/service-requests/sent/${encodeURIComponent(username)}`, {
        credentials: 'include'
      })
    ]);
    
    if (!receivedResponse.ok || !sentResponse.ok) {
      return; // Silently fail
    }
    
    const receivedRequests = await receivedResponse.json();
    const sentRequests = await sentResponse.json();
    
    // Get last inbox visit time
    const lastVisit = localStorage.getItem('lastInboxVisit');
    const lastVisitDate = lastVisit ? new Date(lastVisit) : new Date(0);
    
    // Check for new pending received requests created after last visit
    const hasNewReceived = receivedRequests.some(r => 
      r.status === 'PENDING' && new Date(r.createdAt) > lastVisitDate
    );
    
    // Check for status changes on sent requests (accepted or rejected) after last visit
    const hasStatusChange = sentRequests.some(r => 
      (r.status === 'ACCEPTED' || r.status === 'REJECTED') && 
      new Date(r.createdAt) > lastVisitDate
    );
    
    // Show notification dot if there are new items
    const notificationDot = document.getElementById('inboxNotification');
    if (notificationDot && (hasNewReceived || hasStatusChange)) {
      notificationDot.style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking inbox notifications:', error);
  }
}

// Event Listeners für andere Module
window.addEventListener("userChanged", function (e) {
  if (e.detail.username) {
    currentUser = e.detail.username;
    currentUserState =
      e.detail.state || (e.detail.username === "Admin" ? "admin" : "user");
  } else {
    currentUser = null;
    currentUserState = "guest";
  }
  renderNavbar();
});

// Export für andere Module
export { setActiveUser, showNotification, currentUser, currentUserState };
