import { NextRequest } from "next/server";
import { getItems, createItem, addPhotos } from "@/lib/items";
import { savePhotos } from "@/lib/upload";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const includeAll = searchParams.get("all") === "true";

  // If not admin and store is locked, return empty list
  if (!isAdmin(request) && !includeAll) {
    const db = getDb();
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'store_locked'").get() as { value: string } | undefined;
    if (setting?.value === "true") {
      return Response.json([]);
    }
  }

  const items = getItems(includeAll);
  return Response.json(items);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const formData = await request.formData();

  const title = formData.get("title");
  const description = formData.get("description");
  const priceValue = formData.get("price");

  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    !priceValue
  ) {
    return Response.json(
      { error: "Campos obrigatórios: title, description, price" },
      { status: 400 }
    );
  }

  const price = parseFloat(String(priceValue));
  if (isNaN(price) || price < 0) {
    return Response.json({ error: "Preço inválido" }, { status: 400 });
  }

  let variations: { name: string; price?: number | null }[] | undefined;
  const variationsRaw = formData.get("variations");
  if (typeof variationsRaw === "string" && variationsRaw.trim()) {
    try {
      const parsed = JSON.parse(variationsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        variations = parsed
          .filter((v: unknown) => {
            if (typeof v === "string") return v.trim();
            if (typeof v === "object" && v !== null && "name" in v) return (v as { name: string }).name.trim();
            return false;
          })
          .map((v: unknown) => {
            if (typeof v === "string") return { name: v.trim(), price: null };
            const obj = v as { name: string; price?: number | null };
            return { name: obj.name.trim(), price: obj.price ?? null };
          });
      }
    } catch {
      // ignore parse errors, will use default
    }
  }

  const id = createItem({ title, description, price, variations });

  const files = formData.getAll("files") as File[];
  if (files.length > 0 && files[0].size > 0) {
    const filenames = await savePhotos(files);
    addPhotos(id, filenames);
  }

  const item = (await import("@/lib/items")).getItem(id);
  return Response.json(item, { status: 201 });
}
