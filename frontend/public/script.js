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

    if (name.trim() === "" || serviceType === "" || desiredServiceType === "" || description.trim() === "") {
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

    fetch("http://localhost:8080/d4d/user", {
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

// Dienstleistung bearbeiten
function editService(serviceElement) {
    const details = serviceElement.dataset;
    document.getElementById("name").value = details.name;
    document.getElementById("serviceType").value = details.serviceType;
    document.getElementById("desiredServiceType").value = details.desiredServiceType;
    document.getElementById("description").value = details.description;
    document.getElementById("serviceModal").style.display = "block";

    serviceElement.remove();
}

// Dienstleistung löschen
function deleteService(serviceElement) {
    if (confirm("Möchten Sie diese Dienstleistung wirklich löschen?")) {
        serviceElement.remove();
    }
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
