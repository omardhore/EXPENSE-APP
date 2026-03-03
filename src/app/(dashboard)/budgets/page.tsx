"use client";

import { useEffect, useState, useCallback } from "react";
import { useBudgetStore } from "@/lib/stores/budget-store";
import { useCategoryStore } from "@/lib/stores/category-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function BudgetsPage() {
  const { budgets, loading, fetchBudgets, addBudget, updateBudget, deleteBudget } =
    useBudgetStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    category_id: "",
    period: "monthly" as "monthly" | "quarterly" | "yearly",
    limit_amount: "",
    alert_threshold: "80",
    start_date: format(new Date(), "yyyy-MM-dd"),
  });

  const fetchSpending = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/budgets/spending");
      const json = await res.json();
      if (json.success) {
        setSpending(json.data);
      }
    } catch {
      // Spending fetch failed silently
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [fetchBudgets, fetchCategories]);

  useEffect(() => {
    if (budgets.length > 0) {
      const timerId = setTimeout(() => {
        void fetchSpending();
      }, 0);

      return () => clearTimeout(timerId);
    }
  }, [budgets.length, fetchSpending]);

  function resetForm() {
    setForm({
      category_id: "",
      period: "monthly",
      limit_amount: "",
      alert_threshold: "80",
      start_date: format(new Date(), "yyyy-MM-dd"),
    });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      category_id: form.category_id || null,
      period: form.period,
      limit_amount: parseFloat(form.limit_amount),
      alert_threshold: parseInt(form.alert_threshold),
      start_date: form.start_date,
    };

    try {
      if (editingId) {
        await updateBudget(editingId, data);
        toast.success("Budget updated successfully");
      } else {
        await addBudget(data);
        toast.success("Budget created successfully");
      }
      setDialogOpen(false);
      resetForm();
      fetchSpending();
    } catch {
      toast.error("Failed to save budget");
    }
  }

  function handleEdit(budget: (typeof budgets)[0]) {
    setForm({
      category_id: budget.category_id ?? "",
      period: budget.period,
      limit_amount: String(budget.limit_amount),
      alert_threshold: String(budget.alert_threshold),
      start_date: budget.start_date,
    });
    setEditingId(budget.id);
    setDialogOpen(true);
  }

  const periodLabels: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">
            Set spending limits and track progress
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Budget" : "Add Budget"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Category (optional - leave empty for overall)</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) =>
                    setForm({ ...form, category_id: v === "overall" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Overall budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall budget</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={form.period}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        period: v as typeof form.period,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit_amount">Limit ($)</Label>
                  <Input
                    id="limit_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.limit_amount}
                    onChange={(e) =>
                      setForm({ ...form, limit_amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alert_threshold">Alert at (%)</Label>
                  <Input
                    id="alert_threshold"
                    type="number"
                    min="1"
                    max="100"
                    value={form.alert_threshold}
                    onChange={(e) =>
                      setForm({ ...form, alert_threshold: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update Budget" : "Add Budget"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No budgets set. Create a budget to track your spending limits.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((budget) => {
            const spent = spending[budget.id] ?? 0;
            const limit = Number(budget.limit_amount);
            const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const isOverThreshold = percent >= budget.alert_threshold;
            const isOverBudget = percent >= 100;
            return (
              <Card key={budget.id} className={isOverBudget ? "border-destructive" : ""}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">
                      {budget.categories?.name ?? "Overall Budget"}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="outline">
                        {periodLabels[budget.period]}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(budget)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        try {
                          await deleteBudget(budget.id);
                          toast.success("Budget deleted");
                        } catch {
                          toast.error("Failed to delete budget");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className={isOverBudget ? "text-destructive font-medium" : isOverThreshold ? "text-orange-500 font-medium" : "text-muted-foreground"}>
                      ${spent.toFixed(2)} spent
                    </span>
                    <span className="font-medium">
                      ${limit.toFixed(2)} limit
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    className={isOverBudget ? "[&>div]:bg-destructive" : isOverThreshold ? "[&>div]:bg-orange-500" : ""}
                  />
                  {isOverBudget ? (
                    <p className="text-xs text-destructive font-medium">
                      Over budget by ${(spent - limit).toFixed(2)}
                    </p>
                  ) : isOverThreshold ? (
                    <p className="text-xs text-orange-500">
                      {percent.toFixed(0)}% of budget used - approaching limit
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      ${(limit - spent).toFixed(2)} remaining
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
