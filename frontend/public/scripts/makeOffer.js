document.getElementById('marketButton').addEventListener('click', function() {
    window.location.href = 'showOffers.html';
});

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
        })
        .catch(error => {
            alert(error.message);
        });
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