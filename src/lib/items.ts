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

export interface ItemVariation {
  id: string;
  item_id: string;
  name: string;
  price: number | null;
  previous_price: number | null;
  status: string;
  buyer_name: string | null;
  buyer_contact: string | null;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  previous_price: number | null;
  category: string | null;
  status: string;
  buyer_name: string | null;
  buyer_contact: string | null;
  created_at: string;
  photos: ItemPhoto[];
  variations: ItemVariation[];
}

type ItemRow = Omit<Item, "photos" | "variations">;

function deriveStatus(variations: ItemVariation[]): "available" | "reserved" | "sold" {
  if (variations.length === 0) return "available";
  const allSold = variations.every((v) => v.status === "sold");
  if (allSold) return "sold";
  const allReservedOrSold = variations.every((v) => v.status === "reserved" || v.status === "sold");
  if (allReservedOrSold) return "reserved";
  return "available";
}

function attachPhotosAndVariations(items: ItemRow[]): Item[] {
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

  const variations = db
    .prepare(
      `SELECT * FROM item_variations WHERE item_id IN (${placeholders})`
    )
    .all(...ids) as ItemVariation[];

  const variationMap = new Map<string, ItemVariation[]>();
  for (const variation of variations) {
    const list = variationMap.get(variation.item_id) ?? [];
    list.push(variation);
    variationMap.set(variation.item_id, list);
  }

  return items.map((item) => {
    const itemVariations = variationMap.get(item.id) ?? [];
    return {
      ...item,
      status: deriveStatus(itemVariations),
      photos: photoMap.get(item.id) ?? [],
      variations: itemVariations,
    };
  });
}

export function getItems(includeAll = false): Item[] {
  const db = getDb();

  const rows = db
    .prepare(`SELECT * FROM items ORDER BY created_at DESC`)
    .all() as ItemRow[];

  const items = attachPhotosAndVariations(rows);

  if (includeAll) {
    // Sort: available first, then reserved, then sold
    return items.sort((a, b) => {
      const order = { available: 0, reserved: 1, sold: 2 };
      return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
    });
  }

  // Filter out fully sold items
  return items
    .filter((i) => i.status === "available" || i.status === "reserved")
    .sort((a, b) => {
      const order = { available: 0, reserved: 1, sold: 2 };
      return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
    });
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

  const variations = db
    .prepare("SELECT * FROM item_variations WHERE item_id = ?")
    .all(id) as ItemVariation[];

  return {
    ...row,
    status: deriveStatus(variations),
    photos,
    variations,
  };
}

export function createItem(data: {
  title: string;
  description: string;
  price: number;
  category?: string | null;
  variations?: { name: string; price?: number | null }[];
}): string {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    "INSERT INTO items (id, title, description, price, category) VALUES (?, ?, ?, ?, ?)"
  ).run(id, data.title, data.description, data.price, data.category ?? null);

  const variationsList = data.variations && data.variations.length > 0
    ? data.variations
    : [{ name: "Padrão", price: null }];

  const insert = db.prepare(
    "INSERT INTO item_variations (id, item_id, name, price) VALUES (?, ?, ?, ?)"
  );

  const createVariations = db.transaction(() => {
    for (const v of variationsList) {
      insert.run(uuidv4(), id, v.name, v.price ?? null);
    }
  });

  createVariations();

  return id;
}

export function updateItem(
  id: string,
  data: { title?: string; description?: string; price?: number; category?: string | null }
): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.price !== undefined) {
    fields.push("previous_price = CASE WHEN price != ? THEN price ELSE previous_price END");
    values.push(data.price);
    fields.push("price = ?");
    values.push(data.price);
  }
  if (data.category !== undefined) {
    fields.push("category = ?");
    values.push(data.category);
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

// Variation CRUD

export function createVariation(itemId: string, name: string, price?: number | null): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO item_variations (id, item_id, name, price) VALUES (?, ?, ?, ?)"
  ).run(id, itemId, name, price ?? null);
  return id;
}

export function updateVariation(variationId: string, name: string, price?: number | null): void {
  const db = getDb();
  const newPrice = price ?? null;
  db.prepare(
    `UPDATE item_variations SET
      name = ?,
      previous_price = CASE
        WHEN price IS NOT NULL AND (? IS NULL OR price != ?) THEN price
        ELSE previous_price
      END,
      price = ?
    WHERE id = ?`
  ).run(name, newPrice, newPrice, newPrice, variationId);
}

export function deleteVariation(variationId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM item_variations WHERE id = ?").run(variationId);
}

export function getVariation(variationId: string): ItemVariation | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM item_variations WHERE id = ?")
    .get(variationId) as ItemVariation | undefined;
  return row ?? null;
}

// Reserve variations
export function reserveVariations(
  variationIds: string[],
  buyerName: string,
  buyerContact: string
): { success: boolean; unavailable: string[] } {
  const db = getDb();

  const placeholders = variationIds.map(() => "?").join(",");
  const variations = db
    .prepare(
      `SELECT id, status FROM item_variations WHERE id IN (${placeholders})`
    )
    .all(...variationIds) as { id: string; status: string }[];

  const unavailable = variations
    .filter((v) => v.status !== "available")
    .map((v) => v.id);

  const missing = variationIds.filter(
    (id) => !variations.find((v) => v.id === id)
  );
  unavailable.push(...missing);

  if (unavailable.length > 0) {
    return { success: false, unavailable };
  }

  const update = db.prepare(
    "UPDATE item_variations SET status = 'reserved', buyer_name = ?, buyer_contact = ? WHERE id = ?"
  );

  const reserveAll = db.transaction(() => {
    for (const id of variationIds) {
      update.run(buyerName, buyerContact, id);
    }
  });

  reserveAll();

  return { success: true, unavailable: [] };
}

// Backward-compatible: reserve items by item IDs (reserves all available variations)
export function reserveItems(
  itemIds: string[],
  buyerName: string,
  buyerContact: string
): { success: boolean; unavailable: string[] } {
  const db = getDb();
  const placeholders = itemIds.map(() => "?").join(",");
  const variations = db
    .prepare(
      `SELECT id, item_id, status FROM item_variations WHERE item_id IN (${placeholders})`
    )
    .all(...itemIds) as { id: string; item_id: string; status: string }[];

  const availableVariationIds = variations
    .filter((v) => v.status === "available")
    .map((v) => v.id);

  if (availableVariationIds.length === 0) {
    return { success: false, unavailable: itemIds };
  }

  return reserveVariations(availableVariationIds, buyerName, buyerContact);
}

export function markVariationAsSold(variationId: string): void {
  const db = getDb();
  db.prepare("UPDATE item_variations SET status = 'sold' WHERE id = ?").run(
    variationId
  );
}

export function markVariationAsAvailable(variationId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE item_variations SET status = 'available', buyer_name = NULL, buyer_contact = NULL WHERE id = ?"
  ).run(variationId);
}

// Backward-compatible: operate on all variations of an item
export function markAsSold(id: string): void {
  const db = getDb();
  db.prepare("UPDATE item_variations SET status = 'sold' WHERE item_id = ?").run(id);
}

export function markAsAvailable(id: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE item_variations SET status = 'available', buyer_name = NULL, buyer_contact = NULL WHERE item_id = ?"
  ).run(id);
}

export function syncItemVariations(
  itemId: string,
  variations: { id?: string; name: string; price?: number | null }[]
): void {
  const db = getDb();

  const existing = db
    .prepare("SELECT * FROM item_variations WHERE item_id = ?")
    .all(itemId) as ItemVariation[];

  const incomingIds = new Set(
    variations.filter((v) => v.id).map((v) => v.id!)
  );

  // Delete variations that are not in the incoming list
  for (const existing_v of existing) {
    if (!incomingIds.has(existing_v.id)) {
      deleteVariation(existing_v.id);
    }
  }

  // Update existing and create new
  for (const v of variations) {
    if (v.id) {
      updateVariation(v.id, v.name, v.price);
    } else {
      createVariation(itemId, v.name, v.price);
    }
  }
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
