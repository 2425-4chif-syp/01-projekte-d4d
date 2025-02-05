document.getElementById("loginButton").addEventListener("click", function () {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (username === "admin" && password === "d4d") {
        window.location.href = "manageServiceTypes.html";
    } else {
        alert("Falsche Anmeldedaten!");
        window.history.back(); 
    }
});

document.getElementById("backButton").addEventListener("click", function () {
    window.history.back();
});

document.getElementById("password").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("loginButton").click();
    }
});