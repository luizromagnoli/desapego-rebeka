import { NextRequest } from "next/server";
import { getItem, updateItem, deleteItem, addPhotos } from "@/lib/items";
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

  const updateData: { title?: string; description?: string; price?: number } =
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

  updateItem(id, updateData);

  const files = formData.getAll("files") as File[];
  if (files.length > 0 && files[0].size > 0) {
    const filenames = await savePhotos(files);
    addPhotos(id, filenames);
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
