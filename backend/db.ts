import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { app, Data } from 'electron';

class AppDatabase {
  public db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'transactions.sqlite');
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL');

  }
  initDatabase() {
    this.db.exec(`

      `)
  }
}