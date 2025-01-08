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
                const li = document.createElement("li");
                li.textContent = serviceType.trim();
                serviceTypeList.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Fehler beim Abrufen der Service-Typen:", error);
        });
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