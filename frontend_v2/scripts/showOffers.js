document.getElementById('createOfferButton').addEventListener('click', function () {
    window.location.href = 'makeOffer.html';
});

// Tag-Verwaltung
let selectedTags = new Set();

// Event-Listener für "Geschlossene Märkte anzeigen" Checkbox
document.getElementById('showClosedMarkets').addEventListener('change', applyFilters);

// Suchfunktionalität für beide Suchleisten
document.getElementById('nameSearchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        applyFilters(); // Direkte Suche im Namen
    }
});

document.getElementById('detailSearchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const searchTerm = this.value.trim();
        if (searchTerm) {
            addTag(searchTerm);
            this.value = '';
        }
    }
});

// Event-Listener für Datumsfelder
document.getElementById('fromDateInput').addEventListener('change', applyFilters);
document.getElementById('toDateInput').addEventListener('change', applyFilters);

function addTag(tag) {
    if (!selectedTags.has(tag)) {
        selectedTags.add(tag);
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            ${tag}
            <button class="tag-remove" onclick="removeTag('${tag}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        document.getElementById('selectedTags').appendChild(tagElement);
        applyFilters();
    }
}

function removeTag(tag) {
    selectedTags.delete(tag);
    const tagElement = document.querySelector(`.tag:has(button[onclick*="${tag}"])`);
    if (tagElement) {
        tagElement.remove();
    }
    applyFilters();
}

function applyFilters() {
    const nameSearch = document.getElementById('nameSearchInput').value.trim().toLowerCase();
    const selectedServiceType = document.getElementById('filterService').value;
    const fromDate = document.getElementById('fromDateInput').value;
    const toDate = document.getElementById('toDateInput').value;
    const showClosedMarkets = document.getElementById('showClosedMarkets').checked;
    showLoading();

    fetch(`http://localhost:8080/d4d/allmarkets`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(users => {
            const filteredUsers = users.filter(user => {
                // Changed: Show users matching the name search instead of excluding them
                const matchesName = nameSearch === '' || user.userName.toLowerCase().includes(nameSearch);
                const matchesServiceType = selectedServiceType === 'all' || user.serviceTypeName === selectedServiceType;
                
                // Adjusted logic to filter closed markets                
                let matchesDateRange = true;
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
                
                const matchesTags = selectedTags.size === 0 || Array.from(selectedTags).some(tag => 
                    user.serviceTypeName.toLowerCase().includes(tag.toLowerCase())
                );
                
                // Fixed matchesActive logic for markets with end dates before 31.12.2100
                let matchesActive = true;
                
                if (showClosedMarkets) {
                    // When checkbox is checked, ONLY show markets with end dates before 31.12.2100
                    if (user.endDate) {
                        const endDate = new Date(user.endDate);
                        const endLimit = new Date('2100-12-31');
                        matchesActive = endDate < endLimit;
                    } else {
                        // If there's no end date, don't include this market when showing closed markets
                        matchesActive = false;
                    }
                } else {
                    // When checkbox is not checked, only show active markets (no end date or future end date)
                    matchesActive = user.endDate === null || new Date(user.endDate) > new Date();
                }
                
                return matchesName && matchesTags && matchesServiceType && matchesDateRange && matchesActive;
            });

            clearLoading();
            const serviceList = document.getElementById("serviceList");
            serviceList.innerHTML = ''; // Liste leeren vor neuem Rendern
            if (filteredUsers.length === 0) {
                const messageContainer = document.createElement("div");
                messageContainer.className = "no-results";
                messageContainer.innerHTML = `<p>Keine Ergebnisse gefunden.</p>`;
                serviceList.appendChild(messageContainer);
                return;
            }

            // Container für beide Listen mit festgelegter Breite
            const offersContainer = document.createElement("div");
            offersContainer.className = "services-container";
            offersContainer.style.display = "flex";
            offersContainer.style.gap = "20px";
            offersContainer.style.width = "100%"; // Volle Breite nutzen
            offersContainer.style.margin = "0 auto"; // Zentriert den Container
            
            // Container für isOffer = false (Gesuche - links)
            const falseContainer = document.createElement("div");
            falseContainer.className = "services-column false-offers";
            falseContainer.style.flex = "1";
            falseContainer.style.minWidth = "45%"; // Mindestbreite für Gesuche-Container
            
            // Überschrift für isOffer = false
            const falseHeader = document.createElement("h3");
            falseHeader.innerHTML = '<i class="fas fa-hand-holding"></i> Gesuchte Dienste';
            falseHeader.style.marginBottom = "15px";
            falseContainer.appendChild(falseHeader);
            
            // Liste für isOffer = false
            const falseList = document.createElement("ul");
            falseList.className = "service-list";
            falseList.style.padding = "0";
            falseList.style.margin = "0";
            falseList.style.listStyle = "none";
            falseList.style.width = "100%"; // Volle Breite der Spalte
            falseContainer.appendChild(falseList);
            
            // Container für isOffer = true (Angebote - rechts)
            const trueContainer = document.createElement("div");
            trueContainer.className = "services-column true-offers";
            trueContainer.style.flex = "1";
            trueContainer.style.minWidth = "45%"; // Mindestbreite für Angebote-Container
            
            // Überschrift für isOffer = true
            const trueHeader = document.createElement("h3");
            trueHeader.innerHTML = '<i class="fas fa-hands-helping"></i> Angebotene Dienste';
            trueHeader.style.marginBottom = "15px";
            trueContainer.appendChild(trueHeader);
            
            // Liste für isOffer = true
            const trueList = document.createElement("ul");
            trueList.className = "service-list";
            trueList.style.padding = "0";
            trueList.style.margin = "0";
            trueList.style.listStyle = "none";
            trueList.style.width = "100%"; // Volle Breite der Spalte
            trueContainer.appendChild(trueList);
            
            // Sortieren und Hinzufügen der gefilterten Dienste
            filteredUsers.forEach(m => {
                // Element erstellen
                const listItem = createServiceCard(
                    m.serviceTypeName, 
                    "", 
                    m.userName, 
                    m.description || "",
                    m.startDate,
                    m.endDate,
                    m.isOffer
                );
                
                // Zum richtigen Container hinzufügen
                if (m.isOffer) {
                    trueList.appendChild(listItem);
                } else {
                    falseList.appendChild(listItem);
                }
            });
            
            // Container zum Layout hinzufügen
            offersContainer.appendChild(falseContainer);
            offersContainer.appendChild(trueContainer);
            
            // Zum Hauptcontainer hinzufügen
            serviceList.appendChild(offersContainer);
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
            </div>
        </div>
    `;

    serviceList.appendChild(listItem);
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
    loadServiceTypes();
    loadAllOffers();
}

function loadServiceTypes() {
    const filterService = document.getElementById("filterService");
    const url = "http://localhost:8080/d4d/allServiceTypes";

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Kategorien");
            }
            return response.text();
        })
        .then(data => {
            const serviceTypes = data.split('|'); // Daten aufteilen
            filterService.innerHTML = '<option value="all">Alle Fächer</option>'; // Standardoption
            serviceTypes.forEach(type => {
                const option = document.createElement("option");
                option.value = type;
                option.textContent = type;
                filterService.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

function loadAllOffers() {
    const url = `http://localhost:8080/d4d/allmarkets`;

    showLoading();

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(marketDtos => {
            clearLoading();
            if (marketDtos.length === 0) {
                const messageContainer = document.createElement("div");
                messageContainer.className = "no-results";
                messageContainer.innerHTML = `
                    <p><i class="fas fa-search"></i> Keine Angebote gefunden.</p>
                `;
                document.getElementById("serviceList").appendChild(messageContainer);
                return;
            }
            
            // Aufteilung in zwei Listen basierend auf isOffer mit festgelegter Breite
            const offersContainer = document.createElement("div");
            offersContainer.className = "services-container";
            offersContainer.style.display = "flex";
            offersContainer.style.gap = "20px";
            offersContainer.style.maxWidth = "100%"; // Gleiche Breite wie die Suchfelder
            offersContainer.style.margin = "0 auto"; // Zentriert den Container
            
            // Container für isOffer = false (links)
            const falseContainer = document.createElement("div");
            falseContainer.className = "services-column false-offers";
            falseContainer.style.flex = "1";
            
            // Überschrift für isOffer = false
            const falseHeader = document.createElement("h3");
            falseHeader.innerHTML = '<i class="fas fa-hand-holding"></i> Gesuchte Dienste';
            falseHeader.style.marginBottom = "15px";
            falseContainer.appendChild(falseHeader);
            
            // Liste für isOffer = false
            const falseList = document.createElement("ul");
            falseList.className = "service-list";
            falseList.style.padding = "0";
            falseList.style.margin = "0";
            falseList.style.listStyle = "none";
            falseContainer.appendChild(falseList);
            
            // Container für isOffer = true (rechts)
            const trueContainer = document.createElement("div");
            trueContainer.className = "services-column true-offers";
            trueContainer.style.flex = "1";
            
            // Überschrift für isOffer = true
            const trueHeader = document.createElement("h3");
            trueHeader.innerHTML = '<i class="fas fa-hands-helping"></i> Angebotene Dienste';
            trueHeader.style.marginBottom = "15px";
            trueContainer.appendChild(trueHeader);
            
            // Liste für isOffer = true
            const trueList = document.createElement("ul");
            trueList.className = "service-list";
            trueList.style.padding = "0";
            trueList.style.margin = "0";
            trueList.style.listStyle = "none";
            trueContainer.appendChild(trueList);
            
            // Sortieren und Hinzufügen der Dienste
            marketDtos.forEach(m => {
                // Element erstellen
                const listItem = createServiceCard(
                    m.serviceTypeName, 
                    "", 
                    m.userName, 
                    m.description || "",
                    m.startDate,
                    m.endDate,
                    m.isOffer
                );
                
                // Zum richtigen Container hinzufügen
                if (m.isOffer) {
                    trueList.appendChild(listItem);
                } else {
                    falseList.appendChild(listItem);
                }
            });
            
            // Container zum Layout hinzufügen
            offersContainer.appendChild(falseContainer);
            offersContainer.appendChild(trueContainer);
            
            // Zum Hauptcontainer hinzufügen
            const serviceList = document.getElementById("serviceList");
            serviceList.appendChild(offersContainer);
        })
        .catch(error => {
            console.error("Fehler:", error);
            clearLoading();
            alert("Es gab ein Problem beim Abrufen der Daten.");
        });
}

function createServiceCard(serviceOffer, serviceWanted, name, description, startdate, enddate, isOffer) {
    const listItem = document.createElement("li");
    listItem.className = "service-item";

    // Format dates for display
    let dateRange = 'Zeitraum nicht angegeben';
    
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

    listItem.innerHTML = `
        <div class="card ${cardClassName}" style="height: auto; min-height: 200px;">
            <div class="card-header">
                <h3 style="margin: 0 0 8px 0; font-size: 1rem; color: #333;">${serviceOffer}</h3>
                <p style="margin: 0; font-size: 0.85rem; color: #666;">${dateRange}</p>
                <span class="badge">${badgeText}</span>
            </div>
            <div class="card-body">
                <p style="margin: 0 0 4px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 0;"><strong>Beschreibung: </strong> ${description}</p>
            </div>
        </div>
    `;

    return listItem;
}

document.addEventListener("DOMContentLoaded", loadServiceTypesAndOffers);

// Event Listener für die Filterauswahl
document.getElementById("filterService").addEventListener('change', applyFilters);
