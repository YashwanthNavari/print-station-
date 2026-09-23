import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database;

export async function initDB() {
  const dbPath = path.resolve(__dirname, '..', 'printstation.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      cloud_job_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      local_path TEXT,
      status TEXT NOT NULL,
      file_size INTEGER,
      file_hash TEXT,
      copies INTEGER DEFAULT 1,
      color_mode BOOLEAN DEFAULT 0,
      page_range TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      station_id TEXT PRIMARY KEY,
      printer_name TEXT,
      poll_interval INTEGER DEFAULT 5000,
      auto_delete_minutes INTEGER DEFAULT 60,
      pin_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS print_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default settings if none exist
  const stationId = process.env.STATION_ID || 'PS-HYD-001';
  const settings = await db.get('SELECT * FROM settings WHERE station_id = ?', [stationId]);
  if (!settings) {
    await db.run('INSERT INTO settings (station_id, poll_interval, auto_delete_minutes) VALUES (?, ?, ?)', [stationId, 5000, 60]);
  }

  return db;
}

export function getDB() {
  if (!db) throw new Error("DB not initialized");
  return db;
}
