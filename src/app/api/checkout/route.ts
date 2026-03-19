import { NextRequest } from "next/server";
import { reserveVariations } from "@/lib/items";

interface CheckoutBody {
  variationIds: string[];
  buyerName: string;
  buyerContact: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<CheckoutBody>;

  if (
    !Array.isArray(body.variationIds) ||
    body.variationIds.length === 0 ||
    typeof body.buyerName !== "string" ||
    !body.buyerName.trim() ||
    typeof body.buyerContact !== "string" ||
    !body.buyerContact.trim()
  ) {
    return Response.json(
      {
        error:
          "Campos obrigatórios: variationIds (array não vazio), buyerName, buyerContact",
      },
      { status: 400 }
    );
  }

  const result = reserveVariations(
    body.variationIds,
    body.buyerName.trim(),
    body.buyerContact.trim()
  );

  if (!result.success) {
    return Response.json(
      {
        error: "Algumas variações não estão disponíveis",
        unavailable: result.unavailable,
      },
      { status: 409 }
    );
  }

  return Response.json({ success: true });
}
