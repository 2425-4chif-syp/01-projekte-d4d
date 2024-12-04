// Öffnet das Modal zum Anbieten einer Dienstleistung
document.getElementById("serviceButton").onclick = function() {
    resetFormFields();
    document.getElementById("serviceModal").style.display = "block";
};

// Funktion zum Zurücksetzen der Formularfelder
function resetFormFields() {
    document.getElementById("name").value = "";
    document.getElementById("serviceType").value = "";
    document.getElementById("desiredServiceType").value = "";
    document.getElementById("description").value = "";
    document.getElementById("charCount").textContent = "0/250 Zeichen";
}

// Daten einreichen
document.getElementById("submitButton").onclick = function() {
    const name = document.getElementById("name").value;
    const serviceType = document.getElementById("serviceType").value;
    const desiredServiceType = document.getElementById("desiredServiceType").value;
    const description = document.getElementById("description").value;

    if (name.trim() === "" || description.trim() === "") {
        alert("Bitte fülle alle Felder aus.");
        return;
    }

    // Daten als JSON-Objekt vorbereiten
    const userData = {
        name: name,
        serviceOffer: serviceType,
        serviceWanted: desiredServiceType,
        description: description
    };

    fetch("http://localhost:8080/d4d/service", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (response.ok) {
            return response.text();
        } else {
            throw new Error("Fehler beim Erstellen des Benutzers");
        }
    })
    .then(message => {
        alert(message);
        addUserToList(userData.serviceOffer, userData.serviceWanted, userData.name, userData.description);
        document.getElementById("serviceModal").style.display = "none";
    })
    .catch(error => {
        alert(error.message);
    });
};

// Filterfunktion: Holt die gefilterten Dienstleistungen vom Backend
document.getElementById("applyFilter").onclick = function() {
    const filterValue = document.getElementById("filterService").value;

    const url = `http://localhost:8080/d4d/${encodeURIComponent(filterValue)}`;

    // Abrufen der Daten von der API
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(users => {
            // Bestehende Dienstleistungsliste leeren
            document.getElementById("serviceList").innerHTML = "";
            users.forEach(user => addUserToList(user.serviceOffer, user.serviceWanted, user.name, user.description));
        })
        .catch(error => {
            console.error("Fehler:", error);
            alert("Es gab ein Problem beim Abrufen der Daten.");
        });
};

// Filter zurücksetzen und Angebote ausblenden
document.getElementById("clearFilter").onclick = function() {

    const url = `http://localhost:8080/d4d/${encodeURIComponent("all")}`;

    // Abrufen der Daten von der API
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(users => {
            // Bestehende Dienstleistungsliste leeren
            document.getElementById("serviceList").innerHTML = "";
            users.forEach(user => addUserToList(user.serviceOffer, user.serviceWanted, user.name, user.description));
        })
        .catch(error => {
            console.error("Fehler:", error);
            alert("Es gab ein Problem beim Abrufen der Daten.");
        });
};

// Dienstleistung zur Liste hinzufügen
function addUserToList(serviceType, desiredServiceType, name, description) {
    const li = document.createElement("li");
    li.classList.add("service-item", serviceType.toLowerCase());
    
    // Container für Text und Button
    const textContainer = document.createElement("span");
    textContainer.classList.add("service-text");
    textContainer.textContent = `${name} - ${serviceType} --- Gegentausch: ${desiredServiceType}`;

    // Elemente anordnen
    li.appendChild(textContainer);

    document.getElementById("serviceList").appendChild(li);
}

// Schließen des Hauptmodals (serviceModal) über den Schließen-Button
document.getElementById("closeButton").onclick = function() {
    document.getElementById("serviceModal").style.display = "none";
};

// Schließen des Detailmodals (serviceModalDetails) über den Schließen-Button
document.getElementById("closeDetailsButton").onclick = function() {
    document.getElementById("serviceModalDetails").style.display = "none";
};

// Schließen des Modals durch Klick außerhalb des Modals
window.onclick = function(event) {
    const serviceModal = document.getElementById("serviceModal");
    const serviceModalDetails = document.getElementById("serviceModalDetails");

    if (event.target === serviceModal) {
        serviceModal.style.display = "none";
    }
    if (event.target === serviceModalDetails) {
        serviceModalDetails.style.display = "none";
    }
};

// Zeichenanzahl im Beschreibungsfeld überwachen
const descriptionField = document.getElementById("description");
const charCount = document.getElementById("charCount");
const maxChars = 250;

descriptionField.addEventListener("input", () => {
    const currentLength = descriptionField.value.length;
    charCount.textContent = `${currentLength}/${maxChars} Zeichen`;

    if (currentLength > maxChars) {
        charCount.style.color = "red";
        descriptionField.style.borderColor = "red";
    } else {
        charCount.style.color = "#757575";
        descriptionField.style.borderColor = "#00796b";
    }
});

