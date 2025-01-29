const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const oldPasswordInput = document.getElementById('oldPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const changePasswordSubmitButton = document.getElementById('changePasswordSubmit');
    const errorMessageDiv = document.getElementById('error-message');
    const successMessageDiv = document.getElementById('success-message');

    changePasswordSubmitButton.addEventListener('click', () => {
        const oldPassword = oldPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        errorMessageDiv.style.display = 'none';
        successMessageDiv.style.display = 'none';

        if (newPassword !== confirmNewPassword) {
            errorMessageDiv.textContent = 'New passwords do not match.';
            errorMessageDiv.style.display = 'block';
            return;
        }

        ipcRenderer.send('change-password', { oldPassword, newPassword });
    });

    ipcRenderer.on('change-password-result', (event, { success, message }) => {
        if (success) {
            successMessageDiv.style.display = 'block';
            oldPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';
        } else {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
        }
    });
});