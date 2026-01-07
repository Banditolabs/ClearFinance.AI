import { app, BrowserWindow } from 'electron';
import { getDb, closeDb } from "@main/core/db/sqliteClient";
import path from 'node:path'

const createWindow = async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600
    })

    await win.loadFile('index.html')
}

app.whenReady().then(async () => {
    getDb();
    await createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on("before-quit", () => {
    closeDb();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
