import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM-Elemente referenzieren
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatItems = document.getElementById('chatItems');
    const searchInput = document.getElementById('searchInput');
    const currentUserSelect = document.getElementById('currentUserSelect');
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    
    // Backend-Konfiguration - Angepasst an den neuen API-Endpunkt
    const CHAT_API_PATH = '/chatentry'; // Neuer Endpunkt laut Backend-Code
    
    // Globale Variablen
    let currentUserId = parseInt(currentUserSelect.value) || 1; // Standard: User 1
    let currentChatId = null; // ID des aktiven Gesprächspartners
    let activeChats = []; // Chats mit Nachrichtenverlauf
    let inactiveChats = []; // Kontakte ohne Nachrichtenverlauf
    let chatMessagesCache = {}; // Cache für Nachrichten
    let allUsers = []; // Liste aller verfügbaren Benutzer
    let socket = null; // WebSocket Verbindung

    // WebSocket verbinden
    function connectWebSocket() {
        if (socket) {
            socket.close();
        }

        const wsUrl = API_URL.replace(/^http/, 'ws') + `/chat/${currentUserId}`;
        console.log('Verbinde zu WebSocket:', wsUrl);

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WebSocket verbunden');
        };

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                handleIncomingMessage(msg);
            } catch (e) {
                console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', e);
            }
        };

        socket.onclose = () => {
            console.log('WebSocket getrennt');
        };

        socket.onerror = (error) => {
            console.error('WebSocket Fehler:', error);
        };
    }

    // Eingehende Nachricht verarbeiten
    function handleIncomingMessage(msg) {
        const senderId = msg.sender?.id;
        const receiverId = msg.receiver?.id;
        
        // Bestimmen, wer der Gesprächspartner ist
        const partnerId = (senderId == currentUserId) ? receiverId : senderId;

        // Wenn der Chat mit diesem Partner offen ist, Nachricht anzeigen
        if (currentChatId == partnerId) {
            appendMessage(msg);
            // Scrollen
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Kontaktliste aktualisieren (Last Message, Timestamp)
        updateContactInList(partnerId, msg);
    }

    // Einzelne Nachricht anfügen
    function appendMessage(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        const senderId = msg.sender?.id;
        
        if (senderId === currentUserId) {
            messageDiv.classList.add('other');
        } else {
            messageDiv.classList.add('user');
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = msg.content || msg.message || '';
        
        if (senderId !== currentUserId) {
            const messageSender = document.createElement('div');
            messageSender.className = 'message-sender';
            const senderName = msg.sender?.name || 'Kontakt';
            messageSender.textContent = senderName;
            messageDiv.appendChild(messageSender);
        }
        
        const timestamp = new Date(msg.time || msg.timestamp || Date.now());
        const timeString = timestamp.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = timeString;
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatMessages.appendChild(messageDiv);
    }

    // Kontakt in der Liste aktualisieren
    function updateContactInList(partnerId, msg) {
        // Prüfen ob in activeChats
        let chatIndex = activeChats.findIndex(c => c.id == partnerId);
        let contact = null;

        if (chatIndex !== -1) {
            contact = activeChats[chatIndex];
            // Aktualisieren
            contact.lastMessage = msg.message || msg.content;
            contact.timestamp = msg.time || msg.timestamp;
            if (currentChatId != partnerId) {
                contact.unreadCount = (contact.unreadCount || 0) + 1;
            } else {
                contact.unreadCount = 0;
            }
            // Nach oben schieben
            activeChats.splice(chatIndex, 1);
            activeChats.unshift(contact);
        } else {
            // Vielleicht in inactiveChats?
            chatIndex = inactiveChats.findIndex(c => c.id == partnerId);
            if (chatIndex !== -1) {
                contact = inactiveChats[chatIndex];
                contact.lastMessage = msg.message || msg.content;
                contact.timestamp = msg.time || msg.timestamp;
                if (currentChatId != partnerId) {
                    contact.unreadCount = 1;
                } else {
                    contact.unreadCount = 0;
                }
                // Verschieben zu activeChats
                inactiveChats.splice(chatIndex, 1);
                activeChats.unshift(contact);
            } else {
                // Neuer Kontakt (sollte eigentlich geladen sein, aber falls nicht)
                // Hier müssten wir User-Details holen, vereinfacht:
                console.log("Kontakt nicht gefunden, lade neu...");
                // Wir laden neu, aber im Hintergrund, damit es nicht flackert
                fetchContacts(); 
                return;
            }
        }
        displayContacts();
    }
    
    // Alle verfügbaren Nutzer laden
    async function loadAllUsers() {
        try {
            const response = await fetch(`${API_URL}${CHAT_API_PATH}/users`);
            
            if (!response.ok) {
                console.error('Fehler beim Laden aller Benutzer:', response.statusText);
                return;
            }
            
            allUsers = await response.json();
            console.log("Alle Benutzer geladen:", allUsers);
            
            // Dropdown aktualisieren
            updateUserDropdown();
            
        } catch (error) {
            console.error('Netzwerkfehler beim Laden der Benutzer:', error);
        }
    }
    
    // Dropdown mit verfügbaren Nutzern befüllen
    function updateUserDropdown() {
        // Aktuelle Auswahl speichern
        const selectedUserId = parseInt(currentUserSelect.value);
        
        // Dropdown leeren
        currentUserSelect.innerHTML = '';
        
        // Nutzer sortiert nach ID hinzufügen
        allUsers.sort((a, b) => a.id - b.id).forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name || `User ${user.id}`;
            
            // Wenn aktuelle Auswahl, als selected markieren
            if (user.id === selectedUserId) {
                option.selected = true;
            }
            
            currentUserSelect.appendChild(option);
        });
        
        // Falls keine User geladen werden konnten, zumindest User 1 hinzufügen
        if (currentUserSelect.options.length === 0) {
            const option = document.createElement('option');
            option.value = 1;
            option.textContent = 'User 1';
            option.selected = true;
            currentUserSelect.appendChild(option);
        }
        
        // Aktuellen Nutzer anzeigen aktualisieren
        updateCurrentUserDisplay();
    }
    
    // Aktuellen Nutzer anzeigen und wechseln
    function updateCurrentUserDisplay() {
        const selectedOption = currentUserSelect.options[currentUserSelect.selectedIndex];
        currentUserDisplay.textContent = `${selectedOption.text} (Du)`;
    }
    
    // Initial aktuellen Benutzer anzeigen
    updateCurrentUserDisplay();
    
    // Aktuellen Nutzer wechseln
    currentUserSelect.addEventListener('change', function() {
        currentUserId = parseInt(this.value);
        console.log("Aktueller Nutzer gewechselt zu ID:", currentUserId);
        updateCurrentUserDisplay();
        
        // WebSocket neu verbinden
        connectWebSocket();

        // Chat-Liste neu laden
        fetchContacts();
        
        // Chat-Bereich zurücksetzen
        resetChatArea();
    });
    
    // Chat-Bereich zurücksetzen
    function resetChatArea() {
        currentChatId = null;
        document.getElementById('chatTitle').textContent = 'Bitte wähle einen Chat';
        chatMessages.innerHTML = `
            <div class="empty-chat-info">
                <i class="fas fa-comments"></i>
                <p>Wähle einen Chat aus der Liste oder starte einen neuen Chat</p>
            </div>`;
    }
    
    // Bild in Base64 konvertieren
    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
    
    // Kontakte abrufen (Optimiert)
    async function fetchContacts() {
        try {
            // Zeige Ladeanzeige an
            chatItems.innerHTML = '<div class="loading-message">Kontakte werden geladen...</div>';
            
            // Neuer optimierter Endpunkt
            const response = await fetch(`${API_URL}${CHAT_API_PATH}/overview/${currentUserId}`);
            
            if (!response.ok) {
                throw new Error(`${response.status}: ${response.statusText}`);
            }
            
            const overviewData = await response.json();
            console.log("Chat-Übersicht geladen:", overviewData);
            
            processOverviewData(overviewData);
            
        } catch (error) {
            console.error('Fehler beim Abrufen der Kontakte:', error);
            chatItems.innerHTML = `
                <div class="error-message">
                    <p>Netzwerkfehler: ${error.message}</p>
                    <button id="retryButton" class="retry-button">Erneut versuchen</button>
                </div>`;
                    
            document.getElementById('retryButton')?.addEventListener('click', fetchContacts);
        }
    }
    
    // Daten verarbeiten und anzeigen
    function processOverviewData(data) {
        activeChats = [];
        inactiveChats = [];
        
        data.forEach(item => {
            const contact = {
                id: item.userId,
                name: item.username,
                lastMessage: item.lastMessage,
                timestamp: item.timestamp,
                unreadCount: item.unreadCount
            };
            
            if (item.lastMessage) {
                activeChats.push(contact);
            } else {
                inactiveChats.push(contact);
            }
        });
        
        displayContacts();
    }
    
    // Veraltet: Kontakte nach Aktivität sortieren (mit/ohne Nachrichtenverlauf)
    // async function sortContactsByActivity(contacts) { ... }
    
    // Kontakte anzeigen
    function displayContacts() {
        // Chat-Liste leeren und neu befüllen
        chatItems.innerHTML = '';
        
        if (activeChats.length === 0 && inactiveChats.length === 0) {
            const noContacts = document.createElement('div');
            noContacts.className = 'no-contacts';
            noContacts.textContent = 'Keine Kontakte gefunden.';
            chatItems.appendChild(noContacts);
            return;
        }
        
        // Aktive Chats mit Nachrichtenverlauf anzeigen
        if (activeChats.length > 0) {
            const activeChatsHeader = document.createElement('div');
            activeChatsHeader.className = 'chat-category';
            activeChatsHeader.textContent = 'Aktive Chats';
            chatItems.appendChild(activeChatsHeader);
            
            activeChats.forEach(contact => {
                const chatElement = createChatElement(contact, true);
                chatItems.appendChild(chatElement);
            });
        }
        
        // Inaktive Chats (ohne Nachrichtenverlauf) anzeigen
        if (inactiveChats.length > 0) {
            const inactiveChatsHeader = document.createElement('div');
            inactiveChatsHeader.className = 'chat-category';
            inactiveChatsHeader.textContent = 'Kontakte ohne Nachrichten';
            chatItems.appendChild(inactiveChatsHeader);
            
            inactiveChats.forEach(contact => {
                const chatElement = createChatElement(contact, false);
                chatItems.appendChild(chatElement);
            });
        }
    }
    
    // Chat-Element erstellen
    function createChatElement(contact, isActive) {
        const chatElement = document.createElement('div');
        chatElement.className = 'chat-item';
        
        // Benutzerinformationen anzeigen
        const contactName = contact.name || contact.username || 'Unbenannt';
        chatElement.dataset.name = contactName;
        
        // ID für Chat-Funktion speichern
        const contactId = contact.id;
        
        // Highlight active chat
        if (contactId == currentChatId) {
            chatElement.classList.add('active');
        }
        
        // Formatiere das Datum für aktive Chats
        let timeString = '';
        let lastMessageText = '';
        
        if (isActive) {
            const timestamp = new Date(contact.timestamp);
            timeString = formatChatTimestamp(timestamp);
            lastMessageText = contact.lastMessage || 'Neue Nachricht';
        }
        
        // HTML für Chat-Element erstellen
        chatElement.innerHTML = `
            <div class="chat-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="chat-details">
                <div class="chat-name">${contactName}</div>
                ${isActive ? `<div class="chat-last-message">${lastMessageText}</div>` : ''}
            </div>
            <div class="chat-meta">
                ${isActive ? `<div class="chat-time">${timeString}</div>` : ''}
                ${(isActive && contact.unreadCount > 0) ? `<div class="chat-badge">${contact.unreadCount}</div>` : ''}
            </div>
        `;
        
        chatElement.onclick = () => {
            setActiveChat(contactId, chatElement, contactName);
        };
        
        return chatElement;
    }
    
    // Zeitstempel formatieren für Chat-Liste
    function formatChatTimestamp(timestamp) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
        
        // Wenn es von heute ist, zeige nur die Uhrzeit
        if (messageDate.getTime() === today.getTime()) {
            return timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
        
        // Wenn es von gestern ist, zeige "Gestern"
        if (messageDate.getTime() === yesterday.getTime()) {
            return 'Gestern';
        }
        
        // Wenn es aus diesem Jahr ist, zeige Tag und Monat
        if (messageDate.getFullYear() === now.getFullYear()) {
            return timestamp.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        }
        
        // Sonst zeige volles Datum
        return timestamp.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    
    // Aktiven Chat setzen und Nachrichten laden
    function setActiveChat(partnerId, chatElement, partnerName) {
        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        chatElement.classList.add('active');
        
        // Zeige Namen im Chat-Header
        document.getElementById('chatTitle').textContent = partnerName || 'Chat';
        
        currentChatId = partnerId;
        fetchChatMessages(partnerId);
        
        // Badge entfernen (gelesen markieren)
        const badge = chatElement.querySelector('.chat-badge');
        if (badge) {
            badge.style.display = 'none';
        }
        
        // Aktualisiere den Chat in der Liste als gelesen
        const chatIndex = activeChats.findIndex(chat => chat.id === partnerId);
        if (chatIndex !== -1) {
            activeChats[chatIndex].unreadCount = 0;
        }
    }
    
    // Chat-Nachrichten zwischen aktuellem User und Partner laden
    async function fetchChatMessages(partnerId) {
        try {
            // Ladeanzeige
            chatMessages.innerHTML = '<div class="message system loading">Nachrichten werden geladen...</div>';
            
            // Nutze den neuen Endpunkt mit den IDs beider Benutzer
            const response = await fetch(`${API_URL}${CHAT_API_PATH}/${currentUserId}/${partnerId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Keine Nachrichten gefunden ist kein Fehler
                    chatMessages.innerHTML = '<div class="message system">Keine Nachrichten vorhanden. Beginne eine Konversation!</div>';
                    return;
                }
                
                throw new Error(`${response.status}: ${response.statusText}`);
            }
            
            const messages = await response.json();
            displayMessages(messages);
            
        } catch (error) {
            console.error('Fehler beim Abrufen der Chat-Nachrichten:', error);
            chatMessages.innerHTML = `
                <div class="message system error">
                    Netzwerkfehler: ${error.message}
                    <button class="retry-button" onclick="retryLoadMessages(${partnerId})">Erneut versuchen</button>
                </div>`;
                
            window.retryLoadMessages = (id) => fetchChatMessages(id);
        }
    }
    
    // Nachrichten anzeigen
    function displayMessages(messages) {
        // Chat-Container leeren
        chatMessages.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'message system';
            emptyMessage.textContent = 'Keine Nachrichten vorhanden.';
            chatMessages.appendChild(emptyMessage);
        } else {
            // Nachrichten anzeigen
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                
                // Neue API: Sender ist ein Objekt mit einer ID
                const senderId = msg.sender?.id;
                
                // Bestimmen, ob die Nachricht von uns oder dem Partner ist
                if (senderId === currentUserId) {
                    messageDiv.classList.add('other'); // Eigene Nachrichten rechts
                } else {
                    messageDiv.classList.add('user'); // Fremde Nachrichten links
                }
                
                // Nachrichteninhalt hinzufügen
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.textContent = msg.content || msg.message || '';
                
                // Sender-Name anzeigen, wenn es nicht unsere Nachricht ist
                if (senderId !== currentUserId) {
                    const messageSender = document.createElement('div');
                    messageSender.className = 'message-sender';
                    const senderName = msg.sender?.name || 'Kontakt';
                    messageSender.textContent = senderName;
                    messageDiv.appendChild(messageSender);
                }
                
                // Zeit formatieren und hinzufügen
                const timestamp = new Date(msg.time || msg.timestamp || Date.now());
                const timeString = timestamp.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const messageTime = document.createElement('div');
                messageTime.className = 'message-time';
                messageTime.textContent = timeString;
                
                messageDiv.appendChild(messageContent);
                messageDiv.appendChild(messageTime);
                chatMessages.appendChild(messageDiv);
            });
        }
        
        // Zum Ende des Chats scrollen
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Nachricht senden
    chatForm.addEventListener('submit', async event => {
        event.preventDefault();
        
        if (!currentChatId) {
            alert('Bitte wähle zuerst einen Chat aus.');
            return;
        }
        
        const messageText = chatInput.value.trim();
        
        if (!messageText) {
            return; // Keine leeren Nachrichten senden
        }
        
        // Nachrichtendaten vorbereiten
        const messageData = {
            sender: { id: currentUserId },
            receiver: { id: currentChatId },
            message: messageText,
            time: null // Backend setzt Zeit
        };
        
        try {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(messageData));
                resetInputFields();
                // Nachricht wird über onmessage (Echo) angezeigt
            } else {
                console.warn('WebSocket nicht verbunden. Versuche neu zu verbinden...');
                connectWebSocket();
                alert('Verbindung wird wiederhergestellt. Bitte versuche es gleich noch einmal.');
            }
            
        } catch (error) {
            console.error('Fehler beim Senden der Nachricht:', error);
            alert(`Fehler beim Senden: ${error.message}`);
        }
    });
    
    // Eingabefelder zurücksetzen
    function resetInputFields() {
        chatInput.value = '';
        document.getElementById('chatImage').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('imagePreview').style.display = 'none';
    }
    
    // Bild-Upload Vorschau
    document.getElementById('chatImage').addEventListener('change', function(event) {
        const file = event.target.files[0];
        const previewContainer = document.getElementById('imagePreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewContainer.innerHTML = `
                    <div style="position: relative; display: inline-block;">
                        <img src="${e.target.result}" alt="Vorschau" />
                        <span id="removeImage">&times;</span>
                    </div>`;
                previewContainer.style.display = 'block';
                
                document.getElementById('removeImage').addEventListener('click', function() {
                    previewContainer.innerHTML = '';
                    previewContainer.style.display = 'none';
                    document.getElementById('chatImage').value = '';
                });
            };
            reader.readAsDataURL(file);
        } else {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
        }
    });
    
    // Filter-Funktion für Kontakte
    window.filterContacts = function() {
        const query = searchInput.value.toLowerCase();
        document.querySelectorAll('.chat-item').forEach(item => {
            const name = item.dataset.name.toLowerCase();
            if (name.includes(query)) {
                item.style.display = 'flex';
                // Auch die zugehörige Kategorie zeigen, falls vorhanden
                const category = item.previousElementSibling;
                if (category && category.classList.contains('chat-category')) {
                    category.style.display = 'block';
                }
            } else {
                item.style.display = 'none';
            }
        });
        
        // Verstecke leere Kategorien
        document.querySelectorAll('.chat-category').forEach(category => {
            let nextElem = category.nextElementSibling;
            let hasVisibleChats = false;
            
            while (nextElem && !nextElem.classList.contains('chat-category')) {
                if (nextElem.classList.contains('chat-item') && nextElem.style.display !== 'none') {
                    hasVisibleChats = true;
                    break;
                }
                nextElem = nextElem.nextElementSibling;
            }
            
            category.style.display = hasVisibleChats ? 'block' : 'none';
        });
    };
    
    // Neuen Chat erstellen
    window.createNewChat = function() {
        const chatName = document.getElementById('chatName').value.trim();
        if (!chatName) return;
        
        alert('Funktion "Neuen Chat erstellen" ist momentan nicht implementiert.');
        closeChatCreation();
        document.getElementById('chatName').value = '';
    };
    
    // Modal schließen
    window.closeChatCreation = function() {
        document.getElementById('chatModal').classList.remove('active');
    };
    
    // Modal öffnen
    window.openChatCreation = function() {
        document.getElementById('chatModal').classList.add('active');
    };
    
    // Chat-Testdaten generieren
    async function generateChatTestData() {
        try {
            const button = document.getElementById('generateDataButton') || document.getElementById('generateChatDataButton');
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generiere...';
                button.disabled = true;
                
                // Versuche verschiedene mögliche Testdaten-Endpunkte
                const response = await fetch(`${API_URL}/api/testdata/generate`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    alert('Chat-Testdaten erfolgreich generiert!');
                    // Nach dem Generieren von Daten, aktualisiere die Benutzer-Liste
                    await loadAllUsers();
                    fetchContacts(); // Kontakte neu laden
                } else {
                    alert(`Fehler: ${response.status} ${response.statusText}`);
                }
                
                button.innerHTML = originalText;
                button.disabled = false;
            }
        } catch (error) {
            console.error('Fehler beim Generieren der Testdaten:', error);
            alert(`Netzwerkfehler: ${error.message}`);
            
            const button = document.getElementById('generateDataButton') || document.getElementById('generateChatDataButton');
            if (button) {
                button.innerHTML = 'Testdaten generieren';
                button.disabled = false;
            }
        }
    }
    
    document.getElementById('generateChatDataButton')?.addEventListener('click', generateChatTestData);
    
    // Initial beim Laden der Seite
    loadAllUsers(); // Lade alle Benutzer
    fetchContacts();
    resetChatArea();
    connectWebSocket();
});
