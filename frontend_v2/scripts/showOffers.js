import { API_URL } from './config.js';

console.log('showOffers.js loaded successfully');
console.log('API_URL:', API_URL);

// Tag-Verwaltung
let selectedTags = new Set();
let currentServices = []; // Speichert alle aktuell geladenen Services

// Event-Listener für Service Toggle
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    // Initialize user system
    getActiveUser();
    
    // Event-Listener für Navigation Username Input
    const navUsernameInput = document.getElementById("navUsername");
    if (navUsernameInput) {
        navUsernameInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                const username = this.value.trim();
                if (username) {
                    setActiveUser(username);
                } else {
                    showMessage("Bitte gib einen gültigen Benutzernamen ein.");
                }
            }
        });
    }
    
    // Event-Listener für Create Offer Button
    const createOfferButton = document.getElementById('createOfferButton');
    if (createOfferButton) {
        createOfferButton.addEventListener('click', function () {
            window.location.href = 'makeOffer.html';
        });
    }
    
    // Warte etwas, damit die DOM-Elemente vollständig geladen sind
    setTimeout(() => {
        console.log('Setting up event listeners...');
        const toggleInputs = document.querySelectorAll('input[name="serviceToggle"]');
        console.log('Toggle inputs found:', toggleInputs.length); // Debug
        toggleInputs.forEach(input => {
            input.addEventListener('change', handleServiceToggle);
            console.log('Event listener added to:', input.value); // Debug
        });
        
        // Event-Listener für "Geschlossene Märkte anzeigen" Checkbox
        const showClosedMarketsCheckbox = document.getElementById('showClosedMarkets');
        if (showClosedMarketsCheckbox) {
            showClosedMarketsCheckbox.addEventListener('change', applyFilters);
        }
        
        // Suchfunktionalität für Namenssuche
        const nameSearchInput = document.getElementById('nameSearchInput');
        if (nameSearchInput) {
            nameSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    applyFilters();
                }
            });
            // Event-Listener für Namenssuche (auch bei Input-Änderung)
            nameSearchInput.addEventListener('input', debounce(applyFilters, 300));
        }
        
        // Event-Listener für Beschreibungssuche
        const detailSearchInput = document.getElementById('detailSearchInput');
        if (detailSearchInput) {
            detailSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const searchTerm = this.value.trim();
                    if (searchTerm) {
                        addTag(searchTerm);
                        this.value = '';
                    }
                }
            });
        }
        
        // Event-Listener für Datumsfelder (deaktiviert)
        /*
        const fromDateInput = document.getElementById('fromDateInput');
        const toDateInput = document.getElementById('toDateInput');
        if (fromDateInput) fromDateInput.addEventListener('change', applyFilters);
        if (toDateInput) toDateInput.addEventListener('change', applyFilters);
        */
        
        // Event-Listener für Filter-Dropdown
        const filterService = document.getElementById("filterService");
        if (filterService) {
            filterService.addEventListener('change', applyFilters);
        }
        
        // Event-Listener für beliebte Tags
        const popularTagPills = document.querySelectorAll('.popular-tag-pill');
        popularTagPills.forEach(pill => {
            pill.addEventListener('click', function() {
                const tag = this.getAttribute('data-tag');
                togglePopularTag(this, tag);
            });
        });
        
        // Lade initiale Daten
        console.log('Loading initial data...');
        loadServiceTypesAndOffers();
    }, 100);
});

// Debounce-Funktion für bessere Performance bei der Eingabe
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleServiceToggle() {
    const selectedValue = document.querySelector('input[name="serviceToggle"]:checked')?.value;
    console.log('Toggle changed to:', selectedValue); // Debug
    
    // Verwende applyFilters() um alle aktiven Filter zu berücksichtigen
    applyFilters();
}

function getCurrentUsername() {
    const activeUserDisplay = document.getElementById("activeUserDisplay");
    if (activeUserDisplay) {
        const username = activeUserDisplay.textContent.trim();
        return username !== "Nicht angemeldet" ? username : null;
    }
    return null;
}

function displayFilteredServices(services, toggleFilter = null) {
    const serviceList = document.getElementById("serviceList");
    serviceList.innerHTML = '';

    console.log('displayFilteredServices called with:', services.length, 'services, toggle:', toggleFilter); // Debug

    // Filtere die Dienste des aktuell eingeloggten Benutzers heraus
    const currentUser = getCurrentUsername();
    let filteredServices = [...services]; // Kopie erstellen
    
    if (currentUser) {
        filteredServices = filteredServices.filter(service => {
            const serviceUsername = service.user && service.user.name ? service.user.name.trim() : '';
            return serviceUsername !== currentUser;
        });
        console.log('Filtered out current user services. Remaining:', filteredServices.length); // Debug
    }

    // Wenn Toggle-Filter aktiv ist, filtere entsprechend weiter
    if (toggleFilter) {
        if (toggleFilter === 'offers') {
            filteredServices = filteredServices.filter(s => s.offer === 1);
            console.log('Filtered to offers:', filteredServices.length); // Debug
        } else if (toggleFilter === 'demands') {
            filteredServices = filteredServices.filter(s => s.offer === 0);
            console.log('Filtered to demands:', filteredServices.length); // Debug
        }
    }

    if (filteredServices.length === 0) {
        const messageContainer = document.createElement("div");
        messageContainer.className = "no-results";
        messageContainer.innerHTML = `<p>Keine Ergebnisse gefunden.</p>`;
        serviceList.appendChild(messageContainer);
        return;
    }

    if (filteredServices.length === 0) {
        const messageContainer = document.createElement("div");
        messageContainer.className = "no-results";
        messageContainer.innerHTML = `<p>Keine ${toggleFilter === 'offers' ? 'Angebote' : 'Gesuche'} gefunden.</p>`;
        serviceList.appendChild(messageContainer);
        return;
    }

    // Erstelle Container für die Services
    const servicesGrid = document.createElement("div");
    servicesGrid.className = "service-grid";
    servicesGrid.style.display = "grid";
    servicesGrid.style.gap = "1rem";
    servicesGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";

    filteredServices.forEach(m => {
        const listItem = createServiceCard(
            m.serviceType && m.serviceType.name ? m.serviceType.name : '',
            "",
            m.user && m.user.name ? m.user.name : '',
            m.description || "",
            m.startDate,
            m.endDate,
            m.offer === 1
        );
        servicesGrid.appendChild(listItem);
    });

    serviceList.appendChild(servicesGrid);
}

function addTag(tag) {
    if (!selectedTags.has(tag)) {
        selectedTags.add(tag);
        
        // Prüfe ob es ein beliebter Tag ist
        const popularTagPill = document.querySelector(`.popular-tag-pill[data-tag="${tag}"]`);
        
        if (popularTagPill) {
            // Für beliebte Tags: nur visuell markieren, kein separates Element erstellen
            popularTagPill.classList.add('active');
        } else {
            // Für manuelle Tags: separates Element in der Tag-Liste erstellen
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <button class="tag-remove" onclick="removeTag('${tag}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            document.getElementById('selectedTags').appendChild(tagElement);
        }
        
        applyFilters();
    }
}

function removeTag(tag) {
    selectedTags.delete(tag);
    
    // Prüfe ob es ein beliebter Tag ist
    const popularTagPill = document.querySelector(`.popular-tag-pill[data-tag="${tag}"]`);
    
    if (popularTagPill) {
        // Für beliebte Tags: nur visuell deaktivieren
        popularTagPill.classList.remove('active');
    } else {
        // Für manuelle Tags: DOM-Element entfernen
        const tagElement = document.querySelector(`.tag:has(button[onclick*="${tag}"])`);
        if (tagElement) {
            tagElement.remove();
        }
    }
    
    applyFilters();
}

function togglePopularTag(pill, tag) {
    if (pill.classList.contains('active')) {
        // Tag entfernen
        pill.classList.remove('active');
        removeTag(tag);
    } else {
        // Tag hinzufügen
        pill.classList.add('active');
        addTag(tag);
    }
}

// Make removeTag available globally for onclick handlers
window.removeTag = removeTag;

// User Management Functions
function getActiveUser() {
    fetch(`${API_URL}/user`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen des aktiven Benutzers");
            }
            return response.text();
        })
        .then(responseText => {
            try {
                const responseJson = JSON.parse(responseText);
                const username = responseJson.username || "Nicht angemeldet";
                
                const activeUserDisplay = document.getElementById("activeUserDisplay");
                if (activeUserDisplay) {
                    activeUserDisplay.textContent = username;
                    activeUserDisplay.classList.add("user-active");
                }
                
                // Aktualisiere die Anzeige nach dem Laden des Benutzers
                loadAllOffers();
            } catch (e) {
                const username = responseText && responseText.trim() !== "" ? responseText : "Nicht angemeldet";
                
                const activeUserDisplay = document.getElementById("activeUserDisplay");
                if (activeUserDisplay) {
                    activeUserDisplay.textContent = username !== "" ? username : "Nicht angemeldet";
                    if (username !== "") {
                        activeUserDisplay.classList.add("user-active");
                    } else {
                        activeUserDisplay.classList.remove("user-active");
                    }
                }
                
                // Aktualisiere die Anzeige nach dem Laden des Benutzers
                loadAllOffers();
            }
        })
        .catch(error => {
            console.error("Fehler beim Abrufen des aktiven Benutzers:", error);
            const activeUserDisplay = document.getElementById("activeUserDisplay");
            if (activeUserDisplay) {
                activeUserDisplay.textContent = "Nicht angemeldet";
                activeUserDisplay.classList.remove("user-active");
            }
        });
}

function setActiveUser(username) {
    fetch(`${API_URL}/user`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: username })
    })
    .then(response => {
        if (response.ok) {
            return response.text().then(msg => {
                const activeUserDisplay = document.getElementById("activeUserDisplay");
                if (activeUserDisplay) {
                    activeUserDisplay.textContent = username;
                    activeUserDisplay.classList.add("user-active");
                }
                
                // Clear the input field after successful login
                const navUsernameInput = document.getElementById("navUsername");
                if (navUsernameInput) {
                    navUsernameInput.value = "";
                }
                
                showMessage(`Erfolgreich als ${username} angemeldet.`);
                
                // Lade Services neu, um den neuen Benutzer herauszufiltern
                loadAllOffers();
                
                return msg;
            });
        } else {
            return response.text().then(errorMsg => {
                throw new Error(errorMsg || `Fehler beim Setzen von ${username} als aktiven Benutzer`);
            });
        }
    })
    .catch(error => {
        showMessage(error.message);
    });
}

function showMessage(message) {
    // Create a temporary message element
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    messageElement.textContent = message;
    
    // Add animation keyframes
    if (!document.querySelector('#messageAnimations')) {
        const style = document.createElement('style');
        style.id = 'messageAnimations';
        style.innerHTML = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

function applyFilters() {
    const nameSearch = document.getElementById('nameSearchInput').value.trim().toLowerCase();
    const selectedServiceType = document.getElementById('filterService').value;
    // Datum-Filter sind deaktiviert (auskommentiert)
    // const fromDate = document.getElementById('fromDateInput').value;
    // const toDate = document.getElementById('toDateInput').value;
    const showClosedMarkets = document.getElementById('showClosedMarkets').checked;
    const toggleValue = document.querySelector('input[name="serviceToggle"]:checked')?.value;
    
    showLoading();

    fetch(`${API_URL}/market`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(users => {
            const currentUser = getCurrentUsername();
            const filteredUsers = users.filter(user => {
                // Filtere den aktuell eingeloggten Benutzer heraus
                if (currentUser) {
                    const serviceUsername = user.user && user.user.name ? user.user.name.trim() : '';
                    if (serviceUsername === currentUser) {
                        return false; // Schließe eigene Services aus
                    }
                }
                
                // Toggle-Filter (offers vs demands) - WICHTIG: Das muss zuerst geprüft werden!
                let matchesToggle = true;
                if (toggleValue === 'offers') {
                    matchesToggle = user.offer === 1;
                } else if (toggleValue === 'demands') {
                    matchesToggle = user.offer === 0;
                }
                
                // Name-Filter
                const matchesName = nameSearch === '' || (user.user && user.user.name && user.user.name.toLowerCase().includes(nameSearch));
                // ServiceType-Filter
                const matchesServiceType = selectedServiceType === 'all' || (user.serviceType && user.serviceType.name === selectedServiceType);
                // Tag-Filter (Beschreibung und ServiceType)
                const matchesTags = selectedTags.size === 0 || Array.from(selectedTags).some(tag => {
                    const tagLower = tag.toLowerCase();
                    const inServiceType = user.serviceType && user.serviceType.name && user.serviceType.name.toLowerCase().includes(tagLower);
                    const inDescription = user.description && user.description.toLowerCase().includes(tagLower);
                    return inServiceType || inDescription;
                });
                // Datumsfilter (startDate) - deaktiviert
                let matchesDateRange = true;
                /* Datum-Filter auskommentiert
                if (fromDate || toDate) {
                    if (user.startDate) {
                        const userStartDate = new Date(user.startDate);
                        if (fromDate) {
                            const filterFromDate = new Date(fromDate);
                            matchesDateRange = matchesDateRange && userStartDate >= filterFromDate;
                        }
                        if (toDate) {
                            const filterToDate = new Date(toDate);
                            matchesDateRange = matchesDateRange && userStartDate <= filterToDate;
                        }
                    } else {
                        matchesDateRange = false;
                    }
                }
                */
                // Geschlossene Märkte (endDate)
                let matchesActive = true;
                if (showClosedMarkets) {
                    // Zeige nur Märkte mit vergangenem Enddatum
                    if (user.endDate) {
                        const endDate = new Date(user.endDate);
                        matchesActive = endDate < new Date();
                    } else {
                        matchesActive = false;
                    }
                } else {
                    // Zeige nur offene Märkte (kein Enddatum oder Enddatum in der Zukunft)
                    matchesActive = !user.endDate || new Date(user.endDate) >= new Date();
                }
                return matchesToggle && matchesName && matchesTags && matchesServiceType && matchesDateRange && matchesActive;
            });

            currentServices = filteredUsers; // Speichere gefilterte Services
            clearLoading();
            displayFilteredServices(filteredUsers, toggleValue);
        })
        .catch(error => {
            console.error("Fehler:", error);
            clearLoading();
            alert("Es gab ein Problem beim Abrufen der Daten.");
        });
}

function addUserToList(serviceOffer, serviceWanted, name, description, startdate, enddate) {
    const serviceList = document.getElementById("serviceList");
    const listItem = document.createElement("li");
    listItem.className = "service-item";

    let formattedStartDate = '';
    let formattedEndDate = '';

    if (startdate) {
        try {
            const startDateTime = new Date(startdate);
            if (!isNaN(startDateTime.getTime())) {
                formattedStartDate = startDateTime.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (e) {
            console.error("Error formatting startdate:", e);
        }
    }

    if (enddate) {
        try {
            const endDateTime = new Date(enddate);
            if (!isNaN(endDateTime.getTime())) {
                formattedEndDate = endDateTime.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (e) {
            console.error("Error formatting enddate:", e);
        }
    }

    listItem.innerHTML = `
        <div class="card" style="height: auto; min-height: 240px;">
            <div class="card-header">
                <span class="badge">${serviceOffer} ➝ ${serviceWanted}</span>
            </div>
            <div class="card-body">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Beschreibung:</strong> ${description}</p>
                <p><strong>Von:</strong> ${formattedStartDate}</p>
                <p><strong>Bis:</strong> ${formattedEndDate}</p>
                <div class="rating-container" data-username="${name}">
                    <i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...
                </div>
            </div>
        </div>
    `;

    serviceList.appendChild(listItem);
    
    // Load rating for this user
    loadUserRating(name, listItem.querySelector('.rating-container'));
}


function showLoading(message = "Laden...") {
    const serviceList = document.getElementById("serviceList");
    serviceList.innerHTML = `<li class="loading">${message}</li>`;
}

function clearLoading() {
    const serviceList = document.getElementById("serviceList");
    serviceList.innerHTML = "";
}

function loadServiceTypesAndOffers() {
    console.log('loadServiceTypesAndOffers() called');
    loadServiceTypes();
    loadAllOffers();
}

function loadServiceTypes() {
    console.log('loadServiceTypes() called');
    const filterService = document.getElementById("filterService");
    const url = `${API_URL}/servicetype`;
    console.log('Fetching service types from:', url);

    fetch(url)
        .then(response => {
            console.log('ServiceTypes response:', response);
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Kategorien");
            }
            return response.json();
        })
        .then(serviceTypes => {
            console.log('ServiceTypes loaded:', serviceTypes);
            filterService.innerHTML = '<option value="all">Alle Fächer</option>';
            serviceTypes.forEach(type => {
                const option = document.createElement("option");
                option.value = type.name;
                option.textContent = type.name;
                filterService.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

function loadAllOffers() {
    console.log('loadAllOffers() called');
    const url = `${API_URL}/market`;
    console.log('Fetching offers from:', url);
    showLoading();
    fetch(url)
        .then(response => {
            console.log('Market response:', response);
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(marketDtos => {
            console.log('Market data loaded:', marketDtos.length, 'items');
            clearLoading();
            currentServices = marketDtos; // Speichere alle Services
            
            if (marketDtos.length === 0) {
                const messageContainer = document.createElement("div");
                messageContainer.className = "no-results";
                messageContainer.innerHTML = `
                    <p><i class="fas fa-search"></i> Keine Angebote gefunden.</p>
                `;
                document.getElementById("serviceList").appendChild(messageContainer);
                return;
            }
            
            // Zeige initial alle Services mit dem aktuellen Toggle-Filter (ohne aktiven Benutzer)
            const toggleValue = document.querySelector('input[name="serviceToggle"]:checked')?.value;
            console.log('Initial toggle value:', toggleValue);
            displayFilteredServices(marketDtos, toggleValue);
        })
        .catch(error => {
            console.error("Fehler beim Laden der Marktdaten:", error);
            clearLoading();
            const serviceList = document.getElementById("serviceList");
            if (serviceList) {
                serviceList.innerHTML = `<li style="color: red;">❌ Fehler: ${error.message}</li>`;
            }
        });
}

// Neue einfache Funktion zum Testen
function createSimpleList(data) {
    console.log('createSimpleList called with', data.length, 'items');
    const serviceList = document.getElementById("serviceList");
    
    if (!serviceList) {
        console.error('Element "serviceList" nicht gefunden!');
        return;
    }
    
    // Lösche vorherige Inhalte
    serviceList.innerHTML = '';
    
    // Erstelle einfache Listenelemennete
    data.slice(0, 10).forEach((item, index) => { // Nur erste 10 für Test
        const li = document.createElement('li');
        li.style.cssText = 'margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 5px;';
        li.innerHTML = `
            <strong>${index + 1}. ${item.serviceType.name}</strong><br>
            <em>Von: ${item.user.name}</em><br>
            <span style="color: ${item.offer ? 'green' : 'red'}">
                ${item.offer ? '🟢 Angebot' : '🔴 Gesucht'}
            </span>
        `;
        serviceList.appendChild(li);
    });
    
    console.log('Simple list created with', serviceList.children.length, 'items');
}

function createServiceCard(serviceOffer, serviceWanted, name, description, startdate, enddate, isOffer) {
    const listItem = document.createElement("li");
    listItem.className = "service-item";

    // Format dates for display
    let dateRange = '';
    
    // Format startdate and enddate if they exist
    if (startdate || enddate) {
        try {
            let formattedStartDate = 'Nicht angegeben';
            let formattedEndDate = 'Nicht angegeben';
            
            // Format startdate if exists
            if (startdate) {
                try {
                    const startDateTime = new Date(startdate);
                    if (!isNaN(startDateTime.getTime())) {
                        formattedStartDate = startDateTime.toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        }).replace(/\./g, '/');
                    }
                } catch (e) {
                    console.error("Error formatting startdate:", e);
                }
            }
        
            if (enddate) {
                try {
                    const endDateTime = new Date(enddate);
                    if (!isNaN(endDateTime.getTime())) {
                        formattedEndDate = endDateTime.toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        }).replace(/\./g, '/');
                    }
                } catch (e) {
                    console.error("Error formatting enddate:", e);
                }
            }
            
            // Create date range string
            dateRange = `${formattedStartDate} - ${formattedEndDate}`;
        } catch (e) {
            console.error("Error formatting dates:", e);
        }
    }

    // Klassenname je nach isOffer-Wert
    const cardClassName = isOffer ? "offer-card" : "demand-card";
    const badgeText = isOffer ? "Angebot" : "Gesucht";
    const cardIcon = isOffer ? "fas fa-hands-helping" : "fas fa-hand-holding";

    listItem.innerHTML = `
        <div class="card ${cardClassName}" style="height: auto; min-height: 200px;">
            <div class="card-header">
                <h3 style="margin: 0 0 8px 0; font-size: 1rem; color: #333;">
                    <i class="${cardIcon}"></i> ${serviceOffer}
                </h3>
                <p style="margin: 0; font-size: 0.85rem; color: #666;">${dateRange}</p>
                <span class="badge">${badgeText}</span>
            </div>
            <div class="card-body">
                <p style="margin: 0 0 4px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 0 0 8px 0;"><strong>Beschreibung:</strong> ${description}</p>
                ${isOffer ? '<div class="rating-container"><i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...</div>' : ''}
            </div>
        </div>
    `;

    // If it's an offer, fetch and display the average rating
    if (isOffer && name && name !== 'Unbekannter Benutzer') {
        const ratingContainer = listItem.querySelector('.rating-container');
        
        // Load rating for this user using the new API
        loadUserRating(name, ratingContainer);
    }

    return listItem;
}

// Einfache Test-Funktion um zu sehen ob das HTML funktioniert
function createSimpleTestList() {
    console.log('Creating simple test list...');
    const serviceList = document.getElementById("serviceList");
    
    if (!serviceList) {
        console.error('serviceList element not found!');
        return;
    }
    
    console.log('serviceList element found:', serviceList);
    
    // Lade direkt die API-Daten
    console.log('Loading real API data...');
    fetch(`${API_URL}/market`)
        .then(response => response.json())
        .then(data => {
            console.log('Got data:', data.length, 'items');
            
            // Erstelle einfache Liste
            let html = '';
            data.slice(0, 10).forEach(item => { // Die ersten 10 Items
                html += `<li>${item.user.name} - ${item.serviceType.name} (${item.offer ? 'Angebot' : 'Nachfrage'})</li>`;
            });
            
            serviceList.innerHTML = html;
            console.log('List updated with real data');
        })
        .catch(error => {
            console.error('API Error:', error);
            serviceList.innerHTML = '<li>Fehler beim Laden der Daten</li>';
        });
}

// Bewertungsfunktionen (von showUserServices.js übernommen)
// Fetch the average rating for a service type (general)
async function getAverageRating(serviceTypeName) {
    try {
        const response = await fetch(`${API_URL}/rating/average/service-type/${encodeURIComponent(serviceTypeName)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.averageRating || 0;
    } catch (error) {
        console.error('Fehler beim Abrufen der durchschnittlichen Bewertung:', error);
        return 0;
    }
}

// Fetch the average rating for a specific user and service type
async function getUserServiceRating(username, serviceTypeName) {
    try {
        const response = await fetch(`${API_URL}/review/average-rating/${encodeURIComponent(username)}/${encodeURIComponent(serviceTypeName)}`);
        if (response.ok) {
            return await response.json();
        }
        return 0;
    } catch (error) {
        console.error('Fehler beim Abrufen der benutzerspezifischen Bewertung:', error);
        return 0;
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
        const response = await fetch(`${API_URL}/ratings/user/by-name/${encodeURIComponent(username)}`);
        if (response.ok) {
            const stats = await response.json();
            
            // Generate rating HTML
            if (stats.averageRating && stats.averageRating > 0) {
                const starsHTML = generateStarHTML(stats.averageRating);
                // Add review count
                container.innerHTML = `${starsHTML.replace('</div>', '')} <span style="color: #666; font-size: 0.9em;">(${stats.totalReviews} ${stats.totalReviews === 1 ? 'Bewertung' : 'Bewertungen'})</span></div>`;
            } else {
                container.innerHTML = '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
            }
        } else {
            container.innerHTML = '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
        }
    } catch (error) {
        console.error('Fehler beim Laden der Bewertung:', error);
        container.innerHTML = '<div class="service-rating"><span style="color: #999;">Bewertung nicht verfügbar</span></div>';
    }
}
