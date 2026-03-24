import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      buyer_name TEXT,
      buyer_contact TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_photos (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_variations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Padrão',
      price REAL,
      status TEXT NOT NULL DEFAULT 'available',
      buyer_name TEXT,
      buyer_contact TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: add price column to item_variations if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(item_variations)").all() as { name: string }[];
  if (!columns.find((c) => c.name === "price")) {
    db.exec("ALTER TABLE item_variations ADD COLUMN price REAL");
  }

  // Auto-migration: if item_variations is empty but items has rows,
  // create a default variation for each existing item
  const variationCount = (db.prepare("SELECT COUNT(*) as cnt FROM item_variations").get() as { cnt: number }).cnt;
  const itemCount = (db.prepare("SELECT COUNT(*) as cnt FROM items").get() as { cnt: number }).cnt;

  if (variationCount === 0 && itemCount > 0) {
    const items = db.prepare("SELECT id, status, buyer_name, buyer_contact FROM items").all() as {
      id: string;
      status: string;
      buyer_name: string | null;
      buyer_contact: string | null;
    }[];

    const insert = db.prepare(
      "INSERT INTO item_variations (id, item_id, name, status, buyer_name, buyer_contact) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const migrate = db.transaction(() => {
      for (const item of items) {
        insert.run(uuidv4(), item.id, "Padrão", item.status, item.buyer_name, item.buyer_contact);
      }
    });

    migrate();
  }

  // Initialize default settings
  const lockSetting = db.prepare("SELECT * FROM settings WHERE key = 'store_locked'").get();
  if (!lockSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('store_locked', 'false')").run();
  }

  return db;
}
