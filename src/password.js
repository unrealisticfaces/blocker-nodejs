const { ipcRenderer } = require('electron');

document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.getElementById("password");
    const submitButton = document.getElementById("submitPassword");
    const errorMessage = document.getElementById("error-message");

    submitButton.addEventListener("click", submitPassword);

    passwordInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            submitPassword();
        }
    });

    function submitPassword() {
        const enteredPassword = passwordInput.value;
        ipcRenderer.send('submit-password', enteredPassword);
        passwordInput.value = '';
        passwordInput.focus();
    }

    ipcRenderer.on('password-incorrect', () => {
        errorMessage.style.display = 'block';
    });
});