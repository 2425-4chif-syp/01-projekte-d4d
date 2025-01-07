document.getElementById('createOfferButton').addEventListener('click', function () {
    window.location.href = 'makeOffer.html';
});

function addUserToList(serviceOffer, serviceWanted, name, description) {
    const serviceList = document.getElementById("serviceList");

    const listItem = document.createElement("li");
    listItem.className = "service-item";

    listItem.innerHTML = `
        <div class="card">
            <div class="card-header">
                <span class="badge">${serviceOffer} ➝ ${serviceWanted}</span>
            </div>
            <div class="card-body">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Beschreibung:</strong> ${description}</p>
            </div>
        </div>
    `;

    serviceList.appendChild(listItem);
}


function showLoading(message = "Laden...") {
    const serviceList = document.getElementById("serviceList");
    serviceList.innerHTML = `<li class="loading">${message}</li>`;
}

function clearLoading() {
    const serviceList = document.getElementById("serviceList");
    serviceList.innerHTML = "";
}

document.getElementById("applyFilter").onclick = function () {
    const filterValue = document.getElementById("filterService").value.trim();

    if (!filterValue) {
        alert("Bitte geben Sie einen Filterwert ein.");
        return;
    }

    const url = `http://localhost:8080/d4d/${encodeURIComponent(filterValue)}`;

    showLoading();

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(users => {
            clearLoading();
            if (users.length === 0) {
                const messageContainer = document.createElement("div");
                messageContainer.className = "no-results";
                messageContainer.innerHTML = `
                    <p>Es wurden keine gefunden.</p>
                `;
                document.getElementById("serviceList").appendChild(messageContainer);
                return;
            }
            users.forEach(user => addUserToList(user.serviceOffer, user.serviceWanted, user.name, user.description));
        })
        .catch(error => {
            console.error("Fehler:", error);
            clearLoading();
            alert("Es gab ein Problem beim Abrufen der Daten.");
        });
};

document.getElementById("clearFilter").onclick = function () {
    const url = `http://localhost:8080/d4d/all`;

    showLoading();

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(users => {
            clearLoading();
            if (users.length === 0) {
                const messageContainer = document.createElement("div");
                messageContainer.className = "no-results";
                messageContainer.innerHTML = `
                    <p>Es wurden keine gefunden.</p>
                `;
                document.getElementById("serviceList").appendChild(messageContainer);
                return;
            }
            users.forEach(user => addUserToList(user.serviceOffer, user.serviceWanted, user.name, user.description));
        })
        .catch(error => {
            console.error("Fehler:", error);
            clearLoading();
            alert("Es gab ein Problem beim Abrufen der Daten.");
        });
};
