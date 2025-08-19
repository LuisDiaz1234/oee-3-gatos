"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";
import { useRole } from "../../lib/useRole";
import { downloadCSV } from "../../lib/csv";

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
        (props.className || "")
      }
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
        (props.className || "")
      }
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

export default function AuditoriaPage() {
  const { isAdmin } = useRole();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [tbl, setTbl] = useState("");
  const [op, setOp] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(200);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("audit_log_view")
      .select("id, at, table_name, operation, row_pk, actor_email, old_data, new_data")
      .order("at", { ascending: false })
      .limit(limit);

    if (tbl) query = query.eq("table_name", tbl);
    if (op) query = query.eq("operation", op);

    const { data, error } = await query;
    if (error) console.error(error);
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tbl, op, limit]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const t = q.toLowerCase();
    return rows.filter(
      (r) =>
        (r.table_name || "").toLowerCase().includes(t) ||
        (r.operation || "").toLowerCase().includes(t) ||
        (r.row_pk || "").toLowerCase().includes(t) ||
        (r.actor_email || "").toLowerCase().includes(t) ||
        JSON.stringify(r.new_data || {}).toLowerCase().includes(t) ||
        JSON.stringify(r.old_data || {}).toLowerCase().includes(t)
    );
  }, [q, rows]);

  const allTables = useMemo(() => {
    const s = new Set(rows.map((r) => r.table_name));
    return ["", ...Array.from(s).sort()];
  }, [rows]);

  function exportAuditCSV() {
    const headers = ["fecha", "tabla", "op", "row_pk", "usuario", "old_json", "new_json"];
    const rowsOut = filtered.map((r) => [
      r.at ? new Date(r.at).toISOString() : "",
      r.table_name,
      r.operation,
      r.row_pk || "",
      r.actor_email || "",
      JSON.stringify(r.old_data || {}),
      JSON.stringify(r.new_data || {}),
    ]);
    downloadCSV("auditoria.csv", headers, rowsOut);
  }

  if (!isAdmin) {
    return (
      <RequireAuth>
        <div className="rounded-2xl bg-white p-6 shadow text-sm text-red-700">
          Solo administradores pueden ver la auditoría.
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold">Auditoría</h2>
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Tabla</label>
              <Select value={tbl} onChange={(e) => setTbl(e.target.value)}>
                {allTables.map((t) => (
                  <option key={t} value={t}>
                    {t || "Todas"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Operación</label>
              <Select value={op} onChange={(e) => setOp(e.target.value)}>
                <option value="">Todas</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Buscar</label>
              <Input
                placeholder="Texto, email, id, etc."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Límite</label>
              <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {[50, 100, 200, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button variant="ghost" onClick={exportAuditCSV}>
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Sin registros con los filtros actuales.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Tabla</th>
                  <th className="p-2">Op</th>
                  <th className="p-2">Row ID</th>
                  <th className="p-2">Usuario</th>
                  <th className="p-2">Cambios</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2 whitespace-nowrap">
                      {new Date(r.at).toLocaleString()}
                    </td>
                    <td className="p-2">{r.table_name}</td>
                    <td className="p-2">{r.operation}</td>
                    <td className="p-2">{r.row_pk || "—"}</td>
                    <td className="p-2">{r.actor_email || "—"}</td>
                    <td className="p-2">
                      <details className="rounded border bg-gray-50 p-2">
                        <summary className="cursor-pointer text-xs text-gray-600">
                          Ver JSON
                        </summary>
                        <pre className="mt-2 max-w-[80ch] overflow-auto text-xs">
                          {JSON.stringify({ old: r.old_data, new: r.new_data }, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
