import { NextRequest } from "next/server";
import { reserveItems } from "@/lib/items";

interface CheckoutBody {
  itemIds: string[];
  buyerName: string;
  buyerContact: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<CheckoutBody>;

  if (
    !Array.isArray(body.itemIds) ||
    body.itemIds.length === 0 ||
    typeof body.buyerName !== "string" ||
    !body.buyerName.trim() ||
    typeof body.buyerContact !== "string" ||
    !body.buyerContact.trim()
  ) {
    return Response.json(
      {
        error:
          "Campos obrigatórios: itemIds (array não vazio), buyerName, buyerContact",
      },
      { status: 400 }
    );
  }

  const result = reserveItems(
    body.itemIds,
    body.buyerName.trim(),
    body.buyerContact.trim()
  );

  if (!result.success) {
    return Response.json(
      {
        error: "Alguns itens não estão disponíveis",
        unavailable: result.unavailable,
      },
      { status: 409 }
    );
  }

  return Response.json({ success: true });
}
