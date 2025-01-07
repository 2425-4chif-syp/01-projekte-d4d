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
                responseMessage.textContent = "Dienstleistungsart erfolgreich hinzugefügt!";
                responseMessage.className = "response-message success";
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

document.getElementById("logoutButton").addEventListener("click", function () {
    window.location.href = "adminLogin.html";
});
