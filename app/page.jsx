"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import RequireAuth from "../components/RequireAuth";

function Card({ title, children }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow">
      {title && <h2 className="mb-2 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
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

// --- util OEE ---
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
  return { A, P, Q, OEE };
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [machinesMap, setMachinesMap] = useState({});
  const [runs, setRuns] = useState([]);
  const [stock, setStock] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [qInv, setQInv] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: m } = await supabase.from("machines").select("id, name, code");
      setMachinesMap(Object.fromEntries((m || []).map((x) => [x.id, x])));

      const { data: pr } = await supabase
        .from("production_runs")
        .select(
          "id, machine_id, started_at, planned_time_min, downtime_min, ideal_cycle_time_sec, good_count, reject_count"
        )
        .order("started_at", { ascending: false })
        .limit(60);
      setRuns((pr || []).map((r) => ({ ...r, _oee: computeOEE(r) })));

      const { data: st } = await supabase.from("inventory_stock").select("*").order("name");
      setStock(st || []);

      const { data: mo } = await supabase
        .from("maintenance_orders")
        .select("id, title, status, priority, scheduled_at, machines(name, code)")
        .in("status", ["programado", "en_proceso"])
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true })
        .limit(8);
      setUpcoming(mo || []);

      setLoading(false);
    }
    load();
  }, []);

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
    return { A: sum.A / n, P: sum.P / n, Q: sum.Q / n, OEE: sum.OEE / n };
  }, [runs]);

  const topMachines = useMemo(() => {
    if (!runs.length) return [];
    const g = {};
    for (const r of runs) {
      const id = r.machine_id;
      g[id] ??= { c: 0, A: 0, P: 0, Q: 0, OEE: 0 };
      g[id].c++; g[id].A += r._oee.A; g[id].P += r._oee.P; g[id].Q += r._oee.Q; g[id].OEE += r._oee.OEE;
    }
    return Object.entries(g)
      .map(([mid, v]) => ({
        mid,
        name: machinesMap[mid]?.name || "Máquina",
        code: machinesMap[mid]?.code || "",
        A: v.A / v.c, P: v.P / v.c, Q: v.Q / v.c, OEE: v.OEE / v.c,
      }))
      .sort((a, b) => b.OEE - a.OEE)
      .slice(0, 5);
  }, [runs, machinesMap]);

  const lowStock = useMemo(() => {
    const all = (stock || []).filter(
      (s) => s.min_stock !== null && Number(s.current_stock) < Number(s.min_stock)
    );
    const t = qInv.toLowerCase();
    const filtered = t
      ? all.filter((s) => s.name.toLowerCase().includes(t) || (s.sku || "").toLowerCase().includes(t))
      : all;
    return filtered
      .map((s) => ({ ...s, ratio: Number(s.current_stock) / (Number(s.min_stock) || 1) }))
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 8);
  }, [stock, qInv]);

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Availability", value: kpi.A },
            { label: "Performance", value: kpi.P },
            { label: "Quality", value: kpi.Q },
            { label: "OEE", value: kpi.OEE },
          ].map((c) => (
            <Card key={c.label}>
              <div className="text-sm text-gray-500">{c.label}</div>
              <div className="text-2xl font-bold">{(c.value * 100).toFixed(1)}%</div>
              {loading && <div className="text-xs text-gray-400 mt-1">Cargando…</div>}
            </Card>
          ))}
        </div>

        <Card title="Top máquinas por OEE (promedio)">
          {topMachines.length === 0 ? (
            <p className="text-sm text-gray-500">Sin corridas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="p-2">Máquina</th>
                    <th className="p-2">A</th>
                    <th className="p-2">P</th>
                    <th className="p-2">Q</th>
                    <th className="p-2">OEE</th>
                  </tr>
                </thead>
                <tbody>
                  {topMachines.map((m) => (
                    <tr key={m.mid} className="border-t">
                      <td className="p-2">
                        {m.name} <span className="text-gray-400">({m.code})</span>
                      </td>
                      <td className="p-2">{(m.A * 100).toFixed(1)}%</td>
                      <td className="p-2">{(m.P * 100).toFixed(1)}%</td>
                      <td className="p-2">{(m.Q * 100).toFixed(1)}%</td>
                      <td className="p-2 font-semibold">{(m.OEE * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Inventario — Bajo mínimo">
          <div className="mb-3">
            <Input
              placeholder="Buscar por nombre o SKU…"
              value={qInv}
              onChange={(e) => setQInv(e.target.value)}
            />
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">Sin alertas por ahora.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="p-2">SKU</th>
                    <th className="p-2">Ítem</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2">Mínimo</th>
                    <th className="p-2">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((r) => (
                    <tr key={r.item_id} className="border-t">
                      <td className="p-2 font-mono text-xs">{r.sku}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{Number(r.current_stock).toFixed(2)}</td>
                      <td className="p-2">{Number(r.min_stock || 0).toFixed(2)}</td>
                      <td className="p-2">{r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Próximos mantenimientos">
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">No hay mantenimientos programados.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((o) => (
                <li key={o.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{o.title}</div>
                      <div className="text-xs text-gray-500">
                        {o.machines?.name} ({o.machines?.code}) •{" "}
                        {o.scheduled_at ? new Date(o.scheduled_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs capitalize">
                      {o.status} • {o.priority}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </RequireAuth>
  );
}
