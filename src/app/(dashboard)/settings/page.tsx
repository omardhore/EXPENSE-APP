"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setName(user.user_metadata?.name ?? "");
        // Load user settings from the users table
        const { data } = await supabase
          .from("users")
          .select("currency")
          .eq("id", user.id)
          .single();
        if (data) {
          setCurrency(data.currency);
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Update auth metadata
    await supabase.auth.updateUser({ data: { name } });

    // Update user settings
    await supabase
      .from("users")
      .update({ currency, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    toast.success("Settings saved successfully");
    setMessage("Settings saved successfully");
    setSaving(false);
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Card>
          <CardContent className="p-6">
            <div className="h-40 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-md border border-secondary/35 bg-secondary/15 p-3 text-sm text-secondary-foreground">
              {message}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
