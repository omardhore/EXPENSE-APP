import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api/response";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_TTL_SECONDS = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return errorResponse("VALIDATION_ERROR", "No file provided", 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
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

  // Upload to Supabase Storage. The "receipts" bucket must be private —
  // access is granted per-request via a short-lived signed URL (see GET
  // below), never a permanent public link.
  const path = `${user.id}/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("[receipt:POST] upload error:", uploadError);
    return errorResponse("STORAGE_ERROR", "A storage error occurred", 500);
  }

  // Store the storage path, not a public URL.
  await supabase
    .from("expenses")
    .update({ receipt_url: path, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  const { data: signed, error: signError } = await supabase.storage
    .from("receipts")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signError) {
    console.error("[receipt:POST] sign url error:", signError);
    return errorResponse("STORAGE_ERROR", "A storage error occurred", 500);
  }

  return successResponse({ receipt_url: signed.signedUrl });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const { id } = await params;
  const supabase = await createClient();

  const { data: expense } = await supabase
    .from("expenses")
    .select("receipt_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!expense) {
    return notFoundResponse("Expense");
  }

  if (!expense.receipt_url) {
    return notFoundResponse("Receipt");
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("receipts")
    .createSignedUrl(expense.receipt_url, SIGNED_URL_TTL_SECONDS);

  if (signError) {
    console.error("[receipt:GET] sign url error:", signError);
    return errorResponse("STORAGE_ERROR", "A storage error occurred", 500);
  }

  return successResponse({ receipt_url: signed.signedUrl });
}
