"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function Input({ className = "", ...props }) {
  return (
    <input
      className={
        "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
        className
      }
      {...props}
    />
  );
}
function Select({ className = "", ...props }) {
  return (
    <select
      className={
        "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
        className
      }
      {...props}
    />
  );
}
function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "rounded-lg px-3 py-2 text-sm font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "ghost"
      ? "bg-white hover:bg-gray-100 border border-gray-300 text-gray-700"
      : "bg-indigo-600 text-white hover:bg-indigo-700";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export default function RecetasPage() {
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Crear receta
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    yield_quantity: "",
    yield_unit: "L",
  });

  // Agregar ingrediente
  const [adding, setAdding] = useState(false);
  const [ingForm, setIngForm] = useState({
    recipe_id: "",
    item_id: "",
    qty: "",
  });

  const filtered = useMemo(() => {
    if (!q) return recipes;
    const t = q.toLowerCase();
    return recipes.filter((r) => r.name.toLowerCase().includes(t));
  }, [q, recipes]);

  async function loadAll() {
    setLoading(true);

    // Ítems para el selector de ingredientes
    const { data: i, error: ei } = await supabase
      .from("inventory_items")
      .select("id, sku, name, unit")
      .order("name", { ascending: true });
    if (ei) console.error(ei);
    setItems(i || []);

    // Recetas + ingredientes (join)
    const { data: r, error: er } = await supabase
      .from("recipes")
      .select(
        "id, name, yield_quantity, yield_unit, created_at, recipe_ingredients ( qty, inventory_items ( id, name, unit, sku ) )"
      )
      .order("created_at", { ascending: false });
    if (er) console.error(er);

    // Normaliza para uso cómodo
    const norm = (r || []).map((rec) => ({
      ...rec,
      ingredients:
        (rec.recipe_ingredients || []).map((ri) => ({
          qty: ri.qty,
          item: ri.inventory_items,
        })) || [],
    }));
    setRecipes(norm);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Crear receta
  async function createRecipe(e) {
    e.preventDefault();
    setCreating(true);
    const payload = {
      name: form.name.trim(),
      yield_quantity: Number(form.yield_quantity) || 0,
      yield_unit: form.yield_unit.trim(),
    };
    const { error } = await supabase.from("recipes").insert(payload);
    setCreating(false);
    if (error) {
      alert("Error creando receta: " + error.message);
      return;
    }
    setForm({ name: "", yield_quantity: "", yield_unit: "L" });
    await loadAll();
  }

  // Agregar/actualizar ingrediente (upsert)
  async function addIngredient(e) {
    e.preventDefault();
    setAdding(true);
    const qty = Number(ingForm.qty);
    if (!ingForm.recipe_id || !ingForm.item_id || !qty || qty <= 0) {
      alert("Llena receta, ítem y cantidad (> 0).");
      setAdding(false);
      return;
    }
    const { error } = await supabase
      .from("recipe_ingredients")
      .upsert(
        [{ recipe_id: ingForm.recipe_id, item_id: ingForm.item_id, qty }],
        { onConflict: "recipe_id,item_id" } // si existe, actualiza qty
      );
    setAdding(false);
    if (error) {
      alert("Error agregando ingrediente: " + error.message);
      return;
    }
    setIngForm({ recipe_id: "", item_id: "", qty: "" });
    await loadAll();
  }

  // Eliminar ingrediente
  async function removeIngredient(recipe_id, item_id) {
    if (!confirm("¿Eliminar ingrediente de la receta?")) return;
    const { error } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipe_id)
      .eq("item_id", item_id);
    if (error) {
      alert("Error eliminando ingrediente: " + error.message);
      return;
    }
    await loadAll();
  }

  // Eliminar receta (borra ingredientes por ON DELETE CASCADE)
  async function deleteRecipe(id) {
    if (!confirm("¿Eliminar receta completa?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) {
      alert("Error eliminando receta: " + error.message);
      return;
    }
    await loadAll();
  }

  return (
    <div className="grid gap-6">
      {/* Listado de recetas */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold">Recetas</h2>
          <Input
            placeholder="Buscar receta por nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No hay recetas aún.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-xl border bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{r.name}</h3>
                    <p className="text-xs text-gray-500">
                      Rendimiento: {Number(r.yield_quantity).toFixed(2)} {r.yield_unit}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => deleteRecipe(r.id)}>
                    Eliminar
                  </Button>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="p-2">Ingrediente</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Cantidad</th>
                      <th className="p-2">Unidad</th>
                      <th className="p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.ingredients.map((ing) => (
                      <tr key={ing.item.id} className="border-t">
                        <td className="p-2">{ing.item.name}</td>
                        <td className="p-2 font-mono text-xs">{ing.item.sku}</td>
                        <td className="p-2">{Number(ing.qty).toFixed(2)}</td>
                        <td className="p-2">{ing.item.unit}</td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            onClick={() => removeIngredient(r.id, ing.item.id)}
                          >
                            Quitar
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {r.ingredients.length === 0 && (
                      <tr>
                        <td className="p-3 text-gray-500" colSpan={5}>
                          Sin ingredientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Crear receta */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <h3 className="mb-3 text-lg font-semibold">Crear receta</h3>
        <form onSubmit={createRecipe} className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nombre
            </label>
            <Input
              placeholder="Ej. IPA 5%"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Rendimiento
            </label>
            <Input
              type="number"
              step="0.01"
              value={form.yield_quantity}
              onChange={(e) =>
                setForm((s) => ({ ...s, yield_quantity: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Unidad
            </label>
            <Select
              value={form.yield_unit}
              onChange={(e) =>
                setForm((s) => ({ ...s, yield_unit: e.target.value }))
              }
            >
              <option value="L">L</option>
              <option value="u">u</option>
              <option value="kg">kg</option>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Button disabled={creating}>
              {creating ? "Guardando…" : "Crear receta"}
            </Button>
          </div>
        </form>
      </div>

      {/* Agregar ingrediente */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <h3 className="mb-3 text-lg font-semibold">Agregar ingrediente</h3>
        {items.length === 0 ? (
          <p className="text-sm text-amber-700">
            No hay ítems en inventario. Ve a <a className="underline" href="/inventario">Inventario</a> y crea al menos uno.
          </p>
        ) : recipes.length === 0 ? (
          <p className="text-sm text-amber-700">
            No hay recetas. Crea una arriba y vuelve aquí.
          </p>
        ) : (
          <form onSubmit={addIngredient} className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Receta
              </label>
              <Select
                value={ingForm.recipe_id}
                onChange={(e) =>
                  setIngForm((s) => ({ ...s, recipe_id: e.target.value }))
                }
                required
              >
                <option value="">Selecciona…</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Ítem
              </label>
              <Select
                value={ingForm.item_id}
                onChange={(e) =>
                  setIngForm((s) => ({ ...s, item_id: e.target.value }))
                }
                required
              >
                <option value="">Selecciona…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.sku}) — {i.unit}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Cantidad
              </label>
              <Input
                type="number"
                step="0.01"
                value={ingForm.qty}
                onChange={(e) => setIngForm((s) => ({ ...s, qty: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-4">
              <Button disabled={adding}>
                {adding ? "Agregando…" : "Agregar ingrediente"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
