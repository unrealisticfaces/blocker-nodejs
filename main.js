const { app, BrowserWindow, ipcMain, Notification, Tray, Menu } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { initializeWatcher, stopWatcher } = require('./src/watcher');

let mainWindow = null;
let tray = null;
let isBlocking = false;
let passwordWindow = null;

const dbPath = path.join(__dirname, 'data', 'keywords.db');
const settingsDbPath = path.join(__dirname, 'data', 'settings.db');

function getPasswordFromDatabase(callback) {
    const settingsDb = new sqlite3.Database(settingsDbPath);
    settingsDb.get("SELECT value FROM settings WHERE key = ?", ['password'], (err, row) => {
        if (err) {
            console.error("Error reading password from database:", err);
            callback(null);
        } else {
            callback(row ? row.value : null);
        }
    });
    settingsDb.close();
}

function updatePasswordInDatabase(newPassword, callback) {
    const settingsDb = new sqlite3.Database(settingsDbPath);
    settingsDb.run("UPDATE settings SET value = ? WHERE key = 'password'", [newPassword], function(err) {
        if (err) {
            console.error("Error updating password in database:", err);
            callback(false);
        } else {
            console.log("Password updated successfully in database.");
            callback(true);
        }
    });
    settingsDb.close();
}

function addKeywordToDatabase(keyword) {
    const db = new sqlite3.Database(dbPath);
    db.run(`INSERT INTO keywords (keyword) VALUES (?)`, [keyword], function (err) {
        if (err) {
            console.error("Error inserting keyword:", err);
        } else {
            console.log(`Keyword "${keyword}" added successfully!`);
        }
    });
    db.close();
}

ipcMain.handle('start-blocking', async () => {
    if (!isBlocking) {
        initializeWatcher();
        isBlocking = true;
    }

    app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe')
    });

    if (!tray) {
        createTrayIcon();
    }
    if (mainWindow) mainWindow.hide();
});

ipcMain.handle('stop-blocking', async () => {
    if (isBlocking) {
        stopWatcher();
        isBlocking = false;
    }
});

ipcMain.handle('addKeyword', async (event, keyword) => {
    addKeywordToDatabase(keyword);
});

function createMainWindow() {
    if (mainWindow) {
        mainWindow.show();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src', 'preload.js')
        },
    });

    mainWindow.loadFile('src/index.html');

    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            new Notification({
                title: 'App is Still Running',
                body: 'The application is now running in the system tray.'
            }).show();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTrayIcon() {
    if (tray) return;

    tray = new Tray(path.join(__dirname, 'src', 'blockicon.ico'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show', click: () => {
                if (!passwordWindow) {
                    createPasswordWindow("open");
                } else {
                    passwordWindow.focus();
                }
            }
        },
        { label: 'Quit', click: () => showPasswordPromptBeforeQuit() }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
        if (!passwordWindow) {
            createPasswordWindow("open");
        } else {
            passwordWindow.focus();
        }
    });
}

function showPasswordPromptBeforeQuit() {
    createPasswordWindow("quit");
}

let changePasswordWindow = null;

function createChangePasswordWindow() {
    if (changePasswordWindow) {
        changePasswordWindow.focus();
        return;
    }

    changePasswordWindow = new BrowserWindow({
        width: 400,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        alwaysOnTop: true,
        resizable: false
    });

    changePasswordWindow.loadFile('src/change_password.html');

    changePasswordWindow.on('closed', () => {
        changePasswordWindow = null;
    });
}

ipcMain.on('change-password', (event, { oldPassword, newPassword }) => {
    getPasswordFromDatabase((correctPassword) => {
        if (oldPassword === correctPassword) {
            updatePasswordInDatabase(newPassword, (success) => {
                if (success) {
                    event.sender.send('change-password-result', { success: true });
                    if (changePasswordWindow) {
                        changePasswordWindow.close();
                    }
                } else {
                    event.sender.send('change-password-result', { success: false, message: 'Failed to update password.' });
                }
            });
        } else {
            event.sender.send('change-password-result', { success: false, message: 'Incorrect old password.' });
        }
    });
});

function createPasswordWindow(action) {
    if (passwordWindow) {
        passwordWindow.focus();
        return;
    }

    passwordWindow = new BrowserWindow({
        width: 400,
        height: 200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        alwaysOnTop: true,
        resizable: false
    });

    passwordWindow.loadFile('src/password.html');

    function handlePasswordSubmission(event, enteredPassword) {
        getPasswordFromDatabase((correctPassword) => {
            if (enteredPassword === correctPassword) {
                if (passwordWindow) {
                    passwordWindow.close();
                }

                if (action === "quit") {
                    app.isQuitting = true;
                    app.quit();
                } else if (action === "open") {
                    createMainWindow();
                }
            } else {
                event.sender.send('password-incorrect');
            }
        });
    }

    ipcMain.on('submit-password', handlePasswordSubmission);

    passwordWindow.on('closed', () => {
        passwordWindow = null;
        ipcMain.removeListener('submit-password', handlePasswordSubmission);
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createPasswordWindow("open");

        app.on('activate', () => {
            if (!passwordWindow && !mainWindow) {
                createPasswordWindow("open");
            }
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
});

ipcMain.on('open-change-password-window', () => {
    createChangePasswordWindow();
});