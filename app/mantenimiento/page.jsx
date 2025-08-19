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

export default function MantenimientoPage() {
  // datos base
  const [machines, setMachines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // formulario crear orden
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    machine_id: "",
    kind: "preventivo",
    title: "",
    description: "",
    scheduled_at: "",
    priority: "media",
  });

  // formulario crear máquina rápida (si no hay)
  const [newMachine, setNewMachine] = useState({ code: "", name: "", location: "" });
  const [creatingMachine, setCreatingMachine] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return orders;
    const t = q.toLowerCase();
    return orders.filter(
      (o) =>
        o.title.toLowerCase().includes(t) ||
        (o.machines?.name || "").toLowerCase().includes(t) ||
        (o.machines?.code || "").toLowerCase().includes(t) ||
        (o.kind || "").toLowerCase().includes(t) ||
        (o.status || "").toLowerCase().includes(t)
    );
  }, [q, orders]);

  async function loadAll() {
    setLoading(true);

    // máquinas
    const { data: m, error: em } = await supabase
      .from("machines")
      .select("id, code, name, location, is_active")
      .order("created_at", { ascending: true });

    if (em) console.error(em);
    setMachines(m || []);

    // órdenes con join a machines
    const { data: o, error: eo } = await supabase
      .from("maintenance_orders")
      .select("id, title, description, kind, status, priority, scheduled_at, created_at, machines (name, code)")
      .order("created_at", { ascending: false });

    if (eo) console.error(eo);
    setOrders(o || []);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createOrder(e) {
    e.preventDefault();
    setCreating(true);
    const payload = {
      machine_id: form.machine_id,
      kind: form.kind,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      priority: form.priority,
    };
    const { error } = await supabase.from("maintenance_orders").insert(payload);
    setCreating(false);
    if (error) {
      alert("Error creando mantenimiento: " + error.message);
      return;
    }
    setForm({ machine_id: "", kind: "preventivo", title: "", description: "", scheduled_at: "", priority: "media" });
    await loadAll();
  }

  async function quickStatus(id, status) {
    const { error } = await supabase.from("maintenance_orders").update({ status }).eq("id", id);
    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }
    await loadAll();
  }

  async function createMachine(e) {
    e.preventDefault();
    setCreatingMachine(true);
    const { error, data } = await supabase
      .from("machines")
      .insert({ code: newMachine.code.trim(), name: newMachine.name.trim(), location: newMachine.location?.trim() || null })
      .select("id");
    setCreatingMachine(false);
    if (error) {
      alert("Error creando máquina: " + error.message);
      return;
    }
    setNewMachine({ code: "", name: "", location: "" });
    await loadAll();
    if (data?.[0]?.id) {
      setForm((f) => ({ ...f, machine_id: data[0].id }));
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Mantenimientos</h2>

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="Buscar por título, máquina, tipo o estado…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="text-xs text-gray-500 md:ml-4">
            {filtered.length} registro(s){loading ? " — cargando…" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2">Título</th>
                <th className="p-2">Máquina</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Prioridad</th>
                <th className="p-2">Programado</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2 font-medium">{o.title}</td>
                  <td className="p-2">{o.machines?.name} <span className="text-gray-400">({o.machines?.code})</span></td>
                  <td className="p-2 capitalize">{o.kind}</td>
                  <td className="p-2 capitalize">{o.priority}</td>
                  <td className="p-2">{o.scheduled_at ? new Date(o.scheduled_at).toLocaleString() : "—"}</td>
                  <td className="p-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs capitalize">{o.status}</span>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => quickStatus(o.id, "en_proceso")}>En proceso</Button>
                      <Button variant="ghost" onClick={() => quickStatus(o.id, "completado")}>Completar</Button>
                      <Button variant="ghost" onClick={() => quickStatus(o.id, "cancelado")}>Cancelar</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={7}>No hay mantenimientos aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crear orden */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <h3 className="text-lg font-semibold mb-3">Programar mantenimiento</h3>
        {machines.length === 0 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="mb-3 text-sm">No hay máquinas registradas. Crea una rápida:</p>
            <form onSubmit={createMachine} className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Código (ej. FERM-01)" value={newMachine.code} onChange={(e) => setNewMachine((s) => ({ ...s, code: e.target.value }))} required />
              <Input placeholder="Nombre (ej. Fermentador 1)" value={newMachine.name} onChange={(e) => setNewMachine((s) => ({ ...s, name: e.target.value }))} required />
              <Input placeholder="Ubicación (opcional)" value={newMachine.location} onChange={(e) => setNewMachine((s) => ({ ...s, location: e.target.value }))} />
              <div className="md:col-span-3">
                <Button disabled={creatingMachine}>{creatingMachine ? "Creando…" : "Crear máquina"}</Button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={createOrder} className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Máquina</label>
              <Select value={form.machine_id} onChange={(e) => setForm((f) => ({ ...f, machine_id: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
              <Select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Prioridad</label>
              <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Título</label>
              <Input placeholder="Ej. Cambio de sello mecánico" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Programado para</label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
              <Input placeholder="Notas / alcance (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="md:col-span-3">
              <Button disabled={creating}>{creating ? "Guardando…" : "Programar"}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
