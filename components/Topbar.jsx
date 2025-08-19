"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Topbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => { await supabase.auth.signOut(); };

  return (
    <nav className="space-x-2 text-sm">
      <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/">Dashboard</a>
      <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/mantenimiento">Mantenimientos</a>
      <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/inventario">Inventario</a>
      <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/recetas">Recetas</a>
      <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/produccion">Producción</a>

      {user ? (
        <button className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black" onClick={logout}>
          Cerrar sesión
        </button>
      ) : (
        <a className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" href="/login">
          Entrar
        </a>
      )}
    </nav>
  );
}
