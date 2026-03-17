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

export async function savePhotos(files: File[]): Promise<string[]> {
  ensureUploadsDir();

  const filenames: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${uuidv4()}.jpg`;
    const outputPath = path.join(UPLOADS_DIR, filename);

    await sharp(buffer)
      .rotate()
      .resize({ width: 1000, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(outputPath);

    filenames.push(filename);
  }

  return filenames;
}
