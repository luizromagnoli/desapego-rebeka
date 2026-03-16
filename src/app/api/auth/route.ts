import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD ?? "admin123";

  if (password === expected) {
    return Response.json({ success: true });
  }

  return Response.json({ error: "Senha incorreta" }, { status: 401 });
}
