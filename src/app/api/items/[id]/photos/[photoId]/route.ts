import { NextRequest } from "next/server";
import { removePhoto } from "@/lib/items";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string; photoId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const { photoId } = await params;

  removePhoto(photoId);
  return Response.json({ success: true });
}
