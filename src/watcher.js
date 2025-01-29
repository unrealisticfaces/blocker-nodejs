const chokidar = require('chokidar');
const { log } = require('./utils');
const path = require('path');
const { exec } = require('child_process');
const { ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();

const directoriesToWatch = [ path.join(process.env.USERPROFILE, 'Downloads') ];
const installerKeywords = ['installer', 'setup', 'install', 'update'];

let additionalKeywords = [];

function loadAdditionalKeywords() {
    const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'keywords.db'));
    db.all('SELECT keyword FROM keywords', [], (err, rows) => {
        if (err) {
            throw err;
        }
        additionalKeywords = rows.map(row => row.keyword.toLowerCase());
    });
    db.close();
}

function isPotentialInstaller(filePath) {
    const filename = path.basename(filePath).toLowerCase();
    const allKeywords = [...installerKeywords, ...additionalKeywords];
    return (filename.endsWith('.exe') || filename.endsWith('.bat')) &&
           allKeywords.some(keyword => filename.includes(keyword));
}

async function getPsList() {
    const psListModule = await import('ps-list');
    return psListModule.default;
}

async function checkRunningProcesses() {
    const psList = await getPsList();
    const processes = await psList();
    log('Checking running processes...');
    for (const process of processes) {
        if (isPotentialInstaller(process.name)) {
            log(`Suspicious process found: ${process.name} (PID: ${process.pid})`);
            terminateProcess(process.pid, process.name);
        }
    }
}

function terminateProcess(pid, name) {
    log(`Attempting to terminate process: ${name} (PID: ${pid})`);
    exec(`taskkill /pid ${pid} /f /t`, (error) => {
        if (error) {
            console.error(`Error terminating process: ${error.message}`);
            return;
        }
        log(`Process ${name} (PID: ${pid}) terminated.`);
        ipcMain.emit('blocked-execution', name);
    });
}

let watcher = null;
let processCheckInterval = null;

function initializeWatcher() {
    if (!watcher) {
        loadAdditionalKeywords(); 

        watcher = chokidar.watch(directoriesToWatch, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true,
            depth: 0,
            awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
        });

        watcher.on('add', async (filePath) => {
            if (isPotentialInstaller(filePath)) {
                log(`Potential installer detected: ${filePath}`);
                checkRunningProcesses();
            }
        });
        
        if (!processCheckInterval) {
            processCheckInterval = setInterval(checkRunningProcesses, 100);
        }
    }
}

function stopWatcher() {
    if (watcher) {
        watcher.close();
        watcher = null;
        log('File watching stopped.');
    }

    if (processCheckInterval) {
        clearInterval(processCheckInterval);
        processCheckInterval = null;
        log('Process monitoring stopped.');
    }
}

module.exports = { initializeWatcher, stopWatcher };
