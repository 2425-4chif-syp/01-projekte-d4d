// API Basis-URL
const API_BASE_URL = 'http://localhost:8080/d4d';

// Warte, bis das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    loadAllOffers();
    setupStarRating();
});

// Sternebewertung einrichten
function setupStarRating() {
    const stars = document.querySelectorAll('.rating-input i');
    const ratingInput = document.getElementById('rating');
    const form = document.getElementById('reviewSubmitForm');
    const comment = document.getElementById('comment');
    const charCount = document.getElementById('charCount');

    if (!stars.length || !ratingInput || !form || !comment || !charCount) {
        console.error('Erforderliche Elemente für Sternebewertung nicht gefunden');
        return;
    }

    // Stern-Bewertung
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('data-rating');
            ratingInput.value = rating;
            updateStars(rating);
        });
    });

    // Zeichenzähler
    comment.addEventListener('input', function() {
        const remaining = 250 - this.value.length;
        charCount.textContent = `${this.value.length}/250 Zeichen`;
        charCount.classList.toggle('error', remaining < 0);
    });

    // Formular absenden
    form.addEventListener('submit', submitReview);
}

// Sterne aktualisieren
function updateStars(rating) {
    const stars = document.querySelectorAll('.rating-input i');
    if (!stars.length) return;

    stars.forEach(star => {
        star.classList.toggle('selected', star.getAttribute('data-rating') <= rating);
    });
}

// Bewertung abbrechen
function cancelReview() {
    const reviewForm = document.getElementById('reviewForm');
    const ratingInput = document.getElementById('rating');
    const comment = document.getElementById('comment');
    const charCount = document.getElementById('charCount');
    
    if (!reviewForm || !ratingInput || !comment || !charCount) {
        console.error('Erforderliche Elemente zum Abbrechen nicht gefunden');
        return;
    }

    reviewForm.style.display = 'none';
    ratingInput.value = '';
    comment.value = '';
    charCount.textContent = '0/250 Zeichen';
    updateStars(0);
}

// Bewertung einreichen
async function submitReview(e) {
    e.preventDefault();
    
    const ratingInput = document.getElementById('rating');
    const comment = document.getElementById('comment');
    const form = document.getElementById('reviewSubmitForm');
    
    if (!ratingInput || !comment || !form) {
        console.error('Erforderliche Formularelemente nicht gefunden');
        return;
    }

    const rating = ratingInput.value;
    if (!rating) {
        alert('Bitte wählen Sie eine Bewertung aus');
        return;
    }

    // Hole die benötigten Daten
    const username = form.getAttribute('data-username');
    const serviceType = form.getAttribute('data-service-type');
    
    console.log('Sende Bewertung für:', username);
    console.log('Service Typ:', serviceType);
    console.log('Rating:', rating);
    console.log('Kommentar:', comment.value.trim());

    if (!username || !serviceType) {
        alert('Fehlende Benutzer- oder Service-Informationen');
        return;
    }

    // Erstelle das Review-Objekt im exakt gleichen Format wie im Backend erwartet
    const reviewData = {
        evaluateeUsername: username,          // Der Benutzer, der bewertet wird
        evaluatorUsername: "currentUser",     // Der Benutzer, der die Bewertung abgibt
        serviceType: serviceType,             // Der Typ der Dienstleistung
        rating: parseFloat(rating),           // Die Bewertung als Double
        comment: comment.value.trim()         // Der Kommentar
    };

    console.log('Sende Daten an Backend:', JSON.stringify(reviewData, null, 2));

    try {
        // Sende die Bewertung zum korrekten Endpunkt
        const response = await fetch(`${API_BASE_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });

        console.log('Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server Antwort:', errorText);
            
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorJson.details || 'Unbekannter Fehler';
            } catch (e) {
                errorMessage = errorText || response.statusText || 'Unbekannter Fehler';
            }
            
            throw new Error(errorMessage);
        }

        // Erfolgreiche Speicherung
        alert('Bewertung wurde erfolgreich gespeichert');
        cancelReview();
        loadAllOffers();
    } catch (error) {
        console.error('Fehler beim Speichern der Bewertung:', error);
        alert('Bewertung konnte nicht gespeichert werden: ' + error.message);
    }
}

// Bewertungsprozess starten
function startReview(serviceId, username, serviceType) {
    const reviewForm = document.getElementById('reviewForm');
    const form = document.getElementById('reviewSubmitForm');
    const reviewUserName = document.getElementById('reviewUserName');
    const reviewSubject = document.getElementById('reviewSubject');
    
    if (!reviewForm || !form || !reviewUserName || !reviewSubject) {
        console.error('Erforderliche Elemente für das Bewertungsformular nicht gefunden');
        return;
    }

    reviewUserName.textContent = username;
    reviewSubject.textContent = serviceType;
    
    // Speichere die benötigten Informationen im Formular
    form.setAttribute('data-username', username);
    form.setAttribute('data-service-type', serviceType);
    form.setAttribute('data-service-id', serviceId);  // Speichere auch die Service-ID
    
    cancelReview();
    reviewForm.style.display = 'block';
    reviewForm.scrollIntoView({ behavior: 'smooth' });
}

// Alle Angebote laden
async function loadAllOffers() {
    const serviceList = document.getElementById('serviceList');
    if (!serviceList) {
        console.error('Service-Liste nicht gefunden');
        return;
    }

    serviceList.innerHTML = '<li class="loading">Laden...</li>';

    try {
        const response = await fetch(`${API_BASE_URL}/all`);
        if (!response.ok) throw new Error('Fehler beim Abrufen der Daten');
        
        const users = await response.json();
        
        if (users.length === 0) {
            serviceList.innerHTML = `
                <li class="service-item">
                    <div class="card">
                        <div class="card-body">
                            <p class="no-results">Keine Dienstleistungen gefunden.</p>
                        </div>
                    </div>
                </li>`;
            return;
        }

        serviceList.innerHTML = '';
        users.forEach(user => {
            const listItem = document.createElement('li');
            listItem.className = 'service-item';
            listItem.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <span class="badge">${user.serviceOffer} ➝ ${user.serviceWanted}</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Name:</strong> ${user.name}</p>
                        <p><strong>Beschreibung:</strong> ${user.description}</p>
                        <button class="review-button" onclick="startReview('${user.id}', '${user.name}', '${user.serviceOffer}')">
                            <i class="fas fa-star"></i> Bewerten
                        </button>
                    </div>
                </div>
            `;
            serviceList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Fehler:', error);
        serviceList.innerHTML = `
            <li class="service-item">
                <div class="card">
                    <div class="card-body">
                        <p class="error-message">Fehler beim Laden der Dienstleistungen.</p>
                    </div>
                </div>
            </li>`;
    }
}
