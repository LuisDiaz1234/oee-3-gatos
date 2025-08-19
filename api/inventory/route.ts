
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("inventory_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return Response.json({ items: data });
}

export async function POST(req: Request) {
  const payload = await req.json();
  const { action } = payload ?? {};

  if (action === "create_item") {
    const { sku, name, unit, min_stock } = payload;
    if (!name || !unit) {
      return new Response(JSON.stringify({ error: "name and unit are required" }), { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .insert([{ sku, name, unit, min_stock: min_stock ?? 0 }])
      .select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return Response.json({ item: data });
  }

  if (action === "movement") {
    const { item_id, qty, type, reason, reference } = payload;
    if (!item_id || !qty || !type) {
      return new Response(JSON.stringify({ error: "item_id, qty and type are required" }), { status: 400 });
    }
    // 1) insert movement
    const { data: mov, error: e1 } = await supabaseAdmin
      .from("inventory_movements")
      .insert([{ item_id, qty, type, reason, reference }])
      .select().single();
    if (e1) return new Response(JSON.stringify({ error: e1.message }), { status: 500 });

    // 2) update stock
    const factor = type === "entrada" ? 1 : -1;
    const { error: e2 } = await supabaseAdmin.rpc("update_stock_delta", { p_item_id: item_id, p_delta: factor * Number(qty) });
    if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 500 });

    return Response.json({ movement: mov });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), { status: 400 });
}
