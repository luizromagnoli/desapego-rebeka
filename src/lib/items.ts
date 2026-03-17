import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { getDb } from "./db";
import { UPLOADS_DIR } from "./upload";

export interface ItemPhoto {
  id: string;
  item_id: string;
  filename: string;
  sort_order: number;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  buyer_name: string | null;
  buyer_contact: string | null;
  created_at: string;
  photos: ItemPhoto[];
}

type ItemRow = Omit<Item, "photos">;

function attachPhotos(items: ItemRow[]): Item[] {
  const db = getDb();
  if (items.length === 0) return [];

  const ids = items.map((i) => i.id);
  const placeholders = ids.map(() => "?").join(",");
  const photos = db
    .prepare(
      `SELECT * FROM item_photos WHERE item_id IN (${placeholders}) ORDER BY sort_order ASC`
    )
    .all(...ids) as ItemPhoto[];

  const photoMap = new Map<string, ItemPhoto[]>();
  for (const photo of photos) {
    const list = photoMap.get(photo.item_id) ?? [];
    list.push(photo);
    photoMap.set(photo.item_id, list);
  }

  return items.map((item) => ({
    ...item,
    photos: photoMap.get(item.id) ?? [],
  }));
}

export function getItems(includeAll = false): Item[] {
  const db = getDb();

  let rows: ItemRow[];
  if (includeAll) {
    rows = db
      .prepare(
        `SELECT * FROM items
         ORDER BY
           CASE status
             WHEN 'available' THEN 0
             WHEN 'reserved' THEN 1
             WHEN 'sold' THEN 2
           END,
           created_at DESC`
      )
      .all() as ItemRow[];
  } else {
    rows = db
      .prepare(
        `SELECT * FROM items
         WHERE status IN ('available', 'reserved')
         ORDER BY
           CASE status
             WHEN 'available' THEN 0
             WHEN 'reserved' THEN 1
           END,
           created_at DESC`
      )
      .all() as ItemRow[];
  }

  return attachPhotos(rows);
}

export function getItem(id: string): Item | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as
    | ItemRow
    | undefined;

  if (!row) return null;

  const photos = db
    .prepare(
      "SELECT * FROM item_photos WHERE item_id = ? ORDER BY sort_order ASC"
    )
    .all(id) as ItemPhoto[];

  return { ...row, photos };
}

export function createItem(data: {
  title: string;
  description: string;
  price: number;
}): string {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    "INSERT INTO items (id, title, description, price) VALUES (?, ?, ?, ?)"
  ).run(id, data.title, data.description, data.price);

  return id;
}

export function updateItem(
  id: string,
  data: { title?: string; description?: string; price?: number }
): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.price !== undefined) {
    fields.push("price = ?");
    values.push(data.price);
  }

  if (fields.length === 0) return;

  values.push(id);
  db.prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values
  );
}

export function deleteItem(id: string): void {
  const db = getDb();

  const photos = db
    .prepare("SELECT * FROM item_photos WHERE item_id = ?")
    .all(id) as ItemPhoto[];

  for (const photo of photos) {
    const filePath = path.join(UPLOADS_DIR, photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  db.prepare("DELETE FROM items WHERE id = ?").run(id);
}

export function addPhotos(itemId: string, filenames: string[]): void {
  const db = getDb();

  const maxOrder = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM item_photos WHERE item_id = ?"
    )
    .get(itemId) as { max_order: number };

  let sortOrder = maxOrder.max_order + 1;

  const insert = db.prepare(
    "INSERT INTO item_photos (id, item_id, filename, sort_order) VALUES (?, ?, ?, ?)"
  );

  const insertMany = db.transaction((files: string[]) => {
    for (const filename of files) {
      insert.run(uuidv4(), itemId, filename, sortOrder);
      sortOrder++;
    }
  });

  insertMany(filenames);
}

export function removePhoto(photoId: string): void {
  const db = getDb();

  const photo = db
    .prepare("SELECT * FROM item_photos WHERE id = ?")
    .get(photoId) as ItemPhoto | undefined;

  if (!photo) return;

  const filePath = path.join(UPLOADS_DIR, photo.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare("DELETE FROM item_photos WHERE id = ?").run(photoId);
}

export function reserveItems(
  itemIds: string[],
  buyerName: string,
  buyerContact: string
): { success: boolean; unavailable: string[] } {
  const db = getDb();

  const placeholders = itemIds.map(() => "?").join(",");
  const items = db
    .prepare(
      `SELECT id, status FROM items WHERE id IN (${placeholders})`
    )
    .all(...itemIds) as { id: string; status: string }[];

  const unavailable = items
    .filter((i) => i.status !== "available")
    .map((i) => i.id);

  const missing = itemIds.filter((id) => !items.find((i) => i.id === id));
  unavailable.push(...missing);

  if (unavailable.length > 0) {
    return { success: false, unavailable };
  }

  const update = db.prepare(
    "UPDATE items SET status = 'reserved', buyer_name = ?, buyer_contact = ? WHERE id = ?"
  );

  const reserveAll = db.transaction(() => {
    for (const id of itemIds) {
      update.run(buyerName, buyerContact, id);
    }
  });

  reserveAll();

  return { success: true, unavailable: [] };
}

export function markAsSold(id: string): void {
  const db = getDb();
  db.prepare("UPDATE items SET status = 'sold' WHERE id = ?").run(id);
}

export function markAsAvailable(id: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE items SET status = 'available', buyer_name = NULL, buyer_contact = NULL WHERE id = ?"
  ).run(id);
}

export function reorderPhotos(
  itemId: string,
  order: { type: "existing" | "new"; value: string }[]
): void {
  const db = getDb();

  // Get all photos for this item to map filenames to IDs for new photos
  const allPhotos = db
    .prepare("SELECT * FROM item_photos WHERE item_id = ? ORDER BY sort_order ASC")
    .all(itemId) as ItemPhoto[];

  const update = db.prepare(
    "UPDATE item_photos SET sort_order = ? WHERE id = ?"
  );

  const reorder = db.transaction(() => {
    let sortOrder = 0;
    for (const entry of order) {
      if (entry.type === "existing") {
        update.run(sortOrder, entry.value);
      } else {
        // Find the photo by filename
        const photo = allPhotos.find((p) => p.filename === entry.value);
        if (photo) {
          update.run(sortOrder, photo.id);
        }
      }
      sortOrder++;
    }
  });

  reorder();
}
