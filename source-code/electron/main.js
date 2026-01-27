const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#05050A',
        icon: path.join(__dirname, '../images/Hacker-Launcher.png'),
                                  webPreferences: {
                                      nodeIntegration: true,
                                      contextIsolation: false, // For this prototype, allows easier FS access simulation
                                      webSecurity: false // Often needed for loading local images in dev
                                  },
                                  autoHideMenuBar: true,
                                  titleBarStyle: 'hidden', // Custom window controls if needed, or just cleaner look
    });

    // In development mode, connect to the Vite server
    // In production, load the built index.html
    const isDev = !app.isPackaged;

    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools(); // Uncomment to debug
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
