import {app, BrowserWindow} from 'electron';
import path from 'node:path'


async function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

    await win.loadFile('index.html');
}

app.whenReady().then(async () => {
    await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow()
    }
  })
})

app.on("before-quit", () => {
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})