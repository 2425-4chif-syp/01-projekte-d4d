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

// 2) Alle Reviews vom Server abrufen
async function fetchAllReviews() {
  try {
    // Neuer Endpunkt für alle Reviews
    const response = await fetch("http://localhost:8080/review");
    if (response.ok) {
      const reviews = await response.json();
      console.log("Empfangene Reviews:", reviews);
      displayReviews(reviews);
    } else {
      console.error("Fehler beim Abrufen der Reviews:", response.statusText);
    }
  } catch (error) {
    console.error("Netzwerkfehler beim Abrufen der Reviews:", error);
  }
}

// 3) Reviews im Frontend darstellen
function displayReviews(reviews) {
  const reviewList = document.getElementById("reviewList");
  reviewList.innerHTML = ""; // Alten Inhalt löschen

  reviews.forEach((rev) => {
    // Angepasst an das neue Format der Review-Objekte
    const evaluatee = rev.evaluatee ? rev.evaluatee.name : "";
    const evaluator = rev.evaluator ? rev.evaluator.name : "";
    const comment = rev.comment || "";
    const ratingVal = parseFloat(rev.rating) || 0.0;
    const serviceType = rev.serviceType && rev.serviceType.name ? rev.serviceType.name : "";

    const reviewCard = document.createElement("div");
    reviewCard.classList.add("review-card");

    reviewCard.innerHTML = `
      <div class="card">
        <div class="card-header">
          Bewertung für: ${evaluatee}<br>
          <small>Service: ${serviceType}</small><br>
          <small>Erstellt von: ${evaluator}</small>
        </div>
        <div class="card-body">
          <div class="review-rating">
            ${generateStarHTML(ratingVal)}
          </div>
          <div class="review-comment">
            ${comment}
          </div>
          <div class="text-muted">
            Erstellt am: ${rev.createdAt || ""}
          </div>
        </div>
      </div>
    `;
    reviewList.appendChild(reviewCard);
  });
}

// 4) Reviews nach Service-Typ abrufen
async function fetchReviewsByServiceType() {
  const serviceType = document.getElementById("serviceTypeInput").value;
  if (!serviceType) {
    alert("Bitte geben Sie einen Service-Typ ein");
    return;
  }
  try {
    // Neuer Endpunkt für Reviews nach Service-Typ
    const response = await fetch("http://localhost:8080/review/" + encodeURIComponent(serviceType));
    if (response.ok) {
      const reviews = await response.json();
      console.log("Empfangene Service-Reviews:", reviews);
      displayServiceReviews(reviews);
    } else {
      console.error("Fehler beim Abrufen der Reviews für Service-Typ:", response.statusText);
    }
  } catch (error) {
    console.error("Netzwerkfehler beim Abrufen der Reviews für Service-Typ:", error);
  }
}

// Darstellung der Reviews nach Service-Typ
function displayServiceReviews(reviews) {
  const reviewList = document.getElementById("serviceReviewList");
  reviewList.innerHTML = ""; // Alten Inhalt löschen

  reviews.forEach((rev) => {
    // Angepasst an das neue Format der Review-Objekte
    const evaluator = rev.evaluator ? rev.evaluator.name : "";
    const comment = rev.comment || "";
    const ratingVal = parseFloat(rev.rating) || 0.0;
    const serviceType = rev.serviceType && rev.serviceType.name ? rev.serviceType.name : "";

    const reviewCard = document.createElement("div");
    reviewCard.classList.add("review-card");

    reviewCard.innerHTML = `
      <div class="card">
        <div class="card-header">
          Bewertung für Service-Typ: ${serviceType}<br>
          <small>Erstellt von: ${evaluator}</small>
        </div>
        <div class="card-body">
          <div class="review-rating">
            ${generateStarHTML(ratingVal)}
          </div>
          <div class="review-comment">
            ${comment}
          </div>
          <div class="text-muted">
            Erstellt am: ${rev.createdAt || ""}
          </div>
        </div>
      </div>
    `;
    reviewList.appendChild(reviewCard);
  });
}

// 5) Durchschnittsbewertung für einen Service-Typ abrufen
async function fetchServiceRating() {
  const serviceType = document.getElementById("serviceTypeInput").value;
  if (!serviceType) {
    alert("Bitte geben Sie einen Service-Typ ein");
    return;
  }
  try {
    // Neuer Endpunkt für die Durchschnittsbewertung eines Service-Typs
    const response = await fetch("http://localhost:8080/review/average-rating/" + encodeURIComponent(serviceType));
    if (response.ok) {
      const averageRating = await response.json();
      displayServiceRating(averageRating);
    } else {
      console.error("Fehler beim Abrufen der Durchschnittsbewertung:", response.statusText);
    }
  } catch (error) {
    console.error("Netzwerkfehler beim Abrufen der Durchschnittsbewertung:", error);
  }
}

function displayServiceRating(averageRating) {
  const display = document.getElementById("serviceRatingDisplay");
  // Das Durchschnittsrating wird jetzt direkt als Gleitkommazahl zurückgegeben
  const rating = typeof averageRating === 'number' ? averageRating : 0.0;
  display.innerHTML = `<h3>Durchschnittsbewertung: ${rating.toFixed(1)}</h3>`;
}

// 6) Star-Rating-HTML generieren (für FontAwesome 6)
function generateStarHTML(rating) {
  const roundedRating = Math.round(rating);
  let starsHTML = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= roundedRating) {
      starsHTML += `<i class="fa-solid fa-star selected"></i>`;
    } else {
      starsHTML += `<i class="fa-solid fa-star"></i>`;
    }
  }
  return `${starsHTML} (${rating.toFixed(1)})`;
}
