import { app, BrowserWindow } from 'electron';
import path from 'node:path'

const createWindow = async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600
    })

    await win.loadFile(path.join(__dirname, "../index.html"));
    return win;
}

app.whenReady().then(async () => {
    await createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
