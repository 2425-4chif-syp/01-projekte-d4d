document.getElementById('marketButton').addEventListener('click', function() {
    window.location.href = 'showOffers.html';
});

let selectedOffers = [];
let selectedDemands = [];
let serviceTypeMap = {}; 
let serviceIdToNameMap = {}; 
let servicesEnabled = false;

function loadServiceTypes() {
    const offeredServicesList = document.getElementById("offeredServicesList");
    const demandedServicesList = document.getElementById("demandedServicesList");
    const url = "http://localhost:8080/d4d/serviceTypes";
    
    offeredServicesList.innerHTML = '';
    demandedServicesList.innerHTML = '';
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Kategorien");
            }
            return response.text();
        })
        .then(data => {
            const serviceTypes = data.split('|').filter(type => type.trim() !== '');
            
            serviceTypes.forEach((typeName) => {
                const offerItem = createServiceItem(typeName, typeName);
                offerItem.addEventListener('click', (e) => {
                    if (servicesEnabled) {
                        toggleServiceSelection(offerItem, typeName, 'offer');
                    } else {
                        e.preventDefault();
                        showMessage("Bitte gib zuerst deinen Namen ein.");
                    }
                });
                offeredServicesList.appendChild(offerItem);
                
                const demandItem = createServiceItem(typeName, typeName);
                demandItem.addEventListener('click', (e) => {
                    if (servicesEnabled) {
                        toggleServiceSelection(demandItem, typeName, 'demand');
                    } else {
                        e.preventDefault();
                        showMessage("Bitte gib zuerst deinen Namen ein.");
                    }
                });
                demandedServicesList.appendChild(demandItem);
                
                serviceTypeMap[typeName] = typeName;
                serviceIdToNameMap[typeName] = typeName;
            });
            
            // Initial alle Service-Items deaktivieren
            disableServiceItems();
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

// Funktion zum Deaktivieren aller Service-Items
function disableServiceItems() {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.add('disabled');
    });
    
    // Deaktiviere auch den Submit-Button
    document.getElementById("submitButton").disabled = true;
    document.getElementById("submitButton").classList.add('button-disabled');
}

// Funktion zum Aktivieren aller Service-Items, mit Option für den Button
function enableServiceItems(enableButton = true) {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('disabled');
    });
    
    // Aktiviere den Submit-Button nur, wenn gewünscht
    if (enableButton) {
        document.getElementById("submitButton").disabled = false;
        document.getElementById("submitButton").classList.remove('button-disabled');
    }
}

function loadUserMarkets(username) {
    if (!username || username.trim() === '') {
        servicesEnabled = false;
        disableServiceItems();
        return;
    }
    
    // Setze den Status auf nicht aktiviert, bis wir wissen, ob es Märkte gibt
    servicesEnabled = false;
    disableServiceItems();
    resetServiceSelection();
    
    fetch(`http://localhost:8080/d4d/getMarkets/${encodeURIComponent(username)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Märkte");
            }
            return response.json();
        })
        .then(markets => {
            // Prüfe, ob Märkte für den Benutzer vorhanden sind
            if (markets && markets.length > 0) {
                // Aktiviere die Service-Items und den Submit-Button
                servicesEnabled = true;
                enableServiceItems(true);
                
                markets.forEach(async market => {
                    const serviceTypeId = market.serviceType_ID;
                    const typeName = await getServiceTypeName(serviceTypeId);
                    
                    if (market.offer === 1) {
                        selectItemByServiceName(typeName, 'offer');
                    } else if (market.offer === 0) {
                        selectItemByServiceName(typeName, 'demand');
                    }
                });
            } else {
                // Keine Märkte gefunden, alles bleibt deaktiviert
                servicesEnabled = false;
                disableServiceItems();
                showMessage("Keine Märkte für diesen Benutzer gefunden.");
            }
        })
        .catch(error => {
            console.error("Fehler beim Laden der Märkte:", error);
            showMessage(`Benutzer ${username} existiert nicht.`);
            // Im Fehlerfall bleibt alles deaktiviert
            servicesEnabled = false;
            disableServiceItems();
        });
}

async function getServiceTypeName(id) {
    if (serviceIdToNameMap[id]) {
        return serviceIdToNameMap[id];
    }
    
    try {
        const response = await fetch(`http://localhost:8080/d4d/serviceType/${id}`);
        if (!response.ok) {
            throw new Error("Fehler beim Abrufen des Servicetyps");
        }
        const typeName = await response.text();
        serviceIdToNameMap[id] = typeName; 
        return typeName;
    } catch (error) {
        console.error(`Fehler beim Abrufen des Servicetyps mit ID ${id}:`, error);
        return `Servicetyp ${id}`;
    }
}

function selectItemByServiceName(serviceName, type) {
    const selector = type === 'offer' ? '#offeredServicesList' : '#demandedServicesList';
    const listItems = document.querySelectorAll(`${selector} .service-item`);
    
    listItems.forEach(item => {
        if (item.dataset.name === serviceName) {
            item.classList.add('selected');
            
            if (type === 'offer') {
                if (!selectedOffers.includes(serviceName)) {
                    selectedOffers.push(serviceName);
                }
            } else {
                if (!selectedDemands.includes(serviceName)) {
                    selectedDemands.push(serviceName);
                }
            }
        }
    });
}

function selectItemByServiceTypeId(serviceTypeId, type) {
    getServiceTypeName(serviceTypeId).then(name => {
        selectItemByServiceName(name, type);
    });
}

function createServiceItem(serviceName, serviceId) {
    const item = document.createElement("div");
    item.className = "service-item disabled"; // Initial deaktiviert
    item.textContent = serviceName;
    item.dataset.id = serviceId;
    item.dataset.name = serviceName; 
    return item;
}

function toggleServiceSelection(element, serviceId, type) {
    element.classList.toggle('selected');
    const serviceName = element.dataset.name;
    
    if (type === 'offer') {
        if (element.classList.contains('selected')) {
            if (!selectedOffers.includes(serviceId)) {
                selectedOffers.push(serviceId);
            }
        } else {
            selectedOffers = selectedOffers.filter(id => id !== serviceId);
        }
    } else if (type === 'demand') {
        if (element.classList.contains('selected')) {
            if (!selectedDemands.includes(serviceId)) {
                selectedDemands.push(serviceId);
            }
        } else {
            selectedDemands = selectedDemands.filter(id => id !== serviceId);
        }
    }
}

function showMessage(message) {
    const responseMessage = document.querySelector('.response-message');
    responseMessage.textContent = message;
    responseMessage.style.display = 'block';
    
    setTimeout(() => {
        responseMessage.style.display = 'none';
    }, 1000);
}

document.getElementById("submitButton").onclick = async function () {
    const username = document.getElementById("name").value;
    if (username.trim() === "") {
        showMessage("Bitte gib deinen Namen ein.");
        return;
    }
    if (selectedOffers.length === 0 && selectedDemands.length === 0) {
        showMessage("Bitte wähle mindestens eine Dienstleistung aus.");
        return;
    }
    
    const offerNames = [];
    const demandNames = [];
    
    for (const id of selectedOffers) {
        const name = await getServiceTypeName(id);
        offerNames.push(name);
    }
    
    for (const id of selectedDemands) {
        const name = await getServiceTypeName(id);
        demandNames.push(name);
    }
    
    const requestData = {
        username: username,
        offers: offerNames,
        demands: demandNames
    };
    
    console.log("Sending data:", requestData);
    
    fetch("http://localhost:8080/d4d/createMultipleMarkets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (response.ok) {
            return response.text().then(msg => {
                showMessage("Angebote und Nachfragen erfolgreich erstellt!");
                return msg;
            });
        } else {
            return response.text().then(errorMsg => {
                throw new Error(errorMsg || "Fehler beim Erstellen der Angebote und Nachfragen");
            });
        }
    })
    .catch(error => {
        showMessage(error.message);
    });
};

function resetServiceSelection() {
    document.querySelectorAll('.service-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    selectedOffers = [];
    selectedDemands = [];
}

document.getElementById("name").addEventListener("keyup", function(event) {
    const username = this.value.trim();
    
    if (event.key === "Enter") {
        if (username) {
            loadUserMarkets(username);
        } else {
            showMessage("Bitte gib einen Namen ein.");
            servicesEnabled = false;
            disableServiceItems();
        }
    }
});

document.addEventListener("DOMContentLoaded", function() {
    loadServiceTypes();
    
    const usernameInput = document.getElementById("name");
    if (!usernameInput.value.trim()) {
        servicesEnabled = false;
        document.getElementById("submitButton").disabled = true;
        document.getElementById("submitButton").classList.add('button-disabled');
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .service-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #f0f0f0;
        }
        
        #submitButton {
            font-size: 1.2em;
            padding: 12px 24px;
            margin-top: 20px;
            width: 100%;
            max-width: 300px;
        }
        
        .button-disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #cccccc !important;
        }
    `;
    document.head.appendChild(style);
});