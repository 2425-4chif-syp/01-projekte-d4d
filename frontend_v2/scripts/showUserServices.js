import { API_URL } from "./config.js";
import { sessionManager } from "./session-manager.js";

// Global toast notification functions
function showMessage(message, type = "info", duration = 5000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Icon
  const icon = document.createElement("div");
  icon.className = "toast-icon";
  icon.innerHTML = getToastIcon(type);

  // Content
  const content = document.createElement("div");
  content.className = "toast-content";
  content.textContent = message;

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.innerHTML = "×";
  closeBtn.setAttribute("aria-label", "Toast schließen");

  // Progress bar for auto-dismiss
  const progressBar = document.createElement("div");
  progressBar.className = "toast-progress";
  progressBar.style.width = "100%";

  // Assemble toast
  toast.appendChild(icon);
  toast.appendChild(content);
  toast.appendChild(closeBtn);
  toast.appendChild(progressBar);

  // Add to container
  toastContainer.appendChild(toast);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Start progress bar animation
  setTimeout(() => {
    progressBar.style.width = "0%";
    progressBar.style.transition = `width ${duration}ms linear`;
  }, 100);

  // Auto remove after duration
  const autoRemoveTimeout = setTimeout(() => {
    removeToast(toast);
  }, duration);

  // Manual close
  closeBtn.addEventListener("click", () => {
    clearTimeout(autoRemoveTimeout);
    removeToast(toast);
  });

  // Remove function
  function removeToast(toastElement) {
    toastElement.classList.add("hide");
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 400);
  }
}

function getToastIcon(type) {
  switch (type) {
    case "success":
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    case "error":
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/></svg>';
    case "warning":
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    case "info":
    default:
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const responseMessage = document.querySelector(".response-message");

  // Restore scroll position after rating submission reload
  const savedScrollPosition = sessionStorage.getItem("scrollPosition");
  if (savedScrollPosition) {
    setTimeout(() => {
      window.scrollTo({
        top: parseInt(savedScrollPosition),
        behavior: "smooth",
      });
      sessionStorage.removeItem("scrollPosition");
    }, 1500); // Wait for content to load
  }

  let allPerfectMatches = [];
  let allServices = [];
  let serviceTypes = [];
  let currentServiceType = "all";
  let currentFilterType = "all";
  let currentPerfectMatchUser = "all";
  let currentRatingFilter = "all";
  let currentSortOption = "rating-desc";
  let currentViewMode = localStorage.getItem("matchesViewMode") || "grouped"; // grouped, compact, card
  let currentCardIndex = 0; // For card view

  // Pagination State
  let currentPage = 1;
  let itemsPerPage = 10; // Default, will be calculated dynamically

  // Initialize session first (for guest mode)
  await sessionManager.init();

  // Calculate initial items per page
  calculateItemsPerPage();

  // Listen for window resize to adjust items per page
  window.addEventListener("resize", () => {
    calculateItemsPerPage();
    filterAndDisplayServices();
  });

  getActiveUser();

  function getActiveUser() {
    fetch(`${API_URL}/user`, {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Fehler beim Abrufen des aktiven Benutzers");
        }
        return response.text();
      })
      .then((responseText) => {
        try {
          const responseJson = JSON.parse(responseText);
          const username = responseJson.username || "Gast-Modus";

          // Lade direkt die Services des aktiven Benutzers, wenn einer angemeldet ist
          if (username && username !== "Gast-Modus") {
            searchUserServices(username);
          } else {
            // Guest mode: Load session matches
            loadGuestMatches();
          }
        } catch (e) {
          // Falls die Antwort kein gültiges JSON ist, verwende den Text direkt
          const username =
            responseText && responseText.trim() !== ""
              ? responseText
              : "Gast-Modus";

          if (username !== "" && username !== "Gast-Modus") {
            searchUserServices(username);
          } else {
            // Guest mode: Load session matches
            loadGuestMatches();
          }
        }
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen des aktiven Benutzers:", error);
        // Guest mode: Load session matches
        loadGuestMatches();
      });
  }

  // Function to load guest matches based on session
  async function loadGuestMatches() {
    if (!sessionManager || !sessionManager.sessionId) {
      console.warn("No session ID available for guest");
      showMessage("Wähle zuerst Services aus, um Matches zu sehen.", "info");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/session/${sessionManager.sessionId}/matches`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          matchesContainer.innerHTML =
            '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Matches gefunden. Wähle zuerst einige Fächer aus!</div>';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const matches = await response.json();
      console.log("Guest matches loaded:", matches);

      if (!matches || matches.length === 0) {
        matchesContainer.innerHTML =
          '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Matches gefunden. Wähle zuerst einige Fächer aus!</div>';
        return;
      }

      // Process matches to display
      allServices = matches.map((match, index) => ({
        id: `guest-match-${index}`,
        username: match.user?.name || "Unbekannter Benutzer",
        serviceTypeName: match.serviceType?.name || "Unbekannter Service",
        isOffer: match.offer === 1 || match.offer === true,
        typeId: match.serviceType?.id,
        providerId: match.user?.id,
        rating: null,
        isPerfectMatch: match.isPerfectMatch || false,
        offer: match.offer, // Backend gibt 0 oder 1
      }));

      console.log("Processed guest matches:", allServices);
      console.log(
        "Match details:",
        allServices.map((s) => ({
          username: s.username,
          service: s.serviceTypeName,
          offer: s.offer,
          isOffer: s.isOffer,
          isPerfectMatch: s.isPerfectMatch,
        }))
      );

      // Markiere Perfect Matches (werden durch Farbe erkennbar gemacht)
      const perfectMatchesCount = allServices.filter(
        (s) => s.isPerfectMatch
      ).length;
      const regularMatchesCount = allServices.filter(
        (s) => !s.isPerfectMatch
      ).length;

      console.log("Guest Perfect Matches:", perfectMatchesCount);
      console.log("Guest Regular Matches:", regularMatchesCount);

      // Load ratings
      await loadRatingsForServices(allServices);

      // Initialize container
      initializeResultsContainer();

      // Populate filters if we can extract types
      const types = [...new Set(allServices.map((s) => s.serviceTypeName))];
      populateServiceTypeFilter(types);

      // Display services
      filterAndDisplayServices();
    } catch (error) {
      console.error("Error loading guest matches:", error);
      const matchesContainer = document.getElementById("matchesContainer");
      if (matchesContainer) {
        matchesContainer.innerHTML =
          '<div class="no-results"><i class="fas fa-exclamation-triangle"></i> Fehler beim Laden der Matches.</div>';
      }
    }
  }

  // Funktion, um einen Benutzer als aktiv zu markieren
  function setActiveUser(username) {
    fetch(`${API_URL}/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username: username }),
    })
      .then((response) => {
        if (response.ok) {
          return response.text().then((msg) => {
            // Suche nach den Services des aktiven Benutzers
            searchUserServices(username);
            return msg;
          });
        } else {
          return response.text().then((errorMsg) => {
            throw new Error(
              errorMsg ||
                `Fehler beim Setzen von ${username} als aktiven Benutzer`
            );
          });
        }
      })
      .catch((error) => {
        showMessage(error.message, "error");
      });
  }

  // Initialize filters and event listeners
  function initializeFilters() {
    // View Mode Toggle
    const viewModeButtons = document.querySelectorAll(".view-mode-btn");
    const servicesDisplay = document.getElementById("servicesContainer");

    viewModeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        viewModeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentViewMode = btn.dataset.view;
        currentCardIndex = 0;
        localStorage.setItem("matchesViewMode", currentViewMode);

        if (servicesDisplay) {
          servicesDisplay.className = `services-display view-${currentViewMode}`;
        }

        // WICHTIG: Erst items per page berechnen, dann filtern!
        calculateItemsPerPage();
        filterAndDisplayServices(true);
      });
    });

    // Text Filter
    const textFilter = document.getElementById("textFilter");
    if (textFilter) {
      textFilter.addEventListener("input", () => {
        filterAndDisplayServices(true);
      });
    }

    // Service Type Filter
    const serviceTypeFilter = document.getElementById("serviceTypeFilter");
    if (serviceTypeFilter) {
      serviceTypeFilter.addEventListener("change", (e) => {
        currentServiceType = e.target.value;
        filterAndDisplayServices(true);
      });
    }

    // Offer/Demand Filter
    const offerFilter = document.getElementById("offerFilter");
    const ratingFilterGroup = document.getElementById("ratingFilterGroup");

    if (offerFilter) {
      offerFilter.addEventListener("change", (e) => {
        currentFilterType = e.target.value;

        // Show/hide rating filter based on selection
        if (ratingFilterGroup) {
          if (e.target.value === "offer" || e.target.value === "all") {
            ratingFilterGroup.style.display = "flex";
          } else {
            ratingFilterGroup.style.display = "none";
            currentRatingFilter = "all";
            const ratingSelect = document.getElementById("ratingFilter");
            if (ratingSelect) ratingSelect.value = "all";
          }
        }

        filterAndDisplayServices(true);
      });
    }

    // Rating Filter
    const ratingFilter = document.getElementById("ratingFilter");
    if (ratingFilter) {
      ratingFilter.addEventListener("change", (e) => {
        currentRatingFilter = e.target.value;
        filterAndDisplayServices(true);
      });
    }

    // Sort Filter
    const sortFilter = document.getElementById("sortFilter");
    if (sortFilter) {
      // Force sync with DOM state on init
      currentSortOption = sortFilter.value;
      
      sortFilter.addEventListener("change", (e) => {
        currentSortOption = e.target.value;
        filterAndDisplayServices(true);
      });
    }
  }

  function initializeResultsContainer() {
    const matchesContainer = document.getElementById("matchesContainer");
    if (!matchesContainer) return;

    matchesContainer.innerHTML = "";

    // Create services display container if it doesn't exist
    let servicesDisplay = document.getElementById("servicesContainer");
    if (!servicesDisplay) {
      servicesDisplay = document.createElement("div");
      servicesDisplay.id = "servicesContainer";
      servicesDisplay.className = `services-display view-${currentViewMode}`;
      matchesContainer.appendChild(servicesDisplay);
    }
  }

  // Populate Service Type Filter
  function populateServiceTypeFilter(types) {
    const select = document.getElementById("serviceTypeFilter");
    if (!select) return;

    // Keep "All" option
    select.innerHTML = '<option value="all">Alle Services</option>';

    types.forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      select.appendChild(option);
    });
  }

  // Call initialization
  initializeFilters();

  // Function to search for user services
  function searchUserServices(username) {
    // Initialize container
    initializeResultsContainer();

    fetchServiceTypes()
      .then((types) => {
        serviceTypes = types;
        // Populate sidebar filter
        populateServiceTypeFilter(types);
        return getPerfectMatches(username);
      })
      .then((pm) => {
        if (pm && pm.length > 0) {
          allPerfectMatches = pm;
          // We don't create a separate section anymore, they are part of the main list
          // but we might want to highlight them or keep them at top
          return [pm, username];
        }
        return [[], username];
      })
      .then(([perfectMatches, username]) => {
        return getUserServices(username).then((services) => [
          services,
          perfectMatches,
        ]);
      })
      .then(([services, perfectMatches]) => {
        console.log("Raw matches from API:", services?.length || 0);
        console.log("Perfect matches:", perfectMatches?.length || 0);

        if (services && services.length > 0) {
          // services are now matches (Market entries)

          // Create a Set of Perfect Match IDs to exclude them from regular matches
          const perfectMatchIds = new Set();
          if (perfectMatches && perfectMatches.length > 0) {
            perfectMatches.forEach((pm) => {
              if (pm.id) perfectMatchIds.add(pm.id);
            });
          }

          // Filter out Perfect Matches from the general list
          const regularMatches = services.filter(
            (match) => !perfectMatchIds.has(match.id)
          );

          console.log("Regular matches count:", regularMatches.length);

          // Map to the format expected by display functions
          const mappedRegularMatches = regularMatches.map((match) => ({
            id: match.id, // Market ID
            username: match.username || "Unbekannter Benutzer",
            serviceTypeName: match.serviceTypeName || "Unbekannter Service",
            isOffer: match.offer === 1,
            typeId: match.typeId,
            providerId: match.providerId,
            rating: null,
            isPerfectMatch: false,
            // Mock marketProvider for compatibility with click handlers
            marketProvider:
              match.offer === 1
                ? { id: match.id, user: { id: match.providerId } }
                : null,
          }));

          // Map Perfect Matches to the same format
          const mappedPerfectMatches = perfectMatches.map((match) => ({
            id: match.id,
            username: match.username || "Unbekannter Benutzer",
            serviceTypeName: match.serviceTypeName || "Unbekannter Service",
            isOffer: match.offer === 1,
            typeId: match.typeId, // Might need to extract if not present
            providerId: match.providerId || match.user?.id,
            rating: null,
            isPerfectMatch: true,
            marketProvider:
              match.offer === 1
                ? {
                    id: match.id,
                    user: { id: match.providerId || match.user?.id },
                  }
                : null,
          }));

          // Combine all services
          allServices = [...mappedPerfectMatches, ...mappedRegularMatches];

          console.log("Total processed matches:", allServices.length);

          // Load ratings for all services
          loadRatingsForServices(allServices);
        } else {
          // Handle empty case
          const matchesContainer = document.getElementById("matchesContainer");
          matchesContainer.innerHTML =
            '<div class="no-results"><i class="fas fa-info-circle"></i> Keine passenden Matches gefunden.</div>';
        }
      })
      .catch((error) => {
        console.error("Error fetching services:", error);
        showMessage(
          "Fehler bei der Suche nach Dienstleistungen: " + error.message,
          "error"
        );
      });
  }

  // Funktion zum Abrufen aller Service-Typen
  function fetchServiceTypes() {
    return fetch(`${API_URL}/servicetype`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Fehler beim Abrufen der Service-Typen");
        }
        return response.json();
      })
      .then((serviceTypes) => serviceTypes.map((type) => type.name));
  }

  // Function to get user services by username
  function getUserServices(username) {
    return fetch(`${API_URL}/service/relevant/${encodeURIComponent(username)}`)
      .then((response) => {
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der Dienste:", error);
        throw error;
      });
  }

  // Function to get service type name by ID
  function getServiceTypeName(serviceTypeId) {
    return fetch(`${API_URL}/servicetype`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Service type fetch failed: ${response.status}`);
        }
        return response.json();
      })
      .then((serviceTypes) => {
        const serviceType = serviceTypes.find(
          (type) => type.id === serviceTypeId
        );
        return serviceType
          ? serviceType.name
          : "Unbekannter Dienstleistungstyp";
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen des Dienstleistungstyps:", error);
        return "Unbekannter Dienstleistungstyp";
      });
  }

  // Function to get username by ID
  function getUserName(userId) {
    return fetch(`${API_URL}/market/${userId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Username fetch failed: ${response.status}`);
        }
        return response.json();
      })
      .then((markets) => {
        if (markets && markets.length > 0 && markets[0].user) {
          return markets[0].user.name;
        }
        return "Unbekannter Benutzer";
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen des Benutzernamens:", error);
        return "Unbekannter Benutzer";
      });
  }

  // Function to get perfect matches
  function getPerfectMatches(username) {
    return fetch(
      `${API_URL}/service/perfect-matches/${encodeURIComponent(username)}`
    )
      .then((response) => {
        if (!response.ok) {
          if (response.status === 404) {
            return [];
          }
          throw new Error(`Perfect matches fetch failed: ${response.status}`);
        }
        return response.json();
      })
      .then((matches) => {
        console.log("Raw perfect matches:", matches);
        // Process matches to ensure they have the expected format
        return matches.map((match) => ({
          ...match,
          id: match.id, // Ensure id is preserved
          serviceTypeName: match.serviceType
            ? match.serviceType.name
            : "Unbekannter Dienstleistungstyp",
          username: match.user ? match.user.name : "Unbekannter Benutzer",
        }));
      })
      .catch((error) => {
        console.error(
          "Fehler beim Abrufen der perfekten Übereinstimmungen:",
          error
        );
        return [];
      });
  }

  // Function to create a perfect-match service card -> gold, kein Angebot, Nachfrage
  function createPerfectMatchCard(service) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "service-item";

    // Ensure we have proper values for display, even if data is missing
    const username =
      service.username ||
      (service.user && service.user.name
        ? service.user.name
        : "Unbekannter Benutzer");
    const serviceTypeName =
      service.serviceTypeName ||
      (service.serviceType && service.serviceType.name
        ? service.serviceType.name
        : "Unbekannter Dienstleistungstyp");
    const offer =
      service.offer !== undefined ? service.offer : service.offer === 1;

    const cardHTML = `
            <div class="card perfect-match-card">
                <div class="card-header">
                    <span class="badge perfect-match">Perfect-Match</span>
                    <span class="badge ${
                      offer === 1 ? "provider" : "client"
                    }">${offer === 1 ? "Angebot" : "Nachfrage"}</span>
                </div>
                <div class="card-body">
                    <div class="service-info">
                        <p><strong>${username}</strong></p>
                        <p>${serviceTypeName}</p>
                        ${
                          offer === 1
                            ? '<div class="rating-container"><i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...</div>'
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;

    cardDiv.innerHTML = cardHTML;

    // If it's an offer, make it clickable and add rating functionality
    if (
      offer === 1 &&
      serviceTypeName !== "Unbekannter Dienstleistungstyp" &&
      username !== "Unbekannter Benutzer"
    ) {
      // Make card clickable
      cardDiv.classList.add("clickable");
      cardDiv.style.cursor = "pointer";

      // Extract marketId - for Perfect Match offers
      // Check multiple possible locations for the market ID
      const marketId =
        service.id || service.marketId || service.marketProvider?.id || null;

      // Extract typeId and providerId
      const typeId =
        service.typeId ||
        (service.serviceType && service.serviceType.id) ||
        (service.marketProvider &&
          service.marketProvider.serviceType &&
          service.marketProvider.serviceType.id) ||
        (service.marketClient &&
          service.marketClient.serviceType &&
          service.marketClient.serviceType.id) ||
        null;
      const providerId =
        service.providerId ||
        (service.user && service.user.id) ||
        (service.marketProvider &&
          service.marketProvider.user &&
          service.marketProvider.user.id) ||
        (service.marketClient &&
          service.marketClient.user &&
          service.marketClient.user.id) ||
        null;

      // Add click handler: open request modal to send a service request
      cardDiv.addEventListener("click", function (e) {
        if (!marketId) {
          console.error(
            "Market ID not found for request. Service data:",
            service
          );
          alert("Anfrage nicht möglich: Fehlende Daten");
          return;
        }

        // Open modal to send request
        openRatingModal(
          marketId,
          username,
          serviceTypeName,
          typeId,
          providerId
        );
      });

      // Load rating specific to this TypeOfService + Provider combination
      const ratingContainer = cardDiv.querySelector(".rating-container");
      if (ratingContainer && typeId && providerId) {
        loadRatingByTypeAndProvider(typeId, providerId, ratingContainer);
      }
    }

    return cardDiv;
  }

  // Function to remove perfect matches from normal services
  function removePerfectMatches(services, perfectMatches) {
    // We actually want to show all services, not filter out the perfect matches from regular view
    // This function is now a pass-through to maintain compatibility
    return services;
  }

  function displayFilteredServices(services) {
    const servicesContainer = document.getElementById("servicesContainer");
    if (!servicesContainer) return;

    servicesContainer.innerHTML = "";

    if (services.length === 0) {
      servicesContainer.innerHTML =
        '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Dienstleistungen gefunden.</div>';
      return;
    }

    // Unterschiedliche Anzeige je nach View Mode
    if (currentViewMode === "grouped") {
      // GROUPED VIEW: Original mit Gruppierung nach User
      displayGroupedView(services, servicesContainer);
    } else if (currentViewMode === "compact") {
      // COMPACT VIEW: Viele kleine Karten, keine Gruppierung
      displayCompactView(services, servicesContainer);
    } else if (currentViewMode === "card") {
      // CARD VIEW: Tinder-Style, eine Karte zur Zeit
      displayCardView(services, servicesContainer);
    }
  }

  // GROUPED VIEW: Original mit Gruppierung
  function displayGroupedView(services, container) {
    const groupedServices = groupServicesByUser(services);

    Object.keys(groupedServices).forEach((username) => {
      const userServices = groupedServices[username];

      const groupDiv = document.createElement("div");
      groupDiv.className = "service-group group-user";

      const headerDiv = document.createElement("div");
      headerDiv.className = "service-group-header";

      const titleDiv = document.createElement("div");
      titleDiv.className = "service-group-title";
      titleDiv.innerHTML = `
                <span class="group-icon"><i class="fas fa-user"></i></span>
                <h3>${username}</h3>
                <div class="group-user-rating"><i class="fas fa-spinner fa-spin"></i> Lade Bewertung...</div>
            `;

      const countDiv = document.createElement("div");
      countDiv.className = "service-group-count";
      countDiv.textContent = `${userServices.length} ${
        userServices.length === 1 ? "Service" : "Services"
      }`;

      headerDiv.appendChild(titleDiv);
      headerDiv.appendChild(countDiv);

      const userRatingContainer = titleDiv.querySelector(".group-user-rating");
      if (userRatingContainer && username !== "Unbekannter Benutzer") {
        loadUserRatingForGroup(username, userRatingContainer);
      }

      const gridDiv = document.createElement("div");
      gridDiv.className = "service-grid";

      userServices.forEach((service) => {
        // Für Perfect Matches: Zeige BEIDE Services (Angebot und Nachfrage)
        if (service.isPerfectMatch) {
          // Finde beide Services dieses Users aus allServices
          const userAllServices = allServices.filter(
            (s) => s.username === service.username
          );
          const offerService = userAllServices.find((s) => s.isOffer);
          const demandService = userAllServices.find((s) => !s.isOffer);

          // Zeige beide Services
          if (offerService) {
            const offerCard = createServiceCard(offerService);
            gridDiv.appendChild(offerCard);
          }
          if (demandService) {
            const demandCard = createServiceCard(demandService);
            gridDiv.appendChild(demandCard);
          }
        } else {
          // Normale Services
          const card = createServiceCard(service);
          gridDiv.appendChild(card);
        }
      });

      groupDiv.appendChild(headerDiv);
      groupDiv.appendChild(gridDiv);
      container.appendChild(groupDiv);
    });
  }

  // COMPACT VIEW: Viele kleine Karten
  function displayCompactView(services, container) {
    const gridDiv = document.createElement("div");
    gridDiv.className = "compact-grid";

    services.forEach((service) => {
      const card = createCompactCard(service);
      gridDiv.appendChild(card);
    });

    container.appendChild(gridDiv);
  }

  // CARD VIEW: Tinder-Style einzelne Karte
  function displayCardView(services, container) {
    // Clear container to ensure we don't stack cards when navigating
    container.innerHTML = "";

    if (services.length === 0) {
      container.innerHTML =
        '<div class="no-results">Keine Services gefunden.</div>';
      return;
    }

    // Ensure index is valid
    if (currentCardIndex >= services.length) currentCardIndex = 0;
    if (currentCardIndex < 0) currentCardIndex = services.length - 1;

    const service = services[currentCardIndex];

    const cardViewContainer = document.createElement("div");
    cardViewContainer.className = "card-view-container";

    // Main Card
    const mainCard = createLargeCard(service, allServices);
    cardViewContainer.appendChild(mainCard);

    // Navigation Controls
    const navContainer = document.createElement("div");
    navContainer.className = "card-nav-container";
    navContainer.style.display = "flex";
    navContainer.style.justifyContent = "center";
    navContainer.style.alignItems = "center";
    navContainer.style.gap = "20px";
    navContainer.style.marginTop = "20px";

    const prevBtn = document.createElement("button");
    prevBtn.className = "card-nav-btn";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = () => {
      currentCardIndex--;
      if (currentCardIndex < 0) currentCardIndex = services.length - 1;
      displayCardView(services, container);
    };

    const nextBtn = document.createElement("button");
    nextBtn.className = "card-nav-btn";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => {
      currentCardIndex++;
      if (currentCardIndex >= services.length) currentCardIndex = 0;
      displayCardView(services, container);
    };

    const counter = document.createElement("span");
    counter.className = "card-counter";
    counter.textContent = `${currentCardIndex + 1} / ${services.length}`;
    counter.style.fontSize = "1.2em";
    counter.style.fontWeight = "bold";

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(counter);
    navContainer.appendChild(nextBtn);

    cardViewContainer.appendChild(navContainer);
    container.appendChild(cardViewContainer);
  }

  // Hilfsfunktion zum Gruppieren von Services nach Benutzername
  function groupServicesByUser(services) {
    const groups = {};
    const processedIds = new Set(); // Verhindere Duplikate
    const processedPerfectMatchUsers = new Set(); // Spezielle Behandlung für Perfect Matches

    services.forEach((service, index) => {
      const username = service.username || "Unbekannter Benutzer";
      const serviceId = service.id || service.serviceId || `temp-${index}`;

      // Für Perfect Matches: Nur einen Service pro User behalten
      if (service.isPerfectMatch) {
        if (processedPerfectMatchUsers.has(username)) {
          console.warn("Duplicate Perfect Match user found:", username);
          return; // Überspringe Duplikat
        }
        processedPerfectMatchUsers.add(username);
      } else {
        // Prüfe auf Duplikate bei normalen Services
        if (processedIds.has(serviceId)) {
          console.warn("Duplicate service found:", serviceId, username);
          return; // Überspringe Duplikate
        }
        processedIds.add(serviceId);
      }

      if (!groups[username]) {
        groups[username] = [];
      }

      groups[username].push(service);
    });

    // Sortiere Services innerhalb jeder Gruppe: Perfect Matches zuerst
    Object.keys(groups).forEach((username) => {
      groups[username].sort((a, b) => {
        if (a.isPerfectMatch && !b.isPerfectMatch) return -1;
        if (!a.isPerfectMatch && b.isPerfectMatch) return 1;
        return 0;
      });
    });

    return groups;
  }

  // Fetch the average rating for a service type (general)
  async function getAverageRating(serviceTypeName) {
    try {
      const response = await fetch(
        `${API_URL}/review/average-rating/${encodeURIComponent(
          serviceTypeName
        )}`
      );
      if (response.ok) {
        return await response.json();
      }
      return 0;
    } catch (error) {
      console.error("Fehler beim Abrufen der Durchschnittsbewertung:", error);
      return 0;
    }
  }

  // Fetch the average rating for a specific user and service type
  async function getUserServiceRating(username, serviceTypeName) {
    try {
      // Use the new ratings endpoint
      const response = await fetch(
        `${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`
      );
      if (response.ok) {
        const stats = await response.json();
        // Return the full stats object
        return stats;
      }
      return { averageRating: 0, totalReviews: 0 };
    } catch (error) {
      console.error("Fehler beim Abrufen der Bewertung:", error);
      return { averageRating: 0, totalReviews: 0 };
    }
  }

  // Generate HTML for star rating display
  function generateStarHTML(rating) {
    // Check if rating is null, undefined, or 0 (no rating)
    if (rating === null || rating === undefined || rating === 0) {
      return '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
    }

    let starsHTML = "";

    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        // Full star
        starsHTML += '<i class="fas fa-star selected"></i>';
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        // Half star
        starsHTML += '<i class="fas fa-star-half-alt selected"></i>';
      } else {
        // Empty star
        starsHTML += '<i class="fas fa-star"></i>';
      }
    }
    return `<div class="service-rating">${starsHTML} (${rating.toFixed(1)})</div>`;
  }

  // Load user rating from API
  async function loadUserRating(username, container) {
    if (!username || !container) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`
      );
      if (response.ok) {
        const stats = await response.json();

        // Generate rating HTML
        if (stats.averageRating && stats.averageRating > 0) {
          const starsHTML = generateStarHTML(stats.averageRating);
          // Add review count
          container.innerHTML = `${starsHTML.replace(
            "</div>",
            ""
          )} <span style="color: #666; font-size: 0.9em;">(${
            stats.totalReviews
          } ${
            stats.totalReviews === 1 ? "Bewertung" : "Bewertungen"
          })</span></div>`;
        } else {
          container.innerHTML =
            '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
        }
      } else {
        container.innerHTML =
          '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
      }
    } catch (error) {
      console.error("Fehler beim Laden der Bewertung:", error);
      container.innerHTML =
        '<div class="service-rating"><span style="color: #999;">Bewertung nicht verfügbar</span></div>';
    }
  }

  // Load user rating for group header (compact version)
  async function loadUserRatingForGroup(username, container) {
    if (!username || !container) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`
      );
      if (response.ok) {
        const stats = await response.json();

        // Generate compact rating HTML for group header
        if (stats.averageRating && stats.averageRating > 0) {
          container.innerHTML = `<span class="group-rating-stars">⭐ ${stats.averageRating.toFixed(
            1
          )}</span> <span class="group-rating-count">(${
            stats.totalReviews
          })</span>`;
        } else {
          container.innerHTML =
            '<span style="color: #999; font-size: 0.9em;">Keine Bewertung</span>';
        }
      } else {
        container.innerHTML =
          '<span style="color: #999; font-size: 0.9em;">Keine Bewertung</span>';
      }
    } catch (error) {
      console.error("Fehler beim Laden der User-Bewertung:", error);
      container.innerHTML =
        '<span style="color: #999; font-size: 0.9em;">—</span>';
    }
  }

  // Load rating for specific TypeOfService + Provider combination
  async function loadRatingByTypeAndProvider(typeId, providerId, container) {
    if (!typeId || !providerId || !container) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/reviews/type/${typeId}/provider/${providerId}`
      );
      if (response.ok) {
        const data = await response.json();

        // Generate rating HTML
        if (data.averageRating && data.averageRating > 0) {
          const starsHTML = generateStarHTML(data.averageRating);
          // Add review count
          container.innerHTML = `${starsHTML.replace(
            "</div>",
            ""
          )} <span style="color: #666; font-size: 0.9em;">(${
            data.totalReviews
          } ${
            data.totalReviews === 1 ? "Bewertung" : "Bewertungen"
          })</span></div>`;
        } else {
          container.innerHTML =
            '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung für diese Dienstleistung</span></div>';
        }
      } else {
        container.innerHTML =
          '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung für diese Dienstleistung</span></div>';
      }
    } catch (error) {
      console.error("Fehler beim Laden der Bewertung:", error);
      container.innerHTML =
        '<div class="service-rating"><span style="color: #999;">Bewertung nicht verfügbar</span></div>';
    }
  }

  function createServiceCard({
    username,
    serviceTypeName,
    isOffer,
    marketClient,
    marketProvider,
    serviceId,
    id,
    typeId,
    providerId,
    isPerfectMatch = false,
  }) {
    const cardDiv = document.createElement("div");
    cardDiv.className = `service-item${isPerfectMatch ? " perfect-match" : ""}`;

    // Try to get the username from multiple possible sources
    const displayUsername =
      username ||
      (marketClient && marketClient.user && marketClient.user.name
        ? marketClient.user.name
        : marketProvider && marketProvider.user && marketProvider.user.name
        ? marketProvider.user.name
        : "Unbekannter Benutzer");

    // Try to get the service type from multiple possible sources
    const displayServiceType =
      serviceTypeName ||
      (marketProvider &&
      marketProvider.serviceType &&
      marketProvider.serviceType.name
        ? marketProvider.serviceType.name
        : "Unbekannter Dienstleistungstyp");

    // Get service ID from various sources - for normal services use 'id', for enriched matches use 'serviceId'
    const finalServiceId = id || serviceId || null;

    // Get typeId and providerId from various sources
    const finalTypeId =
      typeId ||
      marketProvider?.serviceType?.id ||
      marketClient?.serviceType?.id ||
      null;
    const finalProviderId =
      providerId || marketProvider?.user?.id || marketClient?.user?.id || null;

    // Create the card without the rating first
    const cardHTML = `
            <div class="card ${isOffer ? "offer-card" : "demand-card"}${
      isPerfectMatch ? " perfect-match-card" : ""
    }">
                <div class="card-header">
                    ${
                      isPerfectMatch
                        ? '<span class="perfect-match-badge"><i class="fas fa-star"></i> Perfect Match</span>'
                        : ""
                    }
                    <span class="badge ${isOffer ? "provider" : "client"}">${
      isOffer ? "Angebot" : "Nachfrage"
    }</span>
                </div>
                <div class="card-body">
                    <div class="service-info">
                        <p><strong>${displayUsername}</strong></p>
                        <p>${displayServiceType}</p>
                        ${
                          isOffer
                            ? '<div class="rating-container"><i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...</div>'
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;

    cardDiv.innerHTML = cardHTML;

    // If it's an offer, make it clickable and fetch rating
    if (
      isOffer &&
      displayServiceType !== "Unbekannter Dienstleistungstyp" &&
      displayUsername !== "Unbekannter Benutzer"
    ) {
      // Make card clickable
      cardDiv.classList.add("clickable");
      cardDiv.style.cursor = "pointer";

      // Add click handler: open request modal to send a service request
      cardDiv.addEventListener("click", function (e) {
        // Extract marketId from marketProvider (since this is an offer)
        const marketId = marketProvider?.id || null;

        if (!marketId) {
          console.warn("Market ID not found for request");
          alert("Anfrage nicht möglich: Fehlende Daten");
          return;
        }

        // Open modal to send request
        openRatingModal(
          marketId,
          displayUsername,
          displayServiceType,
          finalTypeId,
          finalProviderId
        );
      });

      // Load rating specific to this TypeOfService + Provider combination
      const ratingContainer = cardDiv.querySelector(".rating-container");
      if (ratingContainer && finalTypeId && finalProviderId) {
        loadRatingByTypeAndProvider(
          finalTypeId,
          finalProviderId,
          ratingContainer
        );
      }
    }

    return cardDiv;
  }

  // Load ratings for all services
  async function loadRatingsForServices(services) {
    // Sammle eindeutige Usernames
    const uniqueUsernames = [
      ...new Set(
        services
          .map((s) => s.username)
          .filter((u) => u && u !== "Unbekannter Benutzer")
      ),
    ];

    // Lade User-Bewertungen (durchschnitt über alle Services des Users)
    const userRatings = {};
    for (let username of uniqueUsernames) {
      try {
        const response = await fetch(
          `${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`
        );
        if (response.ok) {
          const stats = await response.json();
          userRatings[username] = stats.averageRating || 0;
        }
      } catch (error) {
        console.error(
          "Fehler beim Laden der User-Bewertung für",
          username,
          error
        );
        userRatings[username] = 0;
      }
    }

    // Setze User-Bewertungen für alle Services
    for (let service of services) {
      service.userRating = userRatings[service.username] || 0;

      // Behalte auch die service-spezifische Bewertung bei (für Cards)
      if (
        service.isOffer &&
        service.username !== "Unbekannter Benutzer" &&
        service.serviceTypeName !== "Unbekannter Dienstleistungstyp"
      ) {
        try {
          const rating = await getUserServiceRating(
            service.username,
            service.serviceTypeName
          );
          service.rating = rating;
        } catch (error) {
          console.error(
            "Fehler beim Laden der Bewertung für",
            service.username,
            service.serviceTypeName,
            error
          );
          service.rating = 0;
        }
      } else {
        service.rating = null; // Not an offer, so no rating
      }
    }
    
    // Ensure sort option is correct from DOM before displaying
    const sortFilter = document.getElementById("sortFilter");
    if (sortFilter) {
        // If value is empty or invalid, force rating-desc
        if (!sortFilter.value || sortFilter.value === "none") {
            sortFilter.value = "rating-desc";
        }
        currentSortOption = sortFilter.value;
        console.log("Initial sort applied:", currentSortOption);
    }

    // After all ratings are loaded, update the display
    filterAndDisplayServices();
  }

  // Calculate items per page based on screen size
  function calculateItemsPerPage() {
    const container = document.querySelector(".content-section");
    if (!container) return;

    // Estimate available height
    // Window height - Navbar (approx 60px) - Padding/Margins (approx 40px) - Pagination (approx 60px)
    const availableHeight = window.innerHeight - 160;

    // Estimate item height based on view mode
    let itemHeight;
    if (currentViewMode === "grouped") {
      itemHeight = 300; // Increased from 150 to account for group headers and spacing
    } else if (currentViewMode === "compact") {
      itemHeight = 100; // Approx height of compact card
    } else {
      itemHeight = 400; // Card view is different, usually 1 per page
    }

    // Calculate items that fit
    let calculatedItems = Math.floor(availableHeight / itemHeight);

    // Adjust for width (columns) in compact view
    if (currentViewMode === "compact") {
      const containerWidth = container.clientWidth;
      const itemWidth = 200; // Min width of compact card
      const columns = Math.floor(containerWidth / itemWidth);
      calculatedItems = calculatedItems * columns;
    }

    // Set bounds
    if (currentViewMode === "card") {
      itemsPerPage = 1; // Card view: 1 item per page (Tinder-style)
    } else if (currentViewMode === "compact") {
      itemsPerPage = 16; // Compact view: 16 items per page (Kacheln)
    } else {
      itemsPerPage = 2; // Grouped view: 2 items per page
    }

    console.log(
      `Calculated items per page: ${itemsPerPage} (View: ${currentViewMode})`
    );
  }

  // Render Pagination Controls
  function renderPagination(totalItems) {
    const paginationContainer = document.getElementById("paginationContainer");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";

    // Don't render pagination for card view
    if (currentViewMode === "card") {
      return;
    }

    if (totalItems <= itemsPerPage) {
      return; // No pagination needed if all items fit
    }

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Container for buttons
    const nav = document.createElement("nav");
    nav.className = "pagination-nav";

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn prev";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        filterAndDisplayServices();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    nav.appendChild(prevBtn);

    // Page Numbers (Smart display: 1 ... 4 5 6 ... 10)
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      const firstPageBtn = document.createElement("button");
      firstPageBtn.className = "pagination-btn";
      firstPageBtn.textContent = "1";
      firstPageBtn.onclick = () => {
        currentPage = 1;
        filterAndDisplayServices();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      nav.appendChild(firstPageBtn);

      if (startPage > 2) {
        const dots = document.createElement("span");
        dots.className = "pagination-dots";
        dots.textContent = "...";
        nav.appendChild(dots);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-btn ${i === currentPage ? "active" : ""}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        currentPage = i;
        filterAndDisplayServices();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      nav.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement("span");
        dots.className = "pagination-dots";
        dots.textContent = "...";
        nav.appendChild(dots);
      }

      const lastPageBtn = document.createElement("button");
      lastPageBtn.className = "pagination-btn";
      lastPageBtn.textContent = totalPages;
      lastPageBtn.onclick = () => {
        currentPage = totalPages;
        filterAndDisplayServices();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      nav.appendChild(lastPageBtn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn next";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        filterAndDisplayServices();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    nav.appendChild(nextBtn);

    // Info Text
    const infoText = document.createElement("div");
    infoText.className = "pagination-info";
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    infoText.textContent = `${startItem}-${endItem} von ${totalItems}`;

    paginationContainer.appendChild(nav);
    paginationContainer.appendChild(infoText);
  }

  function filterAndDisplayServices(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }

    const textFilterInput = document.getElementById("textFilter");
    const filterText = textFilterInput
      ? textFilterInput.value.toLowerCase()
      : "";

    let filteredServices = allServices.filter((service) => {
      // Text Filter (Name or Service Type)
      const username = service.username || "";
      const serviceTypeName = service.serviceTypeName || "";
      const textMatch =
        username.toLowerCase().includes(filterText) ||
        serviceTypeName.toLowerCase().includes(filterText);

      if (!textMatch) return false;

      // Service Type Filter
      const typeMatch =
        currentServiceType === "all" ||
        service.serviceTypeName === currentServiceType;

      if (!typeMatch) return false;

      // Filter by offer/demand type
      let offerMatch = true;
      if (currentFilterType === "offer") offerMatch = service.isOffer;
      else if (currentFilterType === "demand") offerMatch = !service.isOffer;

      if (!offerMatch) return false;

      // Filter by rating (use userRating for filtering)
      let ratingMatch = true;
      if (currentRatingFilter !== "all") {
        if (currentRatingFilter === "unrated") {
          ratingMatch = !service.userRating || service.userRating === 0;
        } else {
          const minRating = parseFloat(currentRatingFilter.replace("+", ""));
          ratingMatch = service.userRating && service.userRating >= minRating;
        }
      }

      return ratingMatch;
    });

    // Sort services
    if (currentSortOption !== "none") {
      filteredServices.sort((a, b) => {
        switch (currentSortOption) {
          case "rating-desc":
            // Use userRating for sorting, not service-specific rating
            const ratingA = a.userRating || 0;
            const ratingB = b.userRating || 0;
            return ratingB - ratingA;
          case "rating-asc":
            const ratingA2 = a.userRating || 0;
            const ratingB2 = b.userRating || 0;
            return ratingA2 - ratingB2;
          case "name-asc":
            return (a.username || "").localeCompare(b.username || "");
          case "name-desc":
            return (b.username || "").localeCompare(a.username || "");
          default:
            return 0;
        }
      });
    }

    // WICHTIG: Perfect Matches immer zuerst anzeigen
    filteredServices.sort((a, b) => {
      // Perfect Matches haben Priorität
      if (a.isPerfectMatch && !b.isPerfectMatch) return -1;
      if (!a.isPerfectMatch && b.isPerfectMatch) return 1;
      return 0; // Behalte die vorherige Sortierung bei
    });

    // Dedupliziere Perfect Matches NUR für Grouped View
    // In Compact/Card View sollen beide Services (Angebot + Nachfrage) einzeln angezeigt werden
    if (currentViewMode === "grouped") {
      const seenPerfectMatchUsers = new Set();
      filteredServices = filteredServices.filter((service) => {
        if (service.isPerfectMatch) {
          if (seenPerfectMatchUsers.has(service.username)) {
            return false; // Überspringe Duplikat
          }
          seenPerfectMatchUsers.add(service.username);
        }
        return true;
      });
    }

    // Pagination Logic
    const totalItems = filteredServices.length;

    // For grouped view, we need to paginate by groups, not individual items
    let paginatedServices;
    let totalPages;

    if (currentViewMode === "grouped") {
      // Group services first to count groups
      const groupedServices = {};

      filteredServices.forEach((service) => {
        const username = service.username || "Unbekannter Benutzer";
        if (!groupedServices[username]) {
          groupedServices[username] = [];
        }
        groupedServices[username].push(service);
      });

      const groupNames = Object.keys(groupedServices);
      totalPages = Math.ceil(groupNames.length / itemsPerPage);

      // Ensure currentPage is valid
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
      if (currentPage < 1) currentPage = 1;

      // Get groups for current page
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentPageGroups = groupNames.slice(startIndex, endIndex);

      // Flatten services from selected groups
      paginatedServices = [];
      currentPageGroups.forEach((username) => {
        paginatedServices.push(...groupedServices[username]);
      });

      // Render pagination based on number of groups
      renderPagination(groupNames.length);
    } else if (currentViewMode === "card") {
      paginatedServices = filteredServices; // Pass all services for card view
      totalPages = filteredServices.length; // Each service is a page
      renderPagination(totalItems);
    } else {
      // Compact view: paginate by individual items
      totalPages = Math.ceil(totalItems / itemsPerPage);

      // Ensure currentPage is valid
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
      if (currentPage < 1) currentPage = 1;

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      paginatedServices = filteredServices.slice(startIndex, endIndex);

      // Render Pagination Controls
      renderPagination(totalItems);
    }

    // Display current page items
    displayFilteredServices(paginatedServices);
  }
});
// ==================== SERVICE REQUEST MODAL FUNCTIONALITY ====================

let currentRatingData = {
  marketId: null,
  providerName: null,
  serviceType: null,
  typeId: null,
  providerId: null,
};

// Initialize request modal functionality
function initializeRatingModal() {
  // No initialization needed for request modal
}

// Open request modal for a service
window.openRatingModal = function (
  marketId,
  providerName,
  serviceType,
  typeId,
  providerId
) {
  // Store current scroll position
  const scrollPosition =
    window.pageYOffset || document.documentElement.scrollTop;

  currentRatingData = {
    marketId: marketId,
    providerName: providerName,
    serviceType: serviceType,
    typeId: typeId,
    providerId: providerId,
    scrollPosition: scrollPosition,
  };

  // Update modal display
  document.getElementById("ratingProviderName").textContent = providerName;
  document.getElementById("ratingServiceType").textContent = serviceType;
  document.querySelector(".modal-message").style.display = "none";
  document.querySelector(".modal-message").className = "modal-message";

  // Show modal
  document.getElementById("ratingModal").classList.add("active");

  // Initialize if not already done
  if (!window.ratingModalInitialized) {
    initializeRatingModal();
    window.ratingModalInitialized = true;
  }
};

// Close request modal
window.closeRatingModal = function () {
  document.getElementById("ratingModal").classList.remove("active");
  currentRatingData = {
    marketId: null,
    providerName: null,
    serviceType: null,
    typeId: null,
    providerId: null,
  };
};

// Submit service request
window.submitRating = async function () {
  const modalMessage = document.querySelector(".modal-message");

  // Validation
  if (!currentRatingData.marketId) {
    showMessage("Fehler: Market-ID nicht gefunden", "error");
    closeRatingModal();
    return;
  }

  try {
    // Get current user
    const userResponse = await fetch(`${API_URL}/user`, {
      credentials: "include",
    });

    if (!userResponse.ok) {
      showMessage("Fehler: Du musst angemeldet sein", "error");
      closeRatingModal();
      return;
    }

    const userText = await userResponse.text();
    let senderUsername;
    try {
      const userJson = JSON.parse(userText);
      senderUsername = userJson.username;
    } catch (e) {
      senderUsername = userText.trim();
    }

    if (!senderUsername || senderUsername === "Gast-Modus") {
      showMessage("Fehler: Du musst angemeldet sein", "error");
      closeRatingModal();
      return;
    }

    // Prepare request
    const requestData = {
      senderUsername: senderUsername,
      marketId: currentRatingData.marketId,
    };

    const response = await fetch(`${API_URL}/service-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 409) {
        showMessage(
          "Du hast bereits eine Anfrage an diesen User gesendet",
          "warning"
        );
        closeRatingModal();
      } else if (response.status === 404) {
        showMessage("Service nicht gefunden", "error");
        closeRatingModal();
      } else if (response.status === 400) {
        showMessage(errorText || "Ungültige Anfragedaten", "error");
        closeRatingModal();
      } else {
        showMessage("Fehler beim Senden der Anfrage", "error");
        closeRatingModal();
      }
      return;
    }

    const result = await response.json();

    showMessage("Anfrage erfolgreich gesendet!", "success");
    closeRatingModal();

    // Store the scroll position in sessionStorage before reload
    const targetScrollPosition = currentRatingData.scrollPosition || 0;
    sessionStorage.setItem("scrollPosition", targetScrollPosition.toString());

    // Reload the page after a short delay to show updated state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error("Fehler beim Absenden der Anfrage:", error);
    showMessage(
      "Netzwerkfehler: Anfrage konnte nicht gesendet werden",
      "error"
    );
    closeRatingModal();
  }
};

// Modal message functionality replaced by toast notifications

// Close modal when clicking outside
document.addEventListener("click", function (e) {
  const modal = document.getElementById("ratingModal");
  if (e.target === modal) {
    closeRatingModal();
  }
});

// Close modal with ESC key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const modal = document.getElementById("ratingModal");
    if (modal && modal.classList.contains("active")) {
      closeRatingModal();
    }
  }
});

console.log("Service request modal functionality loaded");

// ==================== COMPACT CARD (für compact view) ====================
function createCompactCard(service) {
  const cardDiv = document.createElement("div");
  cardDiv.className = `compact-card ${service.isOffer ? "offer" : "demand"}${
    service.isPerfectMatch ? " perfect-match" : ""
  }`;

  cardDiv.innerHTML = `
    <div class="compact-badge">${service.isOffer ? "A" : "N"}</div>
    <div class="compact-content">
      <h5>${service.username}</h5>
      <p>${service.serviceTypeName}</p>
      ${
        service.isOffer && service.rating && typeof service.rating === "number"
          ? `<div class="compact-rating">⭐ ${service.rating.toFixed(1)}</div>`
          : ""
      }
    </div>
  `;

  // Click handler for Offers
  if (service.isOffer && service.marketProvider?.id) {
    cardDiv.classList.add("clickable");
    cardDiv.onclick = () => {
      const marketId = service.marketProvider.id;
      openRatingModal(
        marketId,
        service.username,
        service.serviceTypeName,
        service.typeId,
        service.providerId
      );
    };
  }

  return cardDiv;
}

// ==================== LARGE CARD (für card/tinder view) ====================
function createLargeCard(service, allServices) {
  const cardDiv = document.createElement("div");
  cardDiv.className = `large-card ${
    service.isOffer ? "offer-large" : "demand-large"
  }${service.isPerfectMatch ? " perfect-match" : ""}`;

  // Zähle alle Services dieses Users
  const userServices = allServices.filter(
    (s) => s.username === service.username
  );
  const serviceCount = userServices.length;

  // Für Perfect Matches: Spezielle 2-Spalten Ansicht
  if (service.isPerfectMatch) {
    // Finde das komplementäre Service des gleichen Users
    const complementService = userServices.find(
      (s) => s.isOffer !== service.isOffer
    );

    // Bestimme was angezeigt wird
    const yourSide = service.isOffer ? service : complementService;
    const theirSide = service.isOffer ? complementService : service;

    const yourServiceName =
      yourSide?.serviceTypeName || service.serviceTypeName;
    const theirServiceName =
      theirSide?.serviceTypeName || service.serviceTypeName;

    cardDiv.innerHTML = `
      <div class="large-card-header">
        <span class="perfect-match-badge large"><i class="fas fa-star"></i> Perfect Match</span>
        <span class="service-count-badge">${serviceCount} ${
      serviceCount === 1 ? "Service" : "Services"
    }</span>
      </div>
      <div class="large-card-body perfect-match-layout">
        <div class="perfect-match-user">
          <div class="large-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <h2 class="large-username">${service.username}</h2>
        </div>
        
        <div class="perfect-match-columns">
          <div class="perfect-match-col demand-col">
            <div class="col-header">
              <i class="fas fa-search"></i>
              <span>Sucht</span>
            </div>
            <div class="col-content">
              <div class="service-tag demand">${theirServiceName}</div>
            </div>
          </div>
          
          <div class="match-connector">
            <i class="fas fa-exchange-alt"></i>
          </div>
          
          <div class="perfect-match-col offer-col">
            <div class="col-header">
              <i class="fas fa-hands-helping"></i>
              <span>Bietet an</span>
            </div>
            <div class="col-content">
              <div class="service-tag offer">${yourServiceName}</div>
            </div>
          </div>
        </div>
        
        <div class="large-rating-container"><i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...</div>
      </div>
    `;
    
    // Load service-specific rating for Perfect Match
    const ratingContainer = cardDiv.querySelector('.large-rating-container');
    if (ratingContainer && service.typeId && service.providerId) {
      loadLargeCardRating(service.typeId, service.providerId, ratingContainer);
    }
  } else {
    // Normale Card für nicht-Perfect Matches
    cardDiv.innerHTML = `
      <div class="large-card-header">
        <span class="large-badge ${
          service.isOffer ? "offer-badge" : "demand-badge"
        }">
          ${service.isOffer ? "Bietet an" : "Sucht"}
        </span>
        <span class="service-count-badge">${serviceCount} ${
      serviceCount === 1 ? "Service" : "Services"
    }</span>
      </div>
      <div class="large-card-body">
        <div class="large-avatar">
          <i class="fas fa-user-circle"></i>
        </div>
        <h2 class="large-username">${service.username}</h2>
        <h3 class="large-service">${service.serviceTypeName}</h3>
        <div class="large-rating-container"><i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...</div>
      </div>
    `;
    
    // Load service-specific rating for normal service
    const ratingContainer = cardDiv.querySelector('.large-rating-container');
    if (ratingContainer && service.typeId && service.providerId) {
      loadLargeCardRating(service.typeId, service.providerId, ratingContainer);
    }
  }

  return cardDiv;
}

// Load rating for large card view
async function loadLargeCardRating(typeId, providerId, container) {
  if (!typeId || !providerId || !container) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/reviews/type/${typeId}/provider/${providerId}`
    );
    if (response.ok) {
      const data = await response.json();

      if (data.averageRating && data.averageRating > 0) {
        // Generate stars with half-star support
        let starsHTML = "";
        for (let i = 1; i <= 5; i++) {
          if (i <= Math.floor(data.averageRating)) {
            // Full star
            starsHTML += '<i class="fas fa-star selected"></i>';
          } else if (i === Math.ceil(data.averageRating) && data.averageRating % 1 !== 0) {
            // Half star
            starsHTML += '<i class="fas fa-star-half-alt selected"></i>';
          } else {
            // Empty star
            starsHTML += '<i class="fas fa-star"></i>';
          }
        }
        
        container.innerHTML = `
          <div class="large-rating">
            <div class="stars">${starsHTML}</div>
            <div class="rating-value">${data.averageRating.toFixed(1)} / 5.0 (${data.totalReviews} ${data.totalReviews === 1 ? 'Bewertung' : 'Bewertungen'})</div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="large-rating">
            <div class="rating-no-data">Noch keine Bewertung</div>
          </div>
        `;
      }
    } else {
      container.innerHTML = `
        <div class="large-rating">
          <div class="rating-no-data">Noch keine Bewertung</div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Fehler beim Laden der Bewertung:", error);
    container.innerHTML = `
      <div class="large-rating">
        <div class="rating-no-data">Bewertung nicht verfügbar</div>
      </div>
    `;
  }
}

// Helper for opening request modal from card view
window.openRatingModalForCard = function (
  marketId,
  username,
  serviceType,
  typeId,
  providerId
) {
  openRatingModal(marketId, username, serviceType, typeId, providerId);
};
