import { API_URL } from './config.js';
import { sessionManager } from './session-manager.js';

document.getElementById('marketButton').addEventListener('click', function() {
    window.location.href = 'showOffers.html';
});

let selectedOffers = [];
let selectedDemands = [];
let serviceTypeMap = {}; 
let serviceIdToNameMap = {}; 
let servicesEnabled = false;

document.addEventListener("DOMContentLoaded", function() {
    sessionManager.init(); // Initialize session for anonymous users
    getActiveUser();

    const navUsernameInput = document.getElementById("navUsername");
    if (navUsernameInput) {
        navUsernameInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                const username = this.value.trim();
                if (username) {
                    setActiveUser(username);
                } else {
                    showMessage("Bitte gib einen Benutzernamen ein.");
                }
            }
        });
    }
});

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
                
                if (username && username !== "Nicht angemeldet") {
                    loadUserMarkets(username);
                } else {
                    // Anonymous user mode: enable services and load session data if exists
                    servicesEnabled = true;
                    enableServiceItems(true);
                    loadSessionData();
                }
            } catch (e) {
                const username = responseText && responseText.trim() !== "" ? responseText : "Nicht angemeldet";
                
                const activeUserDisplay = document.getElementById("activeUserDisplay");
                if (activeUserDisplay) {
                    activeUserDisplay.textContent = username !== "" ? username : "Nicht angemeldet";
                    if (username !== "") {
                        activeUserDisplay.classList.add("user-active");
                        loadUserMarkets(username);
                    } else {
                        activeUserDisplay.classList.remove("user-active");
                        // Anonymous user mode: enable services and load session data
                        servicesEnabled = true;
                        enableServiceItems(true);
                        loadSessionData();
                    }
                }
            }
        })
        .catch(error => {
            console.error("Fehler beim Abrufen des aktiven Benutzers:", error);
            const activeUserDisplay = document.getElementById("activeUserDisplay");
            if (activeUserDisplay) {
                activeUserDisplay.textContent = "Nicht angemeldet";
                activeUserDisplay.classList.remove("user-active");
            }
            
            servicesEnabled = true;
            enableServiceItems(true);
            loadSessionData();
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
                
                loadUserMarkets(username);
                
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

function loadServiceTypes() {
    const offeredServicesList = document.getElementById("offeredServicesList");
    const demandedServicesList = document.getElementById("demandedServicesList");
    const url = `${API_URL}/servicetype`;
    
    offeredServicesList.innerHTML = '';
    demandedServicesList.innerHTML = '';
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Kategorien");
            }
            return response.json();
        })
        .then(serviceTypes => {
            serviceTypes.forEach((serviceType) => {
                const typeName = serviceType.name;
                const typeId = serviceType.id;
                
                const offerItem = createServiceItem(typeName, typeId);
                offerItem.addEventListener('click', (e) => {
                    if (servicesEnabled) {
                        toggleServiceSelection(offerItem, typeId, 'offer');
                    } else {
                        e.preventDefault();
                        showMessage("Bitte gib zuerst deinen Namen ein.");
                    }
                });
                offeredServicesList.appendChild(offerItem);
                
                const demandItem = createServiceItem(typeName, typeId);
                demandItem.addEventListener('click', (e) => {
                    if (servicesEnabled) {
                        toggleServiceSelection(demandItem, typeId, 'demand');
                    } else {
                        e.preventDefault();
                        showMessage("Bitte gib zuerst deinen Namen ein.");
                    }
                });
                demandedServicesList.appendChild(demandItem);
                
                serviceTypeMap[typeId] = typeName;
                serviceIdToNameMap[typeId] = typeName;
            });
            
            disableServiceItems();
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

function disableServiceItems() {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.add('disabled');
    });
    
    document.getElementById("submitButton").disabled = true;
    document.getElementById("submitButton").classList.add('button-disabled');
}

function enableServiceItems(enableButton = true) {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('disabled');
    });
    
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
    
    servicesEnabled = false;
    disableServiceItems();
    resetServiceSelection();
    
    fetch(`${API_URL}/market/${encodeURIComponent(username)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Märkte");
            }
            return response.json();
        })
        .then(markets => {
            if (markets && markets.length > 0) {
                servicesEnabled = true;
                enableServiceItems(true);
                
                markets.forEach(market => {
                    const serviceTypeId = market.serviceType.id;
                    const typeName = market.serviceType.name;
                    
                    serviceIdToNameMap[serviceTypeId] = typeName;
                    
                    if (market.offer === 1) {
                        selectItemByServiceId(serviceTypeId, 'offer');
                    } else if (market.offer === 0) {
                        selectItemByServiceId(serviceTypeId, 'demand');
                    }
                });
            } else {
                servicesEnabled = true;
                enableServiceItems(true);
                showMessage("Noch keine Dienstleistungen vorhanden. Wähle die gewünschten Dienstleistungen aus.");
            }
        })
        .catch(error => {
            console.error("Fehler beim Laden der Märkte:", error);
            showMessage(`Benutzer ${username} existiert nicht oder es gab einen Fehler beim Laden der Märkte.`);
            servicesEnabled = false;
            disableServiceItems();
        });
}

// Load saved session data for anonymous users
async function loadSessionData() {
    if (sessionManager.sessionId) {
        try {
            const sessionData = await sessionManager.getSession();
            if (sessionData && sessionData.serviceTypes) {
                // Restore selections from session
                sessionData.serviceTypes.forEach(st => {
                    const serviceTypeId = st.serviceType.id;
                    if (st.isOffer) {
                        selectItemByServiceId(serviceTypeId, 'offer');
                    } else {
                        selectItemByServiceId(serviceTypeId, 'demand');
                    }
                });
            }
        } catch (error) {
            console.error("Fehler beim Laden der Session-Daten:", error);
        }
    }
}

function selectItemByServiceId(serviceTypeId, type) {
    const selector = type === 'offer' ? '#offeredServicesList' : '#demandedServicesList';
    const listItems = document.querySelectorAll(`${selector} .service-item`);
    
    listItems.forEach(item => {
        if (item.dataset.id == serviceTypeId) {
            item.classList.add('selected');
            
            if (type === 'offer') {
                if (!selectedOffers.includes(serviceTypeId.toString())) {
                    selectedOffers.push(serviceTypeId.toString());
                }
            } else {
                if (!selectedDemands.includes(serviceTypeId.toString())) {
                    selectedDemands.push(serviceTypeId.toString());
                }
            }
        }
    });
}

function createServiceItem(serviceName, serviceId) {
    const item = document.createElement("div");
    item.className = "service-item disabled";
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
            if (!selectedOffers.includes(serviceId.toString())) {
                selectedOffers.push(serviceId.toString());
            }
        } else {
            selectedOffers = selectedOffers.filter(id => id !== serviceId.toString());
        }
    } else if (type === 'demand') {
        if (element.classList.contains('selected')) {
            if (!selectedDemands.includes(serviceId.toString())) {
                selectedDemands.push(serviceId.toString());
            }
        } else {
            selectedDemands = selectedDemands.filter(id => id !== serviceId.toString());
        }
    }
}

function showMessage(message) {
    const responseMessage = document.querySelector('.response-message');
    responseMessage.textContent = message;
    responseMessage.style.display = 'block';
    
    setTimeout(() => {
        responseMessage.style.display = 'none';
    }, 3000);
}

document.getElementById("submitButton").onclick = async function () {
    const username = document.getElementById("activeUserDisplay").textContent;
    const isLoggedIn = username !== "Nicht angemeldet";
    
    if (selectedOffers.length === 0 && selectedDemands.length === 0) {
        showMessage("Bitte wähle mindestens eine Dienstleistung aus.");
        return;
    }
    
    const submitButton = document.getElementById("submitButton");
    submitButton.disabled = true;
    submitButton.classList.add('button-loading');
    
    try {
        if (!isLoggedIn) {
            // Anonymous user: save to session
            const services = [];
            
            selectedOffers.forEach(id => {
                services.push({
                    serviceTypeId: parseInt(id),
                    isOffer: true
                });
            });
            
            selectedDemands.forEach(id => {
                services.push({
                    serviceTypeId: parseInt(id),
                    isOffer: false
                });
            });
            
            await sessionManager.saveServices(services);
            
            submitButton.classList.remove('button-loading');
            submitButton.classList.add('button-success');
            showMessage("✓ Auswahl gespeichert! Melde dich an, um deine Angebote zu veröffentlichen.");
            
            setTimeout(() => {
                submitButton.classList.remove('button-success');
                submitButton.disabled = false;
            }, 2000);
            
        } else {
            // Logged in user: save directly to database
            const offerNames = selectedOffers.map(id => serviceTypeMap[id]);
            const demandNames = selectedDemands.map(id => serviceTypeMap[id]);
            
            const requestData = {
                username: username,
                offers: offerNames,
                demands: demandNames
            };
            
            console.log("Sending data:", requestData);
            
            const response = await fetch(`${API_URL}/market`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });
            
            if (response.ok) {
                submitButton.classList.remove('button-loading');
                submitButton.classList.add('button-success');
                showMessage("✓ Angebote und Nachfragen erfolgreich erstellt!");
                
                setTimeout(() => {
                    submitButton.classList.remove('button-success');
                    submitButton.disabled = false;
                }, 2000);
            } else {
                const errorMsg = await response.text();
                throw new Error(errorMsg || "Fehler beim Erstellen der Angebote und Nachfragen");
            }
        }
    } catch (error) {
        submitButton.classList.remove('button-loading');
        submitButton.disabled = false;
        showMessage(error.message);
    }
};

function resetServiceSelection() {
    document.querySelectorAll('.service-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    selectedOffers = [];
    selectedDemands = [];
}

document.addEventListener("DOMContentLoaded", function() {
    loadServiceTypes();
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
        
        .user-active {
            color: #38a169 !important;
        }
    `;
    document.head.appendChild(style);
});