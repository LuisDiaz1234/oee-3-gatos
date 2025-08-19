
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: recipes, error } = await supabaseAdmin
    .from("recipes")
    .select("*, recipe_ingredients(*, inventory_items(name, unit))")
    .order("created_at", { ascending: false });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return Response.json({ recipes });
}

export async function POST(req: Request) {
  const payload = await req.json();
  const { code, name, yield_liters, ingredients } = payload ?? {};
  if (!name) return new Response(JSON.stringify({ error: "name is required" }), { status: 400 });

  const { data: recipe, error: e1 } = await supabaseAdmin
    .from("recipes")
    .insert([{ code, name, yield_liters }])
    .select().single();
  if (e1) return new Response(JSON.stringify({ error: e1.message }), { status: 500 });

  if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
    const rows = ingredients.map((ing: any) => ({
      recipe_id: recipe.id,
      item_id: ing.item_id,
      qty: ing.qty,
      unit: ing.unit ?? null
    }));
    const { error: e2 } = await supabaseAdmin.from("recipe_ingredients").insert(rows);
    if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 500 });
  }

  return Response.json({ recipe_id: recipe.id });
}
