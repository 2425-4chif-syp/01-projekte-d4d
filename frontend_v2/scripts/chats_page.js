import { API_URL } from "./config.js";
import { sessionManager } from "./session-manager.js";

let currentChatId = null;
let currentUser = null;
let currentUserId = null;
let chats = [];

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Chat: DOM geladen");
  await loadActiveUser();
  setupEventListeners();
  startPeriodicChatUpdates(); // NEU: Starte automatische Aktualisierung
});

// Lade aktiven Benutzer aus Keycloak-Session
async function loadActiveUser() {
  try {
    const session = await sessionManager.getSession();
    
    if (session && session.user) {
      currentUser = session.user.fullname || session.user.username || "Unbekannt";
      currentUserId = session.user.id;
      console.log("Chat: Aktiver Benutzer aus Session:", currentUser, "ID:", currentUserId);
      
      // Lade nur existierende Konversationen (mit Nachrichten)
      await loadExistingChats();
    } else {
      console.log("Chat: Keine aktive Session gefunden");
      showNoUserMessage();
    }
  } catch (error) {
    console.error("Chat: Fehler beim Laden der Session:", error);
    showNoUserMessage();
  }
}

function showNoUserMessage() {
  const chatList = document.getElementById("chatItems");
  if (chatList) {
    chatList.innerHTML =
      '<div class="no-contacts">Bitte melden Sie sich zuerst an.<br><small>Sie müssen bei Keycloak angemeldet sein.</small></div>';
  }
}

// Zeige leere Kontaktliste (Microsoft Teams-Stil)
function showEmptyContactList() {
  const chatList = document.getElementById("chatItems");
  if (chatList) {
    chatList.innerHTML =
      '<div class="no-contacts"><i class="fas fa-search"></i><p>Suchen Sie nach Kontakten</p><small>Geben Sie einen Namen ein, um Chats zu finden</small></div>';
  }
}

// Lade echte Chats aus dem Backend - NUR FÜR EXISTIERENDE UNTERHALTUNGEN
async function loadExistingChats() {
  if (!currentUser || !currentUserId) {
    showEmptyContactList();
    return;
  }

  console.log("Chat: Lade existierende Chats für Benutzer:", currentUser);

  try {
    // Lade nur Chats mit bereits existierenden Nachrichten
    const response = await fetch(`${API_URL}/chatentry/conversations/${currentUserId}`);

    if (!response.ok) {
      console.log("Chat: Noch keine existierenden Konversationen");
      showEmptyContactList();
      return;
    }

    const conversations = await response.json();
    console.log("Chat: Existierende Konversationen:", conversations.length);

    if (conversations.length === 0) {
      showEmptyContactList();
      return;
    }

    // Erstelle Chat-Objekte für existierende Konversationen
    chats = conversations.map(conv => ({
      id: conv.userId,
      user1Username: currentUser,
      user2Username: conv.username,
      lastMessage: conv.lastMessage || "Keine Nachricht",
      lastUpdate: conv.lastUpdate || new Date().toISOString(),
      isAdmin: false,
    }));

    renderChatList();
    console.log("Chat: Existierende Konversationen geladen:", chats.length);
  } catch (error) {
    console.error("Chat: Fehler beim Laden existierender Chats:", error);
    showEmptyContactList();
  }
}

// Suche nach Benutzern (Teams-Stil)
async function searchUsers(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) {
    // Bei leerer Suche: zeige existierende Chats
    await loadExistingChats();
    return;
  }

  console.log("Chat: Suche nach Benutzern:", searchTerm);

  try {
    const response = await fetch(`${API_URL}/chatentry/users`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const allUsers = await response.json();
    
    // Filtere Benutzer nach Suchbegriff (case-insensitive)
    const filteredUsers = allUsers.filter(user => {
      const userName = user.name || "";
      return userName.toLowerCase().includes(searchTerm.toLowerCase()) && 
             userName !== currentUser; // Schließe aktuellen User aus
    });

    console.log("Chat: Gefundene Benutzer:", filteredUsers.length);

    // Erstelle Chat-Objekte für gefundene Benutzer
    chats = await Promise.all(filteredUsers.map(async (user) => {
      try {
        // Prüfe ob es bereits Nachrichten gibt
        const messagesResponse = await fetch(
          `${API_URL}/chatentry/${currentUserId}/${user.id}`
        );

        let lastMessage = "Neue Unterhaltung starten";
        let lastUpdate = new Date().toISOString();

        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            lastMessage = lastMsg.message || "Nachricht";
            lastMessage =
              lastMessage.length > 50
                ? lastMessage.substring(0, 50) + "..."
                : lastMessage;
            lastUpdate = lastMsg.time || new Date().toISOString();
          }
        }

        return {
          id: user.id,
          user1Username: currentUser,
          user2Username: user.name,
          lastMessage: lastMessage,
          lastUpdate: lastUpdate,
          isAdmin: false,
        };
      } catch (error) {
        console.debug("Chat: Fehler beim Prüfen von", user.name, ":", error);
        return {
          id: user.id,
          user1Username: currentUser,
          user2Username: user.name,
          lastMessage: "Neue Unterhaltung starten",
          lastUpdate: new Date().toISOString(),
          isAdmin: false,
        };
      }
    }));

    if (chats.length === 0) {
      const chatList = document.getElementById("chatItems");
      if (chatList) {
        chatList.innerHTML = '<div class="no-contacts">Keine Benutzer gefunden</div>';
      }
    } else {
      renderChatList();
    }
  } catch (error) {
    console.error("Chat: Fehler bei der Benutzersuche:", error);
    showMessage("Fehler bei der Benutzersuche", "error");
  }
}

// Event Listeners
function setupEventListeners() {
  // Chat-Suchfeld (für Personensuche - Teams-Stil)
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      const searchTerm = this.value.trim();
      if (searchTerm.length >= 2) {
        searchUsers(searchTerm);
      } else if (searchTerm.length === 0) {
        // Bei leerer Suche: zeige existierende Chats
        loadExistingChats();
      }
    });
  }

  // Chat-Form
  const chatForm = document.getElementById("chatForm");
  if (chatForm) {
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const chatInput = document.getElementById("chatInput");
      if (chatInput && chatInput.value.trim() && currentChatId) {
        sendMessage(chatInput.value.trim());
        chatInput.value = "";
      }
    });
  }
}

// Setze aktiven Benutzer - KORRIGIERT MIT BENUTZER-VALIDIERUNG
// Rendere Chat-Liste (sortiert nach Aktivität)
function renderChatList() {
  const chatList = document.getElementById("chatItems");
  if (!chatList) {
    console.error("chatItems nicht gefunden!");
    return;
  }

  chatList.innerHTML = "";

  if (chats.length === 0) {
    chatList.innerHTML = '<div class="no-contacts">Keine Chats vorhanden</div>';
    return;
  }

  // Sortiere Chats nach letzter Aktivität (neueste zuerst)
  const sortedChats = [...chats].sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));

  console.log(`Chat: Rendere ${sortedChats.length} Chats`);

  sortedChats.forEach((chat) => {
    renderChatItem(chat, chatList);
  });

  console.log(`Chat: ${sortedChats.length} Chats gerendert`);
}

// Hilfsfunktion: Einzelnen Chat-Item rendern
function renderChatItem(chat, container) {
  let otherUser =
    chat.user1Username === currentUser
      ? chat.user2Username
      : chat.user1Username;

  // Falls otherUser ein Objekt ist, extrahiere den Namen
  if (typeof otherUser === "object" && otherUser !== null) {
    otherUser = otherUser.username || otherUser.name || "Unbekannt";
  }

  const firstLetter = otherUser.charAt(0).toUpperCase();

  const chatItem = document.createElement("div");
  chatItem.className = "chat-item";
  chatItem.setAttribute("data-chat-id", chat.id);

  // Bestimme ob Chat aktiv ist (hat Nachrichten)
  const hasMessages =
    chat.lastMessage &&
    chat.lastMessage !== "Starten Sie eine Unterhaltung" &&
    chat.lastMessage !== "Neue Unterhaltung starten" &&
    chat.lastMessage.trim() !== "";

  chatItem.innerHTML = `
        <div class="chat-avatar">${firstLetter}</div>
        <div class="chat-details">
            <div class="chat-name">${escapeHtml(otherUser)}</div>
            <div class="chat-last-message ${
              hasMessages ? "has-messages" : "no-messages"
            }">${escapeHtml(
    chat.lastMessage || "Neue Unterhaltung starten"
  )}</div>
        </div>
        <div class="chat-meta">
            <div class="chat-time">${
              hasMessages ? formatTime(chat.lastUpdate) : ""
            }</div>
            ${
              hasMessages
                ? '<div class="chat-indicator active"></div>'
                : '<div class="chat-indicator new"></div>'
            }
        </div>
    `;

  chatItem.addEventListener("click", () => selectChat(chat.id, otherUser));
  container.appendChild(chatItem);
}

// Chat auswählen - KORRIGIERT
function selectChat(chatId, otherUser) {
  console.log("Chat: Wähle Chat:", chatId, "mit", otherUser);
  currentChatId = chatId;

  const chatTitle = document.getElementById("chatTitle");
  if (chatTitle) {
    chatTitle.textContent = `Chat mit ${otherUser}`;
  }

  // Markiere aktiven Chat
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.remove("active");
  });
  document.querySelector(`[data-chat-id="${chatId}"]`)?.classList.add("active");

  // Lade Nachrichten für den Chat
  loadMessagesForChat(chatId);
}

// Lade Nachrichten für einen Chat
async function loadMessagesForChat(chatId) {
  if (!chatId || !currentUserId) return;

  console.log("Chat: Lade Nachrichten für Chat ID:", chatId);

  try {
    // Versuche echte Nachrichten zu laden
    const response = await fetch(
      `${API_URL}/chatentry/${currentUserId}/${chatId}`
    );

    if (response.ok) {
      const messages = await response.json();
      console.log("Chat: Echte Nachrichten von API erhalten:", messages);

      // Aktualisiere Chat-Objekt mit letzter Nachricht
      if (messages.length > 0) {
        const chat = chats.find((c) => c.id === chatId);
        if (chat) {
          const lastMsg = messages[messages.length - 1];
          const lastMessage = lastMsg.message || "Nachricht";
          chat.lastMessage =
            lastMessage.length > 50
              ? lastMessage.substring(0, 50) + "..."
              : lastMessage;
          chat.lastUpdate = lastMsg.time || new Date().toISOString();

          // Chat-Liste neu rendern
          renderChatList();
          // Aktiven Chat wieder markieren
          setTimeout(() => {
            document
              .querySelector(`[data-chat-id="${chatId}"]`)
              ?.classList.add("active");
          }, 100);
        }
      }

      renderRealMessages(messages);
    } else {
      console.log("Chat: Keine echten Nachrichten gefunden, zeige leeren Chat");
      showEmptyChat();
    }
  } catch (error) {
    console.error("Chat: Fehler beim Laden von Nachrichten:", error);
    showEmptyChat();
  }
}

// Zeige leeren Chat
function showEmptyChat() {
  const chatMessages = document.getElementById("chatMessages");
  if (chatMessages) {
    chatMessages.innerHTML =
      '<div class="empty-chat-info"><i class="fas fa-comments"></i><p>Noch keine Nachrichten in diesem Chat<br><small>Schreiben Sie die erste Nachricht!</small></p></div>';
  }
}

// Rendere echte Nachrichten
function renderRealMessages(messages) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  chatMessages.innerHTML = "";

  if (messages.length === 0) {
    showEmptyChat();
    return;
  }

  messages.forEach((message, index) => {
    const messageDiv = document.createElement("div");
    const isCurrentUser = message.sender && message.sender.name === currentUser;

    messageDiv.className = `message ${isCurrentUser ? "user" : "other"}`;
    messageDiv.setAttribute("data-message-id", message.id || index);

    const senderName = message.sender ? message.sender.name : "Unbekannt";
    const messageTime = message.time ? formatDateTime(message.time) : "Jetzt";

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

// Sende Nachricht
async function sendMessage(message) {
  if (!message || !currentChatId || !currentUserId) return;

  console.log("Chat: Sende Nachricht:", message, "an Chat:", currentChatId);

  try {
    const receiverId = currentChatId;

    console.log(
      "Chat: Sende über API - Sender ID:",
      currentUserId,
      "Empfänger ID:",
      receiverId
    );

    const response = await fetch(`${API_URL}/chatentry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { id: currentUserId },
        receiver: { id: receiverId },
        message: message,
        time: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      console.log("Chat: Nachricht erfolgreich gesendet");

      // Chat-Liste sofort aktualisieren
      updateChatListAfterMessage(message);

      // Nachricht direkt zum Chat hinzufügen
      addMessageToChat(message, true);

      showMessage("Nachricht gesendet", "success");
    } else {
      throw new Error(`API Error: ${response.status}`);
    }
  } catch (error) {
    console.error("Chat: Fehler beim Senden:", error);
    showMessage("Fehler beim Senden der Nachricht", "error");
  }
}

// Füge Nachricht direkt zum Chat hinzu
function addMessageToChat(message, isCurrentUser = true) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  // Entferne "leerer Chat" Info falls vorhanden
  const emptyInfo = chatMessages.querySelector(".empty-chat-info");
  if (emptyInfo) {
    emptyInfo.remove();
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isCurrentUser ? "user" : "other"}`;
  messageDiv.setAttribute("data-message-id", `local-${Date.now()}`);

  const now = new Date();
  const time =
    now.getHours() + ":" + now.getMinutes().toString().padStart(2, "0");

  // KORRIGIERT: Verwende immer den aktuellen User als Sender für eigene Nachrichten
  const senderName = isCurrentUser
    ? currentUser
    : getOtherUserFromChat(currentChatId);

  messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(senderName)}</div>
        <div>${escapeHtml(message)}</div>
        <div class="message-status">
            <span class="message-time">${time}</span>
            ${
              isCurrentUser
                ? '<div class="read-status status-sending"><i class="fas fa-clock"></i></div>'
                : ""
            }
        </div>
    `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Status-Updates für eigene Nachrichten
  if (isCurrentUser) {
    setTimeout(() => {
      const statusElement = messageDiv.querySelector(".read-status");
      if (statusElement) {
        statusElement.className = "read-status status-delivered";
        statusElement.innerHTML = '<i class="fas fa-check"></i>';
      }
    }, 1000);

    setTimeout(() => {
      const statusElement = messageDiv.querySelector(".read-status");
      if (statusElement) {
        statusElement.className = "read-status status-read";
        statusElement.innerHTML = '<i class="fas fa-check-double"></i>';
      }
    }, 3000);
  }
}

// Hilfsfunktion: Chat-Liste nach Nachricht aktualisieren
function updateChatListAfterMessage(message) {
  const chat = chats.find((c) => c.id === currentChatId);
  if (chat) {
    // Aktualisiere die letzte Nachricht und Zeit
    chat.lastMessage =
      message.length > 50 ? message.substring(0, 50) + "..." : message;
    chat.lastUpdate = new Date().toISOString();

    // Entferne Chat aus aktueller Position und füge an den Anfang
    const index = chats.indexOf(chat);
    if (index > -1) {
      chats.splice(index, 1);
    }

    // Füge den aktualisierten Chat an den Anfang der Liste
    chats.unshift(chat);

    // Chat-Liste sofort neu rendern
    renderChatList();

    // Aktiven Chat wieder markieren
    setTimeout(() => {
      document
        .querySelector(`[data-chat-id="${currentChatId}"]`)
        ?.classList.add("active");
    }, 100);

    console.log(
      "Chat: Liste aktualisiert - Chat verschoben zu Kürzliche Chats"
    );
  }
}

// NEU: Automatische Aktualisierung für eingehende Nachrichten
function startPeriodicChatUpdates() {
  console.log("Chat: ⏰ Starte automatische Aktualisierung (alle 10 Sekunden)");

  // Überprüfe alle 10 Sekunden ob neue Nachrichten da sind
  setInterval(async () => {
    if (!currentUserId) {
      console.debug("Chat: Kein aktiver Benutzer - überspringe Aktualisierung");
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `Chat: 🔍 [${timestamp}] Starte Prüfung auf neue Nachrichten...`
    );

    try {
      let hasUpdates = false;

      // TEIL 1: Prüfe bestehende aktive Chats auf Updates
      const activeChatsToCheck = chats.filter((chat) => {
        // Nur Chats mit echten Nachrichten prüfen
        return (
          chat.lastMessage &&
          chat.lastMessage !== "Neue Unterhaltung starten" &&
          chat.lastMessage !== "Starten Sie eine Unterhaltung"
        );
      });

      console.log(
        `Chat: Prüfe ${activeChatsToCheck.length} aktive Chats auf Updates`
      );

      // Prüfe jeden aktiven Chat auf neue Nachrichten
      for (const chat of activeChatsToCheck) {
        try {
          const response = await fetch(
            `${API_URL}/chatentry/${currentUserId}/${chat.id}`
          );

          if (response.ok) {
            const messages = await response.json();

            if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              const lastMessage = lastMsg.message || "Nachricht";
              const lastUpdate = lastMsg.time || new Date().toISOString();

              // Prüfe ob sich die letzte Nachricht geändert hat
              if (chat.lastUpdate !== lastUpdate) {
                console.log(
                  `Chat: ✉️ Neue Nachricht in Chat mit ${chat.user2Username}`
                );

                // Aktualisiere Chat-Objekt
                chat.lastMessage =
                  lastMessage.length > 50
                    ? lastMessage.substring(0, 50) + "..."
                    : lastMessage;
                chat.lastUpdate = lastUpdate;
                hasUpdates = true;

                // Wenn dies der aktuell geöffnete Chat ist, aktualisiere die Nachrichten
                if (currentChatId === chat.id) {
                  renderRealMessages(messages);
                }
              }
            }
          } else if (response.status !== 404) {
            // Nur nicht-404 Fehler loggen
            console.debug(
              "Chat: Fehler beim Prüfen von Chat:",
              chat.id,
              response.status
            );
          }
        } catch (error) {
          // Ignoriere Fehler für einzelne Chats
          console.debug("Chat: Fehler beim Prüfen von Chat:", chat.id, error);
        }
      }

      // TEIL 2: Prüfe auch NEUE Chats (wenn jemand zum ersten Mal schreibt)
      const newChatsToCheck = chats.filter((chat) => {
        // Nur Chats OHNE Nachrichten prüfen
        return (
          !chat.lastMessage ||
          chat.lastMessage === "Neue Unterhaltung starten" ||
          chat.lastMessage === "Starten Sie eine Unterhaltung"
        );
      });

      // Prüfe nur maximal 20 neue Chats pro Zyklus (Performance-Optimierung)
      const chatsToSample = newChatsToCheck.slice(0, 20);

      if (chatsToSample.length > 0) {
        console.log(
          `Chat: Prüfe ${chatsToSample.length} neue Chats auf erste Nachrichten`
        );

        for (const chat of chatsToSample) {
          try {
            const response = await fetch(
              `${API_URL}/chatentry/${currentUserId}/${chat.id}`
            );

            if (response.ok) {
              const messages = await response.json();

              // Wenn es jetzt Nachrichten gibt, aktualisiere den Chat
              if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                const lastMessage = lastMsg.message || "Nachricht";
                const lastUpdate = lastMsg.time || new Date().toISOString();

                console.log(
                  `Chat: 🆕 Neue erste Nachricht von ${chat.user2Username}!`
                );

                // Aktualisiere Chat-Objekt
                chat.lastMessage =
                  lastMessage.length > 50
                    ? lastMessage.substring(0, 50) + "..."
                    : lastMessage;
                chat.lastUpdate = lastUpdate;
                hasUpdates = true;

                // Wenn dies der aktuell geöffnete Chat ist, aktualisiere die Nachrichten
                if (currentChatId === chat.id) {
                  renderRealMessages(messages);
                }
              }
            } else if (response.status !== 404) {
              // Nur nicht-404 Fehler loggen
              console.debug(
                "Chat: Fehler beim Prüfen von neuem Chat:",
                chat.id,
                response.status
              );
            }
          } catch (error) {
            // Ignoriere Fehler für einzelne Chats
            console.debug(
              "Chat: Fehler beim Prüfen von neuem Chat:",
              chat.id,
              error
            );
          }
        }
      }

      // Wenn es Updates gab, rendere die Chat-Liste neu
      if (hasUpdates) {
        console.log("Chat: 🔄 Updates gefunden, rendere Liste neu");

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
            document
              .querySelector(`[data-chat-id="${currentChatId}"]`)
              ?.classList.add("active");
          }, 100);
        }
      }
    } catch (error) {
      // Fehler still ignorieren um Spam zu vermeiden
      console.debug("Chat: Fehler bei automatischer Aktualisierung:", error);
    }
  }, 10000); // Alle 10 Sekunden
}

// Such-Funktionalität für Kontakte
// Hilfsfunktion: Anderen Benutzer aus Chat ermitteln
function getOtherUserFromChat(chatId) {
  const chat = chats.find((c) => c.id === chatId);
  if (chat) {
    return chat.user1Username === currentUser
      ? chat.user2Username
      : chat.user1Username;
  }
  return "Unbekannt";
}

// Hilfsfunktionen für UI
function formatTime(dateString) {
  if (!dateString) return "";
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
    return "jetzt";
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Bestimme den Lesebestätigung-Status einer Nachricht
function getReadStatus(message, isCurrentUser) {
  if (!isCurrentUser) {
    return ""; // Keine Status-Anzeige für empfangene Nachrichten
  }

  // Für gesendete Nachrichten zeige Status
  const messageAge =
    Date.now() - new Date(message.time || Date.now()).getTime();

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
  let messageElement = document.querySelector(".response-message");

  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "response-message";
    document.body.appendChild(messageElement);
  }

  messageElement.textContent = message;
  messageElement.className = `response-message ${type}`;
  messageElement.style.display = "block";

  // Auto-hide nach 3 Sekunden
  setTimeout(() => {
    if (messageElement && messageElement.parentNode) {
      messageElement.style.display = "none";
    }
  }, 3000);
}

console.log("Chat: Initialisierung abgeschlossen");
