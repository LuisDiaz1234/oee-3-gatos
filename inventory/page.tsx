
"use client";

import { useEffect, useState } from "react";

type Item = { id: string; sku: string | null; name: string; unit: string; stock: number; min_stock: number };

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<any>({ sku: "", name: "", unit: "kg", min_stock: 0 });
  const [mov, setMov] = useState<any>({ item_id: "", qty: 0, type: "entrada", reason: "", reference: "" });

  async function loadItems() {
    const res = await fetch("/api/inventory");
    const j = await res.json();
    setItems(j.items || []);
  }

  useEffect(() => { loadItems(); }, []);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_item", ...form })
    });
    const ok = res.ok;
    if (ok) { setForm({ sku: "", name: "", unit: "kg", min_stock: 0 }); loadItems(); alert("Ítem creado"); }
    else { const j = await res.json(); alert("Error: " + j.error); }
  }

  async function addMovement(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "movement", ...mov })
    });
    const ok = res.ok;
    if (ok) { setMov({ item_id: "", qty: 0, type: "entrada", reason: "", reference: "" }); loadItems(); alert("Movimiento registrado"); }
    else { const j = await res.json(); alert("Error: " + j.error); }
  }

  return (
    <main className="container">
      <section className="rounded-2xl shadow-xl p-6 mb-6" style={{ background: "var(--card)" }}>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Ítems, entradas y salidas.</p>

        <form onSubmit={createItem} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input placeholder="SKU" className="bg-transparent rounded border border-white/20 p-2"
                 value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}/>
          <input placeholder="Nombre" className="bg-transparent rounded border border-white/20 p-2"
                 value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
          <select className="bg-transparent rounded border border-white/20 p-2"
                  value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="unidad">unidad</option>
          </select>
          <input type="number" placeholder="Stock mínimo" className="bg-transparent rounded border border-white/20 p-2"
                 value={form.min_stock} onChange={e => setForm({ ...form, min_stock: Number(e.target.value) })}/>
          <div className="sm:col-span-4">
            <button className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Crear ítem</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl shadow-xl p-6 mb-6" style={{ background: "var(--card)" }}>
        <h2 className="text-xl font-semibold">Movimiento</h2>
        <form onSubmit={addMovement} className="mt-4 grid gap-3 sm:grid-cols-5">
          <select className="bg-transparent rounded border border-white/20 p-2"
                  value={mov.item_id} onChange={e => setMov({ ...mov, item_id: e.target.value })}>
            <option value="">-- Ítem --</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <input type="number" placeholder="Cantidad" className="bg-transparent rounded border border-white/20 p-2"
                 value={mov.qty} onChange={e => setMov({ ...mov, qty: Number(e.target.value) })}/>
          <select className="bg-transparent rounded border border-white/20 p-2"
                  value={mov.type} onChange={e => setMov({ ...mov, type: e.target.value })}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
          <input placeholder="Motivo" className="bg-transparent rounded border border-white/20 p-2"
                 value={mov.reason} onChange={e => setMov({ ...mov, reason: e.target.value })}/>
          <input placeholder="Referencia (OP/lote)" className="bg-transparent rounded border border-white/20 p-2"
                 value={mov.reference} onChange={e => setMov({ ...mov, reference: e.target.value })}/>
          <div className="sm:col-span-5">
            <button className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Registrar</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl shadow-xl p-6" style={{ background: "var(--card)" }}>
        <h2 className="text-xl font-semibold mb-3">Ítems</h2>
        <div className="grid gap-3">
          {items.map(i => (
            <div key={i.id} className="rounded border border-white/10 p-3">
              <div className="text-sm" style={{ color: "var(--muted)" }}>{i.sku || "—"}</div>
              <div className="font-semibold">{i.name}</div>
              <div className="text-sm">Stock: {i.stock} {i.unit} • Mín: {i.min_stock}</div>
            </div>
          ))}
          {items.length === 0 && <p>No hay ítems.</p>}
        </div>
      </section>
    </main>
  );
}
