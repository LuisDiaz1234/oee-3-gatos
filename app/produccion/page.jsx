"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// ---------- UI helpers ----------
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

// ---------- util OEE ----------
function computeOEE(run) {
  const planned = Number(run.planned_time_min) || 0;
  const down = Number(run.downtime_min) || 0;
  const ict = Number(run.ideal_cycle_time_sec) || 0;
  const good = Number(run.good_count) || 0;
  const reject = Number(run.reject_count) || 0;
  const total = good + reject;

  const runTime = Math.max(planned - down, 0);
  const A = planned > 0 ? Math.max((planned - down) / planned, 0) : 0;
  const P = runTime > 0 && ict > 0 ? Math.max(((ict / 60) * total) / runTime, 0) : 0;
  const Q = total > 0 ? good / total : 0;
  const OEE = A * P * Q;

  return {
    runTime,
    A: Number(A.toFixed(4)),
    P: Number(P.toFixed(4)),
    Q: Number(Q.toFixed(4)),
    OEE: Number(OEE.toFixed(4)),
  };
}

export default function ProduccionPage() {
  // catálogos
  const [machines, setMachines] = useState([]);
  const [recipes, setRecipes] = useState([]);

  // corridas
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // creación
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    machine_id: "",
    recipe_id: "",
    started_at: "",
    ended_at: "",
    planned_time_min: "",
    downtime_min: "0",
    ideal_cycle_time_sec: "",
    good_count: "",
    reject_count: "0",
    notes: "",
    batches_for_consumption: "1", // número de "batches" de la receta para consumir inventario
  });

  const filtered = useMemo(() => {
    if (!q) return runs;
    const t = q.toLowerCase();
    return runs.filter(
      (r) =>
        (r.machines?.name || "").toLowerCase().includes(t) ||
        (r.recipes?.name || "").toLowerCase().includes(t)
    );
  }, [q, runs]);

  async function loadAll() {
    setLoading(true);

    const { data: m, error: em } = await supabase
      .from("machines")
      .select("id, code, name")
      .order("name", { ascending: true });
    if (em) console.error(em);
    setMachines(m || []);

    const { data: r, error: er } = await supabase
      .from("recipes")
      .select("id, name, yield_quantity, yield_unit")
      .order("name", { ascending: true });
    if (er) console.error(er);
    setRecipes(r || []);

    const { data: pr, error: epr } = await supabase
      .from("production_runs")
      .select(
        "id, machine_id, recipe_id, started_at, ended_at, planned_time_min, downtime_min, ideal_cycle_time_sec, good_count, reject_count, notes, machines (name, code), recipes (name)"
      )
      .order("created_at", { ascending: false })
      .limit(30);
    if (epr) console.error(epr);

    // añade OEE calculado
    const withOEE = (pr || []).map((x) => ({ ...x, _oee: computeOEE(x) }));
    setRuns(withOEE);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createRun(e) {
    e.preventDefault();
    setCreating(true);

    const payload = {
      machine_id: form.machine_id,
      recipe_id: form.recipe_id || null,
      started_at: form.started_at ? new Date(form.started_at).toISOString() : null,
      ended_at: form.ended_at ? new Date(form.ended_at).toISOString() : null,
      planned_time_min: Number(form.planned_time_min),
      downtime_min: Number(form.downtime_min || 0),
      ideal_cycle_time_sec: Number(form.ideal_cycle_time_sec),
      good_count: parseInt(form.good_count || "0", 10),
      reject_count: parseInt(form.reject_count || "0", 10),
      notes: form.notes?.trim() || null,
    };

    // Validaciones mínimas
    if (!payload.machine_id) { alert("Selecciona la máquina."); setCreating(false); return; }
    if (!payload.started_at || !payload.ended_at) { alert("Indica inicio y fin."); setCreating(false); return; }
    if (!payload.planned_time_min || payload.planned_time_min <= 0) { alert("Tiempo planificado debe ser > 0."); setCreating(false); return; }
    if (!payload.ideal_cycle_time_sec || payload.ideal_cycle_time_sec <= 0) { alert("Tiempo de ciclo ideal (s) debe ser > 0."); setCreating(false); return; }

    // Inserta corrida y devuelve id
    const { data: inserted, error } = await supabase
      .from("production_runs")
      .insert(payload)
      .select("id");
    if (error) {
      setCreating(false);
      alert("Error creando corrida: " + error.message);
      return;
    }
    const runId = inserted?.[0]?.id;

    // ===== Consumo de inventario por receta (opcional) =====
    const batches = Number(form.batches_for_consumption || 0);
    if (runId && payload.recipe_id && batches > 0) {
      // ingredientes de la receta
      const { data: ings, error: ei } = await supabase
        .from("recipe_ingredients")
        .select("item_id, qty")
        .eq("recipe_id", payload.recipe_id);
      if (!ei && (ings?.length || 0) > 0) {
        const movements = ings.map((ri) => ({
          item_id: ri.item_id,
          mtype: "salida",
          qty: Number(ri.qty) * batches,
          reason: "Consumo por producción",
          ref_id: runId,
        }));
        const { error: emv } = await supabase.from("inventory_movements").insert(movements);
        if (emv) {
          alert("Corrida creada, pero falló el consumo de inventario: " + emv.message);
        }
      }
    }

    // Reset y recarga
    setForm({
      machine_id: "",
      recipe_id: "",
      started_at: "",
      ended_at: "",
      planned_time_min: "",
      downtime_min: "0",
      ideal_cycle_time_sec: "",
      good_count: "",
      reject_count: "0",
      notes: "",
      batches_for_consumption: "1",
    });
    setCreating(false);
    await loadAll();
  }

  async function deleteRun(id) {
    if (!confirm("¿Eliminar corrida? (No revierte consumos)")) return;
    const { error } = await supabase.from("production_runs").delete().eq("id", id);
    if (error) {
      alert("Error eliminando corrida: " + error.message);
      return;
    }
    await loadAll();
  }

  // KPI simple (promedios de las corridas listadas)
  const kpi = useMemo(() => {
    if (!runs.length) return { A: 0, P: 0, Q: 0, OEE: 0 };
    const n = runs.length;
    const sum = runs.reduce(
      (acc, r) => ({
        A: acc.A + r._oee.A,
        P: acc.P + r._oee.P,
        Q: acc.Q + r._oee.Q,
        OEE: acc.OEE + r._oee.OEE,
      }),
      { A: 0, P: 0, Q: 0, OEE: 0 }
    );
    return {
      A: Number((sum.A / n).toFixed(3)),
      P: Number((sum.P / n).toFixed(3)),
      Q: Number((sum.Q / n).toFixed(3)),
      OEE: Number((sum.OEE / n).toFixed(3)),
    };
  }, [runs]);

  return (
    <div className="grid gap-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Availability", value: kpi.A },
          { label: "Performance", value: kpi.P },
          { label: "Quality", value: kpi.Q },
          { label: "OEE", value: kpi.OEE },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="text-2xl font-bold">{(c.value * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>

      {/* Crear corrida */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <h3 className="mb-3 text-lg font-semibold">Registrar producción</h3>
        <form onSubmit={createRun} className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Máquina</label>
            <Select
              value={form.machine_id}
              onChange={(e) => setForm((s) => ({ ...s, machine_id: e.target.value }))}
              required
            >
              <option value="">Selecciona…</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Receta (opcional)</label>
            <Select
              value={form.recipe_id}
              onChange={(e) => setForm((s) => ({ ...s, recipe_id: e.target.value }))}
            >
              <option value="">—</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Inicio</label>
            <Input
              type="datetime-local"
              value={form.started_at}
              onChange={(e) => setForm((s) => ({ ...s, started_at: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Fin</label>
            <Input
              type="datetime-local"
              value={form.ended_at}
              onChange={(e) => setForm((s) => ({ ...s, ended_at: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tiempo planificado (min)</label>
            <Input
              type="number"
              step="0.01"
              value={form.planned_time_min}
              onChange={(e) => setForm((s) => ({ ...s, planned_time_min: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Paros (min)</label>
            <Input
              type="number"
              step="0.01"
              value={form.downtime_min}
              onChange={(e) => setForm((s) => ({ ...s, downtime_min: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tiempo ciclo ideal (s/u)</label>
            <Input
              type="number"
              step="0.0001"
              value={form.ideal_cycle_time_sec}
              onChange={(e) =>
                setForm((s) => ({ ...s, ideal_cycle_time_sec: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Buenas (unidades)</label>
            <Input
              type="number"
              step="1"
              value={form.good_count}
              onChange={(e) => setForm((s) => ({ ...s, good_count: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Rechazo (unidades)</label>
            <Input
              type="number"
              step="1"
              value={form.reject_count}
              onChange={(e) => setForm((s) => ({ ...s, reject_count: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Batches para consumo (si hay receta)
            </label>
            <Input
              type="number"
              step="0.01"
              value={form.batches_for_consumption}
              onChange={(e) =>
                setForm((s) => ({ ...s, batches_for_consumption: e.target.value }))
              }
            />
            <p className="mt-1 text-[11px] text-gray-500">
              1 batch = cantidades definidas en la receta. Se descuenta del inventario.
            </p>
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
            <Input
              placeholder="Opcional"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>

          <div className="md:col-span-4">
            <Button disabled={creating}>{creating ? "Guardando…" : "Registrar corrida"}</Button>
          </div>
        </form>
      </div>

      {/* Listado de corridas */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold">Últimas corridas</h3>
          <Input
            placeholder="Buscar por máquina o receta…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2">Fecha</th>
                <th className="p-2">Máquina</th>
                <th className="p-2">Receta</th>
                <th className="p-2">A</th>
                <th className="p-2">P</th>
                <th className="p-2">Q</th>
                <th className="p-2">OEE</th>
                <th className="p-2">Buenas</th>
                <th className="p-2">Rechazo</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="p-2">{r.machines?.name} <span className="text-gray-400">({r.machines?.code})</span></td>
                  <td className="p-2">{r.recipes?.name || "—"}</td>
                  <td className="p-2">{(r._oee.A * 100).toFixed(1)}%</td>
                  <td className="p-2">{(r._oee.P * 100).toFixed(1)}%</td>
                  <td className="p-2">{(r._oee.Q * 100).toFixed(1)}%</td>
                  <td className="p-2 font-semibold">{(r._oee.OEE * 100).toFixed(1)}%</td>
                  <td className="p-2">{r.good_count}</td>
                  <td className="p-2">{r.reject_count}</td>
                  <td className="p-2">
                    <Button variant="ghost" onClick={() => deleteRun(r.id)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={10}>
                    No hay corridas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

