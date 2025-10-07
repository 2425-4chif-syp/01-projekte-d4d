import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', function() {
    const responseMessage = document.querySelector('.response-message');
    const marketButton = document.getElementById('marketButton');
    const offerButton = document.getElementById('offerButton');
    
    let allPerfectMatches = [];
    let allServices = [];
    let serviceTypes = [];
    let currentServiceType = 'all';
    let currentFilterType = 'all';
    let currentPerfectMatchUser = 'all';
    let currentRatingFilter = 'all';
    let currentSortOption = 'none';

    getActiveUser();

    const navUsernameInput = document.getElementById("navUsername");
    if (navUsernameInput) {
        navUsernameInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                const username = this.value.trim();
                if (username) {
                    setActiveUser(username);
                    // Dispatch event for compatibility
                    window.dispatchEvent(new CustomEvent('userChanged', {
                        detail: { username: username }
                    }));
                } else {
                    showMessage("Bitte gib einen Benutzernamen ein.", "error");
                }
            }
        });
    }

    function getActiveUser() {
        fetch(`${API_URL}/user`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Fehler beim Abrufen des aktiven Benutzers");
                }
                return response.text();
            })
            .then(responseText => {
                try {
                    const responseJson = JSON.parse(responseText);
                    const username = responseJson.username || "Nicht angemeldet";
                    
                    const activeUserDisplay = document.getElementById("activeUserDisplay");
                    if (activeUserDisplay) {
                        activeUserDisplay.textContent = username;
                        activeUserDisplay.classList.add("user-active");
                    }
                    
                    // Lade direkt die Services des aktiven Benutzers, wenn einer angemeldet ist
                    if (username && username !== "Nicht angemeldet") {
                        searchUserServices(username);
                    } else {
                        showMessage("Bitte melde dich an, um Dienstleistungen anzuzeigen.", "info");
                    }
                } catch (e) {
                    // Falls die Antwort kein gültiges JSON ist, verwende den Text direkt
                    const username = responseText && responseText.trim() !== "" ? responseText : "Nicht angemeldet";
                    
                    const activeUserDisplay = document.getElementById("activeUserDisplay");
                    if (activeUserDisplay) {
                        activeUserDisplay.textContent = username !== "" ? username : "Nicht angemeldet";
                        if (username !== "") {
                            activeUserDisplay.classList.add("user-active");
                            searchUserServices(username);
                        } else {
                            activeUserDisplay.classList.remove("user-active");
                            showMessage("Bitte melde dich an, um Dienstleistungen anzuzeigen.", "info");
                        }
                    }
                }
            })
            .catch(error => {
                console.error("Fehler beim Abrufen des aktiven Benutzers:", error);
                const activeUserDisplay = document.getElementById("activeUserDisplay");
                if (activeUserDisplay) {
                    activeUserDisplay.textContent = "Nicht angemeldet";
                    activeUserDisplay.classList.remove("user-active");
                }
                showMessage("Fehler beim Laden des aktiven Benutzers. Bitte versuche es später erneut.", "error");
            });
    }

    // Funktion, um einen Benutzer als aktiv zu markieren
    function setActiveUser(username) {
        fetch(`${API_URL}/user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: username })
        })
        .then(response => {
            if (response.ok) {
                return response.text().then(msg => {
                    
                    // Aktualisiere die Anzeige des aktiven Benutzers
                    const activeUserDisplay = document.getElementById("activeUserDisplay");
                    if (activeUserDisplay) {
                        activeUserDisplay.textContent = username;
                        activeUserDisplay.classList.add("user-active");
                    }
                    
                    // Suche nach den Services des aktiven Benutzers
                    searchUserServices(username);
                    
                    return msg;
                });
            } else {
                return response.text().then(errorMsg => {
                    throw new Error(errorMsg || `Fehler beim Setzen von ${username} als aktiven Benutzer`);
                });
            }
        })
        .catch(error => {
            showMessage(error.message, "error");
        });
    }

    // Add event listeners for navigation buttons
    marketButton.addEventListener('click', function() {
        window.location.href = 'showOffers.html';
    });
    
    offerButton.addEventListener('click', function() {
        window.location.href = 'makeOffer.html';
    });

    // Add filter functionality
    const perfectMatchFilter = document.getElementById('perfectMatchFilter');
    const serviceFilter = document.getElementById('serviceFilter');
    const serviceTypeFilter = document.getElementById('serviceTypeFilter');

    if (perfectMatchFilter) {
        perfectMatchFilter.addEventListener('input', () => {
            filterPerfectMatches(allPerfectMatches);
        });
    }

    if (serviceFilter) {
        serviceFilter.addEventListener('input', () => {
            filterServices(allServices);
        });
    }

    if (serviceTypeFilter) {
        serviceTypeFilter.addEventListener('change', () => {
            filterServices(allServices);
        });
    }

    function filterPerfectMatches(matches) {
        const filterText = perfectMatchFilter.value.toLowerCase();
        const filteredMatches = matches.filter(match => {
            // Get username directly from the user object
            const username = match.username || (match.user && match.user.name ? match.user.name : 'Unbekannter Benutzer');
            // Get service type name directly from the serviceType object
            const serviceTypeName = match.serviceTypeName || (match.serviceType && match.serviceType.name ? match.serviceType.name : 'Unbekannter Dienstleistungstyp');
            
            return username.toLowerCase().includes(filterText) ||
                   serviceTypeName.toLowerCase().includes(filterText);
        });
        
        displayFilteredPerfectMatches(filteredMatches);
    }

    function filterServices(services) {
        const filterText = serviceFilter.value.toLowerCase();
        const filterType = serviceTypeFilter.value;
        
        const filteredServices = services.filter(service => {
            // Ensure we have proper username and serviceTypeName values
            const username = service.username || 
                (service.marketClient && service.marketClient.user && service.marketClient.user.name ? 
                service.marketClient.user.name : 'Unbekannter Benutzer');
            
            const serviceTypeName = service.serviceTypeName || 
                (service.marketProvider && service.marketProvider.serviceType && service.marketProvider.serviceType.name ? 
                service.marketProvider.serviceType.name : 'Unbekannter Dienstleistungstyp');
            
            const textMatch = username.toLowerCase().includes(filterText) ||
                            serviceTypeName.toLowerCase().includes(filterText);
            
            if (filterType === 'all') return textMatch;
            if (filterType === 'offer') return textMatch && service.isOffer;
            if (filterType === 'demand') return textMatch && !service.isOffer;
            
            return textMatch;
        });
        
        displayFilteredServices(filteredServices);
    }

    function createFilterSection(title, filterId, isServiceSection = false) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'service-container';
        
        const titleElement = document.createElement('h3');
        titleElement.innerHTML = `<i class="${isServiceSection ? 'fas fa-clipboard-list' : 'fas fa-star'}"></i> ${title}`;
        sectionDiv.appendChild(titleElement);
        
        const filterControls = document.createElement('div');
        filterControls.className = 'filter-controls';
        
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.id = filterId;
        filterInput.className = 'filter-input';
        filterInput.placeholder = `Filter ${isServiceSection ? 'Services' : 'Perfect Matches'}...`;
        filterControls.appendChild(filterInput);
        
        if (isServiceSection) {
            const typeFilter = document.createElement('select');
            typeFilter.id = 'serviceTypeFilter';
            typeFilter.innerHTML = `
                <option value="all">Alle Arten</option>
                <option value="offer">Nur Angebote</option>
                <option value="demand">Nur Nachfragen</option>
            `;
            filterControls.appendChild(typeFilter);
        }
        
        sectionDiv.appendChild(filterControls);
        
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'scrollable-container';
        
        const gridContainer = document.createElement('div');
        gridContainer.className = 'service-grid';
        gridContainer.id = `${isServiceSection ? 'userServiceResults' : 'perfectMatchContainer'}`;
        
        scrollContainer.appendChild(gridContainer);
        sectionDiv.appendChild(scrollContainer);
        
        return sectionDiv;
    }

    // Function to search for user services
    function searchUserServices(username) {
        const matchesContainer = document.getElementById('matchesContainer');
        matchesContainer.innerHTML = '';
        
        fetchServiceTypes()
            .then(types => {
                serviceTypes = types;
                return getPerfectMatches(username);
            })
            .then(pm => {
                if (pm && pm.length > 0) {
                    allPerfectMatches = pm;
                    createPerfectMatchesSection(pm);
                    return [pm, username];
                }
                return [[], username];
            })
            .then(([perfectMatches, username]) => {
                return getUserServices(username).then(services => [services, perfectMatches]);
            })
            .then(([services, perfectMatches]) => {
                if (services && services.length > 0) {
                    // Keep all services - we want to display both perfect matches and regular services
                    const allAvailableServices = [...services];
                    
                    // No need to filter out perfect matches - we want to show them in both sections
                    // This keeps backward compatibility with the existing code
                    const filteredServices = removePerfectMatches(services, perfectMatches);
                    
                    // Process all services
                    if (allAvailableServices.length > 0) {
                        console.log('Services from backend:', allAvailableServices);
                        
                        // Map services to a format with all required fields
                        allServices = allAvailableServices.map(service => {
                            const currentUsername = username; // The username we searched for
                            
                            // Determine which user is the "other" user and what type of service this is
                            let otherUsername = 'Unbekannter Benutzer';
                            let serviceTypeName = 'Unbekannter Dienstleistungstyp';
                            let isOffer = false;
                            
                            // If current user is the provider, show the client's demand
                            if (service.marketProvider && service.marketProvider.user && 
                                service.marketProvider.user.name === currentUsername) {
                                otherUsername = service.marketClient && service.marketClient.user ? 
                                    service.marketClient.user.name : 'Unbekannter Benutzer';
                                serviceTypeName = service.marketClient && service.marketClient.serviceType ? 
                                    service.marketClient.serviceType.name : 'Unbekannter Dienstleistungstyp';
                                isOffer = service.marketClient && service.marketClient.offer === 1;
                            }
                            // If current user is the client, show the provider's offer
                            else if (service.marketClient && service.marketClient.user && 
                                     service.marketClient.user.name === currentUsername) {
                                otherUsername = service.marketProvider && service.marketProvider.user ? 
                                    service.marketProvider.user.name : 'Unbekannter Benutzer';
                                serviceTypeName = service.marketProvider && service.marketProvider.serviceType ? 
                                    service.marketProvider.serviceType.name : 'Unbekannter Dienstleistungstyp';
                                isOffer = service.marketProvider && service.marketProvider.offer === 1;
                            }
                            // For services where the current user is not directly involved
                            // (these are demands from others that match what the user offers)
                            else {
                                otherUsername = service.marketClient && service.marketClient.user ? 
                                    service.marketClient.user.name : 'Unbekannter Benutzer';
                                serviceTypeName = service.marketClient && service.marketClient.serviceType ? 
                                    service.marketClient.serviceType.name : 'Unbekannter Dienstleistungstyp';
                                isOffer = service.marketClient && service.marketClient.offer === 1;
                            }
                            
                            return {
                                ...service,
                                username: otherUsername,
                                serviceTypeName,
                                isOffer,
                                typeId: service.marketProvider?.serviceType?.id || service.marketClient?.serviceType?.id || null,
                                providerId: service.marketProvider?.user?.id || service.marketClient?.user?.id || null,
                                rating: null // Will be loaded asynchronously
                            };
                        });

                        // Load ratings for all offer services
                        loadRatingsForServices(allServices);
                        
                        createServicesSection();
                        setTimeout(() => filterAndDisplayServices(), 0);
                        showMessage(`Gefundene Dienstleistungen für ${username}`, 'success');
                    }
                }
                
                if (!document.querySelector('.perfect-matches') && !document.querySelector('#servicesContainer')) {
                    matchesContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Dienstleistungen gefunden.</div>';
                }
            })
            .catch(error => {
                console.error('Error fetching services:', error);
                showMessage('Fehler bei der Suche nach Dienstleistungen: ' + error.message, 'error');
            });
    }

    function createPerfectMatchesSection(perfectMatches) {
        const matchesContainer = document.getElementById('matchesContainer');
        
        // Perfect Matches Section
        const perfectMatchSection = document.createElement('div');
        perfectMatchSection.className = 'main-services-section perfect-matches';
        perfectMatchSection.innerHTML = '<h3><i class="fas fa-star"></i> Perfekte Übereinstimmungen</h3>';

        // Get unique usernames from perfect matches
        const uniqueUsers = [...new Set(perfectMatches.map(match => {
            return match.username || (match.user && match.user.name ? match.user.name : 'Unbekannter Benutzer');
        }))];
        
        // Create navigation for perfect match users
        const usersNav = document.createElement('nav');
        usersNav.className = 'service-types-nav';
        
        const usersList = document.createElement('div');
        usersList.className = 'service-types-list';

        // "Alle" Button für Perfect Matches
        const allUsersBtn = document.createElement('button');
        allUsersBtn.className = 'service-type-btn active';
        allUsersBtn.dataset.user = 'all';
        allUsersBtn.innerHTML = '<i class="fas fa-users"></i> Alle Benutzer';
        usersList.appendChild(allUsersBtn);
        
        // Button für jeden Benutzer
        uniqueUsers.forEach(username => {
            const button = document.createElement('button');
            button.className = 'service-type-btn';
            button.dataset.user = username;
            button.innerHTML = `<i class="fas fa-user"></i> ${username}`;
            usersList.appendChild(button);
        });

        usersNav.appendChild(usersList);
        perfectMatchSection.appendChild(usersNav);

        // Container für Perfect Matches
        const perfectMatchContainer = document.createElement('div');
        perfectMatchContainer.id = 'perfectMatchContainer';
        perfectMatchContainer.className = 'services-display';
        perfectMatchSection.appendChild(perfectMatchContainer);

        matchesContainer.appendChild(perfectMatchSection);

        // Event Listeners für Perfect Match Filter
        const userButtons = usersNav.querySelectorAll('.service-type-btn');
        userButtons.forEach(button => {
            button.addEventListener('click', () => {
                userButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentPerfectMatchUser = button.dataset.user;
                filterAndDisplayPerfectMatches();
            });
        });

        // Initial Display
        filterAndDisplayPerfectMatches();
    }

    function filterAndDisplayPerfectMatches() {
        const filteredMatches = allPerfectMatches.filter(match => {
            // Access user.name directly from the match object
            const username = match.user && match.user.name ? match.user.name : 'Unbekannter Benutzer';
            return currentPerfectMatchUser === 'all' || username === currentPerfectMatchUser;
        });

        const perfectMatchContainer = document.getElementById('perfectMatchContainer');
        if (!perfectMatchContainer) return;

        perfectMatchContainer.innerHTML = '';
        
        if (filteredMatches.length === 0) {
            perfectMatchContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Perfect Matches gefunden.</div>';
            return;
        }

        const gridDiv = document.createElement('div');
        gridDiv.className = 'service-grid';
        
        filteredMatches.forEach(match => {
            const card = createPerfectMatchCard(match);
            gridDiv.appendChild(card);
        });
        
        perfectMatchContainer.appendChild(gridDiv);
    }

    // Funktion zum Abrufen aller Service-Typen
    function fetchServiceTypes() {
        return fetch(`${API_URL}/servicetype`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Fehler beim Abrufen der Service-Typen");
                }
                return response.json();
            })
            .then(serviceTypes => serviceTypes.map(type => type.name));
    }

    function createServiceTypeSection(serviceType) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'service-type-section';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'service-type-header';
        
        const title = document.createElement('h3');
        title.innerHTML = `<i class="fas fa-tags"></i> ${serviceType}`;
        
        const filterSelect = document.createElement('select');
        filterSelect.className = 'offer-filter';
        filterSelect.innerHTML = `
            <option value="all">Alle anzeigen</option>
            <option value="offer">Nur Angebote</option>
            <option value="demand">Nur Nachfragen</option>
        `;
        
        headerDiv.appendChild(title);
        headerDiv.appendChild(filterSelect);
        sectionDiv.appendChild(headerDiv);
        
        const servicesContainer = document.createElement('div');
        servicesContainer.className = 'scrollable-container';
        servicesContainer.id = `services-${serviceType.replace(/\s+/g, '-')}`;
        sectionDiv.appendChild(servicesContainer);
        
        return { sectionDiv, filterSelect, servicesContainer };
    }

    function displayServicesByType(services) {
        const matchesContainer = document.getElementById('matchesContainer');
        if (!matchesContainer) return;
        
        // Gruppiere Services nach Typ
        const servicesByType = {};
        services.forEach(service => {
            if (!servicesByType[service.serviceTypeName]) {
                servicesByType[service.serviceTypeName] = [];
            }
            servicesByType[service.serviceTypeName].push(service);
        });
        
        // Erstelle Sektionen für jeden Service-Typ
        Object.entries(servicesByType).forEach(([type, typeServices]) => {
            const { sectionDiv, filterSelect, servicesContainer } = createServiceTypeSection(type);
            
            // Filter-Event-Listener
            filterSelect.addEventListener('change', (e) => {
                const filterValue = e.target.value;
                const filteredServices = typeServices.filter(service => {
                    if (filterValue === 'all') return true;
                    if (filterValue === 'offer') return service.isOffer;
                    if (filterValue === 'demand') return !service.isOffer;
                    return true;
                });
                
                displayServicesInContainer(filteredServices, servicesContainer);
            });
            
            // Initial anzeigen
            displayServicesInContainer(typeServices, servicesContainer);
            matchesContainer.appendChild(sectionDiv);
        });
    }

    function displayServicesInContainer(services, container) {
        container.innerHTML = '';
        
        if (services.length === 0) {
            container.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Dienstleistungen gefunden.</div>';
            return;
        }

        const gridDiv = document.createElement('div');
        gridDiv.className = 'service-grid';
        
        services.forEach(service => {
            const card = createServiceCard(service);
            gridDiv.appendChild(card);
        });
        
        container.appendChild(gridDiv);
    }

    // Function to get user services by username
    function getUserServices(username) {
        return fetch(`${API_URL}/service/relevant/${encodeURIComponent(username)}`)
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
        return fetch(`${API_URL}/servicetype`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Service type fetch failed: ${response.status}`);
                }
                return response.json();
            })
            .then(serviceTypes => {
                const serviceType = serviceTypes.find(type => type.id === serviceTypeId);
                return serviceType ? serviceType.name : 'Unbekannter Dienstleistungstyp';
            })
            .catch(error => {
                console.error('Fehler beim Abrufen des Dienstleistungstyps:', error);
                return 'Unbekannter Dienstleistungstyp';
            });
    }

    // Function to get username by ID
    function getUserName(userId) {
        return fetch(`${API_URL}/market/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Username fetch failed: ${response.status}`);
                }
                return response.json();
            })
            .then(markets => {
                if (markets && markets.length > 0 && markets[0].user) {
                    return markets[0].user.name;
                }
                return 'Unbekannter Benutzer';
            })
            .catch(error => {
                console.error('Fehler beim Abrufen des Benutzernamens:', error);
                return 'Unbekannter Benutzer';
            });
    }

    // Function to get perfect matches
    function getPerfectMatches(username) {
        return fetch(`${API_URL}/service/perfect-matches/${encodeURIComponent(username)}`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        return [];
                    }
                    throw new Error(`Perfect matches fetch failed: ${response.status}`);
                }
                return response.json();
            })
            .then(matches => {
                console.log('Raw perfect matches:', matches);
                // Process matches to ensure they have the expected format
                return matches.map(match => ({
                    ...match,
                    serviceTypeName: match.serviceType ? match.serviceType.name : 'Unbekannter Dienstleistungstyp',
                    username: match.user ? match.user.name : 'Unbekannter Benutzer'
                }));
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der perfekten Übereinstimmungen:', error);
                return [];
            });
    }

    // Function to show perfect-matches as cards -> gold
    function showPerfectMatches(pm) {
        const perfectMatchContainer = document.getElementById('perfectMatchContainer');
        if (!perfectMatchContainer) {
            console.error('perfectMatchContainer element not found in the DOM');
            return;
        }
        
        perfectMatchContainer.innerHTML = ''; // Clear previous results
        if (!pm || pm.length === 0) {
            perfectMatchContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine perfekten Übereinstimmungen gefunden.</div>';
            return;
        }

        pm.forEach(market => {
            // Get username directly from the user object
            const username = market.username || (market.user && market.user.name ? market.user.name : 'Unbekannter Benutzer');
            // Get service type name directly from the serviceType object
            const serviceTypeName = market.serviceTypeName || (market.serviceType && market.serviceType.name ? market.serviceType.name : 'Unbekannter Dienstleistungstyp');
            
            const card = createPerfectMatchCard({
                username: username,
                serviceTypeName: serviceTypeName,
                offer: market.offer
            });
            perfectMatchContainer.appendChild(card);
        });
    }

    // Function to create a perfect-match service card -> gold, kein Angebot, Nachfrage
    function createPerfectMatchCard(service) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'service-item';
        
        // Ensure we have proper values for display, even if data is missing
        const username = service.username || (service.user && service.user.name ? service.user.name : 'Unbekannter Benutzer');
        const serviceTypeName = service.serviceTypeName || (service.serviceType && service.serviceType.name ? service.serviceType.name : 'Unbekannter Dienstleistungstyp');
        const offer = service.offer !== undefined ? service.offer : (service.offer === 1);
        
        const cardHTML = `
            <div class="card perfect-match-card">
                <div class="card-header">
                    <span class="badge perfect-match">Perfect-Match</span>
                    <span class="badge ${offer === 1 ? 'provider' : 'client'}">${offer === 1 ? 'Angebot' : 'Nachfrage'}</span>
                </div>
                <div class="card-body">
                    <div class="service-info">
                        <p><strong>${username}</strong></p>
                        <p>${serviceTypeName}</p>
                        ${offer === 1 ? '<div class="rating-container"><i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...</div>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        cardDiv.innerHTML = cardHTML;
        
        // If it's an offer, make it clickable and add rating functionality
        if (offer === 1 && serviceTypeName !== 'Unbekannter Dienstleistungstyp' && username !== 'Unbekannter Benutzer') {
            // Make card clickable
            cardDiv.classList.add('clickable');
            cardDiv.style.cursor = 'pointer';
            
            // Add click handler to open rating modal
            cardDiv.addEventListener('click', function(e) {
                // Check if we have a serviceId from the service object
                const serviceId = service.id || service.serviceId || null;
                const typeId = service.typeId || null;
                const providerId = service.providerId || null;
                if (serviceId && typeId && providerId) {
                    openRatingModal(serviceId, username, serviceTypeName, typeId, providerId);
                } else {
                    console.warn('Service ID, TypeId or ProviderId not found for rating:', service);
                    alert('Bewertung nicht möglich: Fehlende Daten');
                }
            });
            
            // Load rating specific to this TypeOfService + Provider combination
            const ratingContainer = cardDiv.querySelector('.rating-container');
            if (ratingContainer && service.typeId && service.providerId) {
                loadRatingByTypeAndProvider(service.typeId, service.providerId, ratingContainer);
            }
        }
        
        return cardDiv;
    }

    // Function to remove perfect matches from normal services
    function removePerfectMatches(services, perfectMatches) {
        // We actually want to show all services, not filter out the perfect matches from regular view
        // This function is now a pass-through to maintain compatibility
        return services;
    }

    // Function to display filtered perfect matches
    function displayFilteredPerfectMatches(matches) {
        const perfectMatchContainer = document.getElementById('perfectMatchContainer');
        if (!perfectMatchContainer) return;
        
        perfectMatchContainer.innerHTML = '';
        
        if (matches.length === 0) {
            perfectMatchContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Übereinstimmungen gefunden.</div>';
            return;
        }

        matches.forEach(match => {
            const card = createPerfectMatchCard(match);
            perfectMatchContainer.appendChild(card);
        });
    }

    function displayFilteredServices(services) {
        const servicesContainer = document.getElementById('servicesContainer');
        if (!servicesContainer) return;
        
        servicesContainer.innerHTML = '';
        
        if (services.length === 0) {
            servicesContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Dienstleistungen gefunden.</div>';
            return;
        }

        const gridDiv = document.createElement('div');
        gridDiv.className = 'service-grid';
        
        services.forEach(service => {
            const card = createServiceCard(service);
            gridDiv.appendChild(card);
        });
        
        servicesContainer.appendChild(gridDiv);
    }

    // Fetch the average rating for a service type (general)
    async function getAverageRating(serviceTypeName) {
        try {
            const response = await fetch(`${API_URL}/review/average-rating/${encodeURIComponent(serviceTypeName)}`);
            if (response.ok) {
                return await response.json();
            }
            return 0;
        } catch (error) {
            console.error('Fehler beim Abrufen der Durchschnittsbewertung:', error);
            return 0;
        }
    }

    // Fetch the average rating for a specific user and service type
    async function getUserServiceRating(username, serviceTypeName) {
        try {
            // Use the new ratings endpoint
            const response = await fetch(`${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`);
            if (response.ok) {
                const stats = await response.json();
                // Return the full stats object
                return stats;
            }
            return { averageRating: 0, totalReviews: 0 };
        } catch (error) {
            console.error('Fehler beim Abrufen der Bewertung:', error);
            return { averageRating: 0, totalReviews: 0 };
        }
    }

    // Generate HTML for star rating display
    function generateStarHTML(rating) {
        // Check if rating is null, undefined, or 0 (no rating)
        if (rating === null || rating === undefined || rating === 0) {
            return '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
        }
        
        let starsHTML = "";
        
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                // Full star
                starsHTML += '<i class="fas fa-star selected"></i>';
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                // Half star
                starsHTML += '<i class="fas fa-star-half-alt selected"></i>';
            } else {
                // Empty star
                starsHTML += '<i class="fas fa-star"></i>';
            }
        }
        return `<div class="service-rating">${starsHTML} (${rating.toFixed(1)})</div>`;
    }

    // Load user rating from API
    async function loadUserRating(username, container) {
        if (!username || !container) {
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`);
            if (response.ok) {
                const stats = await response.json();
                
                // Generate rating HTML
                if (stats.averageRating && stats.averageRating > 0) {
                    const starsHTML = generateStarHTML(stats.averageRating);
                    // Add review count
                    container.innerHTML = `${starsHTML.replace('</div>', '')} <span style="color: #666; font-size: 0.9em;">(${stats.totalReviews} ${stats.totalReviews === 1 ? 'Bewertung' : 'Bewertungen'})</span></div>`;
                } else {
                    container.innerHTML = '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
                }
            } else {
                container.innerHTML = '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung</span></div>';
            }
        } catch (error) {
            console.error('Fehler beim Laden der Bewertung:', error);
            container.innerHTML = '<div class="service-rating"><span style="color: #999;">Bewertung nicht verfügbar</span></div>';
        }
    }

    // Load rating for specific TypeOfService + Provider combination
    async function loadRatingByTypeAndProvider(typeId, providerId, container) {
        if (!typeId || !providerId || !container) {
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/reviews/type/${typeId}/provider/${providerId}`);
            if (response.ok) {
                const data = await response.json();
                
                // Generate rating HTML
                if (data.averageRating && data.averageRating > 0) {
                    const starsHTML = generateStarHTML(data.averageRating);
                    // Add review count
                    container.innerHTML = `${starsHTML.replace('</div>', '')} <span style="color: #666; font-size: 0.9em;">(${data.totalReviews} ${data.totalReviews === 1 ? 'Bewertung' : 'Bewertungen'})</span></div>`;
                } else {
                    container.innerHTML = '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung für diese Dienstleistung</span></div>';
                }
            } else {
                container.innerHTML = '<div class="service-rating"><span style="color: #999;">Noch keine Bewertung für diese Dienstleistung</span></div>';
            }
        } catch (error) {
            console.error('Fehler beim Laden der Bewertung:', error);
            container.innerHTML = '<div class="service-rating"><span style="color: #999;">Bewertung nicht verfügbar</span></div>';
        }
    }

    function createServiceCard({ username, serviceTypeName, isOffer, marketClient, marketProvider, serviceId, id, typeId, providerId }) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'service-item';
        
        // Try to get the username from multiple possible sources
        const displayUsername = username || 
            (marketClient && marketClient.user && marketClient.user.name ? marketClient.user.name : 
                (marketProvider && marketProvider.user && marketProvider.user.name ? marketProvider.user.name : 'Unbekannter Benutzer'));
        
        // Try to get the service type from multiple possible sources
        const displayServiceType = serviceTypeName || 
            (marketProvider && marketProvider.serviceType && marketProvider.serviceType.name ? 
                marketProvider.serviceType.name : 'Unbekannter Dienstleistungstyp');
        
        // Get service ID from various sources
        const finalServiceId = serviceId || id || null;
        
        // Get typeId and providerId from various sources
        const finalTypeId = typeId || (marketProvider?.serviceType?.id) || (marketClient?.serviceType?.id) || null;
        const finalProviderId = providerId || (marketProvider?.user?.id) || (marketClient?.user?.id) || null;
        
        // Create the card without the rating first
        const cardHTML = `
            <div class="card ${isOffer ? 'offer-card' : 'demand-card'}">
                <div class="card-header">
                    <span class="badge ${isOffer ? 'provider' : 'client'}">${isOffer ? 'Angebot' : 'Nachfrage'}</span>
                </div>
                <div class="card-body">
                    <div class="service-info">
                        <p><strong>${displayUsername}</strong></p>
                        <p>${displayServiceType}</p>
                        ${isOffer ? '<div class="rating-container"><i class="fas fa-spinner fa-spin"></i> Bewertung wird geladen...</div>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        cardDiv.innerHTML = cardHTML;
        
        // If it's an offer, make it clickable and fetch rating
        if (isOffer && displayServiceType !== 'Unbekannter Dienstleistungstyp' && displayUsername !== 'Unbekannter Benutzer') {
            // Make card clickable
            cardDiv.classList.add('clickable');
            cardDiv.style.cursor = 'pointer';
            
            // Add click handler to open rating modal
            cardDiv.addEventListener('click', function(e) {
                if (finalServiceId && finalTypeId && finalProviderId) {
                    openRatingModal(finalServiceId, displayUsername, displayServiceType, finalTypeId, finalProviderId);
                } else {
                    console.warn('Service ID, TypeId or ProviderId not found for rating');
                    alert('Bewertung nicht möglich: Fehlende Daten');
                }
            });
            
            // Load rating specific to this TypeOfService + Provider combination
            const ratingContainer = cardDiv.querySelector('.rating-container');
            if (ratingContainer && finalTypeId && finalProviderId) {
                loadRatingByTypeAndProvider(finalTypeId, finalProviderId, ratingContainer);
            }
        }
        
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

    function createServicesSection() {
        const matchesContainer = document.getElementById('matchesContainer');
        
        // Main Services Section
        const mainServicesSection = document.createElement('div');
        mainServicesSection.className = 'main-services-section';
        mainServicesSection.innerHTML = '<h3><i class="fas fa-clipboard-list"></i> Dienstleistungen</h3>';

        // Get unique service types from actual services
        const usedServiceTypes = [...new Set(allServices.map(service => service.serviceTypeName))];

        // Horizontal scrolling service types
        const serviceTypesNav = document.createElement('nav');
        serviceTypesNav.className = 'service-types-nav';
        
        const allTypesBtn = document.createElement('button');
        allTypesBtn.className = 'service-type-btn active';
        allTypesBtn.dataset.type = 'all';
        allTypesBtn.innerHTML = '<i class="fas fa-list"></i> Alle Services';
        
        const serviceTypesList = document.createElement('div');
        serviceTypesList.className = 'service-types-list';
        serviceTypesList.appendChild(allTypesBtn);
        
        // Nur die verwendeten Service-Typen anzeigen
        usedServiceTypes.forEach(type => {
            const button = document.createElement('button');
            button.className = 'service-type-btn';
            button.dataset.type = type;
            button.innerHTML = `<i class="fas fa-tags"></i> ${type}`;
            serviceTypesList.appendChild(button);
        });

        serviceTypesNav.appendChild(serviceTypesList);
        mainServicesSection.appendChild(serviceTypesNav);

        // Filter for Angebot/Nachfrage
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        
        // Base filter HTML
        let filterHTML = `
            <select class="offer-filter">
                <option value="all">Alle anzeigen</option>
                <option value="offer">Nur Angebote</option>
                <option value="demand">Nur Nachfragen</option>
            </select>
            <select class="rating-filter" style="display: none;">
                <option value="all">Alle Bewertungen</option>
                <option value="4+">4+ Sterne</option>
                <option value="3+">3+ Sterne</option>
                <option value="2+">2+ Sterne</option>
                <option value="1+">1+ Sterne</option>
                <option value="unrated">Ohne Bewertung</option>
            </select>
            <select class="sort-filter">
                <option value="none">Standard Sortierung</option>
                <option value="rating-desc">Bewertung (hoch → niedrig)</option>
                <option value="rating-asc">Bewertung (niedrig → hoch)</option>
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
            </select>
        `;
        
        filterContainer.innerHTML = filterHTML;
        mainServicesSection.appendChild(filterContainer);

        // Services display container
        const servicesDisplay = document.createElement('div');
        servicesDisplay.id = 'servicesContainer';
        servicesDisplay.className = 'services-display';
        mainServicesSection.appendChild(servicesDisplay);

        matchesContainer.appendChild(mainServicesSection);

        // Event Listeners
        const typeButtons = serviceTypesNav.querySelectorAll('.service-type-btn');
        typeButtons.forEach(button => {
            button.addEventListener('click', () => {
                typeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentServiceType = button.dataset.type;
                filterAndDisplayServices();
            });
        });

        const offerFilter = filterContainer.querySelector('.offer-filter');
        const ratingFilter = filterContainer.querySelector('.rating-filter');
        
        offerFilter.addEventListener('change', (e) => {
            currentFilterType = e.target.value;
            
            // Show/hide rating filter based on selection
            if (e.target.value === 'offer' || e.target.value === 'all') {
                ratingFilter.style.display = 'inline-block';
            } else {
                ratingFilter.style.display = 'none';
                currentRatingFilter = 'all'; // Reset rating filter when hidden
            }
            
            filterAndDisplayServices();
        });

        ratingFilter.addEventListener('change', (e) => {
            currentRatingFilter = e.target.value;
            filterAndDisplayServices();
        });

        const sortFilter = filterContainer.querySelector('.sort-filter');
        sortFilter.addEventListener('change', (e) => {
            currentSortOption = e.target.value;
            filterAndDisplayServices();
        });
    }

    // Load ratings for all services
    async function loadRatingsForServices(services) {
        for (let service of services) {
            if (service.isOffer && service.username !== 'Unbekannter Benutzer' && service.serviceTypeName !== 'Unbekannter Dienstleistungstyp') {
                try {
                    const rating = await getUserServiceRating(service.username, service.serviceTypeName);
                    service.rating = rating;
                } catch (error) {
                    console.error('Fehler beim Laden der Bewertung für', service.username, service.serviceTypeName, error);
                    service.rating = 0;
                }
            } else {
                service.rating = null; // Not an offer, so no rating
            }
        }
        // After all ratings are loaded, update the display
        filterAndDisplayServices();
    }

    function filterAndDisplayServices() {
        let filteredServices = allServices.filter(service => {
            const typeMatch = currentServiceType === 'all' || service.serviceTypeName === currentServiceType;
            
            if (!typeMatch) return false;
            
            // Filter by offer/demand type
            let offerMatch = true;
            if (currentFilterType === 'offer') offerMatch = service.isOffer;
            else if (currentFilterType === 'demand') offerMatch = !service.isOffer;
            
            if (!offerMatch) return false;
            
            // Filter by rating (only applies to offers)
            let ratingMatch = true;
            if (currentRatingFilter !== 'all' && service.isOffer) {
                if (currentRatingFilter === 'unrated') {
                    ratingMatch = service.rating === null || service.rating === 0;
                } else {
                    const minRating = parseFloat(currentRatingFilter.replace('+', ''));
                    ratingMatch = service.rating !== null && service.rating >= minRating;
                }
            }
            
            return ratingMatch;
        });

        // Sort services
        if (currentSortOption !== 'none') {
            filteredServices.sort((a, b) => {
                switch (currentSortOption) {
                    case 'rating-desc':
                        const ratingA = a.rating || 0;
                        const ratingB = b.rating || 0;
                        return ratingB - ratingA;
                    case 'rating-asc':
                        const ratingA2 = a.rating || 0;
                        const ratingB2 = b.rating || 0;
                        return ratingA2 - ratingB2;
                    case 'name-asc':
                        return (a.username || '').localeCompare(b.username || '');
                    case 'name-desc':
                        return (b.username || '').localeCompare(a.username || '');
                    default:
                        return 0;
                }
            });
        }

        displayFilteredServices(filteredServices);
    }

    // Initial load
    if (navUsernameInput && navUsernameInput.value.trim()) {
        searchUserServices(navUsernameInput.value.trim());
    }
});
// ==================== RATING MODAL FUNCTIONALITY ====================

let currentRatingData = {
    serviceId: null,
    providerName: null,
    serviceType: null,
    typeId: null,
    providerId: null,
    selectedStars: 0
};

// Initialize rating modal functionality
function initializeRatingModal() {
    const stars = document.querySelectorAll('.stars-container i');
    const halfOverlays = document.querySelectorAll('.star-half-overlay');
    const commentTextarea = document.getElementById('ratingComment');
    const charCount = document.querySelector('.char-count');
    
    // Full star rating selection
    stars.forEach(star => {
        star.addEventListener('click', function(e) {
            // Check if clicked on half overlay
            const isHalfClick = e.target.classList.contains('star-half-overlay');
            if (!isHalfClick) {
                const rating = parseFloat(this.getAttribute('data-rating'));
                currentRatingData.selectedStars = rating;
                updateStarDisplay(rating);
                updateRatingValue(rating);
            }
        });
        
        star.addEventListener('mouseenter', function(e) {
            const isHalfHover = e.target.classList.contains('star-half-overlay');
            if (!isHalfHover) {
                const rating = parseFloat(this.getAttribute('data-rating'));
                updateStarDisplay(rating, true);
            }
        });
    });
    
    // Half star rating selection
    halfOverlays.forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            e.stopPropagation();
            const rating = parseFloat(this.getAttribute('data-rating'));
            currentRatingData.selectedStars = rating;
            updateStarDisplay(rating);
            updateRatingValue(rating);
        });
        
        overlay.addEventListener('mouseenter', function(e) {
            e.stopPropagation();
            const rating = parseFloat(this.getAttribute('data-rating'));
            updateStarDisplay(rating, true);
        });
    });
    
    // Reset stars on mouse leave
    document.querySelector('.stars-container').addEventListener('mouseleave', function() {
        updateStarDisplay(currentRatingData.selectedStars);
    });
    
    // Character count for comment
    if (commentTextarea) {
        commentTextarea.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = `${length} / 1000 Zeichen`;
        });
    }
}

function updateStarDisplay(rating, isHover = false) {
    const stars = document.querySelectorAll('.stars-container i');
    stars.forEach((star, index) => {
        const starValue = index + 1;
        const halfValue = index + 0.5;
        
        // Reset classes
        star.classList.remove('fas', 'far', 'fa-star-half-alt');
        
        if (rating >= starValue) {
            // Full star
            star.classList.add('fas', 'fa-star');
        } else if (rating >= halfValue) {
            // Half star
            star.classList.add('fas', 'fa-star-half-alt');
        } else {
            // Empty star
            star.classList.add('far', 'fa-star');
        }
    });
}

function updateRatingValue(rating) {
    const ratingValue = document.querySelector('.rating-value');
    if (rating === 0) {
        ratingValue.textContent = 'Keine Bewertung ausgewählt (0 Sterne)';
    } else if (rating % 1 === 0) {
        ratingValue.textContent = `${rating} ${rating === 1 ? 'Stern' : 'Sterne'}`;
    } else {
        ratingValue.textContent = `${rating} Sterne`;
    }
}

// Open rating modal for a service
window.openRatingModal = function(serviceId, providerName, serviceType, typeId, providerId) {
    currentRatingData = {
        serviceId: serviceId,
        providerName: providerName,
        serviceType: serviceType,
        typeId: typeId,
        providerId: providerId,
        selectedStars: 0
    };
    
    // Update modal display
    document.getElementById('ratingProviderName').textContent = providerName;
    document.getElementById('ratingServiceType').textContent = serviceType;
    document.getElementById('ratingComment').value = '';
    document.querySelector('.char-count').textContent = '0 / 1000 Zeichen';
    document.querySelector('.modal-message').style.display = 'none';
    document.querySelector('.modal-message').className = 'modal-message';
    
    // Reset stars
    updateStarDisplay(0);
    updateRatingValue(0);
    
    // Show modal
    document.getElementById('ratingModal').classList.add('active');
    
    // Initialize if not already done
    if (!window.ratingModalInitialized) {
        initializeRatingModal();
        window.ratingModalInitialized = true;
    }
};

// Close rating modal
window.closeRatingModal = function() {
    document.getElementById('ratingModal').classList.remove('active');
    currentRatingData = {
        serviceId: null,
        providerName: null,
        serviceType: null,
        typeId: null,
        providerId: null,
        selectedStars: 0
    };
};

// Submit rating
window.submitRating = async function() {
    const modalMessage = document.querySelector('.modal-message');
    const commentInput = document.getElementById('ratingComment');
    
    // Validation
    if (currentRatingData.selectedStars === 0) {
        showModalMessage('Bitte wähle eine Bewertung aus (1-5 Sterne)', 'error');
        return;
    }
    
    if (!currentRatingData.serviceId) {
        showModalMessage('Fehler: Service-ID nicht gefunden', 'error');
        return;
    }
    
    const comment = commentInput.value.trim();
    if (comment.length > 1000) {
        showModalMessage('Kommentar darf maximal 1000 Zeichen lang sein', 'error');
        return;
    }
    
    // Prepare request
    const ratingData = {
        serviceId: currentRatingData.serviceId,
        stars: currentRatingData.selectedStars,
        comment: comment || null
    };
    
    try {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ratingData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 409) {
                showModalMessage('Du hast diesen Service bereits bewertet', 'error');
            } else if (response.status === 404) {
                showModalMessage('Service nicht gefunden', 'error');
            } else if (response.status === 400) {
                showModalMessage(errorText || 'Ungültige Bewertungsdaten', 'error');
            } else {
                showModalMessage('Fehler beim Speichern der Bewertung', 'error');
            }
            return;
        }
        
        const result = await response.json();
        
        showModalMessage('Bewertung erfolgreich gespeichert!', 'success');
        
        // Close modal and reload ratings after 1.5 seconds
        setTimeout(() => {
            closeRatingModal();
            // Reload only the ratings instead of full page reload
            if (currentRatingData.typeId && currentRatingData.providerId) {
                // Find all rating containers for this type+provider combo and reload them
                const ratingContainers = document.querySelectorAll('.rating-container');
                ratingContainers.forEach(container => {
                    loadRatingByTypeAndProvider(currentRatingData.typeId, currentRatingData.providerId, container);
                });
            } else {
                // Fallback to page reload if IDs are not available
                window.location.reload();
            }
        }, 1500);
        
    } catch (error) {
        console.error('Fehler beim Absenden der Bewertung:', error);
        showModalMessage('Netzwerkfehler: Bewertung konnte nicht gespeichert werden', 'error');
    }
};

function showModalMessage(message, type) {
    const modalMessage = document.querySelector('.modal-message');
    modalMessage.textContent = message;
    modalMessage.className = `modal-message ${type}`;
    modalMessage.style.display = 'block';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('ratingModal');
    if (e.target === modal) {
        closeRatingModal();
    }
});

// Close modal with ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('ratingModal');
        if (modal && modal.classList.contains('active')) {
            closeRatingModal();
        }
    }
});

console.log('Rating modal functionality loaded');
