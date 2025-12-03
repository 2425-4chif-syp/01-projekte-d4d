import { sessionManager } from "./session-manager.js";

/**
 * auth-merge.js
 * Handles merging of guest session data (selected services) into the user account
 * after a successful login (via Keycloak or other methods).
 */

// Simple notification helper to avoid circular dependency with navbar.js
function showMergeNotification(message, type = "success") {
  // Check if navbar notification styles exist, otherwise use inline
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <i class="fas fa-${
          type === "success" ? "check-circle" : "info-circle"
        }"></i>
        <span>${message}</span>
    `;

  document.body.appendChild(notification);

  // Animation
  setTimeout(() => notification.classList.add("show"), 10);

  // Remove after delay
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Listen for user login events
window.addEventListener("userChanged", async function (e) {
  const { username, state } = e.detail;

  // Only proceed if we have a valid user and it's not a guest logout
  if (username && state !== "guest") {
    console.log(
      "🔄 Auth-Merge: User logged in, checking for guest session...",
      username
    );
    await mergeGuestSession(username);
  }
});

async function mergeGuestSession(username) {
  if (!sessionManager) return;

  // Ensure session manager is initialized
  if (!sessionManager.sessionId) {
    await sessionManager.init();
  }

  // If still no session, nothing to merge
  if (!sessionManager.sessionId) return;

  try {
    // Load latest session data to check for pending services
    await sessionManager.loadSession();

    const hasOffers = sessionManager.offers && sessionManager.offers.length > 0;
    const hasDemands =
      sessionManager.demands && sessionManager.demands.length > 0;

    if (hasOffers || hasDemands) {
      console.log("📦 Auth-Merge: Found guest services to merge:", {
        offers: sessionManager.offers,
        demands: sessionManager.demands,
      });

      // 1. Attach user to current session
      const attached = await sessionManager.attachUser(username);
      if (!attached) {
        console.warn("Auth-Merge: Failed to attach user to session");
        return;
      }

      // 2. Convert session services to permanent market entries
      const converted = await sessionManager.convertToMarkets();

      if (converted) {
        let message = "Deine als Gast gewählten ";
        if (hasOffers && hasDemands) {
          message += "Angebote und Nachfragen";
        } else if (hasOffers) {
          message += "Angebote";
        } else {
          message += "Nachfragen";
        }
        message += " wurden erfolgreich in dein Profil übernommen!";

        console.log("✅ Auth-Merge: Success");
        showMergeNotification(message, "success");

        // 3. Re-attach user to the NEW session
        if (sessionManager.sessionId) {
          await sessionManager.attachUser(username);
          sessionManager.username = username;
          sessionManager.isAnonymous = false;
        }

        // Reload page to reflect changes if we are on offer/request pages
        // This ensures the UI updates to show "You are offering X" instead of guest view
        if (
          window.location.pathname.includes("offerServices") ||
          window.location.pathname.includes("requestServices") ||
          window.location.pathname.includes("showUserServices")
        ) {
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } else {
      console.log("Auth-Merge: No guest services to merge.");
      // Just ensure user is attached to session for future actions
      await sessionManager.attachUser(username);
    }
  } catch (error) {
    console.error("Auth-Merge: Error merging guest session:", error);
  }
}
