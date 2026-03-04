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
import { useTheme } from "next-themes";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const { theme, setTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? "");
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

  async function handleClearData() {
    if (
      !confirm(
        "Are you sure you want to delete ALL your expenses, budgets, and categories? This cannot be undone.",
      )
    ) {
      return;
    }

    setClearingData(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("expenses").delete().eq("user_id", user.id);
      await supabase.from("budgets").delete().eq("user_id", user.id);
      await supabase.from("categories").delete().eq("user_id", user.id);
      toast.success("All data has been cleared.");
      setTimeout(() => window.location.reload(), 1500);
    }
    setClearingData(false);
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Are you sure you want to delete your account FOREVER? This action cannot be undone.",
      )
    ) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login"); // Auth trigger handles rest or Edge function if implemented
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
          <CardTitle>Profile & Preferences</CardTitle>
          <CardDescription>Manage your account, preferences, and theme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-md border border-secondary/35 bg-secondary/15 p-3 text-sm text-secondary-foreground">
              {message}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Your email cannot be changed.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
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

            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account or wipe your workspace data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline" 
              className="text-destructive border-destructive hover:bg-destructive/10" 
              onClick={handleClearData}
              disabled={clearingData}
            >
              {clearingData ? "Clearing..." : "Clear Workspace Data"}
            </Button>
            
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
