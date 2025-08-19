"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function RequireAuth({ children }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const next = window.location.pathname;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      } else {
        setReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        const next = window.location.pathname;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      } else {
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return <div className="text-sm text-gray-500">Autenticando…</div>;
  return children;
}
