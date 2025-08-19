"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";
import { downloadCSV } from "../../lib/csv";

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

export default function InventarioPage() {
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [creatingItem, setCreatingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    sku: "",
    name: "",
    unit: "u",
    min_stock: 0,
  });

  const [creatingMov, setCreatingMov] = useState(false);
  const [movForm, setMovForm] = useState({
    item_id: "",
    mtype: "entrada",
    qty: "",
    reason: "",
  });

  const filtered = useMemo(() => {
    if (!q) return stock;
    const t = q.toLowerCase();
    return stock.filter(
      (s) =>
        s.name.toLowerCase().includes(t) || (s.sku || "").toLowerCase().includes(t)
    );
  }, [q, stock]);

  async function loadAll() {
    setLoading(true);
    const { data: i } = await supabase
      .from("inventory_items")
      .select("id, sku, name, unit, min_stock")
      .order("name");
    setItems(i || []);
    const { data: st } = await supabase.from("inventory_stock").select("*").order("name");
    setStock(st || []);
    setLoading(false);
  }
  useEffect(() => {
    loadAll();
  }, []);

  async function createItem(e) {
    e.preventDefault();
    setCreatingItem(true);
    const payload = {
      sku: itemForm.sku.trim(),
      name: itemForm.name.trim(),
      unit: itemForm.unit.trim(),
      min_stock: Number(itemForm.min_stock) || 0,
    };
    const { error } = await supabase.from("inventory_items").insert(payload);
    setCreatingItem(false);
    if (error) return alert("Error creando ítem: " + error.message);
    setItemForm({ sku: "", name: "", unit: "u", min_stock: 0 });
    await loadAll();
  }

  async function createMovement(e) {
    e.preventDefault();
    setCreatingMov(true);
    const qty = Number(movForm.qty);
    if (!qty || qty <= 0) {
      setCreatingMov(false);
      return alert("La cantidad debe ser mayor a 0.");
    }
    const payload = {
      item_id: movForm.item_id,
      mtype: movForm.mtype,
      qty,
      reason: movForm.reason?.trim() || null,
    };
    const { error } = await supabase.from("inventory_movements").insert(payload);
    setCreatingMov(false);
    if (error) return alert("Error registrando movimiento: " + error.message);
    setMovForm({ item_id: "", mtype: "entrada", qty: "", reason: "" });
    await loadAll();
  }

  function exportStockCSV() {
    const headers = ["item_id", "sku", "nombre", "stock_actual", "stock_minimo", "unidad"];
    const rows = filtered.map((r) => [
      r.item_id,
      r.sku,
      r.name,
      Number(r.current_stock ?? 0),
      Number(r.min_stock ?? 0),
      r.unit,
    ]);
    downloadCSV("inventario_stock.csv", headers, rows);
  }

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Inventario — Stock</h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por nombre o SKU…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button variant="ghost" onClick={exportStockCSV}>
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="p-2">SKU</th>
                  <th className="p-2">Ítem</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Mínimo</th>
                  <th className="p-2">Unidad</th>
                  <th className="p-2">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const alertLow =
                    r.min_stock !== null &&
                    Number(r.current_stock) < Number(r.min_stock);
                  return (
                    <tr key={r.item_id} className="border-t">
                      <td className="p-2 font-mono text-xs">{r.sku}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{Number(r.current_stock).toFixed(2)}</td>
                      <td className="p-2">{Number(r.min_stock || 0).toFixed(2)}</td>
                      <td className="p-2">{r.unit}</td>
                      <td className="p-2">
                        {alertLow ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                            Por debajo del mínimo
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan={6}>
                      No hay ítems aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crear Ítem */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h3 className="mb-3 text-lg font-semibold">Crear ítem</h3>
          <form onSubmit={createItem} className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">SKU</label>
              <Input
                placeholder="Ej. MALTA-PILS-25KG"
                value={itemForm.sku}
                onChange={(e) => setItemForm((s) => ({ ...s, sku: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nombre
              </label>
              <Input
                placeholder="Ej. Malta Pilsner"
                value={itemForm.name}
                onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Unidad
              </label>
              <Select
                value={itemForm.unit}
                onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))}
              >
                <option value="u">u</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="mL">mL</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Stock mínimo
              </label>
              <Input
                type="number"
                step="0.01"
                value={itemForm.min_stock}
                onChange={(e) =>
                  setItemForm((s) => ({ ...s, min_stock: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-4">
              <Button disabled={creatingItem}>
                {creatingItem ? "Guardando…" : "Crear ítem"}
              </Button>
            </div>
          </form>
        </div>

        {/* Movimiento */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h3 className="mb-3 text-lg font-semibold">Registrar movimiento</h3>
          <form onSubmit={createMovement} className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Ítem
              </label>
              <Select
                value={movForm.item_id}
                onChange={(e) =>
                  setMovForm((s) => ({ ...s, item_id: e.target.value }))
                }
                required
              >
                <option value="">Selecciona…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.sku})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tipo
              </label>
              <Select
                value={movForm.mtype}
                onChange={(e) =>
                  setMovForm((s) => ({ ...s, mtype: e.target.value }))
                }
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Cantidad
              </label>
              <Input
                type="number"
                step="0.01"
                value={movForm.qty}
                onChange={(e) => setMovForm((s) => ({ ...s, qty: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Motivo (opcional)
              </label>
              <Input
                placeholder="Compra / Consumo en batch / Ajuste por conteo, etc."
                value={movForm.reason}
                onChange={(e) =>
                  setMovForm((s) => ({ ...s, reason: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-4">
              <Button disabled={creatingMov}>
                {creatingMov ? "Registrando…" : "Guardar movimiento"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </RequireAuth>
  );
}
