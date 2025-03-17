document.getElementById('marketButton').addEventListener('click', function() {
    window.location.href = 'showOffers.html';
});

// Globale Variablen für die ausgewählten Dienstleistungen
let selectedOffers = [];
let selectedDemands = [];

// Laden der Dienstleistungsarten und Erstellen der Auswahlfelder
function loadServiceTypes() {
    const offeredServicesList = document.getElementById("offeredServicesList");
    const demandedServicesList = document.getElementById("demandedServicesList");
    const url = "http://localhost:8080/d4d/serviceTypes";

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Kategorien");
            }
            return response.text();
        })
        .then(data => {
            const serviceTypes = data.split('|').filter(type => type.trim() !== ''); // Daten aufteilen und leere Einträge filtern
            
            // Dienstleistungen für beide Listen erstellen
            serviceTypes.forEach(type => {
                // Für Angebotsseite
                const offerItem = createServiceItem(type);
                offerItem.addEventListener('click', () => toggleServiceSelection(offerItem, type, 'offer'));
                offeredServicesList.appendChild(offerItem);
                
                // Für Nachfrageseite
                const demandItem = createServiceItem(type);
                demandItem.addEventListener('click', () => toggleServiceSelection(demandItem, type, 'demand'));
                demandedServicesList.appendChild(demandItem);
            });
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

// Erstellt ein Dienstleistungs-Element
function createServiceItem(serviceName) {
    const item = document.createElement("div");
    item.className = "service-item";
    item.textContent = serviceName;
    return item;
}

// Umschalten der Auswahl einer Dienstleistung
function toggleServiceSelection(element, serviceName, type) {
    element.classList.toggle('selected');
    
    if (type === 'offer') {
        if (element.classList.contains('selected')) {
            // Hinzufügen zur Angebotsliste
            selectedOffers.push(serviceName);
        } else {
            // Entfernen aus der Angebotsliste
            selectedOffers = selectedOffers.filter(name => name !== serviceName);
        }
    } else if (type === 'demand') {
        if (element.classList.contains('selected')) {
            // Hinzufügen zur Nachfrageliste
            selectedDemands.push(serviceName);
        } else {
            // Entfernen aus der Nachfrageliste
            selectedDemands = selectedDemands.filter(name => name !== serviceName);
        }
    }
}

// Funktion zum Anzeigen einer Nachricht
function showMessage(message, isSuccess = true) {
    const responseMessage = document.querySelector('.response-message');
    responseMessage.textContent = message;
    responseMessage.classList.add(isSuccess ? 'success' : 'error');
    responseMessage.style.display = 'block';
    
    // Nachricht nach einiger Zeit ausblenden
    setTimeout(() => {
        responseMessage.style.display = 'none';
        responseMessage.classList.remove(isSuccess ? 'success' : 'error');
    }, 5000);
}

// Event-Listener für den Einreich-Button
document.getElementById("submitButton").onclick = function () {
    const username = document.getElementById("name").value;

    // Validierung
    if (username.trim() === "") {
        showMessage("Bitte gib deinen Namen ein.", false);
        return;
    }

    if (selectedOffers.length === 0 && selectedDemands.length === 0) {
        showMessage("Bitte wähle mindestens eine Dienstleistung aus.", false);
        return;
    }

    // Daten als JSON-Objekt vorbereiten
    const userData = {
        username: username,
        offers: selectedOffers,
        demands: selectedDemands
    };

    // POST-Request senden
    fetch("http://localhost:8080/d4d/createMultipleMarkets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (response.ok) {
            return response.text().then(msg => {
                showMessage("Angebote und Nachfragen erfolgreich erstellt!");
                // Formular zurücksetzen
                document.getElementById("name").value = "";
                resetServiceSelection();
                return msg;
            });
        } else {
            return response.text().then(errorMsg => {
                throw new Error(errorMsg || "Fehler beim Erstellen der Angebote und Nachfragen");
            });
        }
    })
    .catch(error => {
        showMessage(error.message, false);
    });
};

// Zurücksetzen der Dienstleistungsauswahl
function resetServiceSelection() {
    // Alle ausgewählten Elemente zurücksetzen
    document.querySelectorAll('.service-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Listen leeren
    selectedOffers = [];
    selectedDemands = [];
}

// Namen-Eingabefeld: Einreichung mit Enter-Taste
document.getElementById("name").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        document.getElementById("submitButton").click();
    }
});

// Initialisierung beim Laden der Seite
document.addEventListener("DOMContentLoaded", loadServiceTypes);

