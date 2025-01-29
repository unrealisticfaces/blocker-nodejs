window.popupAPI.onBlockedMessage((event, processName) => {
    document.getElementById('message').textContent = `Blocked: ${processName}`;
});

document.getElementById('okButton').addEventListener('click', () => {
    window.close();
});