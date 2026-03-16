export function isAdmin(request: Request): boolean {
  const password = request.headers.get("x-admin-password");
  const expected = process.env.ADMIN_PASSWORD ?? "admin123";
  return password === expected;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Não autorizado" }, { status: 401 });
}
