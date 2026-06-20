const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

const isDev = process.argv.includes('--dev');

function createWindow() {
  const win = new BrowserWindow({
    width:  472,
    height: 940,
    minWidth:  440,
    minHeight: 720,
    resizable: true,
    frame: true,
    icon: path.join(__dirname, '..', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '游伴 YouBan',
    backgroundColor: '#0a0907',
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (isDev) {
    win.webContents.openDevTools();
  }
}

// IPC: list available games
ipcMain.handle('get-game-list', () => {
  const gamesDir = path.join(__dirname, 'data', 'games');
  try {
    return fs.readdirSync(gamesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const raw  = fs.readFileSync(path.join(gamesDir, f), 'utf-8');
        const data = JSON.parse(raw);
        return { id: data.id, name: data.name, nameEn: data.nameEn || '', year: data.year, posterUrl: data.posterUrl };
      });
  } catch (err) {
    return [];
  }
});

// IPC: read data/games/<gameId>.json
ipcMain.handle('get-game-data', (_event, gameId) => {
  const filePath = path.join(__dirname, 'data', 'games', `${gameId}.json`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Cannot load game data for "${gameId}": ${err.message}`);
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
