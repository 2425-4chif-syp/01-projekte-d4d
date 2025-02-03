document.getElementById('createOfferButton').addEventListener('click', function () {
    window.location.href = 'makeOffer.html';
});

// Tag-Verwaltung
let selectedTags = new Set();

document.getElementById('detailSearchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const searchTerm = this.value.trim();
        if (searchTerm) {
            addTag(searchTerm);
            this.value = '';
        }
    }
});

function addTag(tag) {
    if (!selectedTags.has(tag)) {
        selectedTags.add(tag);
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            ${tag}
            <button class="tag-remove" onclick="removeTag('${tag}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        document.getElementById('selectedTags').appendChild(tagElement);
        applyFilters();
    }
}

function removeTag(tag) {
    selectedTags.delete(tag);
    const tagElement = document.querySelector(`.tag:has(button[onclick*="${tag}"])`);
    if (tagElement) {
        tagElement.remove();
    }
    applyFilters();
}

function applyFilters() {
    const serviceFilter = document.getElementById('filterService').value;
    showLoading();

    fetch(`http://localhost:8080/d4d/${serviceFilter === 'all' ? 'all' : encodeURIComponent(serviceFilter)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Fehler beim Abrufen der Daten");
            }
            return response.json();
        })
        .then(users => {
            const filteredUsers = users.filter(user => {
                if (selectedTags.size === 0) return true;
                const description = user.description.toLowerCase();
                return Array.from(selectedTags).some(tag => 
                    description.includes(tag.toLowerCase())
                );
            });

            clearLoading();
            if (filteredUsers.length === 0) {
                const messageContainer = document.createElement("div");
                messageContainer.className = "no-results";
                messageContainer.innerHTML = `
                    <p>Keine Ergebnisse gefunden.</p>
                `;
                document.getElementById("serviceList").appendChild(messageContainer);
                return;
            }
            filteredUsers.forEach(user => addUserToList(user.serviceOffer, user.serviceWanted, user.name, user.description));
        })
        .catch(error => {
            console.error("Fehler:", error);
            clearLoading();
            alert("Es gab ein Problem beim Abrufen der Daten.");
        });
}

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

function loadServiceTypesAndOffers() {
    loadServiceTypes();
    loadAllOffers();
}

function loadServiceTypes() {
    const filterService = document.getElementById("filterService");
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
            filterService.innerHTML = '<option value="all">Alle Fächer</option>'; // Standardoption
            serviceTypes.forEach(type => {
                const option = document.createElement("option");
                option.value = type;
                option.textContent = type;
                filterService.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Fehler beim Laden der Kategorien:", error);
        });
}

function loadAllOffers() {
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
}

document.addEventListener("DOMContentLoaded", loadServiceTypesAndOffers);

// Event Listener für die Filterauswahl
document.getElementById("filterService").addEventListener('change', applyFilters);
