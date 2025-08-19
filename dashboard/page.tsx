
"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

type Summary = { availability: number; performance: number; quality: number; oee: number };

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({ availability: 0, performance: 0, quality: 0, oee: 0 });
  const [series, setSeries] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/dashboard?days=30");
    const j = await res.json();
    setSummary(j.summary || { availability: 0, performance: 0, quality: 0, oee: 0 });
    setSeries(j.series || []);
  }

  useEffect(() => { load(); }, []);

  const fmt = (x: number) => (x*100).toFixed(1) + "%";

  return (
    <main className="container">
      <section className="rounded-2xl shadow-xl p-6 mb-6" style={{ background: "var(--card)" }}>
        <h1 className="text-2xl font-bold">Dashboard OEE</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Promedios últimos 30 días.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded border border-white/10 p-3">
            <div className="text-sm" style={{ color: "var(--muted)" }}>Disponibilidad</div>
            <div className="text-2xl font-semibold">{(summary.availability*100).toFixed(1)}%</div>
          </div>
          <div className="rounded border border-white/10 p-3">
            <div className="text-sm" style={{ color: "var(--muted)" }}>Rendimiento</div>
            <div className="text-2xl font-semibold">{(summary.performance*100).toFixed(1)}%</div>
          </div>
          <div className="rounded border border-white/10 p-3">
            <div className="text-sm" style={{ color: "var(--muted)" }}>Calidad</div>
            <div className="text-2xl font-semibold">{(summary.quality*100).toFixed(1)}%</div>
          </div>
          <div className="rounded border border-white/10 p-3">
            <div className="text-sm" style={{ color: "var(--muted)" }}>OEE</div>
            <div className="text-2xl font-semibold">{(summary.oee*100).toFixed(1)}%</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl shadow-xl p-6" style={{ background: "var(--card)" }}>
        <h2 className="text-xl font-semibold mb-3">Evolución diaria</h2>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="availability" name="Disponibilidad" />
              <Line type="monotone" dataKey="performance" name="Rendimiento" />
              <Line type="monotone" dataKey="quality" name="Calidad" />
              <Line type="monotone" dataKey="oee" name="OEE" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}
