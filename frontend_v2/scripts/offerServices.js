import { API_URL } from "./config.js";
import { sessionManager } from "./session-manager.js";

let selectedOffers = [];
let serviceTypeMap = {};

document.addEventListener("DOMContentLoaded", async function () {
  await sessionManager.init();
  await loadServiceTypes();
  // Wait a bit to ensure DOM is fully rendered
  await new Promise((resolve) => setTimeout(resolve, 100));
  await checkUserStatus();
});

async function checkUserStatus() {
  try {
    const response = await fetch(`${API_URL}/user`, {
      credentials: "include",
    });
    if (response.ok) {
      const username = await response.text();
      console.log("🔍 offerServices - Username vom Server:", username);
      if (username && username.trim() !== "" && username !== "Gast-Modus") {
        // Logged in: load user's offers
        console.log(
          "✅ offerServices - User ist eingeloggt, lade Offers für:",
          username
        );
        await loadUserOffers(username);
        return;
      }
    }
  } catch (error) {
    console.error("Fehler beim Prüfen des User-Status:", error);
  }

  // Guest mode: load from session
  console.log("👤 offerServices - Gast-Modus, lade Session-Offers");
  await loadSessionOffers();
}

async function loadServiceTypes() {
  try {
    const response = await fetch(`${API_URL}/servicetype`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Fehler beim Laden der Kategorien");

    const serviceTypes = await response.json();
    const container = document.getElementById("offeredServicesList");
    container.innerHTML = "";

    serviceTypes.forEach((serviceType) => {
      const item = createServiceItem(serviceType.name, serviceType.id);
      item.addEventListener("click", () => toggleService(item, serviceType.id));
      container.appendChild(item);
      serviceTypeMap[serviceType.id] = serviceType.name;
    });
  } catch (error) {
    console.error("Fehler beim Laden der Kategorien:", error);
    showNotification("Fehler beim Laden der Fächer", "error");
  }
}

function createServiceItem(name, id) {
  const wrapper = document.createElement("div");
  wrapper.className = "service-checkbox";
  wrapper.dataset.id = id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `service-${id}`;
  checkbox.value = id;

  const label = document.createElement("label");
  label.htmlFor = `service-${id}`;
  label.textContent = name;

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);

  return wrapper;
}

function toggleService(element, serviceId) {
  const checkbox = element.querySelector('input[type="checkbox"]');
  checkbox.checked = !checkbox.checked;

  element.classList.toggle("selected", checkbox.checked);

  if (checkbox.checked) {
    if (!selectedOffers.includes(serviceId)) {
      selectedOffers.push(serviceId);
    }
  } else {
    selectedOffers = selectedOffers.filter((id) => id !== serviceId);
  }
}

async function loadUserOffers(username) {
  try {
    const response = await fetch(
      `${API_URL}/market/${encodeURIComponent(username)}`,
      {
        credentials: "include",
      }
    );
    console.log(
      "📡 offerServices - Market API Response Status:",
      response.status
    );
    if (!response.ok) throw new Error("Fehler beim Laden der Märkte");

    const markets = await response.json();
    console.log("📦 offerServices - Geladene Markets:", markets);

    const offerMarkets = markets.filter((m) => m.offer === 1);
    console.log("✅ offerServices - Gefundene Offers:", offerMarkets);

    markets.forEach((market) => {
      if (market.offer === 1) {
        const serviceId = market.serviceType.id;
        console.log(
          "➕ offerServices - Wähle Service aus:",
          serviceId,
          market.serviceType.name
        );
        selectService(serviceId);
      }
    });
  } catch (error) {
    console.error("Fehler beim Laden der Märkte:", error);
  }
}

async function loadSessionOffers() {
  if (sessionManager.sessionId) {
    try {
      // Lade Session-Daten vom Server
      await sessionManager.loadSession();

      // Markiere gespeicherte Offers (IDs direkt verwenden)
      if (sessionManager.offers && sessionManager.offers.length > 0) {
        console.log("📥 Lade gespeicherte Offers:", sessionManager.offers);

        sessionManager.offers.forEach((serviceId) => {
          selectService(parseInt(serviceId));
        });
      }
    } catch (error) {
      console.error("Fehler beim Laden der Session-Daten:", error);
    }
  }
}

function selectService(serviceId) {
  const items = document.querySelectorAll(".service-checkbox");
  console.log(
    `🔍 offerServices - selectService aufgerufen für serviceId: ${serviceId}`
  );
  console.log(
    `🔍 offerServices - Gefundene Checkboxen im DOM: ${items.length}`
  );
  console.log(
    `🔍 offerServices - Alle IDs im DOM:`,
    Array.from(items).map((i) => i.dataset.id)
  );

  let found = false;
  items.forEach((item) => {
    const itemId = parseInt(item.dataset.id);
    if (itemId === parseInt(serviceId)) {
      found = true;
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.checked = true;
      item.classList.add("selected");
      if (!selectedOffers.includes(serviceId)) {
        selectedOffers.push(serviceId);
      }
      console.log(
        `✅ offerServices - Service ${serviceId} (${serviceTypeMap[serviceId]}) erfolgreich ausgewählt`
      );
    }
  });

  if (!found) {
    console.warn(
      `⚠️ offerServices - Service ${serviceId} (${serviceTypeMap[serviceId]}) nicht im DOM gefunden!`
    );
  }
}

document
  .getElementById("submitButton")
  .addEventListener("click", async function () {
    if (selectedOffers.length === 0) {
      showNotification("Bitte wähle mindestens ein Fach aus", "error");
      return;
    }

    const submitButton = document.getElementById("submitButton");
    submitButton.disabled = true;
    submitButton.classList.add("button-loading");

    try {
      const response = await fetch(`${API_URL}/user`, {
        credentials: "include",
      });
      const username = response.ok ? await response.text() : "";
      const isLoggedIn =
        username && username.trim() !== "" && username !== "Gast-Modus";

      if (!isLoggedIn) {
        // Guest: save to session
        const offerIds = selectedOffers.map((id) => parseInt(id));

        // Lade aktuelle Session um existierende demands zu behalten
        await sessionManager.loadSession();
        const existingDemands = sessionManager.demands || [];

        // Speichere offers und behalte existierende demands
        await sessionManager.saveServices(offerIds, existingDemands);

        submitButton.classList.remove("button-loading");
        submitButton.classList.add("button-success");
        showNotification("✓ Angebote gespeichert! Zeige Matches...", "success");

        setTimeout(() => {
          window.location.href = "showUserServices.html";
        }, 1000);
      } else {
        // Logged in: save to database
        const offerNames = selectedOffers.map((id) => serviceTypeMap[id]);

        // Lade existierende Märkte um demands zu behalten
        let existingDemands = [];
        try {
          const marketsResponse = await fetch(
            `${API_URL}/market/${encodeURIComponent(username)}`,
            {
              credentials: "include",
            }
          );
          if (marketsResponse.ok) {
            const markets = await marketsResponse.json();
            existingDemands = markets
              .filter((m) => m.offer === 0)
              .map((m) => m.serviceType.name);
          }
        } catch (error) {
          console.log("Keine existierenden Demands gefunden");
        }

        const requestData = {
          username: username,
          offers: offerNames,
          demands: existingDemands,
        };

        const saveResponse = await fetch(`${API_URL}/market`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });

        if (saveResponse.ok) {
          submitButton.classList.remove("button-loading");
          submitButton.classList.add("button-success");
          showNotification(
            "✓ Angebote gespeichert! Zeige Matches...",
            "success"
          );

          setTimeout(() => {
            window.location.href = "showUserServices.html";
          }, 1000);
        } else {
          throw new Error("Fehler beim Speichern");
        }
      }
    } catch (error) {
      submitButton.classList.remove("button-loading");
      submitButton.disabled = false;
      showNotification(error.message, "error");
    }
  });

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
