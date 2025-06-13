// API Basis-URL
import { API_URL } from './config.js';


// Warte, bis das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  loadActiveServices();
  const form = document.getElementById('reviewForm');
  if (form) {
    form.addEventListener('submit', submitReview);
  }
});

function setupStarRating() {
  const starRating = document.getElementById('starRating');
  if (!starRating) {
    console.warn('Erforderliche Elemente für Sternebewertung nicht gefunden');
    return;
  }

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

// Nutzer holen oder erstellen
async function getOrCreateUser(name) {
  // Versuche, User mit diesem Namen zu finden
  let user = await fetch(`http://localhost:8080/user?name=${encodeURIComponent(name)}`)
    .then(res => res.ok ? res.json() : null);

  if (user) return user;

  // Wenn nicht gefunden, neuen User anlegen
  user = await fetch('http://localhost:8080/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  }).then(res => res.ok ? res.json() : null);

  return user;
}

// Bewertung einreichen
async function submitReview(event) {
    event.preventDefault();
    try {
        const [evaluateeId, serviceTypeId] = document.getElementById('serviceTypeSelect').value.split('|');
        const rating = document.getElementById('ratingSelect').value;
        const comment = document.getElementById('commentInput').value;

        const response = await fetch('http://localhost:8080/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                evaluatee: { id: parseInt(evaluateeId) },
                serviceType: { id: parseInt(serviceTypeId) },
                rating: parseInt(rating),
                comment
            })
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server did not return JSON');
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit review');
        }

        document.getElementById('reviewFormMessage').textContent = 'Review submitted successfully!';
        document.getElementById('reviewForm').reset();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('reviewFormMessage').textContent = `Error: ${error.message}`;
    }
}

// Bewertungsprozess starten
function startReview(userId, userName, serviceType) {
    document.getElementById('reviewedPersonInput').value = userName;
    const serviceTypeSelect = document.getElementById('serviceTypeSelect');
    const options = serviceTypeSelect.options;
    for (let i = 0; i < options.length; i++) {
        if (options[i].textContent === serviceType) {
            serviceTypeSelect.selectedIndex = i;
            break;
        }
    }
    document.getElementById('reviewForm').scrollIntoView({ behavior: 'smooth' });
}

// Alle Angebote laden
async function loadAllOffers() {
    const serviceList = document.getElementById('serviceList');
    if (!serviceList) {
        console.warn('Service-Liste nicht gefunden');
        return;
    }

    serviceList.innerHTML = '<li class="loading">Laden...</li>';

    try {
        const response = await fetch(`${API_URL}/all`);
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

// Wenn auf "Bewerten" geklickt wird
function startReviewFor(userId, userName, serviceType) {
    // Formular mit den Daten vorausfüllen
    document.getElementById('reviewedPersonInput').value = userName;
    document.getElementById('serviceTypeSelect').value = serviceType;
    
    // Scrolle zum Bewertungsformular
    document.getElementById('reviewForm').scrollIntoView({ behavior: 'smooth' });
}

// Beim Laden der Seite aktive Services laden
async function loadActiveServices() {
    try {
        const response = await fetch('http://localhost:8080/market');
        if (!response.ok) throw new Error('Fehler beim Laden der Services');
        
        const users = await response.json();
        const serviceTypeSelect = document.getElementById('serviceTypeSelect');
        
        if (users.length === 0) {
            serviceTypeSelect.innerHTML = '<option value="">Keine aktiven Services verfügbar</option>';
            return;
        }

        serviceTypeSelect.innerHTML = '<option value="">Bitte wählen...</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = `${user.user.id}|${user.serviceType.id}`;
            option.textContent = `${user.serviceType.name} (Anbieter: ${user.user.name})`;
            serviceTypeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler:', error);
    }
}
