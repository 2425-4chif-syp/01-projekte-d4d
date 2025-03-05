document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const userServiceResults = document.getElementById('userServiceResults');
    const responseMessage = document.querySelector('.response-message');
    const marketButton = document.getElementById('marketButton');
    const offerButton = document.getElementById('offerButton');
    
    // Add event listeners for navigation buttons
    marketButton.addEventListener('click', function() {
        window.location.href = 'showOffers.html';
    });
    
    offerButton.addEventListener('click', function() {
        window.location.href = 'makeOffer.html';
    });

    // Listen for Enter key in the username input
    usernameInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const username = usernameInput.value.trim();
            if (username) {
                searchUserServices(username);
            } else {
                showMessage('Bitte gib einen Benutzernamen ein.', 'error');
            }
        }
    });

    // Function to search for user services
    function searchUserServices(username) {
        showMessage('Suche nach Dienstleistungen...', 'info');
        userServiceResults.innerHTML = '';
        
        getUserServices(username)
            .then(services => {
                if (services && services.length > 0) {
                    displayServices(services, username);
                    showMessage(`Gefundene Dienstleistungen für ${username}`, 'success');
                } else {
                    showMessage(`Keine Dienstleistungen für Benutzer "${username}" gefunden.`, 'error');
                    userServiceResults.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Dienstleistungen für diesen Benutzer gefunden.</div>';
                }
            })
            .catch(error => {
                console.error('Error fetching services:', error);
                showMessage('Fehler bei der Suche nach Dienstleistungen: ' + error.message, 'error');
            });
    }

    // Function to get user services by username
    function getUserServices(username) {
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/d4d/${encodeURIComponent(username)}/services`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        return null;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der Dienste:', error);
                throw error;
            });
    }

    // Function to get service type name by ID
    function getServiceTypeName(serviceTypeId) {
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/d4d/${serviceTypeId}/type/services`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Service type fetch failed: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                console.log('Service Type Response:', {serviceTypeId, data});
                return data;
            })
            .catch(error => {
                console.error('Fehler beim Abrufen des Dienstleistungstyps:', error);
                return 'Unbekannter Dienstleistungstyp';
            });
    }

    // Function to get username by ID
    function getUserName(userId) {
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/d4d/${userId}/username/services`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Username fetch failed: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                console.log('Username Response:', {userId, data});
                return data;
            })
            .catch(error => {
                console.error('Fehler beim Abrufen des Benutzernamens:', error);
                return 'Unbekannter Benutzer';
            });
    }

    // Function to display the services
    function displayServices(services, currentUsername) {
        userServiceResults.innerHTML = ''; // Clear previous results
        if (!services || services.length === 0) {
            userServiceResults.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Dienstleistungen gefunden.</div>';
            return;
        }

        services.forEach(market => {
            Promise.all([
                getServiceTypeName(market.serviceType_ID),
                getUserName(market.user_ID)
            ])
            .then(([serviceTypeName, username]) => {
                const card = createServiceCard({
                    username: username,
                    serviceTypeName: serviceTypeName,
                    isOffer: market.offer === 1  // Ist 1 wenn es ein Angebot ist, 0 wenn es eine Nachfrage ist
                });
                userServiceResults.appendChild(card);
            })
            .catch(error => {
                console.error('Fehler beim Anzeigen des Services:', error);
            });
        });
    }

    function createServiceCard({ username, serviceTypeName, isOffer }) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'service-item';
        
        cardDiv.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="badge ${isOffer ? 'provider' : 'client'}">${isOffer ? 'Angebot' : 'Nachfrage'}</span>
                </div>
                <div class="card-body">
                    <p><strong>${username}</strong></p>
                    <p>${serviceTypeName}</p>
                </div>
            </div>
        `;
        
        return cardDiv;
    }

    // Function to show messages
    function showMessage(message, type) {
        responseMessage.textContent = message;
        responseMessage.className = `response-message ${type}`;
        responseMessage.style.display = 'block';
        
        if (type === 'info') {
            setTimeout(() => {
                responseMessage.style.display = 'none';
            }, 3000);
        }
    }

    // Initial load
    if (usernameInput.value.trim()) {
        searchUserServices(usernameInput.value.trim());
    }
});