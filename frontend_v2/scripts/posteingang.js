import { API_URL } from './config.js';
import { sessionManager } from './session-manager.js';

console.log('posteingang.js loaded successfully');

let currentFilter = 'all';
let allRequests = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Posteingang page loaded');
    
    // Initialize session
    await sessionManager.init();
    
    // Check if user is logged in
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser === 'Nicht angemeldet' || currentUser === 'Gast-Modus') {
        showNotLoggedInMessage();
        return;
    }
    
    // Load requests
    await loadRequests(currentUser);
    
    // Setup filter tabs
    setupFilterTabs();
});

/**
 * Get current logged-in user
 */
async function getCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const username = await response.text();
            if (username && username.trim() !== '' && username !== 'guest') {
                return username.trim();
            }
        }
    } catch (error) {
        console.error('Fehler beim Abrufen des Benutzers:', error);
    }
    return null;
}

/**
 * Show message when user is not logged in
 */
function showNotLoggedInMessage() {
    const requestsList = document.getElementById('requestsList');
    requestsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-user-lock"></i>
            <h2>Nicht angemeldet</h2>
            <p>Bitte melde dich an, um deine Anfragen zu sehen.</p>
            <button class="btn-primary" onclick="window.location.href='index.html'">
                <i class="fas fa-sign-in-alt"></i> Zur Anmeldung
            </button>
        </div>
    `;
}

/**
 * Load all service requests for the current user
 */
async function loadRequests(username) {
    const requestsList = document.getElementById('requestsList');
    
    try {
        const response = await fetch(`${API_URL}/service-requests/inbox/${encodeURIComponent(username)}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Anfragen');
        }
        
        allRequests = await response.json();
        console.log('Loaded requests:', allRequests);
        
        // Update badge counts
        updateBadgeCounts();
        
        // Display requests
        displayRequests(currentFilter);
        
    } catch (error) {
        console.error('Fehler beim Laden der Anfragen:', error);
        requestsList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Fehler beim Laden</h2>
                <p>${error.message}</p>
                <button class="btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Erneut versuchen
                </button>
            </div>
        `;
    }
}

/**
 * Update badge counts for filter tabs
 */
function updateBadgeCounts() {
    const counts = {
        all: allRequests.length,
        PENDING: allRequests.filter(r => r.status === 'PENDING').length,
        ACCEPTED: allRequests.filter(r => r.status === 'ACCEPTED').length,
        REJECTED: allRequests.filter(r => r.status === 'REJECTED').length
    };
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-pending').textContent = counts.PENDING;
    document.getElementById('count-accepted').textContent = counts.ACCEPTED;
    document.getElementById('count-rejected').textContent = counts.REJECTED;
}

/**
 * Display requests based on current filter
 */
function displayRequests(filter) {
    const requestsList = document.getElementById('requestsList');
    
    // Filter requests
    let filteredRequests = allRequests;
    if (filter !== 'all') {
        filteredRequests = allRequests.filter(r => r.status === filter);
    }
    
    // Sort by newest first
    filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filteredRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h2>Keine Anfragen</h2>
                <p>Du hast noch keine ${filter === 'all' ? '' : getFilterLabel(filter).toLowerCase() + ' '}Anfragen erhalten.</p>
            </div>
        `;
        return;
    }
    
    // Create request cards
    requestsList.innerHTML = '';
    filteredRequests.forEach(request => {
        const card = createRequestCard(request);
        requestsList.appendChild(card);
    });
}

/**
 * Get label for filter
 */
function getFilterLabel(filter) {
    const labels = {
        'PENDING': 'Ausstehende',
        'ACCEPTED': 'Akzeptierte',
        'REJECTED': 'Abgelehnte'
    };
    return labels[filter] || '';
}

/**
 * Create a request card element
 */
function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = `request-card status-${request.status.toLowerCase()}`;
    
    // Format date
    const date = new Date(request.createdAt);
    const formattedDate = date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Status badge
    const statusBadges = {
        'PENDING': '<span class="status-badge pending"><i class="fas fa-clock"></i> Ausstehend</span>',
        'ACCEPTED': '<span class="status-badge accepted"><i class="fas fa-check-circle"></i> Akzeptiert</span>',
        'REJECTED': '<span class="status-badge rejected"><i class="fas fa-times-circle"></i> Abgelehnt</span>'
    };
    
    card.innerHTML = `
        <div class="request-header">
            <div class="request-info">
                <h3><i class="fas fa-user"></i> ${request.senderName}</h3>
                <p class="service-type"><i class="fas fa-book"></i> ${request.serviceTypeName}</p>
            </div>
            ${statusBadges[request.status]}
        </div>
        <div class="request-body">
            <div class="request-details">
                <p class="request-date">
                    <i class="fas fa-calendar-alt"></i>
                    Angefragt am: ${formattedDate}
                </p>
            </div>
            ${request.status === 'PENDING' ? `
                <div class="request-actions">
                    <button class="btn-accept" data-request-id="${request.id}" data-sender="${request.senderName}">
                        <i class="fas fa-check"></i> Akzeptieren
                    </button>
                    <button class="btn-reject" data-request-id="${request.id}" data-sender="${request.senderName}">
                        <i class="fas fa-times"></i> Ablehnen
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add event listeners for action buttons
    if (request.status === 'PENDING') {
        const acceptBtn = card.querySelector('.btn-accept');
        const rejectBtn = card.querySelector('.btn-reject');
        
        acceptBtn.addEventListener('click', () => handleAccept(request.id, request.senderName));
        rejectBtn.addEventListener('click', () => handleReject(request.id, request.senderName));
    }
    
    return card;
}

/**
 * Handle accepting a request
 */
async function handleAccept(requestId, senderName) {
    if (!confirm(`Möchtest du die Anfrage von ${senderName} wirklich akzeptieren?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/service-requests/${requestId}/accept`, {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Akzeptieren der Anfrage');
        }
        
        showNotification(`✓ Anfrage von ${senderName} akzeptiert!`, 'success');
        
        // Reload requests
        const currentUser = await getCurrentUser();
        await loadRequests(currentUser);
        
    } catch (error) {
        console.error('Fehler beim Akzeptieren:', error);
        showNotification('Fehler beim Akzeptieren der Anfrage', 'error');
    }
}

/**
 * Handle rejecting a request
 */
async function handleReject(requestId, senderName) {
    if (!confirm(`Möchtest du die Anfrage von ${senderName} wirklich ablehnen?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/service-requests/${requestId}/reject`, {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Ablehnen der Anfrage');
        }
        
        showNotification(`Anfrage von ${senderName} abgelehnt`, 'info');
        
        // Reload requests
        const currentUser = await getCurrentUser();
        await loadRequests(currentUser);
        
    } catch (error) {
        console.error('Fehler beim Ablehnen:', error);
        showNotification('Fehler beim Ablehnen der Anfrage', 'error');
    }
}

/**
 * Setup filter tab buttons
 */
function setupFilterTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update filter and display
            currentFilter = btn.getAttribute('data-filter');
            displayRequests(currentFilter);
        });
    });
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Remove old notification
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
