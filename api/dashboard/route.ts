
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "30");

  // Latest runs metrics
  const { data: runs, error } = await supabaseAdmin
    .from("oee_run_metrics")
    .select("*")
    .gte("start_time", new Date(Date.now() - days*24*3600*1000).toISOString())
    .order("start_time", { ascending: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Aggregate KPIs
  const agg = runs.reduce((acc: any, r: any) => {
    acc.availability.push(r.availability || 0);
    acc.performance.push(r.performance || 0);
    acc.quality.push(r.quality || 0);
    acc.oee.push(r.oee || 0);
    return acc;
  }, { availability: [], performance: [], quality: [], oee: [] });

  const avg = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0;

  const summary = {
    availability: avg(agg.availability),
    performance: avg(agg.performance),
    quality: avg(agg.quality),
    oee: avg(agg.oee)
  };

  const series = runs.map((r: any) => ({
    time: r.start_time,
    availability: Number((r.availability*100).toFixed(1)),
    performance: Number((r.performance*100).toFixed(1)),
    quality: Number((r.quality*100).toFixed(1)),
    oee: Number((r.oee*100).toFixed(1))
  }));

  return Response.json({ summary, series });
}
