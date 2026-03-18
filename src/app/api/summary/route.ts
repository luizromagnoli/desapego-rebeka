import { NextRequest } from "next/server";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
        COUNT(*) as total_items,
        COALESCE(SUM(price), 0) as total_value,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COALESCE(SUM(CASE WHEN status = 'available' THEN price END), 0) as available_value,
        COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved_count,
        COALESCE(SUM(CASE WHEN status = 'reserved' THEN price END), 0) as reserved_value,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count,
        COALESCE(SUM(CASE WHEN status = 'sold' THEN price END), 0) as sold_value
      FROM items`
    )
    .get() as {
    total_items: number;
    total_value: number;
    available_count: number;
    available_value: number;
    reserved_count: number;
    reserved_value: number;
    sold_count: number;
    sold_value: number;
  };

  const buyers = db
    .prepare(
      `SELECT buyer_name, buyer_contact, status,
        COUNT(*) as item_count,
        SUM(price) as total_value
      FROM items
      WHERE buyer_name IS NOT NULL
      GROUP BY buyer_name, buyer_contact, status
      ORDER BY status ASC, total_value DESC`
    )
    .all() as {
    buyer_name: string;
    buyer_contact: string;
    status: string;
    item_count: number;
    total_value: number;
  }[];

  return Response.json({ totals, buyers });
}
