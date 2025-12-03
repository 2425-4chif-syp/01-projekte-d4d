import { API_URL } from "./config.js";
import { sessionManager } from "./session-manager.js";

let selectedDemands = [];
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
      console.log("🔍 requestServices - Username vom Server:", username);
      if (username && username.trim() !== "" && username !== "Gast-Modus") {
        // Logged in: load user's demands
        console.log(
          "✅ requestServices - User ist eingeloggt, lade Demands für:",
          username
        );
        await loadUserDemands(username);
        return;
      }
    }
  } catch (error) {
    console.error("Fehler beim Prüfen des User-Status:", error);
  }

  // Guest mode: load from session
  console.log("👤 requestServices - Gast-Modus, lade Session-Demands");
  await loadSessionDemands();
}

async function loadServiceTypes() {
  try {
    const response = await fetch(`${API_URL}/servicetype`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Fehler beim Laden der Kategorien");

    const serviceTypes = await response.json();
    const container = document.getElementById("demandedServicesList");
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
    if (!selectedDemands.includes(serviceId)) {
      selectedDemands.push(serviceId);
    }
  } else {
    selectedDemands = selectedDemands.filter((id) => id !== serviceId);
  }
}

async function loadUserDemands(username) {
  try {
    const response = await fetch(
      `${API_URL}/market/${encodeURIComponent(username)}`,
      {
        credentials: "include",
      }
    );
    console.log(
      "📡 requestServices - Market API Response Status:",
      response.status
    );
    if (!response.ok) throw new Error("Fehler beim Laden der Märkte");

    const markets = await response.json();
    console.log("📦 requestServices - Geladene Markets:", markets);

    const demandMarkets = markets.filter((m) => m.offer === 0);
    console.log("✅ requestServices - Gefundene Demands:", demandMarkets);

    markets.forEach((market) => {
      if (market.offer === 0) {
        const serviceId = market.serviceType.id;
        console.log(
          "➕ requestServices - Wähle Service aus:",
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

async function loadSessionDemands() {
  if (sessionManager.sessionId) {
    try {
      // Lade Session-Daten vom Server
      await sessionManager.loadSession();

      // Markiere gespeicherte Demands (IDs direkt verwenden)
      if (sessionManager.demands && sessionManager.demands.length > 0) {
        console.log("📥 Lade gespeicherte Demands:", sessionManager.demands);

        sessionManager.demands.forEach((serviceId) => {
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
    `🔍 requestServices - selectService aufgerufen für serviceId: ${serviceId}`
  );
  console.log(
    `🔍 requestServices - Gefundene Checkboxen im DOM: ${items.length}`
  );
  console.log(
    `🔍 requestServices - Alle IDs im DOM:`,
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
      if (!selectedDemands.includes(serviceId)) {
        selectedDemands.push(serviceId);
      }
      console.log(
        `✅ requestServices - Service ${serviceId} (${serviceTypeMap[serviceId]}) erfolgreich ausgewählt`
      );
    }
  });

  if (!found) {
    console.warn(
      `⚠️ requestServices - Service ${serviceId} (${serviceTypeMap[serviceId]}) nicht im DOM gefunden!`
    );
  }
}

document
  .getElementById("submitButton")
  .addEventListener("click", async function () {
    if (selectedDemands.length === 0) {
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
        const demandIds = selectedDemands.map((id) => parseInt(id));

        // Lade aktuelle Session um existierende offers zu behalten
        await sessionManager.loadSession();
        const existingOffers = sessionManager.offers || [];

        // Speichere demands und behalte existierende offers
        await sessionManager.saveServices(existingOffers, demandIds);

        submitButton.classList.remove("button-loading");
        submitButton.classList.add("button-success");
        showNotification(
          "✓ Nachfragen gespeichert! Zeige Matches...",
          "success"
        );

        setTimeout(() => {
          window.location.href = "showUserServices.html";
        }, 1000);
      } else {
        // Logged in: save to database
        const demandNames = selectedDemands.map((id) => serviceTypeMap[id]);

        // Lade existierende Märkte um offers zu behalten
        let existingOffers = [];
        try {
          const marketsResponse = await fetch(
            `${API_URL}/market/${encodeURIComponent(username)}`,
            {
              credentials: "include",
            }
          );
          if (marketsResponse.ok) {
            const markets = await marketsResponse.json();
            existingOffers = markets
              .filter((m) => m.offer === 1)
              .map((m) => m.serviceType.name);
          }
        } catch (error) {
          console.log("Keine existierenden Offers gefunden");
        }

        const requestData = {
          username: username,
          offers: existingOffers,
          demands: demandNames,
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
            "✓ Nachfragen gespeichert! Zeige Matches...",
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
