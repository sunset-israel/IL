const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false
    }
  });

  // Always allow geolocation (for this local app)
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    if (permission === 'geolocation') return cb(true);
    cb(false);
  });

  win.removeMenu?.();
  win.loadFile('index.html');
  win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
const { Notification } = require('electron');

function showSunsetNotification(location, sunsetTime) {
  new Notification({
    title: 'השקיעה מתקרבת 🌇',
    body: `השקיעה ב-${location} תתרחש בשעה ${sunsetTime}. אל תשכחו לצפות!`
  }).show();
}

function scheduleSunsetNotification(location, sunsetTimeStr) {
  const sunsetTime = new Date(sunsetTimeStr);
  const now = new Date();
  const notifyTime = new Date(sunsetTime.getTime() - 15 * 60 * 1000); // 15 דקות לפני

  const delay = notifyTime.getTime() - now.getTime();
  if (delay > 0) {
    setTimeout(() => {
      showSunsetNotification(location, sunsetTime.toLocaleTimeString());
    }, delay);
  }
}

// בדיקה: תזמון התראה לתל אביב בשעה 16:45
scheduleSunsetNotification('תל אביב', '2025-11-09T16:45:00');



