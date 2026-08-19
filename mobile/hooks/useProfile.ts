import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useProfile() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email ?? "");
      setName(user.user_metadata?.name ?? "");
      const { data } = await supabase
        .from("users")
        .select("currency")
        .eq("id", user.id)
        .single();
      if (data) setCurrency(data.currency);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(newName: string, newCurrency: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error: authError } = await supabase.auth.updateUser({
      data: { name: newName },
    });
    if (authError) throw new Error(authError.message);

    const { error: dbError } = await supabase
      .from("users")
      .update({ currency: newCurrency, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (dbError) throw new Error(dbError.message);

    setName(newName);
    setCurrency(newCurrency);
  }

  return { email, name, currency, loading, save };
}
