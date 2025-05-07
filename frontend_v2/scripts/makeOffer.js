document.getElementById('marketButton').addEventListener('click', function() {
    window.location.href = 'showOffers.html';
});

let selectedOffers = [];
let selectedDemands = [];
let serviceTypeMap = {}; 
let serviceIdToNameMap = {}; 
let servicesEnabled = false;

document.addEventListener("DOMContentLoaded", function() {
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
    fetch("http://localhost:8080/user")
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
                    servicesEnabled = false;
                    disableServiceItems();
                    showMessage("Bitte melde dich an, um Dienstleistungen anzubieten oder nachzufragen.");
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
                        servicesEnabled = false;
                        disableServiceItems();
                        showMessage("Bitte melde dich an, um Dienstleistungen anzubieten oder nachzufragen.");
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
            
            servicesEnabled = false;
            disableServiceItems();
            showMessage("Fehler beim Laden des aktiven Benutzers. Bitte versuche es später erneut.");
        });
}

function setActiveUser(username) {
    fetch("http://localhost:8080/user", {
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
    const url = "http://localhost:8080/servicetype";
    
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
    
    fetch(`http://localhost:8080/market/${encodeURIComponent(username)}`)
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

function getServiceTypeName(id) {
    return serviceIdToNameMap[id] || `Servicetyp ${id}`;
}

function selectItemByServiceName(serviceName, type) {
    const selector = type === 'offer' ? '#offeredServicesList' : '#demandedServicesList';
    const listItems = document.querySelectorAll(`${selector} .service-item`);
    
    listItems.forEach(item => {
        if (item.dataset.name === serviceName) {
            item.classList.add('selected');
            
            if (type === 'offer') {
                if (!selectedOffers.includes(item.dataset.id)) {
                    selectedOffers.push(item.dataset.id);
                }
            } else {
                if (!selectedDemands.includes(item.dataset.id)) {
                    selectedDemands.push(item.dataset.id);
                }
            }
        }
    });
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

document.getElementById("submitButton").onclick = function () {
    const username = document.getElementById("activeUserDisplay").textContent;
    if (username === "Nicht angemeldet") {
        showMessage("Bitte melde dich an, um Dienstleistungen anzubieten oder nachzufragen.");
        return;
    }
    
    if (selectedOffers.length === 0 && selectedDemands.length === 0) {
        showMessage("Bitte wähle mindestens eine Dienstleistung aus.");
        return;
    }
    
    const offerNames = selectedOffers.map(id => serviceTypeMap[id]);
    const demandNames = selectedDemands.map(id => serviceTypeMap[id]);
    
    const requestData = {
        username: username,
        offers: offerNames,
        demands: demandNames
    };
    
    console.log("Sending data:", requestData);
    
    fetch("http://localhost:8080/market", {
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