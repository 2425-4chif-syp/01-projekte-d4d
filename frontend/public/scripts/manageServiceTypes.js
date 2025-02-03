function fetchServiceTypes() {
    fetch("http://localhost:8080/d4d/serviceTypes")
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.text(); 
        })
        .then(serviceTypesText => {
            console.log("Service Types Text:", serviceTypesText); 
            const serviceTypeList = document.getElementById("serviceTypeList");
            serviceTypeList.innerHTML = "";
            const serviceTypes = serviceTypesText.split("|");
            serviceTypes.forEach(serviceType => {
                if (serviceType.trim()) {
                    const li = document.createElement("li");
                    const serviceTypeSpan = document.createElement("span");
                    serviceTypeSpan.textContent = serviceType.trim();
                    
                    const deleteButton = document.createElement("button");
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteButton.className = "delete-button";
                    deleteButton.onclick = () => deleteServiceType(serviceType.trim());
                    
                    li.appendChild(serviceTypeSpan);
                    li.appendChild(deleteButton);
                    serviceTypeList.appendChild(li);
                }
            });
        })
        .catch(error => {
            console.error("Fehler beim Abrufen der Service-Typen:", error);
        });
}

function deleteServiceType(serviceType) {
    if (confirm(`Möchten Sie wirklich die Dienstleistungsart "${serviceType}" löschen?`)) {
        fetch(`http://localhost:8080/d4d/serviceType/${encodeURIComponent(serviceType)}`, {
            method: "PUT"
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Löschen der Dienstleistungsart");
            }
            return response.text();
        })
        .then(message => {
            const responseMessage = document.getElementById("responseMessage");
            responseMessage.textContent = "Dienstleistungsart erfolgreich gelöscht";
            responseMessage.className = "response-message success";
            responseMessage.style.display = "block";
            fetchServiceTypes(); // Refresh the list
        })
        .catch(error => {
            console.error("Fehler:", error);
            const responseMessage = document.getElementById("responseMessage");
            responseMessage.textContent = "Fehler beim Löschen der Dienstleistungsart";
            responseMessage.className = "response-message error";
            responseMessage.style.display = "block";
        });
    }
}

document.getElementById("addServiceTypeButton").addEventListener("click", function () {
    const newServiceType = document.getElementById("newServiceType").value.trim();
    const responseMessage = document.getElementById("responseMessage");

    if (!newServiceType) {
        responseMessage.textContent = "Bitte gib eine Dienstleistungsart ein.";
        responseMessage.className = "response-message error";
        responseMessage.style.display = "block";
        return;
    }

    fetch("http://localhost:8080/d4d/serviceType", {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
        },
        body: newServiceType,
    })
        .then(response => {
            if (response.ok) {
                fetchServiceTypes();

                document.getElementById("newServiceType").value = "";
            } else {
                responseMessage.textContent = "Fehler beim Hinzufügen der Dienstleistungsart.";
                responseMessage.className = "response-message error";
            }
            responseMessage.style.display = "block";
        })
        .catch(error => {
            console.error("Fehler:", error);
            responseMessage.textContent = "Ein unerwarteter Fehler ist aufgetreten.";
            responseMessage.className = "response-message error";
            responseMessage.style.display = "block";
        });
});

document.addEventListener("DOMContentLoaded", fetchServiceTypes);