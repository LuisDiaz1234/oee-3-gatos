
"use client";

import { useEffect, useState } from "react";

type Machine = { id: string; name: string };
type Order = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  scheduled_at: string | null;
  machines?: { name: string } | null;
};

export default function MaintenancePage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({
    machine_id: "",
    type: "preventivo",
    title: "",
    description: "",
    priority: 3,
    scheduled_at: ""
  });
  const [q, setQ] = useState("");

  async function loadMachines() {
    const res = await fetch("/api/machines");
    const j = await res.json();
    setMachines(j.machines || []);
  }

  async function loadOrders() {
    setLoading(true);
    const url = q ? `/api/maintenance?q=${encodeURIComponent(q)}` : "/api/maintenance";
    const res = await fetch(url);
    const j = await res.json();
    setOrders(j.orders || []);
    setLoading(false);
  }

  useEffect(() => {
    loadMachines();
    loadOrders();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const ok = res.ok;
    if (ok) {
      setForm({ machine_id: "", type: "preventivo", title: "", description: "", priority: 3, scheduled_at: "" });
      loadOrders();
      alert("OT creada");
    } else {
      const j = await res.json();
      alert("Error: " + j.error);
    }
  }

  return (
    <main className="container">
      <section className="rounded-2xl shadow-xl p-6 mb-6" style={{ background: "var(--card)" }}>
        <h1 className="text-2xl font-bold">Mantenimientos</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Crear y buscar órdenes de trabajo.</p>

        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="text-sm">Máquina</label>
            <select className="w-full bg-transparent rounded border border-white/20 p-2"
                    value={form.machine_id}
                    onChange={e => setForm({ ...form, machine_id: e.target.value })}>
              <option value="">-- Selecciona --</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm">Tipo</label>
            <select className="w-full bg-transparent rounded border border-white/20 p-2"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Prioridad</label>
            <input type="number" className="w-full bg-transparent rounded border border-white/20 p-2"
                   value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}/>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm">Título</label>
            <input className="w-full bg-transparent rounded border border-white/20 p-2"
                   value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/>
          </div>
          <div className="sm:col-span-1">
            <label className="text-sm">Fecha programada</label>
            <input type="datetime-local" className="w-full bg-transparent rounded border border-white/20 p-2"
                   value={form.scheduled_at || ""} onChange={e => setForm({ ...form, scheduled_at: e.target.value })}/>
          </div>
          <div className="sm:col-span-3">
            <label className="text-sm">Descripción</label>
            <textarea className="w-full bg-transparent rounded border border-white/20 p-2"
                      value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/>
          </div>
          <div className="sm:col-span-3">
            <button className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Crear OT</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl shadow-xl p-6" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xl font-semibold">Órdenes</h2>
          <div className="flex gap-2">
            <input placeholder="Buscar por título..." className="bg-transparent rounded border border-white/20 p-2"
                   value={q} onChange={e => setQ(e.target.value)} />
            <button onClick={loadOrders} className="px-3 py-2 rounded border border-white/20 hover:border-white/40">Buscar</button>
          </div>
        </div>
        {loading ? <p>Cargando…</p> : (
          <div className="grid gap-3">
            {orders.map(o => (
              <div key={o.id} className="rounded border border-white/10 p-3">
                <div className="text-sm" style={{ color: "var(--muted)" }}>{o.type.toUpperCase()} • {o.status.toUpperCase()}</div>
                <div className="font-semibold">{o.title}</div>
                <div className="text-sm">{o.description}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Máquina: {o.machines?.name || "—"} • Programado: {o.scheduled_at ? new Date(o.scheduled_at).toLocaleString() : "—"} • Prioridad: {o.priority ?? "—"}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p>No hay órdenes.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
