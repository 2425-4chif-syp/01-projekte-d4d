import { API_URL } from './config.js';
import { sessionManager } from './session-manager.js';

document.addEventListener('DOMContentLoaded', async function() {
    const responseMessage = document.querySelector('.response-message');
    
    let allPerfectMatches = [];
    let allServices = [];
    let serviceTypes = [];
    let currentServiceType = 'all';
    let currentFilterType = 'all';
    let currentPerfectMatchUser = 'all';
    let currentRatingFilter = 'all';
    let currentSortOption = 'none';

    // Initialize session first (for guest mode)
    await sessionManager.init();
    
    getActiveUser();

    function getActiveUser() {
        fetch(`${API_URL}/user`, {
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Fehler beim Abrufen des aktiven Benutzers");
                }
                return response.text();
            })
            .then(responseText => {
                try {
                    const responseJson = JSON.parse(responseText);
                    const username = responseJson.username || "Gast-Modus";
                    
                    // Lade direkt die Services des aktiven Benutzers, wenn einer angemeldet ist
                    if (username && username !== "Gast-Modus") {
                        searchUserServices(username);
                    } else {
                        // Guest mode: Load session matches
                        loadGuestMatches();
                    }
                } catch (e) {
                    // Falls die Antwort kein gültiges JSON ist, verwende den Text direkt
                    const username = responseText && responseText.trim() !== "" ? responseText : "Gast-Modus";
                    
                    if (username !== "" && username !== "Gast-Modus") {
                        searchUserServices(username);
                    } else {
                        // Guest mode: Load session matches
                        loadGuestMatches();
                    }
                }
            })
            .catch(error => {
                console.error("Fehler beim Abrufen des aktiven Benutzers:", error);
                // Guest mode: Load session matches
                loadGuestMatches();
            });
    }

    // Function to load guest matches based on session
    async function loadGuestMatches() {
        if (!sessionManager || !sessionManager.sessionId) {
            console.warn('No session ID available for guest');
            showMessage("Wähle zuerst Services aus, um Matches zu sehen.", "info");
            return;
        }

        const matchesContainer = document.getElementById('matchesContainer');
        matchesContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Lade deine Matches...</div>';

        try {
            const response = await fetch(`${API_URL}/session/${sessionManager.sessionId}/matches`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    matchesContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Matches gefunden. Wähle zuerst einige Fächer aus!</div>';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const matches = await response.json();
            console.log('Guest matches loaded:', matches);

            if (!matches || matches.length === 0) {
                matchesContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Keine Matches gefunden. Wähle zuerst einige Fächer aus!</div>';
                return;
            }

            // Process matches to display
            allServices = matches.map((match, index) => ({
                id: `guest-match-${index}`,
                username: match.user?.name || 'Unbekannter Benutzer',
                serviceTypeName: match.serviceType?.name || 'Unbekannter Service',
                isOffer: match.offer === 1 || match.offer === true,
                typeId: match.serviceType?.id,
                providerId: match.user?.id,
                rating: null,
                isPerfectMatch: match.isPerfectMatch || false,
                offer: match.offer // Backend gibt 0 oder 1
            }));

            console.log('Processed guest matches:', allServices);
            console.log('Match details:', allServices.map(s => ({ 
                username: s.username, 
                service: s.serviceTypeName, 
                offer: s.offer,
                isOffer: s.isOffer,
                isPerfectMatch: s.isPerfectMatch 
            })));

            // Separiere Perfect Matches von normalen Matches
            let perfectMatches = allServices.filter(s => s.isPerfectMatch);
            const regularMatches = allServices.filter(s => !s.isPerfectMatch);
            
            console.log('Guest Perfect Matches RAW:', perfectMatches.map(s => ({
                username: s.username,
                service: s.serviceTypeName,
                offer: s.offer,
                isOffer: s.isOffer
            })));
            
            // Perfect Matches werden unverändert angezeigt - das Backend hat bereits
            // die richtige Logik: offer=1 bedeutet "User bietet an", offer=0 bedeutet "User sucht"
            // Wir müssen sie NICHT umgruppieren, nur direkt anzeigen
            
            console.log('Guest Perfect Matches:', perfectMatches.length);
            console.log('Guest Regular Matches:', regularMatches.length);

            // Load ratings
            await loadRatingsForServices(allServices);

            // Zeige Perfect Matches Section wenn vorhanden
            if (perfectMatches.length > 0) {
                // Erstelle Perfect Match Section mit gleicher Struktur wie für eingeloggte User
                const matchesContainer = document.getElementById('matchesContainer');
                const perfectMatchSection = document.createElement('div');
                perfectMatchSection.className = 'main-services-section perfect-matches';
                perfectMatchSection.innerHTML = '<h3><i class="fas fa-star"></i> Perfect Matches</h3>';

                const perfectMatchContainer = document.createElement('div');
                perfectMatchContainer.id = 'perfectMatchContainer';
                perfectMatchContainer.className = 'services-display';
                
                perfectMatchSection.appendChild(perfectMatchContainer);
                matchesContainer.appendChild(perfectMatchSection);
                
                // Verwende die gleiche Funktion wie für eingeloggte User
                displayFilteredPerfectMatches(perfectMatches);
            }

            // Setze nur reguläre Matches für die normale Anzeige
            allServices = regularMatches;

            // Create and display services section
            createServicesSection();
            filterAndDisplayServices();

        } catch (error) {
            console.error('Error loading guest matches:', error);
            matchesContainer.innerHTML = '<div class="no-results"><i class="fas fa-exclamation-triangle"></i> Fehler beim Laden der Matches.</div>';
        }
    }

    // Guest Perfect Matches Section
    function createGuestPerfectMatchesSection(perfectMatches) {
        const matchesContainer = document.getElementById('matchesContainer');
        
        const perfectMatchSection = document.createElement('div');
        perfectMatchSection.className = 'main-services-section perfect-matches';
        perfectMatchSection.innerHTML = '<h3><i class="fas fa-star"></i> Perfect Matches</h3>';

        const perfectMatchContainer = document.createElement('div');
        perfectMatchContainer.id = 'perfectMatchContainer';
        perfectMatchContainer.className = 'services-display';
        
        // Gruppiere nach User
        const matchesByUser = {};
        perfectMatches.forEach(match => {
            const userId = match.providerId || match.user?.id;
            const username = match.username;
            const key = `${userId}-${username}`;
            
            if (!matchesByUser[key]) {
                matchesByUser[key] = {
                    username: username,
                    userId: userId,
                    matches: []
                };
            }
            matchesByUser[key].matches.push(match);
        });
        
        // Erstelle für jede Gruppe einen eigenen Bereich mit Perfect Match Styling (wie bei eingeloggten Usern)
        Object.values(matchesByUser).forEach(userGroup => {
            // Erstelle Gruppen-Container für Perfect Matches
            const groupDiv = document.createElement('div');
            groupDiv.className = 'service-group group-perfect-match';
            
            // Erstelle Gruppen-Header für Perfect Matches
            const headerDiv = document.createElement('div');
            headerDiv.className = 'service-group-header';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'service-group-title';
            titleDiv.innerHTML = `
                <span class="group-icon"><i class="fas fa-star"></i></span>
                <h3>${userGroup.username}</h3>
                <div class="group-user-rating"><i class="fas fa-spinner fa-spin"></i> Lade Bewertung...</div>
            `;
            
            headerDiv.appendChild(titleDiv);
            
            // Lade User-Bewertung für den Group Header
            const userRatingContainer = titleDiv.querySelector('.group-user-rating');
            if (userRatingContainer && userGroup.username !== 'Unbekannter Benutzer') {
                loadUserRatingForGroup(userGroup.username, userRatingContainer);
            }
            
            // Erstelle Grid für Perfect Matches dieser Gruppe
            const gridDiv = document.createElement('div');
            gridDiv.className = 'service-grid';
            
            userGroup.matches.forEach(match => {
                const card = createPerfectMatchCard(match);
                gridDiv.appendChild(card);
            });
            
        });
        
        perfectMatchSection.appendChild(perfectMatchContainer);
        matchesContainer.appendChild(perfectMatchSection);
    }

    // Funktion, um einen Benutzer als aktiv zu markieren
    function setActiveUser(username) {
        fetch(`${API_URL}/user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include',
            body: JSON.stringify({ username: username })
        })
        .then(response => {
            if (response.ok) {
                return response.text().then(msg => {
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
                console.log('Raw services from API:', services?.length || 0);
                console.log('Perfect matches:', perfectMatches?.length || 0);
                
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
                        console.log('Processing services for user:', username);
                        console.log('Raw services from backend:', allAvailableServices.length);
                        
                        // Schritt 1: Services eindeutig machen basierend auf Service-ID
                        const uniqueRawServices = [];
                        const seenServiceIds = new Set();
                        
                        allAvailableServices.forEach((service, index) => {
                            const serviceId = service.id;
                            if (!serviceId) {
                                console.warn(`Service at index ${index} has no ID:`, service);
                                return;
                            }
                            
                            if (seenServiceIds.has(serviceId)) {
                                console.log(`Skipping duplicate service ID ${serviceId}`);
                                return;
                            }
                            
                            seenServiceIds.add(serviceId);
                            uniqueRawServices.push(service);
                        });
                        
                        console.log('After ID deduplication:', uniqueRawServices.length);
                        
                        // Schritt 2: Services verarbeiten - nur die, wo BEIDE User beteiligt sind
                        const processedServices = [];
                        const currentUsername = username; // Der gesuchte User
                        
                        uniqueRawServices.forEach((service, index) => {
                            const providerName = service.marketProvider?.user?.name;
                            const clientName = service.marketClient?.user?.name;
                            
                            // Prüfe ob der gesuchte User an diesem Service beteiligt ist
                            const isProvider = providerName === currentUsername;
                            const isClient = clientName === currentUsername;
                            
                            if (!isProvider && !isClient) {
                                // Gesuchter User ist NICHT an diesem Service beteiligt - überspringe
                                if (index < 3) {
                                    console.log(`Service ${service.id} doesn't involve ${currentUsername} (Provider: ${providerName}, Client: ${clientName})`);
                                }
                                return;
                            }
                            
                            // Logge Details für Debugging
                            if (index < 3) {
                                console.log(`Processing service ${service.id}:`, {
                                    provider: providerName,
                                    client: clientName,
                                    providerType: service.marketProvider?.serviceType?.name,
                                    clientType: service.marketClient?.serviceType?.name,
                                    providerOffer: service.marketProvider?.offer,
                                    clientOffer: service.marketClient?.offer,
                                    currentUserRole: isProvider ? 'Provider' : 'Client'
                                });
                            }
                            
                            // Bestimme den "anderen" User (den Partner in diesem Service)
                            let otherUsername;
                            let serviceTypeName;
                            let isOffer;
                            let typeId;
                            let providerId;
                            
                            if (isProvider) {
                                // Gesuchter User ist Provider -> zeige den Client
                                otherUsername = clientName || 'Unbekannter Benutzer';
                                serviceTypeName = service.marketClient?.serviceType?.name || 'Unbekannter Dienstleistungstyp';
                                isOffer = service.marketClient?.offer === 1;
                                typeId = service.marketClient?.serviceType?.id;
                                providerId = service.marketClient?.user?.id;
                            } else {
                                // Gesuchter User ist Client -> zeige den Provider
                                otherUsername = providerName || 'Unbekannter Benutzer';
                                serviceTypeName = service.marketProvider?.serviceType?.name || 'Unbekannter Dienstleistungstyp';
                                isOffer = service.marketProvider?.offer === 1;
                                typeId = service.marketProvider?.serviceType?.id;
                                providerId = service.marketProvider?.user?.id;
                            }
                            
                            // Nur gültige Services hinzufügen
                            if (otherUsername && otherUsername !== 'Unbekannter Benutzer' && 
                                serviceTypeName && serviceTypeName !== 'Unbekannter Dienstleistungstyp') {
                                processedServices.push({
                                    ...service,
                                    username: otherUsername,
                                    serviceTypeName,
                                    isOffer,
                                    typeId,
                                    providerId,
                                    rating: null
                                });
                            } else {
                                console.log(`Skipping invalid service ${service.id}: ${otherUsername} - ${serviceTypeName}`);
                            }
                        });
                        
                        console.log('After processing and filtering:', processedServices.length);
                        
                        // Schritt 3: Content-basierte Deduplizierung
                        // Entferne Services mit identischem Content (Username + ServiceType + isOffer)
                        const finalServices = [];
                        const contentKeys = new Set();
                        
                        processedServices.forEach(service => {
                            // Erstelle einen eindeutigen Content-Key
                            const contentKey = `${service.username}|${service.serviceTypeName}|${service.isOffer}`;
                            
                            if (contentKeys.has(contentKey)) {
                                console.log(`Removing duplicate content: ${contentKey} (ID: ${service.id})`);
                                return;
                            }
                            
                            contentKeys.add(contentKey);
                            finalServices.push(service);
                        });
                        
                        console.log('After content deduplication:', finalServices.length);
                        
                        // Schritt 4: Entferne Services, die bereits in Perfect Matches sind
                        // Erstelle Set von Perfect Match IDs
                        const perfectMatchIds = new Set();
                        if (perfectMatches && perfectMatches.length > 0) {
                            perfectMatches.forEach(pm => {
                                if (pm.id) perfectMatchIds.add(pm.id);
                            });
                            console.log('Perfect Match IDs to exclude:', Array.from(perfectMatchIds));
                        }
                        
                        // Filtere Services, die NICHT in Perfect Matches sind
                        const servicesWithoutPerfectMatches = finalServices.filter(service => {
                            const isPerfectMatch = perfectMatchIds.has(service.id);
                            if (isPerfectMatch) {
                                console.log(`Removing service ${service.id} (${service.username} - ${service.serviceTypeName}) because it's a Perfect Match`);
                            }
                            return !isPerfectMatch;
                        });
                        
                        console.log('After removing Perfect Matches:', servicesWithoutPerfectMatches.length);
                        allServices = servicesWithoutPerfectMatches;

                        console.log('Mapped services before deduplication:', allServices.length);
                        
                        // Finale Validierung und Benutzer-Statistiken
                        const userCounts = {};
                        allServices.forEach(service => {
                            userCounts[service.username] = (userCounts[service.username] || 0) + 1;
                        });
                        
                        console.log('Final service counts per user:');
                        Object.keys(userCounts).forEach(username => {
                            console.log(`- ${username}: ${userCounts[username]} service(s)`);
                            if (userCounts[username] > 5) {
                                console.warn(`⚠️ User "${username}" has ${userCounts[username]} services - this might be unusual`);
                            }
                        });
                        
                        console.log('Final processed services:', allServices.length);

                        // Load ratings for all offer services
                        loadRatingsForServices(allServices);
                        
                        createServicesSection();
                        setTimeout(() => filterAndDisplayServices(), 0);
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
        
        // Perfect Matches Section - Vereinfacht für Gruppierung
        const perfectMatchSection = document.createElement('div');
        perfectMatchSection.className = 'main-services-section perfect-matches';
        perfectMatchSection.innerHTML = '<h3><i class="fas fa-star"></i> Perfect Matches</h3>';

        // Container für Perfect Matches
        const perfectMatchContainer = document.createElement('div');
        perfectMatchContainer.id = 'perfectMatchContainer';
        perfectMatchContainer.className = 'services-display';
        perfectMatchSection.appendChild(perfectMatchContainer);

        matchesContainer.appendChild(perfectMatchSection);

        // Zeige alle Perfect Matches mit Gruppierung an
        displayFilteredPerfectMatches(perfectMatches);
    }

    async function filterAndDisplayPerfectMatches() {
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
            
            // Extract IDs - prioritize serviceId from enriched Perfect Match data
            const serviceId = service.serviceId || service.id || null;
            const typeId = service.typeId || 
                          (service.serviceType && service.serviceType.id) || 
                          (service.marketProvider && service.marketProvider.serviceType && service.marketProvider.serviceType.id) ||
                          (service.marketClient && service.marketClient.serviceType && service.marketClient.serviceType.id) || null;
            const providerId = service.providerId || 
                              (service.user && service.user.id) ||
                              (service.marketProvider && service.marketProvider.user && service.marketProvider.user.id) ||
                              (service.marketClient && service.marketClient.user && service.marketClient.user.id) || null;
            
            console.log('Perfect Match Card Data:', { serviceId, typeId, providerId, username, serviceTypeName });
            
            // Warnung wenn keine Service-ID vorhanden ist
            if (!serviceId) {
                console.warn('⚠️ Keine Service-ID für Perfect Match gefunden:', { service, username, serviceTypeName });
            }
            
            // Add click handler: check if current user can review this service first
            cardDiv.addEventListener('click', function(e) {
                if (!serviceId) {
                    console.warn('Service ID not found for rating:', { serviceId, typeId, providerId, service });
                    alert('Bewertung nicht möglich: Fehlende Daten');
                    return;
                }

                fetch(`${API_URL}/reviews/can-review/${serviceId}`, {
                    credentials: 'include'
                })
                .then(resp => resp.json())
                .then(data => {
                    if (data && data.canReview) {
                        openRatingModal(serviceId, username, serviceTypeName, typeId, providerId);
                    } else {
                        // Show immediate feedback that the service was already reviewed
                        showMessage('Du hast diese Dienstleistung bereits bewertet!', 'info');
                    }
                })
                .catch(err => {
                    console.error('Fehler beim Prüfen, ob bewertet werden kann:', err);
                    showMessage('Fehler beim Prüfen der Bewertungserlaubnis', 'error');
                });
            });
            
            // Load rating specific to this TypeOfService + Provider combination
            const ratingContainer = cardDiv.querySelector('.rating-container');
            if (ratingContainer && typeId && providerId) {
                console.log('Loading rating for Perfect Match:', { typeId, providerId, username });
                loadRatingByTypeAndProvider(typeId, providerId, ratingContainer);
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

        // Gruppiere Perfect Matches nach Benutzername
        const groupedMatches = groupPerfectMatchesByUser(matches);
        
        // Erstelle für jede Gruppe einen eigenen Bereich mit Perfect Match Styling
        Object.keys(groupedMatches).forEach(username => {
            const userMatches = groupedMatches[username];
            
            // Erstelle Gruppen-Container für Perfect Matches
            const groupDiv = document.createElement('div');
            groupDiv.className = 'service-group group-perfect-match';
            
            // Erstelle Gruppen-Header für Perfect Matches
            const headerDiv = document.createElement('div');
            headerDiv.className = 'service-group-header';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'service-group-title';
            titleDiv.innerHTML = `
                <span class="group-icon"><i class="fas fa-star"></i></span>
                <h3>${username}</h3>
                <div class="group-user-rating"><i class="fas fa-spinner fa-spin"></i> Lade Bewertung...</div>
            `;
            
            headerDiv.appendChild(titleDiv);
            
            // Lade User-Bewertung für den Group Header
            const userRatingContainer = titleDiv.querySelector('.group-user-rating');
            if (userRatingContainer && username !== 'Unbekannter Benutzer') {
                loadUserRatingForGroup(username, userRatingContainer);
            }
            
            // Erstelle Grid für Perfect Matches dieser Gruppe
            const gridDiv = document.createElement('div');
            gridDiv.className = 'service-grid';
            
            userMatches.forEach(match => {
                const card = createPerfectMatchCard(match);
                gridDiv.appendChild(card);
            });
            
            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(gridDiv);
            perfectMatchContainer.appendChild(groupDiv);
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

        // Gruppiere Services nach Benutzername
        const groupedServices = groupServicesByUser(services);
        
        // Erstelle für jede Gruppe einen eigenen Bereich
        Object.keys(groupedServices).forEach(username => {
            const userServices = groupedServices[username];
            
            // Erstelle Gruppen-Container
            const groupDiv = document.createElement('div');
            groupDiv.className = 'service-group group-user';
            
            // Erstelle Gruppen-Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'service-group-header';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'service-group-title';
            titleDiv.innerHTML = `
                <span class="group-icon"><i class="fas fa-user"></i></span>
                <h3>${username}</h3>
                <div class="group-user-rating"><i class="fas fa-spinner fa-spin"></i> Lade Bewertung...</div>
            `;
            
            const countDiv = document.createElement('div');
            countDiv.className = 'service-group-count';
            countDiv.textContent = `${userServices.length} ${userServices.length === 1 ? 'Service' : 'Services'}`;
            
            headerDiv.appendChild(titleDiv);
            headerDiv.appendChild(countDiv);
            
            // Lade User-Bewertung für den Group Header
            const userRatingContainer = titleDiv.querySelector('.group-user-rating');
            if (userRatingContainer && username !== 'Unbekannter Benutzer') {
                loadUserRatingForGroup(username, userRatingContainer);
            }
            
            // Erstelle Grid für Services dieser Gruppe
            const gridDiv = document.createElement('div');
            gridDiv.className = 'service-grid';
            
            userServices.forEach(service => {
                const card = createServiceCard(service);
                gridDiv.appendChild(card);
            });
            
            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(gridDiv);
            servicesContainer.appendChild(groupDiv);
        });
    }
    
    // Hilfsfunktion zum Gruppieren von Services nach Benutzername
    function groupServicesByUser(services) {
        const groups = {};
        const processedIds = new Set(); // Verhindere Duplikate
        
        console.log('Grouping services:', services.length, 'total services');
        
        services.forEach((service, index) => {
            const username = service.username || 'Unbekannter Benutzer';
            const serviceId = service.id || service.serviceId || `temp-${index}`;
            
            // Prüfe auf Duplikate
            if (processedIds.has(serviceId)) {
                console.warn('Duplicate service found:', serviceId, username);
                return; // Überspringe Duplikate
            }
            
            processedIds.add(serviceId);
            
            if (!groups[username]) {
                groups[username] = [];
            }
            
            groups[username].push(service);
        });
        
        // Debugging: Zeige Gruppierung
        Object.keys(groups).forEach(username => {
            console.log(`Group "${username}":`, groups[username].length, 'services');
            if (groups[username].length > 10) {
                console.warn(`⚠️ Unusual high count for user "${username}":`, groups[username].length);
            }
        });
        
        return groups;
    }
    
    // Hilfsfunktion zum Gruppieren von Perfect Matches nach Benutzername
    function groupPerfectMatchesByUser(matches) {
        const groups = {};
        const processedIds = new Set();
        
        console.log('Grouping perfect matches:', matches.length, 'total matches');
        
        matches.forEach((match, index) => {
            // Extrahiere Username aus verschiedenen möglichen Quellen
            const username = match.username || 
                           (match.user && match.user.name) || 
                           (match.marketProvider && match.marketProvider.user && match.marketProvider.user.name) ||
                           (match.marketClient && match.marketClient.user && match.marketClient.user.name) ||
                           'Unbekannter Benutzer';
            
            const matchId = match.id || match.serviceId || `perfect-${index}`;
            
            // Prüfe auf Duplikate
            if (processedIds.has(matchId)) {
                console.warn('Duplicate perfect match found:', matchId, username);
                return;
            }
            
            processedIds.add(matchId);
            
            if (!groups[username]) {
                groups[username] = [];
            }
            
            groups[username].push(match);
        });
        
        // Debugging für Perfect Matches
        Object.keys(groups).forEach(username => {
            console.log(`Perfect Match Group "${username}":`, groups[username].length, 'matches');
        });
        
        return groups;
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

    // Load user rating for group header (compact version)
    async function loadUserRatingForGroup(username, container) {
        if (!username || !container) {
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`);
            if (response.ok) {
                const stats = await response.json();
                
                // Generate compact rating HTML for group header
                if (stats.averageRating && stats.averageRating > 0) {
                    container.innerHTML = `<span class="group-rating-stars">⭐ ${stats.averageRating.toFixed(1)}</span> <span class="group-rating-count">(${stats.totalReviews})</span>`;
                } else {
                    container.innerHTML = '<span style="color: #999; font-size: 0.9em;">Keine Bewertung</span>';
                }
            } else {
                container.innerHTML = '<span style="color: #999; font-size: 0.9em;">Keine Bewertung</span>';
            }
        } catch (error) {
            console.error('Fehler beim Laden der User-Bewertung:', error);
            container.innerHTML = '<span style="color: #999; font-size: 0.9em;">—</span>';
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
        
        // Get service ID from various sources - for normal services use 'id', for enriched matches use 'serviceId'
        const finalServiceId = id || serviceId || null;
        
        // Get typeId and providerId from various sources
        const finalTypeId = typeId || (marketProvider?.serviceType?.id) || (marketClient?.serviceType?.id) || null;
        const finalProviderId = providerId || (marketProvider?.user?.id) || (marketClient?.user?.id) || null;
        
        // Debug logging
        console.log('Service Card IDs:', { finalServiceId, finalTypeId, finalProviderId, username: displayUsername, serviceType: displayServiceType });
        
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
            
            // Add click handler: check permission before opening rating modal
            cardDiv.addEventListener('click', function(e) {
                if (!finalServiceId) {
                    console.warn('Service ID not found for rating');
                    alert('Bewertung nicht möglich: Fehlende Daten');
                    return;
                }

                fetch(`${API_URL}/reviews/can-review/${finalServiceId}`, {
                    credentials: 'include'
                })
                .then(resp => resp.json())
                .then(data => {
                    if (data && data.canReview) {
                        openRatingModal(finalServiceId, displayUsername, displayServiceType, finalTypeId, finalProviderId);
                    } else {
                        showMessage('Du hast diese Dienstleistung bereits bewertet!', 'info');
                    }
                })
                .catch(err => {
                    console.error('Fehler beim Prüfen, ob bewertet werden kann:', err);
                    showMessage('Fehler beim Prüfen der Bewertungserlaubnis', 'error');
                });
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
    function showMessage(message, type = 'info') {
        // Remove existing alert if present
        const existing = document.getElementById('centeredAlertOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'centeredAlertOverlay';
        overlay.className = 'centered-alert-overlay';

        const box = document.createElement('div');
        box.className = `centered-alert-box centered-alert-${type}`;
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-live', 'polite');

        // Icon + Title
        const header = document.createElement('div');
        header.className = 'centered-alert-header';

        const icon = document.createElement('div');
        icon.className = 'centered-alert-icon';
        icon.innerHTML = getAlertIcon(type);

        const title = document.createElement('div');
        title.className = 'centered-alert-title';
        title.textContent = getAlertTitle(type);

        header.appendChild(icon);
        header.appendChild(title);

        const msg = document.createElement('div');
        msg.className = 'centered-alert-message';
        msg.textContent = message;

        const btn = document.createElement('button');
        btn.className = 'alert-ok-btn';
        btn.textContent = 'OK, weiter';
        btn.addEventListener('click', () => {
            removeOverlay();
        });

        // Prevent closing by clicking overlay; only OK closes
        overlay.addEventListener('click', (e) => {
            // don't close when clicking backdrop
            e.stopPropagation();
        });

        // Prevent accidental keyboard closes; only Enter on button closes
        const onKeyDown = (e) => {
            if (e.key === 'Tab') {
                // keep focus on button
                e.preventDefault();
                btn.focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                removeOverlay();
            }
        };

        function removeOverlay() {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
        }

        box.appendChild(header);
        box.appendChild(msg);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // ensure keyboard events handled
        document.addEventListener('keydown', onKeyDown);

        // focus the button for keyboard users
        btn.focus();
    }

    function getAlertTitle(type) {
        switch (type) {
            case 'success': return 'Erfolg';
            case 'error': return 'Fehler';
            default: return 'Hinweis';
        }
    }

    function getAlertIcon(type) {
        // simple inline SVG icons
        if (type === 'success') {
            return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
        if (type === 'error') {
            return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
        // info / default
        return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#2563EB" stroke-width="1.6"/><path d="M12 8h.01" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/><path d="M11.5 11.5h1v4h-1z" stroke="#2563EB" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    function createServicesSection() {
        const matchesContainer = document.getElementById('matchesContainer');
        
        // Main Services Section
        const mainServicesSection = document.createElement('div');
        mainServicesSection.className = 'main-services-section';
        mainServicesSection.innerHTML = '<h3><i class="fas fa-clipboard-list"></i> Matches</h3>';

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
        // Sammle eindeutige Usernames
        const uniqueUsernames = [...new Set(services.map(s => s.username).filter(u => u && u !== 'Unbekannter Benutzer'))];
        
        // Lade User-Bewertungen (durchschnitt über alle Services des Users)
        const userRatings = {};
        for (let username of uniqueUsernames) {
            try {
                const response = await fetch(`${API_URL}/reviews/user/by-name/${encodeURIComponent(username)}`);
                if (response.ok) {
                    const stats = await response.json();
                    userRatings[username] = stats.averageRating || 0;
                }
            } catch (error) {
                console.error('Fehler beim Laden der User-Bewertung für', username, error);
                userRatings[username] = 0;
            }
        }
        
        // Setze User-Bewertungen für alle Services
        for (let service of services) {
            service.userRating = userRatings[service.username] || 0;
            
            // Behalte auch die service-spezifische Bewertung bei (für Cards)
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
            
            // Filter by rating (use userRating for filtering)
            let ratingMatch = true;
            if (currentRatingFilter !== 'all') {
                if (currentRatingFilter === 'unrated') {
                    ratingMatch = !service.userRating || service.userRating === 0;
                } else {
                    const minRating = parseFloat(currentRatingFilter.replace('+', ''));
                    ratingMatch = service.userRating && service.userRating >= minRating;
                }
            }
            
            return ratingMatch;
        });

        // Sort services
        if (currentSortOption !== 'none') {
            filteredServices.sort((a, b) => {
                switch (currentSortOption) {
                    case 'rating-desc':
                        // Use userRating for sorting, not service-specific rating
                        const ratingA = a.userRating || 0;
                        const ratingB = b.userRating || 0;
                        return ratingB - ratingA;
                    case 'rating-asc':
                        const ratingA2 = a.userRating || 0;
                        const ratingB2 = b.userRating || 0;
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
