// index.js - Startseite Hero Actions

import { API_URL } from './config.js';

/**
 * Handler für Hero CTA Actions
 * @param {string} action - 'search' oder 'offer'
 */
window.handleHeroAction = function(action) {
    // Prüfe ob User eingeloggt ist
    const username = localStorage.getItem('d4d_user_name');
    
    if (!username || username === 'Nicht angemeldet') {
        // Gast-Modus: Zeige Hinweis und leite zum Markt
        showQuickModal(action);
    } else {
        // Eingeloggter User: Direkt zur entsprechenden Seite
        if (action === 'search') {
            window.location.href = 'showOffers.html?view=offers&autoMatch=true';
        } else if (action === 'offer') {
            window.location.href = 'makeOffer.html';
        }
    }
};

/**
 * Zeigt Quick-Modal für Gäste
 */
function showQuickModal(action) {
    const modalHTML = `
        <div class="quick-modal-overlay" onclick="closeQuickModal()">
            <div class="quick-modal" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeQuickModal()">×</button>
                <div class="modal-icon">${action === 'search' ? '🎓' : '📚'}</div>
                <h2>${action === 'search' ? 'Nachhilfe suchen' : 'Nachhilfe anbieten'}</h2>
                <p>Um fortzufahren, gib bitte deinen Benutzernamen ein oder erstelle ein Profil.</p>
                
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeQuickModal()">
                        Abbrechen
                    </button>
                    <button class="btn-primary" onclick="proceedAsGuest('${action}')">
                        Als Gast fortfahren
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Schließt das Quick-Modal
 */
window.closeQuickModal = function() {
    const modal = document.querySelector('.quick-modal-overlay');
    if (modal) {
        modal.remove();
    }
};

/**
 * Fahre als Gast fort
 */
window.proceedAsGuest = function(action) {
    closeQuickModal();
    
    if (action === 'search') {
        window.location.href = 'showOffers.html?view=offers';
    } else if (action === 'offer') {
        // Hinweis: Zum Anbieten muss man eingeloggt sein
        alert('Um eine Dienstleistung anzubieten, musst du dich anmelden. Gib bitte deinen Benutzernamen in der Navbar ein.');
    }
};

// Prüfe beim Laden, ob User eingeloggt ist
document.addEventListener('DOMContentLoaded', function() {
    updateUserDisplay();
});

function updateUserDisplay() {
    const username = localStorage.getItem('d4d_user_name');
    const activeUserDisplay = document.getElementById('activeUserDisplay');
    
    if (activeUserDisplay) {
        if (username && username !== 'Nicht angemeldet') {
            activeUserDisplay.textContent = username;
            activeUserDisplay.classList.remove('guest');
        } else {
            activeUserDisplay.textContent = 'Gast-Modus';
            activeUserDisplay.classList.add('guest');
        }
    }
}
