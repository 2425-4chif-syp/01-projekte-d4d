document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const userServiceResults = document.getElementById('userServiceResults');
    const responseMessage = document.querySelector('.response-message');
    const marketButton = document.getElementById('marketButton');
    const offerButton = document.getElementById('offerButton');
    
    let allPerfectMatches = [];
    let allServices = [];
    let serviceTypes = [];
    let currentServiceType = 'all';
    let currentFilterType = 'all';
    let currentPerfectMatchUser = 'all';

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

    // Add filter functionality
    const perfectMatchFilter = document.getElementById('perfectMatchFilter');
    const serviceFilter = document.getElementById('serviceFilter');
    const serviceTypeFilter = document.getElementById('serviceTypeFilter');

    perfectMatchFilter.addEventListener('input', () => {
        filterPerfectMatches(allPerfectMatches);
    });

    serviceFilter.addEventListener('input', () => {
        filterServices(allServices);
    });

    serviceTypeFilter.addEventListener('change', () => {
        filterServices(allServices);
    });

    function filterPerfectMatches(matches) {
        const filterText = perfectMatchFilter.value.toLowerCase();
        const filteredMatches = matches.filter(match => {
            return match.username.toLowerCase().includes(filterText) ||
                   match.serviceTypeName.toLowerCase().includes(filterText);
        });
        
        displayFilteredPerfectMatches(filteredMatches);
    }

    function filterServices(services) {
        const filterText = serviceFilter.value.toLowerCase();
        const filterType = serviceTypeFilter.value;
        
        const filteredServices = services.filter(service => {
            const textMatch = service.username.toLowerCase().includes(filterText) ||
                            service.serviceTypeName.toLowerCase().includes(filterText);
            
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
        showMessage('Suche nach Dienstleistungen...', 'info');
        
        fetchServiceTypes()
            .then(types => {
                serviceTypes = types;
                return getPerfectMatches(username);
            })
            .then(pm => {
                if (pm && pm.length > 0) {
                    return Promise.all(pm.map(market => 
                        Promise.all([
                            getServiceTypeName(market.serviceType_ID),
                            getUserName(market.user_ID)
                        ]).then(([serviceTypeName, username]) => ({
                            ...market,
                            serviceTypeName,
                            username
                        }))
                    )).then(enrichedMatches => {
                        allPerfectMatches = enrichedMatches;
                        createPerfectMatchesSection(enrichedMatches);
                        showMessage(`Perfekte Übereinstimmungen für ${username}`, 'success');
                        return [enrichedMatches, username];
                    });
                }
                return [[], username];
            })
            .then(([perfectMatches, username]) => {
                return getUserServices(username).then(services => [services, perfectMatches]);
            })
            .then(([services, perfectMatches]) => {
                if (services && services.length > 0) {
                    const filteredServices = removePerfectMatches(services, perfectMatches);
                    
                    if (filteredServices.length > 0) {
                        return Promise.all(filteredServices.map(market => 
                            Promise.all([
                                getServiceTypeName(market.serviceType_ID),
                                getUserName(market.user_ID)
                            ]).then(([serviceTypeName, username]) => ({
                                ...market,
                                serviceTypeName,
                                username,
                                isOffer: market.offer === 1
                            }))
                        )).then(enrichedServices => {
                            allServices = enrichedServices;
                            createServicesSection();
                            setTimeout(() => filterAndDisplayServices(), 0);
                            showMessage(`Gefundene Dienstleistungen für ${username}`, 'success');
                        });
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
        const uniqueUsers = [...new Set(perfectMatches.map(match => match.username))];
        
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
            return currentPerfectMatchUser === 'all' || match.username === currentPerfectMatchUser;
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
        return fetch(`${backendUrl}/d4d/serviceTypes`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Fehler beim Abrufen der Service-Typen");
                }
                return response.text();
            })
            .then(text => text.split('|').filter(type => type.trim()));
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

    // Function to get perfect matches
    function getPerfectMatches(username) {
        const backendUrl = 'http://localhost:8080';
        return fetch(`${backendUrl}/d4d/${encodeURIComponent(username)}/services/perfect-match`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Perfect matches fetch failed: ${response.status}`);
                }
                return response.json();
            })
            .then(matches => {
                // Wandle die rohen Perfect Matches in ein erweitertes Format um
                return Promise.all(matches.map(match =>
                    Promise.all([
                        getServiceTypeName(match.serviceType_ID),
                        getUserName(match.user_ID)
                    ]).then(([serviceTypeName, username]) => ({
                        ...match,
                        serviceTypeName,
                        username,
                        offer: match.offer
                    }))
                ));
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der perfekten Übereinstimmungen:', error);
                throw error;
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
            Promise.all([
                getServiceTypeName(market.serviceType_ID),
                getUserName(market.user_ID)
            ])
            .then(([serviceTypeName, username]) => {
                const card = createPerfectMatchCard({
                    username: username,
                    serviceTypeName: serviceTypeName
                });
                perfectMatchContainer.appendChild(card);
            })
            .catch(error => {
                console.error('Fehler beim Anzeigen des Perfect Matches:', error);
            });
        });
    }

    // Function to create a perfect-match service card -> gold, kein Angebot, Nachfrage
    function createPerfectMatchCard(service) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'service-item';
        
        cardDiv.innerHTML = `
            <div class="card perfect-match-card">
                <div class="card-header">
                    <span class="badge perfect-match">Perfect-Match</span>
                                        <span class="badge ${service.offer === 1 ? 'provider' : 'client'}">${service.offer === 1 ? 'Angebot' : 'Nachfrage'}</span>
                </div>
                <div class="card-body">
                    <div class="service-info">
                        <p><strong>${service.username}</strong></p>
                        <p>${service.serviceTypeName}</p>
                    </div>
                </div>
            </div>
        `;
        
        return cardDiv;
    }

    // Function to remove perfect matches from normal services
    function removePerfectMatches(services, perfectMatches) {
        return services.filter(service => {
            return !perfectMatches.some(pm => pm.serviceType_ID === service.serviceType_ID && pm.user_ID === service.user_ID);
        });
    }

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

    function createServiceCard({ username, serviceTypeName, isOffer }) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'service-item';
        
        cardDiv.innerHTML = `
            <div class="card ${isOffer ? 'offer-card' : 'demand-card'}">
                <div class="card-header">
                    <span class="badge ${isOffer ? 'provider' : 'client'}">${isOffer ? 'Angebot' : 'Nachfrage'}</span>
                </div>
                <div class="card-body">
                    <div class="service-info">
                        <p><strong>${username}</strong></p>
                        <p>${serviceTypeName}</p>
                    </div>
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
        filterContainer.innerHTML = `
            <select class="offer-filter">
                <option value="all">Alle anzeigen</option>
                <option value="offer">Nur Angebote</option>
                <option value="demand">Nur Nachfragen</option>
            </select>
        `;
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
        offerFilter.addEventListener('change', (e) => {
            currentFilterType = e.target.value;
            filterAndDisplayServices();
        });
    }

    function filterAndDisplayServices() {
        const filteredServices = allServices.filter(service => {
            const typeMatch = currentServiceType === 'all' || service.serviceTypeName === currentServiceType;
            
            if (!typeMatch) return false;
            if (currentFilterType === 'all') return true;
            if (currentFilterType === 'offer') return service.isOffer;
            if (currentFilterType === 'demand') return !service.isOffer;
            
            return true;
        });

        displayFilteredServices(filteredServices);
    }

    // Initial load
    if (usernameInput.value.trim()) {
        searchUserServices(usernameInput.value.trim());
    }
});