// Daten einreichen
document.getElementById("submitButton").onclick = function () {
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