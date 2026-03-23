import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "public", "uploads");

function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

async function processPhoto(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${uuidv4()}.jpg`;
  const outputPath = path.join(UPLOADS_DIR, filename);

  await sharp(buffer)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toFile(outputPath);

  return filename;
}

export async function savePhotos(files: File[]): Promise<string[]> {
  ensureUploadsDir();
  const results = await Promise.all(files.map(processPhoto));
  return results;
}
