import { NextRequest } from "next/server";
import { getItem, updateItem, deleteItem, addPhotos, reorderPhotos, syncItemVariations } from "@/lib/items";
import { savePhotos } from "@/lib/upload";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const item = getItem(id);

  if (!item) {
    return Response.json({ error: "Item não encontrado" }, { status: 404 });
  }

  return Response.json(item);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = getItem(id);

  if (!existing) {
    return Response.json({ error: "Item não encontrado" }, { status: 404 });
  }

  const formData = await request.formData();

  const title = formData.get("title");
  const description = formData.get("description");
  const priceValue = formData.get("price");

  const updateData: { title?: string; description?: string; price?: number; category?: string | null } =
    {};

  if (typeof title === "string") {
    updateData.title = title;
  }
  if (typeof description === "string") {
    updateData.description = description;
  }
  if (priceValue) {
    const price = parseFloat(String(priceValue));
    if (isNaN(price) || price < 0) {
      return Response.json({ error: "Preço inválido" }, { status: 400 });
    }
    updateData.price = price;
  }

  const categoryValue = formData.get("category");
  if (categoryValue !== null) {
    updateData.category = typeof categoryValue === "string" && categoryValue.trim() ? categoryValue.trim() : null;
  }

  updateItem(id, updateData);

  // Handle variations update
  const variationsRaw = formData.get("variations");
  if (typeof variationsRaw === "string" && variationsRaw.trim()) {
    try {
      const parsed = JSON.parse(variationsRaw) as { id?: string; name: string; price?: number | null }[];
      if (Array.isArray(parsed)) {
        syncItemVariations(id, parsed);
      }
    } catch {
      // ignore parse errors
    }
  }

  const files = formData.getAll("files") as File[];
  let newFilenames: string[] = [];
  if (files.length > 0 && files[0].size > 0) {
    newFilenames = await savePhotos(files);
  }

  const photoOrderRaw = formData.get("photoOrder");
  if (typeof photoOrderRaw === "string") {
    const photoOrder = JSON.parse(photoOrderRaw) as string[];
    // Build final ordered list: existing photo IDs keep their ID, "new:N" maps to new filenames
    const orderedNewFilenames: string[] = [];
    const finalOrder: { type: "existing" | "new"; value: string }[] = [];

    for (const entry of photoOrder) {
      if (entry.startsWith("new:")) {
        const idx = parseInt(entry.split(":")[1], 10);
        if (idx < newFilenames.length) {
          finalOrder.push({ type: "new", value: newFilenames[idx] });
          orderedNewFilenames.push(newFilenames[idx]);
        }
      } else {
        finalOrder.push({ type: "existing", value: entry });
      }
    }

    // Add new photos first so they exist in DB
    if (orderedNewFilenames.length > 0) {
      addPhotos(id, orderedNewFilenames);
    }

    // Now reorder all photos
    reorderPhotos(id, finalOrder);
  } else if (newFilenames.length > 0) {
    addPhotos(id, newFilenames);
  }

  const updated = getItem(id);
  return Response.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = getItem(id);

  if (!existing) {
    return Response.json({ error: "Item não encontrado" }, { status: 404 });
  }

  deleteItem(id);
  return Response.json({ success: true });
}
