"use client";

import { useEffect, useState } from "react";
import { useIncomeStore } from "@/lib/stores/income-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, Repeat } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Source = "salary" | "freelance" | "investment" | "gift" | "refund" | "other";

const sourceLabels: Record<Source, string> = {
  salary: "Salary",
  freelance: "Freelance",
  investment: "Investment",
  gift: "Gift",
  refund: "Refund",
  other: "Other",
};

const sourceOptions = Object.entries(sourceLabels) as [Source, string][];

export default function IncomePage() {
  const {
    income,
    loading,
    total,
    hasMore,
    page,
    filters,
    setFilters,
    fetchIncome,
    addIncome,
    updateIncome,
    deleteIncome,
  } = useIncomeStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    source: "salary" as Source,
    notes: "",
    is_recurring: false,
    recurring_frequency: "" as "" | "weekly" | "monthly" | "yearly",
  });

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        setFilters({ ...filters, search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function resetForm() {
    setForm({
      description: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      source: "salary",
      notes: "",
      is_recurring: false,
      recurring_frequency: "",
    });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      source: form.source,
      notes: form.notes || null,
      is_recurring: form.is_recurring,
      recurring_frequency:
        form.is_recurring && form.recurring_frequency
          ? form.recurring_frequency
          : null,
    };

    try {
      if (editingId) {
        await updateIncome(editingId, data);
        toast.success("Income updated successfully");
      } else {
        await addIncome(data);
        toast.success("Income added successfully");
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to save income");
    }
  }

  function handleEdit(entry: (typeof income)[0]) {
    setForm({
      description: entry.description,
      amount: String(entry.amount),
      date: entry.date,
      source: entry.source,
      notes: entry.notes ?? "",
      is_recurring: entry.is_recurring,
      recurring_frequency: entry.recurring_frequency ?? "",
    });
    setEditingId(entry.id);
    setDialogOpen(true);
  }

  const totalAmount = income.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Income</h1>
          <p className="text-muted-foreground">
            {total} {total === 1 ? "entry" : "entries"}
            {income.length > 0 && (
              <>
                {" · "}
                <span className="font-medium text-emerald-600">
                  ${totalAmount.toFixed(2)}
                </span>{" "}
                shown
              </>
            )}
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
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Income" : "Add Income"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g. August salary"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="pl-6"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v as Source })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_recurring"
                    checked={form.is_recurring}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        is_recurring: checked === true,
                        recurring_frequency: checked
                          ? form.recurring_frequency
                          : "",
                      })
                    }
                  />
                  <Label htmlFor="is_recurring" className="cursor-pointer">
                    Recurring income
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tags this income as recurring for your own tracking. Future
                  occurrences aren&apos;t added automatically yet.
                </p>
                {form.is_recurring && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={form.recurring_frequency}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          recurring_frequency:
                            v as typeof form.recurring_frequency,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update Income" : "Add Income"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 p-4">
          <div className="space-y-1">
            <Label className="text-xs">Search</Label>
            <Input
              type="text"
              className="w-48"
              placeholder="Description or notes"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="w-40"
              value={filters.startDate ?? ""}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value || undefined })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="w-40"
              value={filters.endDate ?? ""}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value || undefined })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Source</Label>
            <Select
              value={filters.source ?? "all"}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  source: v === "all" ? undefined : v,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourceOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="w-28"
              value={filters.minAmount ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  minAmount: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="w-28"
              value={filters.maxAmount ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  maxAmount: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Income Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && income.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : income.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No income yet. Add your first income entry to get started.
                  </TableCell>
                </TableRow>
              ) : (
                income.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{entry.description}</p>
                          {entry.is_recurring && (
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1 px-1.5 py-0"
                            >
                              <Repeat className="h-3 w-3" />
                              {entry.recurring_frequency}
                            </Badge>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceLabels[entry.source]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      +${Number(entry.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              await deleteIncome(entry.id);
                              toast.success("Income deleted");
                            } catch {
                              toast.error("Failed to delete income");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchIncome(page + 1)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
