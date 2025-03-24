document.getElementById('marketButton').addEventListener('click', function() {
    window.location.href = 'showOffers.html';
});

let selectedOffers = [];
let selectedDemands = [];
let serviceTypeMap = {}; 
let serviceIdToNameMap = {}; 

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
                offerItem.addEventListener('click', () => toggleServiceSelection(offerItem, typeName, 'offer'));
                offeredServicesList.appendChild(offerItem);
                
                const demandItem = createServiceItem(typeName, typeName);
                demandItem.addEventListener('click', () => toggleServiceSelection(demandItem, typeName, 'demand'));
                demandedServicesList.appendChild(demandItem);
                
                serviceTypeMap[typeName] = typeName;
                serviceIdToNameMap[typeName] = typeName;
            });
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

function loadUserMarkets(username) {
    if (!username || username.trim() === '') return;
    
    resetServiceSelection();
    
    fetch(`http://localhost:8080/d4d/getMarkets/${encodeURIComponent(username)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Märkte");
            }
            return response.json();
        })
        .then(markets => {
            markets.forEach(async market => {
                const serviceTypeId = market.serviceType_ID;
                
                const typeName = await getServiceTypeName(serviceTypeId);
                
                if (market.offer === 1) {
                    selectItemByServiceName(typeName, 'offer');
                } else if (market.offer === 0) {
                    selectItemByServiceName(typeName, 'demand');
                }
            });
        })
        .catch(error => {
            console.error("Fehler beim Laden der Märkte:", error);
            showMessage(`Fehler beim Laden der Märkte für ${username}: ${error.message}`);
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
    item.className = "service-item";
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
    }, 5000);
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
                resetServiceSelection();
                document.getElementById("name").value = "";
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
    if (event.key === "Enter") {
        const username = this.value.trim();
        if (username) {
            loadUserMarkets(username);
        }
    }
});

document.addEventListener("DOMContentLoaded", loadServiceTypes);