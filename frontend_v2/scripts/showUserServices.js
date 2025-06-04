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
                } else {
                    showMessage("Bitte gib einen Benutzernamen ein.", "error");
                }
            }
        });
    }

    function getActiveUser() {
        fetch("http://localhost:8080/user")
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
        fetch("http://localhost:8080/user", {
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
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/servicetype`)
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
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/service/relevant/${encodeURIComponent(username)}`)
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
        return fetch(`${backendUrl}/servicetype`)
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
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/market/${userId}`)
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
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/service/perfect-matches/${encodeURIComponent(username)}`)
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
        
        // If it's an offer, fetch and display the average rating
        if (offer === 1 && serviceTypeName !== 'Unbekannter Dienstleistungstyp' && username !== 'Unbekannter Benutzer') {
            const ratingContainer = cardDiv.querySelector('.rating-container');
            
            getUserServiceRating(username, serviceTypeName)
                .then(rating => {
                    if (ratingContainer) {
                        ratingContainer.innerHTML = generateStarHTML(rating);
                    }
                })
                .catch(error => {
                    console.error('Fehler beim Anzeigen der Bewertung:', error);
                    if (ratingContainer) {
                        ratingContainer.innerHTML = '<p class="error">Bewertung nicht verfügbar</p>';
                    }
                });
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
            const response = await fetch(`http://localhost:8080/review/average-rating/${encodeURIComponent(serviceTypeName)}`);
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
            const response = await fetch(`http://localhost:8080/review/average-rating/${encodeURIComponent(username)}/${encodeURIComponent(serviceTypeName)}`);
            if (response.ok) {
                return await response.json();
            }
            return 0;
        } catch (error) {
            console.error('Fehler beim Abrufen der benutzerspezifischen Bewertung:', error);
            return 0;
        }
    }

    // Generate HTML for star rating display
    function generateStarHTML(rating) {
        // Check if rating is null, undefined, or 0 (no rating)
        if (rating === null || rating === undefined || rating === 0) {
            return `<div class="service-rating"><i class="fas fa-question-circle" style="color: #dc3545; margin-right: 5px;"></i>Noch nicht bewertet</div>`;
        }
        
        let starsHTML = "";
        
        for (let i = 1; i <= 5; i++) {
            const decimal = rating - Math.floor(rating);
            
            if (i <= Math.floor(rating)) {
                // Full star
                starsHTML += `<i class="fas fa-star selected"></i>`;
            } else if (i === Math.ceil(rating) && decimal !== 0) {
                // Half or full star based on decimal value
                if (decimal >= 0.8) {
                    starsHTML += `<i class="fas fa-star selected"></i>`;
                } else if (decimal >= 0.4) {
                    starsHTML += `<i class="fas fa-star-half-alt selected"></i>`;
                } else {
                    starsHTML += `<i class="fas fa-star"></i>`;
                }
            } else {
                // Empty star
                starsHTML += `<i class="fas fa-star"></i>`;
            }
        }
        return `<div class="service-rating">${starsHTML} (${rating.toFixed(1)})</div>`;
    }

    function createServiceCard({ username, serviceTypeName, isOffer, marketClient, marketProvider }) {
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
        
        // If it's an offer, fetch and display the average rating
        if (isOffer && displayServiceType !== 'Unbekannter Dienstleistungstyp' && displayUsername !== 'Unbekannter Benutzer') {
            const ratingContainer = cardDiv.querySelector('.rating-container');
            
            getUserServiceRating(displayUsername, displayServiceType)
                .then(rating => {
                    if (ratingContainer) {
                        ratingContainer.innerHTML = generateStarHTML(rating);
                    }
                })
                .catch(error => {
                    console.error('Fehler beim Anzeigen der Bewertung:', error);
                    if (ratingContainer) {
                        ratingContainer.innerHTML = '<p class="error">Bewertung nicht verfügbar</p>';
                    }
                });
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