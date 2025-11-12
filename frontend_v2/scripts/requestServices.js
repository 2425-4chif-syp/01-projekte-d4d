import { API_URL } from './config.js';
import { sessionManager } from './session-manager.js';

let selectedDemands = [];
let serviceTypeMap = {};

document.addEventListener("DOMContentLoaded", async function() {
    await sessionManager.init();
    await loadServiceTypes();
    await checkUserStatus();
});

async function checkUserStatus() {
    try {
        const response = await fetch(`${API_URL}/user`, {
            credentials: 'include'
        });
        if (response.ok) {
            const username = await response.text();
            if (username && username.trim() !== '' && username !== 'Gast-Modus') {
                // Logged in: load user's demands
                await loadUserDemands(username);
                return;
            }
        }
    } catch (error) {
        console.error('Fehler beim Prüfen des User-Status:', error);
    }
    
    // Guest mode: load from session
    await loadSessionDemands();
}

async function loadServiceTypes() {
    try {
        const response = await fetch(`${API_URL}/servicetype`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error("Fehler beim Laden der Kategorien");
        
        const serviceTypes = await response.json();
        const container = document.getElementById("demandedServicesList");
        container.innerHTML = '';
        
        serviceTypes.forEach(serviceType => {
            const item = createServiceItem(serviceType.name, serviceType.id);
            item.addEventListener('click', () => toggleService(item, serviceType.id));
            container.appendChild(item);
            serviceTypeMap[serviceType.id] = serviceType.name;
        });
    } catch (error) {
        console.error("Fehler beim Laden der Kategorien:", error);
        showNotification('Fehler beim Laden der Fächer', 'error');
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
    
    element.classList.toggle('selected', checkbox.checked);
    
    if (checkbox.checked) {
        if (!selectedDemands.includes(serviceId)) {
            selectedDemands.push(serviceId);
        }
    } else {
        selectedDemands = selectedDemands.filter(id => id !== serviceId);
    }
}

async function loadUserDemands(username) {
    try {
        const response = await fetch(`${API_URL}/market/${encodeURIComponent(username)}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error("Fehler beim Laden der Märkte");
        
        const markets = await response.json();
        markets.forEach(market => {
            if (market.offer === 0) {
                const serviceId = market.serviceType.id;
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
                console.log('📥 Lade gespeicherte Demands:', sessionManager.demands);
                
                sessionManager.demands.forEach(serviceId => {
                    selectService(parseInt(serviceId));
                });
            }
        } catch (error) {
            console.error("Fehler beim Laden der Session-Daten:", error);
        }
    }
}

function selectService(serviceId) {
    const items = document.querySelectorAll('.service-checkbox');
    items.forEach(item => {
        if (parseInt(item.dataset.id) === serviceId) {
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.checked = true;
            item.classList.add('selected');
            if (!selectedDemands.includes(serviceId)) {
                selectedDemands.push(serviceId);
            }
        }
    });
}

document.getElementById("submitButton").addEventListener('click', async function() {
    if (selectedDemands.length === 0) {
        showNotification("Bitte wähle mindestens ein Fach aus", 'error');
        return;
    }
    
    const submitButton = document.getElementById("submitButton");
    submitButton.disabled = true;
    submitButton.classList.add('button-loading');
    
    try {
        const response = await fetch(`${API_URL}/user`, {
            credentials: 'include'
        });
        const username = response.ok ? await response.text() : '';
        const isLoggedIn = username && username.trim() !== '' && username !== 'Gast-Modus';
        
        if (!isLoggedIn) {
            // Guest: save to session
            const demandIds = selectedDemands.map(id => parseInt(id));
            
            // Lade aktuelle Session um existierende offers zu behalten
            await sessionManager.loadSession();
            const existingOffers = sessionManager.offers || [];
            
            // Speichere demands und behalte existierende offers
            await sessionManager.saveServices(existingOffers, demandIds);
            
            submitButton.classList.remove('button-loading');
            submitButton.classList.add('button-success');
            showNotification('✓ Nachfragen gespeichert! Zeige Matches...', 'success');
            
            setTimeout(() => {
                window.location.href = 'showUserServices.html';
            }, 1000);
            
        } else {
            // Logged in: save to database
            const demandNames = selectedDemands.map(id => serviceTypeMap[id]);
            
            const requestData = {
                username: username,
                offers: [],
                demands: demandNames
            };
            
            const saveResponse = await fetch(`${API_URL}/market`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });
            
            if (saveResponse.ok) {
                submitButton.classList.remove('button-loading');
                submitButton.classList.add('button-success');
                showNotification('✓ Nachfragen gespeichert! Zeige Matches...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'showUserServices.html';
                }, 1000);
            } else {
                throw new Error("Fehler beim Speichern");
            }
        }
    } catch (error) {
        submitButton.classList.remove('button-loading');
        submitButton.disabled = false;
        showNotification(error.message, 'error');
    }
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
