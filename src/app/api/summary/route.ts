import { NextRequest } from "next/server";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const db = getDb();

  // Count variations per status, but sum the item price for each variation
  const totals = db
    .prepare(
      `SELECT
        COUNT(DISTINCT i.id) as total_items,
        COALESCE(SUM(i.price), 0) as total_value,
        COUNT(DISTINCT CASE WHEN NOT EXISTS (
          SELECT 1 FROM item_variations v2 WHERE v2.item_id = i.id AND v2.status != 'available'
        ) THEN i.id END) as available_count,
        COALESCE(SUM(CASE WHEN NOT EXISTS (
          SELECT 1 FROM item_variations v3 WHERE v3.item_id = i.id AND v3.status != 'available'
        ) THEN i.price END), 0) as available_value,
        COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1 FROM item_variations v4 WHERE v4.item_id = i.id AND v4.status = 'reserved'
        ) AND NOT EXISTS (
          SELECT 1 FROM item_variations v5 WHERE v5.item_id = i.id AND v5.status = 'available'
        ) THEN i.id END) as reserved_count,
        COALESCE(SUM(CASE WHEN EXISTS (
          SELECT 1 FROM item_variations v6 WHERE v6.item_id = i.id AND v6.status = 'reserved'
        ) AND NOT EXISTS (
          SELECT 1 FROM item_variations v7 WHERE v7.item_id = i.id AND v7.status = 'available'
        ) THEN i.price END), 0) as reserved_value,
        COUNT(DISTINCT CASE WHEN NOT EXISTS (
          SELECT 1 FROM item_variations v8 WHERE v8.item_id = i.id AND v8.status != 'sold'
        ) THEN i.id END) as sold_count,
        COALESCE(SUM(CASE WHEN NOT EXISTS (
          SELECT 1 FROM item_variations v9 WHERE v9.item_id = i.id AND v9.status != 'sold'
        ) THEN i.price END), 0) as sold_value
      FROM items i`
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
      `SELECT v.buyer_name, v.buyer_contact, v.status,
        COUNT(*) as item_count,
        SUM(COALESCE(v.price, i.price)) as total_value
      FROM item_variations v
      JOIN items i ON i.id = v.item_id
      WHERE v.buyer_name IS NOT NULL
      GROUP BY v.buyer_name, v.buyer_contact, v.status
      ORDER BY v.status ASC, total_value DESC`
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
