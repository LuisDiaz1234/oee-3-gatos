
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST() {
  // Basic seed: 2 machines, 3 items, 1 recipe
  const { data: mach, error: em } = await supabaseAdmin.from("machines").insert([
    { name: "Brewhouse", code: "BH-01", location: "Sala de cocción" },
    { name: "Fermentador", code: "FV-01", location: "Sala de fermentación" }
  ]).select();
  if (em) return new Response(JSON.stringify({ error: em.message }), { status: 500 });

  const { data: items, error: ei } = await supabaseAdmin.from("inventory_items").insert([
    { sku: "MALT-PILS", name: "Malta Pilsen", unit: "kg", min_stock: 50 },
    { sku: "HOP-CITRA", name: "Lúpulo Citra", unit: "kg", min_stock: 5 },
    { sku: "LEV-ALE", name: "Levadura Ale", unit: "unidad", min_stock: 2 }
  ]).select();
  if (ei) return new Response(JSON.stringify({ error: ei.message }), { status: 500 });

  const malt = items?.find(i => i.sku === "MALT-PILS");
  const hop = items?.find(i => i.sku === "HOP-CITRA");
  const yeast = items?.find(i => i.sku === "LEV-ALE");

  const { data: recipe, error: er } = await supabaseAdmin.from("recipes").insert([
    { code: "IPA-BASE", name: "IPA Base", yield_liters: 1000 }
  ]).select().single();
  if (er) return new Response(JSON.stringify({ error: er.message }), { status: 500 });

  const ingredients = [
    { recipe_id: recipe.id, item_id: malt?.id, qty: 200, unit: "kg" },
    { recipe_id: recipe.id, item_id: hop?.id, qty: 5, unit: "kg" },
    { recipe_id: recipe.id, item_id: yeast?.id, qty: 1, unit: "unidad" }
  ].filter(x => x.item_id);

  const { error: e4 } = await supabaseAdmin.from("recipe_ingredients").insert(ingredients as any[]);
  if (e4) return new Response(JSON.stringify({ error: e4.message }), { status: 500 });


  // Sample production run + downtime
  const start = new Date(Date.now() - 4*60*60*1000).toISOString(); // 4h ago
  const end = new Date(Date.now() - 3*60*60*1000).toISOString();   // 3h ago
  const { data: run, error: erun } = await supabaseAdmin.from("production_runs").insert([
    {
      machine_id: mach?.[0]?.id,
      recipe_id: recipe.id,
      start_time: start,
      end_time: end,
      ideal_cycle_time_ms: 2000,
      total_units: 1600,
      good_units: 1500,
      defective_units: 100
    }
  ]).select().single();
  if (erun) return new Response(JSON.stringify({ error: erun.message }), { status: 500 });

  const dtStart = new Date(Date.now() - 3.5*60*60*1000).toISOString();
  const dtEnd = new Date(Date.now() - 3.25*60*60*1000).toISOString();
  const { error: edt } = await supabaseAdmin.from("downtime_events").insert([
    { machine_id: mach?.[0]?.id, run_id: run.id, reason: "Limpieza CIP", start_time: dtStart, end_time: dtEnd }
  ]);
  if (edt) return new Response(JSON.stringify({ error: edt.message }), { status: 500 });

  return Response.json({ ok: true, machines: mach?.length ?? 0, items: items?.length ?? 0, recipe_id: recipe.id, run_id: run.id });
}
