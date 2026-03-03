"use client";

import { useEffect, useState } from "react";
import { useExpenseStore } from "@/lib/stores/expense-store";
import { useCategoryStore } from "@/lib/stores/category-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { Plus, Trash2, Pencil, Repeat, Paperclip, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ExpensesPage() {
  const {
    expenses,
    loading,
    total,
    hasMore,
    page,
    filters,
    setFilters,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useExpenseStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    category_id: "",
    payment_method: "other" as "cash" | "credit" | "debit" | "other",
    notes: "",
    is_recurring: false,
    recurring_frequency: "" as "" | "weekly" | "monthly" | "yearly",
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [fetchExpenses, fetchCategories]);

  function resetForm() {
    setForm({
      description: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      category_id: "",
      payment_method: "other",
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
      category_id: form.category_id || null,
      payment_method: form.payment_method as "cash" | "credit" | "debit" | "other",
      notes: form.notes || null,
      is_recurring: form.is_recurring,
      recurring_frequency: form.is_recurring && form.recurring_frequency
        ? form.recurring_frequency
        : null,
    };

    try {
      if (editingId) {
        await updateExpense(editingId, data);
        if (receiptFile) {
          await uploadReceipt(editingId, receiptFile);
        }
        toast.success("Expense updated successfully");
      } else {
        await addExpense(data);
        // Upload receipt to the newly created expense
        const state = useExpenseStore.getState();
        const newest = state.expenses[0];
        if (receiptFile && newest) {
          await uploadReceipt(newest.id, receiptFile);
        }
        toast.success("Expense added successfully");
      }
      setDialogOpen(false);
      resetForm();
      setReceiptFile(null);
    } catch {
      toast.error("Failed to save expense");
    }
  }

  function handleEdit(expense: (typeof expenses)[0]) {
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date,
      category_id: expense.category_id ?? "",
      payment_method: expense.payment_method,
      notes: expense.notes ?? "",
      is_recurring: expense.is_recurring,
      recurring_frequency: expense.recurring_frequency ?? "",
    });
    setEditingId(expense.id);
    setDialogOpen(true);
  }

  async function uploadReceipt(expenseId: string, file: File) {
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/v1/expenses/${expenseId}/receipt`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        // Refresh expenses to show receipt indicator
        fetchExpenses();
      }
    } finally {
      setUploadingReceipt(false);
    }
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: "Cash",
    credit: "Credit",
    debit: "Debit",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">{total} total expenses</p>
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
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Expense" : "Add Expense"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
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
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) =>
                      setForm({ ...form, category_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={form.payment_method}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        payment_method: v as typeof form.payment_method,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
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
                        recurring_frequency: checked ? form.recurring_frequency : "",
                      })
                    }
                  />
                  <Label htmlFor="is_recurring" className="cursor-pointer">
                    Recurring expense
                  </Label>
                </div>
                {form.is_recurring && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={form.recurring_frequency}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          recurring_frequency: v as typeof form.recurring_frequency,
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
              <div className="space-y-2">
                <Label>Receipt (optional)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
                    <Upload className="h-4 w-4" />
                    {receiptFile ? receiptFile.name : "Upload receipt"}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) =>
                        setReceiptFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {receiptFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReceiptFile(null)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or PDF up to 10MB
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={uploadingReceipt}>
                {uploadingReceipt
                  ? "Uploading receipt..."
                  : editingId
                    ? "Update Expense"
                    : "Add Expense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 p-4">
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
            <Label className="text-xs">Category</Label>
            <Select
              value={filters.category ?? "all"}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  category: v === "all" ? undefined : v,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expense Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No expenses yet. Add your first expense to get started.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{expense.description}</p>
                          {expense.is_recurring && (
                            <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0">
                              <Repeat className="h-3 w-3" />
                              {expense.recurring_frequency}
                            </Badge>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {expense.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.categories ? (
                        <Badge
                          variant="secondary"
                          style={{
                            borderColor: expense.categories.color ?? undefined,
                          }}
                        >
                          {expense.categories.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {paymentMethodLabels[expense.payment_method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        {expense.receipt_url && (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            title="View receipt"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </a>
                        )}
                        ${Number(expense.amount).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              await deleteExpense(expense.id);
                              toast.success("Expense deleted");
                            } catch {
                              toast.error("Failed to delete expense");
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
            onClick={() => fetchExpenses(page + 1)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
