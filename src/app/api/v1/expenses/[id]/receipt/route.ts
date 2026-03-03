import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api/response";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return errorResponse("VALIDATION_ERROR", "No file provided", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "File type not allowed. Use JPEG, PNG, or PDF.",
      400,
    );
  }

  if (file.size > MAX_SIZE) {
    return errorResponse(
      "VALIDATION_ERROR",
      "File size exceeds 10MB limit",
      400,
    );
  }

  const supabase = await createClient();

  // Check expense belongs to user
  const { data: expense } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!expense) {
    return notFoundResponse("Expense");
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop();
  const path = `${user.id}/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return errorResponse("STORAGE_ERROR", uploadError.message, 500);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("receipts").getPublicUrl(path);

  // Update expense with receipt URL
  await supabase
    .from("expenses")
    .update({ receipt_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id);

  return successResponse({ receipt_url: publicUrl });
}
