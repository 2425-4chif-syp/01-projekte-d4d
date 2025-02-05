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


