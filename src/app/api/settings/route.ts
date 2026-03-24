import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return Response.json(settings);
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const db = getDb();

  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );

  const updateAll = db.transaction(() => {
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        upsert.run(key, value);
      }
    }
  });

  updateAll();

  return Response.json({ success: true });
}
