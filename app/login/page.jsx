"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";

  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "magic"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  async function handleSignin(e) {
    e.preventDefault();
    setBusy(true); setInfo("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setInfo(error.message);
    router.replace(next);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setBusy(true); setInfo("");
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setInfo(error.message);
    setInfo("Cuenta creada. Revisa tu correo si requiere confirmación, luego inicia sesión.");
  }

  async function handleMagic(e) {
    e.preventDefault();
    setBusy(true); setInfo("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined }
    });
    setBusy(false);
    if (error) return setInfo(error.message);
    setInfo("Enviamos un enlace de acceso a tu correo.");
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold">Accede a 3 Gatos</h2>

      <div className="mb-4 flex gap-2">
        <button className={`rounded-lg px-3 py-2 text-sm ${mode==="signin"?"bg-indigo-600 text-white":"bg-gray-100"}`} onClick={()=>setMode("signin")}>Iniciar sesión</button>
        <button className={`rounded-lg px-3 py-2 text-sm ${mode==="signup"?"bg-indigo-600 text-white":"bg-gray-100"}`} onClick={()=>setMode("signup")}>Crear cuenta</button>
        <button className={`rounded-lg px-3 py-2 text-sm ${mode==="magic"?"bg-indigo-600 text-white":"bg-gray-100"}`} onClick={()=>setMode("magic")}>Magic link</button>
      </div>

      {mode !== "magic" ? (
        <form onSubmit={mode==="signin" ? handleSignin : handleSignup} className="grid gap-3">
          <input className="rounded-lg border px-3 py-2 text-sm" type="email" placeholder="email@empresa.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <input className="rounded-lg border px-3 py-2 text-sm" type="password" placeholder="********" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          <button disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            {busy ? "Procesando…" : (mode==="signin" ? "Entrar" : "Crear cuenta")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagic} className="grid gap-3">
          <input className="rounded-lg border px-3 py-2 text-sm" type="email" placeholder="email@empresa.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <button disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            {busy ? "Enviando…" : "Enviar enlace mágico"}
          </button>
        </form>
      )}

      {info && <p className="mt-3 text-sm text-amber-700">{info}</p>}
    </div>
  );
}
