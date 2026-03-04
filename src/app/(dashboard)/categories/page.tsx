"use client";

import { useEffect, useState } from "react";
import { useCategoryStore } from "@/lib/stores/category-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BRAND_PRIMARY_COLOR,
  BRAND_SECONDARY_COLOR,
} from "@/lib/constants/brand-colors";

const NEW_CATEGORY_COLOR = BRAND_SECONDARY_COLOR;
const FALLBACK_CATEGORY_COLOR = BRAND_PRIMARY_COLOR;

export default function CategoriesPage() {
  const { categories, loading, fetchCategories, addCategory, updateCategory, deleteCategory } =
    useCategoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    color: NEW_CATEGORY_COLOR,
    icon: "",
  });

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function resetForm() {
    setForm({ name: "", color: NEW_CATEGORY_COLOR, icon: "" });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const data = {
      name: form.name,
      color: form.color,
      icon: form.icon || null,
    };

    try {
      if (editingId) {
        await updateCategory(editingId, data);
        toast.success("Category updated");
      } else {
        await addCategory(data);
        toast.success("Category created");
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(cat: (typeof categories)[0]) {
    setForm({
      name: cat.name,
      color: cat.color ?? FALLBACK_CATEGORY_COLOR,
      icon: cat.icon ?? "",
    });
    setEditingId(cat.id);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Organize your expenses into categories
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
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Category" : "Add Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g., Food & Dining"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        setForm({ ...form, color: e.target.value })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={form.color}
                      onChange={(e) =>
                        setForm({ ...form, color: e.target.value })
                      }
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (optional)</Label>
                  <Input
                    id="icon"
                    value={form.icon}
                    onChange={(e) =>
                      setForm({ ...form, icon: e.target.value })
                    }
                    placeholder="e.g., utensils"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (editingId ? "Update Category" : "Add Category")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No categories yet. Create your first category to organize
              expenses.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: cat.color ?? FALLBACK_CATEGORY_COLOR }}
                  />
                  <CardTitle className="text-base">{cat.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(cat)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await deleteCategory(cat.id);
                        toast.success("Category deleted");
                      } catch {
                        toast.error("Failed to delete category");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {cat.is_default && (
                <CardContent>
                  <span className="text-xs text-muted-foreground">
                    Default category
                  </span>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
