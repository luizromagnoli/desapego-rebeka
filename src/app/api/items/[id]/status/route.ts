import { NextRequest } from "next/server";
import { getItem, getVariation, markVariationAsSold, markVariationAsAvailable } from "@/lib/items";
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

  const body = (await request.json()) as { variationId?: string; status?: string };

  if (!body.variationId) {
    return Response.json(
      { error: "variationId é obrigatório" },
      { status: 400 }
    );
  }

  const variation = getVariation(body.variationId);
  if (!variation || variation.item_id !== id) {
    return Response.json(
      { error: "Variação não encontrada para este item" },
      { status: 404 }
    );
  }

  if (body.status === "sold") {
    markVariationAsSold(body.variationId);
  } else if (body.status === "available") {
    markVariationAsAvailable(body.variationId);
  } else {
    return Response.json(
      { error: "Status inválido. Use 'sold' ou 'available'" },
      { status: 400 }
    );
  }

  const updated = getItem(id);
  return Response.json(updated);
}
