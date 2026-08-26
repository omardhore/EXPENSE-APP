import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, requireUserId } from "@/lib/session";
import { updateProfileSchema, firstZodMessage } from "@/lib/schemas";

export function useProfile() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (user) {
      setEmail(user.email ?? "");
      setName(user.user_metadata?.name ?? "");
      const { data } = await supabase.from("users").select("currency").eq("id", user.id).single();
      if (data) setCurrency(data.currency);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(newName: string, newCurrency: string) {
    const parsed = updateProfileSchema.safeParse({
      name: newName,
      currency: newCurrency,
    });
    if (!parsed.success) {
      throw new Error(firstZodMessage(parsed.error));
    }

    const userId = await requireUserId();

    const { error: authError } = await supabase.auth.updateUser({
      data: { name: parsed.data.name },
    });
    if (authError) throw new Error(authError.message);

    const { error: dbError } = await supabase
      .from("users")
      .update({
        currency: parsed.data.currency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (dbError) throw new Error(dbError.message);

    setName(parsed.data.name);
    setCurrency(parsed.data.currency);
  }

  return { email, name, currency, loading, save };
}
