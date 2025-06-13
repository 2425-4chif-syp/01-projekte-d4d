// navbar-compat.js - Kompatibilitätsskript für die Navbar-Funktionalität

document.addEventListener('DOMContentLoaded', function() {
    // Benutzer-Eingabe in der Navbar handhaben
    const navUsernameInput = document.getElementById("navUsername");
    const activeUserDisplay = document.getElementById("activeUserDisplay");
    
    if (navUsernameInput) {
        navUsernameInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                const username = this.value.trim();
                if (username) {
                    // Dispatch custom event for other scripts to listen to
                    window.dispatchEvent(new CustomEvent('setActiveUser', {
                        detail: { username: username }
                    }));
                }
            }
        });
    }
    
    // Listen for active user changes from other scripts
    window.addEventListener('setActiveUser', function(e) {
        const username = e.detail.username;
        if (activeUserDisplay) {
            activeUserDisplay.textContent = username;
            activeUserDisplay.classList.add("user-active");
        }
    });
    
    // Listen for user change events
    window.addEventListener('userChanged', function(e) {
        if (activeUserDisplay) {
            activeUserDisplay.textContent = e.detail.username;
            if (e.detail.username !== "Nicht angemeldet") {
                activeUserDisplay.classList.add("user-active");
            } else {
                activeUserDisplay.classList.remove("user-active");
            }
        }
    });
});