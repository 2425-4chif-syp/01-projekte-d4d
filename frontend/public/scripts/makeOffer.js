document.getElementById('marketButton').addEventListener('click', function() {
    window.location.href = 'showOffers.html';
});

// Daten einreichen
document.getElementById("submitButton").onclick = function () {
    const name = document.getElementById("name").value;
    const serviceType = document.getElementById("offeredServiceType").value;
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

    fetch("http://localhost:8080/d4d/createUserIfNotExists", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(name)
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


        fetch("http://localhost:8080/d4d/createMarket", {
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
                    throw new Error("Fehler beim Erstellen des Angebots");
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

function loadServiceTypes() {
    const offeredServiceTypeDropdown = document.getElementById("offeredServiceType");
    const desiredServiceTypeDropdown = document.getElementById("desiredServiceType");
    const url = "http://localhost:8080/d4d/serviceTypes";

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Kategorien");
            }
            return response.text();
        })
        .then(data => {
            const serviceTypes = data.split('|'); // Daten aufteilen
            const defaultOption = '<option value="all" selected>Bitte Auswählen</option>';

            // Standardoptionen hinzufügen
            offeredServiceTypeDropdown.innerHTML = defaultOption;
            desiredServiceTypeDropdown.innerHTML = defaultOption;

            // Optionen aus den Daten hinzufügen
            serviceTypes.forEach(type => {
                const option = document.createElement("option");
                option.value = type;
                option.textContent = type;

                // Zu beiden Dropdowns hinzufügen
                offeredServiceTypeDropdown.appendChild(option.cloneNode(true));
                desiredServiceTypeDropdown.appendChild(option.cloneNode(true));
            });

            // Entferne "Bitte Auswählen", wenn der Benutzer eine Auswahl trifft
            offeredServiceTypeDropdown.addEventListener("change", function () {
                const defaultOption = offeredServiceTypeDropdown.querySelector('option[value="all"]');
                if (defaultOption) {
                    defaultOption.remove();
                }
            });

            desiredServiceTypeDropdown.addEventListener("change", function () {
                const defaultOption = desiredServiceTypeDropdown.querySelector('option[value="all"]');
                if (defaultOption) {
                    defaultOption.remove();
                }
            });
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

document.addEventListener("DOMContentLoaded", loadServiceTypes);

