import { NextRequest } from "next/server";
import { getItem, markAsSold, markAsAvailable } from "@/lib/items";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const item = getItem(id);

  if (!item) {
    return Response.json({ error: "Item não encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as { status?: string };

  if (body.status === "sold") {
    markAsSold(id);
  } else if (body.status === "available") {
    markAsAvailable(id);
  } else {
    return Response.json(
      { error: "Status inválido. Use 'sold' ou 'available'" },
      { status: 400 }
    );
  }

  const updated = getItem(id);
  return Response.json(updated);
}
