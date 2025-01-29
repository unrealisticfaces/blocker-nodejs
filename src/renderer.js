document.getElementById('startButton').addEventListener('click', async () => {
    await window.electronAPI.startBlocking();
    alert('Blocking started and added to startup!');
});

document.getElementById('stopButton').addEventListener('click', async () => {
    await window.electronAPI.stopBlocking();
    alert('Blocking stopped!');
});

document.getElementById('addKeywordButton').addEventListener('click', async () => {
    const newKeyword = document.getElementById('keywordInput').value.trim();

    if (newKeyword) {
        await window.electronAPI.stopBlocking();
        await window.electronAPI.addKeyword(newKeyword);
        document.getElementById('keywordInput').value = '';
        alert('Keyword added. Please restart the blocking service.');
    } else {
        alert('Please enter a valid keyword.');
    }
});

window.electronAPI.onBlockedExecution((event, value) => {
    const notificationsDiv = document.getElementById('notifications');
    const notification = document.createElement('p');
    notification.textContent = `Blocked: ${value}`;
    notificationsDiv.appendChild(notification);
});

document.getElementById('changePasswordButton').addEventListener('click', () => {
    ipcRenderer.send('open-change-password-window');
});