// Chat-Funktionalität - KORRIGIERT FÜR ADMIN-NACHRICHTEN
console.log('Chat: Script startet');

const API_URL = "http://localhost/api";
let currentChatId = null;
let currentUser = null;
let chats = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat: DOM geladen');
    loadActiveUser();
    setupEventListeners();
    startPeriodicChatUpdates(); // NEU: Starte automatische Aktualisierung
});

// Lade aktiven Benutzer
function loadActiveUser() {
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
                currentUser = responseJson.username || null;
            } catch (e) {
                currentUser = responseText && responseText.trim() !== "" ? responseText : null;
            }
            
            if (currentUser) {
                console.log('Chat: Aktiver Benutzer geladen:', currentUser);
                updateNavbarUser();
                loadRealChats();
            } else {
                console.log('Chat: Kein aktiver Benutzer, zeige Info');
                showNoUserMessage();
            }
        })
        .catch(error => {
            console.error('Chat: API nicht verfügbar, verwende localStorage:', error);
            const savedUser = localStorage.getItem('activeUser');
            if (savedUser) {
                currentUser = savedUser;
                console.log('Chat: Aktiver Benutzer aus localStorage:', currentUser);
                updateNavbarUser();
                loadRealChats();
            } else {
                showNoUserMessage();
            }
        });
}

// Update Navbar mit aktuellem User
function updateNavbarUser() {
    const activeUserDisplay = document.getElementById('activeUserDisplay');
    const navUsernameInput = document.getElementById('navUsername');
    
    if (activeUserDisplay && currentUser) {
        activeUserDisplay.textContent = currentUser;
        activeUserDisplay.classList.add('user-active');
    }
    
    if (navUsernameInput && currentUser) {
        navUsernameInput.value = currentUser;
    }
}

function showNoUserMessage() {
    const chatList = document.getElementById('chatItems');
    if (chatList) {
        chatList.innerHTML = '<div class="no-contacts">Bitte melden Sie sich zuerst an.<br><small>Geben Sie einen Benutzernamen in die obere Suchleiste ein und drücken Enter.</small></div>';
    }
}

// Lade echte Chats aus dem Backend mit Fallback
async function loadRealChats() {
    if (!currentUser) {
        showNoUserMessage();
        return;
    }
    
    console.log('Chat: Lade echte Chats für Benutzer:', currentUser);
    
    try {
        // 1. Versuche Chat-Endpunkte zu laden
        const contactsResponse = await fetch(`${API_URL}/chatentry/users`);
        
        if (!contactsResponse.ok) {
            throw new Error(`API Error: ${contactsResponse.status}`);
        }
        
        const contacts = await contactsResponse.json();
        console.log('Chat: Benutzer von API erhalten:', contacts.length, 'Benutzer');
        
        if (contacts.length === 0) {
            showFallbackChats();
            return;
        }
        
        // 2. Erstelle Chat-Objekte für alle Kontakte
        // WICHTIG: Prüfe für Chats ob Nachrichten existieren (mit Batch-Verarbeitung)
        const currentUserId = await getCurrentUserId();
        const filteredContacts = contacts.filter(contact => contact.name !== currentUser);
        
        console.log('Chat: Starte Laden von', filteredContacts.length, 'Chats...');
        
        // Verarbeite Chats in Batches von 50 gleichzeitig (Performance)
        const batchSize = 50;
        chats = [];
        
        for (let i = 0; i < filteredContacts.length; i += batchSize) {
            const batch = filteredContacts.slice(i, i + batchSize);
            console.log(`Chat: Verarbeite Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(filteredContacts.length/batchSize)} (${batch.length} Chats)`);
            
            const batchPromises = batch.map(async (contact) => {
                try {
                    // Prüfe ob es bereits Nachrichten gibt
                    const messagesResponse = await fetch(`${API_URL}/chatentry/${currentUserId}/${contact.id}`);
                    
                    let lastMessage = 'Neue Unterhaltung starten';
                    let lastUpdate = new Date().toISOString();
                    
                    if (messagesResponse.ok) {
                        const messages = await messagesResponse.json();
                        if (messages.length > 0) {
                            const lastMsg = messages[messages.length - 1];
                            lastMessage = (lastMsg.message || 'Nachricht');
                            lastMessage = lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage;
                            lastUpdate = lastMsg.time || new Date().toISOString();
                        }
                    }
                    
                    // KORRIGIERT: Extrahiere Namen korrekt (falls contact.name ein Objekt ist)
                    const contactName = typeof contact.name === 'object' && contact.name !== null 
                        ? (contact.name.username || contact.name.name || String(contact.name))
                        : (contact.name || 'Unbekannt');
                    
                    return {
                        id: contact.id,
                        user1Username: currentUser,
                        user2Username: contactName,
                        lastMessage: lastMessage,
                        lastUpdate: lastUpdate,
                        isAdmin: contactName.toLowerCase() === 'admin'
                    };
                } catch (error) {
                    // KORRIGIERT: Extrahiere Namen korrekt (falls contact.name ein Objekt ist)
                    const contactName = typeof contact.name === 'object' && contact.name !== null 
                        ? (contact.name.username || contact.name.name || String(contact.name))
                        : (contact.name || 'Unbekannt');
                    
                    console.debug('Chat: Fehler beim Prüfen von', contactName, ':', error);
                    return {
                        id: contact.id,
                        user1Username: currentUser,
                        user2Username: contactName,
                        lastMessage: 'Neue Unterhaltung starten',
                        lastUpdate: new Date().toISOString(),
                        isAdmin: contactName.toLowerCase() === 'admin'
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            chats.push(...batchResults);
            
            // Rendere nach jedem Batch, damit User nicht zu lange warten muss
            if (i === 0) {
                renderChatList();
            }
        }
        
        console.log('Chat: Alle Chats geladen mit Nachrichtenstatus:', chats.length);
        
        if (chats.length === 0) {
            showFallbackChats();
        } else {
            renderChatList();
            showMessage(`${chats.length} Chats geladen`, 'success');
        }
        
    } catch (error) {
        console.error('Chat: Fehler beim Laden der echten Chats:', error);
        showMessage('Backend nicht verfügbar - zeige Demo-Chats', 'warning');
        showFallbackChats();
    }
}

// Stelle sicher, dass ein Admin-Chat existiert
async function ensureAdminChat() {
    try {
        // Prüfe ob der aktuelle Benutzer der Admin ist
        if (currentUser && currentUser.toLowerCase() === 'admin') {
            console.log('Chat: Aktueller Benutzer ist Admin - kein Admin-Chat nötig');
            return; // Admin chattet nicht mit sich selbst
        }
        
        // Prüfe ob Admin bereits in den Chats ist
        let adminChat = chats.find(chat => {
            if (!chat || !chat.user2Username) return false;
            return chat.isAdmin || chat.user2Username.toLowerCase() === 'admin';
        });
        
        if (!adminChat) {
            // Erstelle Admin-Chat wenn er nicht existiert
            console.log('Chat: Erstelle Admin-Chat');
            
            adminChat = {
                id: 'admin-chat',
                user1Username: currentUser,
                user2Username: 'Admin',
                lastMessage: 'Hallo, schreibe mir wenn du Hilfe brauchst.',
                lastUpdate: new Date().toISOString(),
                isAdmin: true,
                isPinned: true
            };
            
            // Füge Admin-Chat an den Anfang hinzu
            chats.unshift(adminChat);
        } else {
            // Markiere existierenden Admin-Chat als gepinnt
            adminChat.isPinned = true;
            adminChat.isAdmin = true;
            
            // Wenn Admin-Chat keine Nachricht hat, setze Willkommensnachricht
            if (!adminChat.lastMessage || adminChat.lastMessage === 'Starten Sie eine Unterhaltung') {
                adminChat.lastMessage = 'Hallo, schreibe mir wenn du Hilfe brauchst.';
                adminChat.lastUpdate = new Date().toISOString();
            }
        }
    } catch (error) {
        console.error('Chat: Fehler in ensureAdminChat:', error);
    }
}

// Fallback: Zeige Demo-Chats wenn Backend nicht verfügbar
function showFallbackChats() {
    console.log('Chat: Zeige Fallback-Chats für:', currentUser);
    
    chats = [];
    
    // ADMIN-CHAT NUR WENN AKTUELLER BENUTZER NICHT ADMIN IST
    if (currentUser && currentUser.toLowerCase() !== 'admin') {
        chats.push({
            id: 'admin-chat',
            user1Username: currentUser,
            user2Username: 'Admin',
            lastMessage: 'Hallo, schreibe mir wenn du Hilfe brauchst.',
            lastUpdate: new Date().toISOString(),
            isAdmin: true,
            isPinned: true
        });
    }
    
    // Reguläre Demo-Chats hinzufügen
    chats.push(
        {
            id: 'demo-1',
            user1Username: currentUser,
            user2Username: "Anna Berghuber",
            lastMessage: "Starten Sie eine Unterhaltung",
            lastUpdate: new Date().toISOString()
        },
        {
            id: 'demo-2',
            user1Username: "Tom Steinmann",
            user2Username: currentUser,
            lastMessage: "Starten Sie eine Unterhaltung",
            lastUpdate: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 'demo-3',
            user1Username: currentUser,
            user2Username: "Lena Waldschmidt",
            lastMessage: "Starten Sie eine Unterhaltung",
            lastUpdate: new Date(Date.now() - 7200000).toISOString()
        },
        {
            id: 'demo-4',
            user1Username: "Robert Steinhuber",
            user2Username: currentUser,
            lastMessage: "Starten Sie eine Unterhaltung",
            lastUpdate: new Date(Date.now() - 10800000).toISOString()
        }
    );
    
    renderChatList();
    showMessage('Demo-Chats geladen (Backend nicht verfügbar)', 'info');
}

// Event Listeners
function setupEventListeners() {
    // Navbar-Suchfeld (für Anmeldung)
    const navUsernameInput = document.getElementById('navUsername');
    if (navUsernameInput) {
        navUsernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const username = this.value.trim();
                if (username) {
                    setActiveUser(username);
                }
            }
        });
    }
    
    // Chat-Suchfeld (für Personensuche)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterContacts);
    }
    
    // Chat-Form
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const chatInput = document.getElementById('chatInput');
            if (chatInput && chatInput.value.trim() && currentChatId) {
                sendMessage(chatInput.value.trim());
                chatInput.value = '';
            }
        });
    }
}

// Setze aktiven Benutzer - KORRIGIERT MIT BENUTZER-VALIDIERUNG
async function setActiveUser(username) {
    console.log('Chat: Setze aktiven Benutzer:', username);
    
    try {
        // 1. ERST PRÜFEN OB BENUTZER EXISTIERT
        const usersResponse = await fetch(`${API_URL}/chatentry/users`);
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            const userExists = users.some(user => user.name === username);
            
            if (!userExists) {
                console.error('Chat: Benutzer existiert nicht:', username);
                showMessage(`Fehler: Benutzer "${username}" existiert nicht!`, 'error');
                
                // Eingabefeld leeren
                const navUsernameInput = document.getElementById('navUsername');
                if (navUsernameInput) {
                    navUsernameInput.value = '';
                }
                return;
            }
            
            console.log('Chat: Benutzer existiert, setze als aktiv:', username);
        } else {
            console.warn('Chat: Kann Benutzerliste nicht laden, verwende Fallback');
            // Bei API-Fehler trotzdem weitermachen (Fallback-Verhalten)
        }
        
        // 2. BENUTZER ALS AKTIV SETZEN (nur wenn er existiert oder API nicht verfügbar)
        const response = await fetch(`${API_URL}/user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: username })
        });
        
        if (response.ok) {
            currentUser = username;
            localStorage.setItem('activeUser', username);
            updateNavbarUser();
            loadRealChats();
            showMessage(`Erfolgreich angemeldet als ${username}`, 'success');
        } else {
            throw new Error(`Fehler beim Setzen von ${username} als aktiven Benutzer`);
        }
        
    } catch (error) {
        console.error('Chat: API Fehler beim Anmelden:', error);
        
        // FALLBACK NUR BEI VERBINDUNGSFEHLERN, NICHT BEI UNGÜLTIGEN BENUTZERN
        if (error.message && error.message.includes('existiert nicht')) {
            // Fehler bereits behandelt, nichts mehr tun
            return;
        }
        
        // Bei anderen Fehlern (Verbindung, etc.) trotzdem anmelden
        currentUser = username;
        localStorage.setItem('activeUser', username);
        updateNavbarUser();
        loadRealChats();
        showMessage(`${username} gesetzt (API nicht verfügbar)`, 'warning');
    }
}

// Rendere Chat-Liste mit Kategorien und Admin-Chat - KORRIGIERT FÜR BESSERE SORTIERUNG
function renderChatList() {
    const chatList = document.getElementById('chatItems');
    if (!chatList) {
        console.error('chatItems nicht gefunden!');
        return;
    }
    
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        chatList.innerHTML = '<div class="no-contacts">Keine Chats vorhanden</div>';
        return;
    }
    
    // Teile Chats in Kategorien auf
    const adminChats = chats.filter(chat => chat.isAdmin || chat.isPinned);
    const regularChats = chats.filter(chat => !chat.isAdmin && !chat.isPinned);
    
    const activeChats = regularChats.filter(chat => 
        chat.lastMessage && 
        chat.lastMessage !== 'Starten Sie eine Unterhaltung' && 
        chat.lastMessage !== 'Neue Unterhaltung starten' &&
        chat.lastMessage.trim() !== ''
    );
    
    const newChats = regularChats.filter(chat => 
        !chat.lastMessage || 
        chat.lastMessage === 'Starten Sie eine Unterhaltung' || 
        chat.lastMessage === 'Neue Unterhaltung starten' ||
        chat.lastMessage.trim() === ''
    );
    
    // KORRIGIERT: Sortiere Admin-Chats auch nach letzter Aktivität (neueste zuerst)
    adminChats.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
    
    // KORRIGIERT: Sortiere aktive Chats nach letzter Aktivität (neueste zuerst)
    activeChats.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
    
    // KORRIGIERT: Sortiere auch neue Chats nach Erstellungszeit (neueste zuerst)
    newChats.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
    
    console.log(`Chat: Rendere ${adminChats.length} Admin, ${activeChats.length} aktive und ${newChats.length} neue Chats`);
    
    // 1. ADMIN-CHAT GANZ OBEN (angepinnt und nach Aktivität sortiert)
    if (adminChats.length > 0) {
        const adminCategoryHeader = document.createElement('div');
        adminCategoryHeader.className = 'chat-category admin-category';
        adminCategoryHeader.innerHTML = '<i class="fas fa-crown"></i> Support';
        chatList.appendChild(adminCategoryHeader);
        
        adminChats.forEach(chat => {
            renderChatItem(chat, chatList, true);
        });
    }
    
    // 2. Kürzliche Chats (neueste zuerst)
    if (activeChats.length > 0) {
        const activeCategoryHeader = document.createElement('div');
        activeCategoryHeader.className = 'chat-category';
        activeCategoryHeader.innerHTML = '<i class="fas fa-clock"></i> Kürzliche Chats';
        chatList.appendChild(activeCategoryHeader);
        
        activeChats.forEach(chat => {
            renderChatItem(chat, chatList);
        });
    }
    
    // 3. Neue Chats (neueste zuerst)
    if (newChats.length > 0) {
        const newCategoryHeader = document.createElement('div');
        newCategoryHeader.className = 'chat-category';
        newCategoryHeader.innerHTML = '<i class="fas fa-plus-circle"></i> Neue Chats';
        chatList.appendChild(newCategoryHeader);
        
        newChats.forEach(chat => {
            renderChatItem(chat, chatList);
        });
    }
    
    console.log(`Chat: ${adminChats.length} Admin, ${activeChats.length} aktive und ${newChats.length} neue Chats gerendert`);
}

// Hilfsfunktion: Einzelnen Chat-Item rendern
function renderChatItem(chat, container, isAdmin = false) {
    // KORRIGIERT: Stelle sicher dass otherUser ein String ist
    let otherUser = chat.user1Username === currentUser ? chat.user2Username : chat.user1Username;
    
    // Falls otherUser ein Objekt ist, extrahiere den Namen
    if (typeof otherUser === 'object' && otherUser !== null) {
        otherUser = otherUser.username || otherUser.name || 'Unbekannt';
    }
    
    const firstLetter = otherUser.charAt(0).toUpperCase();
    
    const chatItem = document.createElement('div');
    chatItem.className = `chat-item ${isAdmin ? 'admin-chat' : ''}`;
    chatItem.setAttribute('data-chat-id', chat.id);
    
    // Bestimme ob Chat aktiv ist (hat Nachrichten)
    const hasMessages = chat.lastMessage && 
                       chat.lastMessage !== 'Starten Sie eine Unterhaltung' && 
                       chat.lastMessage.trim() !== '';
    
    // Admin bekommt spezielle Krone im Avatar
    const avatarContent = isAdmin ? '<i class="fas fa-crown"></i>' : firstLetter;
    const avatarClass = isAdmin ? 'chat-avatar admin-avatar' : 'chat-avatar';
    
    chatItem.innerHTML = `
        <div class="${avatarClass}">${avatarContent}</div>
        <div class="chat-details">
            <div class="chat-name ${isAdmin ? 'admin-name' : ''}">${escapeHtml(otherUser)}</div>
            <div class="chat-last-message ${hasMessages ? 'has-messages' : 'no-messages'}">${escapeHtml(chat.lastMessage || 'Neue Unterhaltung starten')}</div>
        </div>
        <div class="chat-meta">
            <div class="chat-time">${hasMessages ? formatTime(chat.lastUpdate) : ''}</div>
            ${isAdmin ? '<div class="chat-indicator admin"></div>' : (hasMessages ? '<div class="chat-indicator active"></div>' : '<div class="chat-indicator new"></div>')}
        </div>
    `;
    
    chatItem.addEventListener('click', () => selectChat(chat.id, otherUser));
    container.appendChild(chatItem);
}

// Chat auswählen - KORRIGIERT
function selectChat(chatId, otherUser) {
    console.log('Chat: Wähle Chat:', chatId, 'mit', otherUser);
    currentChatId = chatId;
    
    const chatTitle = document.getElementById('chatTitle');
    if (chatTitle) {
        chatTitle.textContent = `Chat mit ${otherUser}`;
    }
    
    // Markiere aktiven Chat
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-chat-id="${chatId}"]`)?.classList.add('active');
    
    // Lade Nachrichten für den Chat
    loadMessagesForChat(chatId);
}

// Lade Nachrichten für einen Chat - KORRIGIERT
async function loadMessagesForChat(chatId) {
    if (!chatId || !currentUser) return;
    
    console.log('Chat: Lade Nachrichten für Chat ID:', chatId);
    
    // Prüfe ob es ein Demo-Chat oder Admin-Chat ist
    if (typeof chatId === 'string' && (chatId.startsWith('demo-') || chatId === 'admin-chat')) {
        showEmptyChat();
        return;
    }
    
    try {
        // Versuche echte Nachrichten zu laden
        const currentUserId = await getCurrentUserId();
        const response = await fetch(`${API_URL}/chatentry/${currentUserId}/${chatId}`);
        
        if (response.ok) {
            const messages = await response.json();
            console.log('Chat: Echte Nachrichten von API erhalten:', messages);
            
            // Aktualisiere Chat-Objekt mit letzter Nachricht
            if (messages.length > 0) {
                const chat = chats.find(c => c.id === chatId);
                if (chat) {
                    const lastMsg = messages[messages.length - 1];
                    const lastMessage = lastMsg.message || 'Nachricht';
                    chat.lastMessage = lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage;
                    chat.lastUpdate = lastMsg.time || new Date().toISOString();
                    
                    // Chat-Liste neu rendern um die Kategorie zu aktualisieren
                    renderChatList();
                    // Aktiven Chat wieder markieren
                    setTimeout(() => {
                        document.querySelector(`[data-chat-id="${chatId}"]`)?.classList.add('active');
                    }, 100);
                }
            }
            
            renderRealMessages(messages);
        } else {
            console.log('Chat: Keine echten Nachrichten gefunden, zeige leeren Chat');
            showEmptyChat();
        }
    } catch (error) {
        console.error('Chat: Fehler beim Laden von Nachrichten:', error);
        showEmptyChat();
    }
}

// Zeige leeren Chat
function showEmptyChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '<div class="empty-chat-info"><i class="fas fa-comments"></i><p>Noch keine Nachrichten in diesem Chat<br><small>Schreiben Sie die erste Nachricht!</small></p></div>';
    }
}

// Rendere echte Nachrichten
function renderRealMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
        showEmptyChat();
        return;
    }
    
    messages.forEach((message, index) => {
        const messageDiv = document.createElement('div');
        const isCurrentUser = message.sender && message.sender.name === currentUser;
        
        messageDiv.className = `message ${isCurrentUser ? 'user' : 'other'}`;
        messageDiv.setAttribute('data-message-id', message.id || index);
        
        const senderName = message.sender ? message.sender.name : 'Unbekannt';
        const messageTime = message.time ? formatDateTime(message.time) : 'Jetzt';
        
        // Bestimme Lesebestätigung-Status
        const readStatus = getReadStatus(message, isCurrentUser);
        
        messageDiv.innerHTML = `
            <div class="message-sender">${escapeHtml(senderName)}</div>
            <div>${escapeHtml(message.message)}</div>
            <div class="message-status">
                <span class="message-time">${messageTime}</span>
                ${readStatus}
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Sende Nachricht - HAUPTFUNKTION KORRIGIERT
async function sendMessage(message) {
    if (!message || !currentChatId || !currentUser) return;
    
    console.log('Chat: Sende Nachricht:', message, 'an Chat:', currentChatId);
    
    // Prüfe ob es ein Demo-Chat oder Admin-Chat ist
    if (typeof currentChatId === 'string' && (currentChatId.startsWith('demo-') || currentChatId === 'admin-chat')) {
        sendDemoMessage(message);
        return;
    }
    
    try {
        const currentUserId = await getCurrentUserId();
        
        // KORRIGIERT: Verwende die richtige Chat-ID als Empfänger-ID
        const receiverId = currentChatId;
        
        console.log('Chat: Sende über API - Sender ID:', currentUserId, 'Empfänger ID:', receiverId);
        
        const response = await fetch(`${API_URL}/chatentry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: { id: currentUserId },
                receiver: { id: receiverId },
                message: message,
                time: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log('Chat: Nachricht erfolgreich gesendet');
            
            // Chat-Liste sofort aktualisieren
            updateChatListAfterMessage(message);
            
            // Nachricht direkt zum Chat hinzufügen
            addMessageToChat(message, true);
            
            showMessage('Nachricht gesendet', 'success');
        } else {
            throw new Error(`API Error: ${response.status}`);
        }
    } catch (error) {
        console.error('Chat: Fehler beim Senden:', error);
        showMessage('Fehler beim Senden - verwende Demo-Modus', 'warning');
        sendDemoMessage(message);
    }
}

// Füge Nachricht direkt zum Chat hinzu
function addMessageToChat(message, isCurrentUser = true) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Entferne "leerer Chat" Info falls vorhanden
    const emptyInfo = chatMessages.querySelector('.empty-chat-info');
    if (emptyInfo) {
        emptyInfo.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isCurrentUser ? 'user' : 'other'}`;
    messageDiv.setAttribute('data-message-id', `local-${Date.now()}`);
    
    const now = new Date();
    const time = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // KORRIGIERT: Verwende immer den aktuellen User als Sender für eigene Nachrichten
    const senderName = isCurrentUser ? currentUser : getOtherUserFromChat(currentChatId);
    
    messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(senderName)}</div>
        <div>${escapeHtml(message)}</div>
        <div class="message-status">
            <span class="message-time">${time}</span>
            ${isCurrentUser ? '<div class="read-status status-sending"><i class="fas fa-clock"></i></div>' : ''}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Status-Updates für eigene Nachrichten
    if (isCurrentUser) {
        setTimeout(() => {
            const statusElement = messageDiv.querySelector('.read-status');
            if (statusElement) {
                statusElement.className = 'read-status status-delivered';
                statusElement.innerHTML = '<i class="fas fa-check"></i>';
            }
        }, 1000);
        
        setTimeout(() => {
            const statusElement = messageDiv.querySelector('.read-status');
            if (statusElement) {
                statusElement.className = 'read-status status-read';
                statusElement.innerHTML = '<i class="fas fa-check-double"></i>';
            }
        }, 3000);
    }
}

// Demo-Nachricht senden (Fallback)
function sendDemoMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages || !currentChatId) return;
    
    // Entferne "leerer Chat" Info falls vorhanden
    const emptyInfo = chatMessages.querySelector('.empty-chat-info');
    if (emptyInfo) {
        emptyInfo.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.setAttribute('data-message-id', `demo-${Date.now()}`);
    
    const now = new Date();
    const time = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
    
    messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(currentUser)}</div>
        <div>${escapeHtml(message)}</div>
        <div class="message-status">
            <span class="message-time">${time}</span>
            <div class="read-status status-sending"><i class="fas fa-clock"></i></div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Chat-Liste aktualisieren
    updateChatListAfterMessage(message);
    
    // Status-Updates simulieren
    setTimeout(() => {
        const statusElement = messageDiv.querySelector('.read-status');
        if (statusElement) {
            statusElement.className = 'read-status status-delivered';
            statusElement.innerHTML = '<i class="fas fa-check"></i>';
        }
    }, 1000);
    
    setTimeout(() => {
        const statusElement = messageDiv.querySelector('.read-status');
        if (statusElement) {
            statusElement.className = 'read-status status-read';
            statusElement.innerHTML = '<i class="fas fa-check-double"></i>';
        }
    }, 3000);
    
    // ADMIN-SPEZIFISCHE BEHANDLUNG - Nur Antwort wenn es NICHT der Admin-Chat ist
    if (currentChatId !== 'admin-chat') {
        // Automatische Demo-Antwort nach 2 Sekunden für normale Chats
        setTimeout(() => {
            const otherUser = getOtherUserFromChat(currentChatId);
            const responseMessages = [
                "Das ist interessant!",
                "Verstehe, danke für die Info.",
                "Können wir uns morgen treffen?",
                "Ja, das passt mir gut.",
                "Super, freue mich darauf!"
            ];
            
            const randomResponse = responseMessages[Math.floor(Math.random() * responseMessages.length)];
            
            const responseDiv = document.createElement('div');
            responseDiv.className = 'message other';
            
            const responseTime = (now.getHours()) + ':' + (now.getMinutes() + 1).toString().padStart(2, '0');
            
            responseDiv.innerHTML = `
                <div class="message-sender">${escapeHtml(otherUser)}</div>
                <div>${escapeHtml(randomResponse)}</div>
                <div class="message-status">
                    <span class="message-time">${responseTime}</span>
                </div>
            `;
            
            chatMessages.appendChild(responseDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Auch nach der Antwort Chat-Liste aktualisieren
            updateChatListAfterMessage(randomResponse);
        }, 2000);
    }
}

// Hilfsfunktion: Chat-Liste nach Nachricht aktualisieren - ERWEITERT FÜR ADMIN-UPDATES
function updateChatListAfterMessage(message) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        // Aktualisiere die letzte Nachricht und Zeit
        chat.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
        chat.lastUpdate = new Date().toISOString();
        
        // WICHTIG: Entferne Chat aus aktueller Position und füge an den Anfang
        const index = chats.indexOf(chat);
        if (index > -1) {
            chats.splice(index, 1);
        }
        
        // Admin-Chats bleiben Admin-Chats, aber werden auch nach vorne geschoben
        if (chat.isAdmin || chat.isPinned) {
            console.log('Chat: Admin-Chat aktualisiert - wird an die Spitze gesetzt');
        }
        
        // Füge den aktualisierten Chat an den Anfang der Liste
        chats.unshift(chat);
        
        // Chat-Liste sofort neu rendern (wird jetzt in "Kürzliche Chats" sein)
        renderChatList();
        
        // Aktiven Chat wieder markieren
        setTimeout(() => {
            document.querySelector(`[data-chat-id="${currentChatId}"]`)?.classList.add('active');
        }, 100);
        
        console.log('Chat: Liste aktualisiert - Chat verschoben zu Kürzliche Chats');
    }
}

// NEU: Automatische Aktualisierung für eingehende Nachrichten
function startPeriodicChatUpdates() {
    console.log('Chat: ⏰ Starte automatische Aktualisierung (alle 10 Sekunden)');
    
    // Überprüfe alle 10 Sekunden ob neue Nachrichten da sind
    setInterval(async () => {
        if (!currentUser) {
            console.debug('Chat: Kein aktiver Benutzer - überspringe Aktualisierung');
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`Chat: 🔍 [${timestamp}] Starte Prüfung auf neue Nachrichten...`);
        
        try {
            const currentUserId = await getCurrentUserId();
            let hasUpdates = false;
            
            // TEIL 1: Prüfe bestehende aktive Chats auf Updates
            const activeChatsToCheck = chats.filter(chat => {
                // Überspringe Demo-Chats
                if (typeof chat.id === 'string' && (chat.id.startsWith('demo-') || chat.id === 'admin-chat')) {
                    return false;
                }
                // Nur Chats mit echten Nachrichten prüfen
                return chat.lastMessage && 
                       chat.lastMessage !== 'Neue Unterhaltung starten' && 
                       chat.lastMessage !== 'Starten Sie eine Unterhaltung';
            });
            
            console.log(`Chat: Prüfe ${activeChatsToCheck.length} aktive Chats auf Updates`);
            
            // Prüfe jeden aktiven Chat auf neue Nachrichten
            for (const chat of activeChatsToCheck) {
                try {
                    const response = await fetch(`${API_URL}/chatentry/${currentUserId}/${chat.id}`);
                    
                    if (response.ok) {
                        const messages = await response.json();
                        
                        if (messages.length > 0) {
                            const lastMsg = messages[messages.length - 1];
                            const lastMessage = lastMsg.message || 'Nachricht';
                            const lastUpdate = lastMsg.time || new Date().toISOString();
                            
                            // Prüfe ob sich die letzte Nachricht geändert hat
                            if (chat.lastUpdate !== lastUpdate) {
                                console.log(`Chat: ✉️ Neue Nachricht in Chat mit ${chat.user2Username}`);
                                
                                // Aktualisiere Chat-Objekt
                                chat.lastMessage = lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage;
                                chat.lastUpdate = lastUpdate;
                                hasUpdates = true;
                                
                                // Wenn dies der aktuell geöffnete Chat ist, aktualisiere die Nachrichten
                                if (currentChatId === chat.id) {
                                    renderRealMessages(messages);
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Ignoriere Fehler für einzelne Chats
                    console.debug('Chat: Fehler beim Prüfen von Chat:', chat.id, error);
                }
            }
            
            // TEIL 2: Prüfe auch NEUE Chats (für Admin - wenn jemand zum ersten Mal schreibt)
            const newChatsToCheck = chats.filter(chat => {
                // Überspringe Demo-Chats
                if (typeof chat.id === 'string' && (chat.id.startsWith('demo-') || chat.id === 'admin-chat')) {
                    return false;
                }
                // Nur Chats OHNE Nachrichten prüfen
                return !chat.lastMessage || 
                       chat.lastMessage === 'Neue Unterhaltung starten' || 
                       chat.lastMessage === 'Starten Sie eine Unterhaltung';
            });
            
            // Prüfe nur maximal 20 neue Chats pro Zyklus (Performance-Optimierung)
            const chatsToSample = newChatsToCheck.slice(0, 20);
            
            if (chatsToSample.length > 0) {
                console.log(`Chat: Prüfe ${chatsToSample.length} neue Chats auf erste Nachrichten`);
                
                for (const chat of chatsToSample) {
                    try {
                        const response = await fetch(`${API_URL}/chatentry/${currentUserId}/${chat.id}`);
                        
                        if (response.ok) {
                            const messages = await response.json();
                            
                            // Wenn es jetzt Nachrichten gibt, aktualisiere den Chat
                            if (messages.length > 0) {
                                const lastMsg = messages[messages.length - 1];
                                const lastMessage = lastMsg.message || 'Nachricht';
                                const lastUpdate = lastMsg.time || new Date().toISOString();
                                
                                console.log(`Chat: 🆕 Neue erste Nachricht von ${chat.user2Username}!`);
                                
                                // Aktualisiere Chat-Objekt
                                chat.lastMessage = lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage;
                                chat.lastUpdate = lastUpdate;
                                hasUpdates = true;
                                
                                // Wenn dies der aktuell geöffnete Chat ist, aktualisiere die Nachrichten
                                if (currentChatId === chat.id) {
                                    renderRealMessages(messages);
                                }
                            }
                        }
                    } catch (error) {
                        // Ignoriere Fehler für einzelne Chats
                        console.debug('Chat: Fehler beim Prüfen von neuem Chat:', chat.id, error);
                    }
                }
            }
            
            // Wenn es Updates gab, rendere die Chat-Liste neu
            if (hasUpdates) {
                console.log('Chat: 🔄 Updates gefunden, rendere Liste neu');
                
                // WICHTIG: Sortiere Chats neu - Chats mit neuesten Nachrichten nach vorne
                chats.sort((a, b) => {
                    // Admin/Pinned Chats zuerst
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    
                    // Dann nach lastUpdate sortieren (neueste zuerst)
                    return new Date(b.lastUpdate) - new Date(a.lastUpdate);
                });
                
                renderChatList();
                
                // Aktiven Chat wieder markieren
                if (currentChatId) {
                    setTimeout(() => {
                        document.querySelector(`[data-chat-id="${currentChatId}"]`)?.classList.add('active');
                    }, 100);
                }
            }
            
        } catch (error) {
            // Fehler still ignorieren um Spam zu vermeiden
            console.debug('Chat: Fehler bei automatischer Aktualisierung:', error);
        }
    }, 10000); // Alle 10 Sekunden
}

// Such-Funktionalität für Kontakte
function filterContacts() {
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const chatItems = document.querySelectorAll('.chat-item');
    
    chatItems.forEach(item => {
        const chatNameElement = item.querySelector('.chat-name');
        const chatName = chatNameElement?.textContent?.toLowerCase() || '';
        
        if (chatName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Hilfsfunktion: Anderen Benutzer aus Chat ermitteln
function getOtherUserFromChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        return chat.user1Username === currentUser ? chat.user2Username : chat.user1Username;
    }
    return 'Unbekannt';
}

// Hilfsfunktion: Aktuelle Benutzer-ID ermitteln mit Fallback
async function getCurrentUserId() {
    try {
        const usersResponse = await fetch(`${API_URL}/chatentry/users`);
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            const user = users.find(u => u.name === currentUser);
            return user ? user.id : 1;
        }
    } catch (error) {
        console.error('Chat: Fehler beim Ermitteln der User-ID:', error);
    }
    return 1; // Fallback
}

// Hilfsfunktionen für UI
function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
        return `${diffDays}d`;
    } else if (diffHours > 0) {
        return `${diffHours}h`;
    } else {
        return 'jetzt';
    }
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Bestimme den Lesebestätigung-Status einer Nachricht
function getReadStatus(message, isCurrentUser) {
    if (!isCurrentUser) {
        return ''; // Keine Status-Anzeige für empfangene Nachrichten
    }
    
    // Für gesendete Nachrichten zeige Status
    const messageAge = Date.now() - new Date(message.time || Date.now()).getTime();
    
    if (messageAge < 1000) {
        // Gerade gesendet
        return '<div class="read-status status-sending"><i class="fas fa-clock"></i></div>';
    } else if (messageAge < 5000) {
        // Zugestellt
        return '<div class="read-status status-delivered"><i class="fas fa-check"></i></div>';
    } else {
        // Gelesen (nach 5 Sekunden)
        return '<div class="read-status status-read"><i class="fas fa-check-double"></i></div>';
    }
}

// Nachrichten anzeigen
function showMessage(message, type) {
    let messageElement = document.querySelector('.response-message');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'response-message';
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.className = `response-message ${type}`;
    messageElement.style.display = 'block';
    
    // Auto-hide nach 3 Sekunden
    setTimeout(() => {
        if (messageElement && messageElement.parentNode) {
            messageElement.style.display = 'none';
        }
    }, 3000);
}

console.log('Chat: Initialisierung abgeschlossen');