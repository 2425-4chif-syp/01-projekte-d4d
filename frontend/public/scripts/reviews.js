// Constants
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const reviewForm = document.getElementById('reviewForm');
const serviceTypeSelect = document.getElementById('serviceType');
const reviewsList = document.getElementById('reviewsList');
const searchUsername = document.getElementById('searchUsername');
const searchButton = document.getElementById('searchButton');

// Load service types when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadServiceTypes();
    loadReviews();
});

// Load service types into the select dropdown
async function loadServiceTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}/serviceTypes`);
        const serviceTypes = await response.json();
        
        serviceTypeSelect.innerHTML = '<option value="">Select a service type</option>';
        serviceTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            serviceTypeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading service types:', error);
        showAlert('Error loading service types', 'danger');
    }
}

// Handle review submission
reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const reviewData = {
        revieweeUsername: document.getElementById('revieweeUsername').value,
        serviceTypeId: document.getElementById('serviceType').value,
        rating: document.getElementById('rating').value,
        reviewText: document.getElementById('reviewText').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(reviewData)
        });

        if (!response.ok) {
            throw new Error('Failed to submit review');
        }

        showAlert('Review submitted successfully!', 'success');
        reviewForm.reset();
        loadReviews(); // Reload reviews list
    } catch (error) {
        console.error('Error submitting review:', error);
        showAlert('Error submitting review', 'danger');
    }
});

// Load reviews
async function loadReviews(username = '') {
    try {
        const url = username 
            ? `${API_BASE_URL}/reviews?username=${encodeURIComponent(username)}`
            : `${API_BASE_URL}/reviews`;
            
        const response = await fetch(url);
        const reviews = await response.json();
        
        displayReviews(reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        showAlert('Error loading reviews', 'danger');
    }
}

// Display reviews in the list
function displayReviews(reviews) {
    reviewsList.innerHTML = '';
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<div class="list-group-item">No reviews found</div>';
        return;
    }

    reviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'list-group-item';
        
        const stars = '⭐'.repeat(review.rating);
        
        reviewElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-1">${review.revieweeUsername}</h5>
                <small>${new Date(review.createdAt).toLocaleDateString()}</small>
            </div>
            <p class="mb-1">${stars}</p>
            <p class="mb-1">${review.reviewText}</p>
            <small>Service: ${review.serviceType.name}</small>
            <small class="text-muted">Reviewed by: ${review.reviewerUsername}</small>
        `;
        
        reviewsList.appendChild(reviewElement);
    });
}

// Handle search
searchButton.addEventListener('click', () => {
    const username = searchUsername.value.trim();
    loadReviews(username);
});

searchUsername.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const username = searchUsername.value.trim();
        loadReviews(username);
    }
});

// Utility function to show alerts
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
} 