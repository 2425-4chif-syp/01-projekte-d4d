document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const switchUserButton = document.getElementById('switchUser');
    const currentUserDisplay = document.getElementById('currentUser');

    let currentUser = 'Gast';
    const users = ['Gast', 'Admin', 'Benutzer1'];

    // Benutzerwechsel
    switchUserButton.addEventListener('click', () => {
        const nextUser = users[(users.indexOf(currentUser) + 1) % users.length];
        currentUser = nextUser;
        currentUserDisplay.textContent = currentUser;
    });

    // Nachricht senden
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            const messageData = {
                user: currentUser,
                message: message,
            };

            try {
                const response = await fetch('http://localhost:8080/chat/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({user: currentUser, message: message,}),
                });


                console.log('Request gesendet:', {user: currentUser, message: message});
                
                if (response.ok) {
                    chatInput.value = ''; // Eingabefeld leeren
                    fetchMessages(); // Nachrichtenliste aktualisieren
                } else {
                    alert(`Fehler: ${response.statusText}`);
                }
            } catch (error) {
                console.error('Fehler beim Senden der Nachricht:', error);
            }
        }
    });

    // Nachrichten abrufen und anzeigen
    async function fetchMessages() {
        try {
            const response = await fetch('http://localhost:8080/chat/messages');
            if (response.ok) {
                const messages = await response.json();
                renderMessages(messages);
            } else {
                console.error('Fehler beim Abrufen der Nachrichten:', response.statusText);
            }
        } catch (error) {
            console.error('Fehler beim Verbindungsaufbau mit dem Backend:', error);
        }
    }

    // Nachrichten im DOM anzeigen
    function renderMessages(messages) {
        chatMessages.innerHTML = ''; // Nachrichtenliste leeren
        messages.forEach((msg) => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            if (msg.user === currentUser) {
                messageDiv.classList.add('self'); // Nachrichten des aktuellen Nutzers rechts anzeigen
            } else {
                messageDiv.classList.add('user'); // Andere Nachrichten links anzeigen
            }
            messageDiv.textContent = `${msg.user}: ${msg.message}`;
            chatMessages.appendChild(messageDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Nachrichten alle 2 Sekunden aktualisieren
    setInterval(fetchMessages, 2000);

    // Initial Nachrichten laden
    fetchMessages();
});