"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useRole() {
  const [role, setRole] = useState("operator");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("role, id")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data?.role) setRole(data.role);
      setLoading(false);
    })();
  }, []);

  return { role, isAdmin: role === "admin", loading };
}
