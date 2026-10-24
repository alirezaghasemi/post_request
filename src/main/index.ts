import { app, BrowserWindow, shell, session } from 'electron';
import path from 'node:path';
import { DatabaseManager } from './database/database-manager';
import { HttpClientEngine } from './network/http-client';
import { registerIpcHandlers } from './ipc/router';

let mainWindow: BrowserWindow | null = null;
let dbManager: DatabaseManager | null = null;
let httpClient: HttpClientEngine | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function setupSecurityPolicies(): void {
  // Enforce strict Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: ws: http:;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
        ]
      }
    });
  });

  // Deny all permission requests by default (camera, microphone, geolocation, etc.)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    title: 'DevPilot API Studio',
    backgroundColor: '#0f172a',
    titleBarStyle: 'hidden', // Custom titlebar / window controls
    titleBarOverlay: false,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
    if (navigationUrl.startsWith('http:') || navigationUrl.startsWith('https:')) {
      shell.openExternal(navigationUrl);
    }
  });

  // Open external links in default OS browser rather than a new electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  setupSecurityPolicies();

  // Initialize SQLite database
  const dbPath = path.join(app.getPath('userData'), 'devpilot.sqlite');
  console.log('[DevPilot] Initializing local database at:', dbPath);

  dbManager = new DatabaseManager(dbPath);
  dbManager.init();

  httpClient = new HttpClientEngine();

  // Register all secure IPC channels
  registerIpcHandlers(dbManager, httpClient, () => mainWindow);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (dbManager) {
    dbManager.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
