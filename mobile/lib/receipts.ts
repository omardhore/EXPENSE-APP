import { supabase } from "@/lib/supabase";

const SIGNED_URL_TTL_SECONDS = 120;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB — matches the web route's cap.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Mirrors the web app's private-bucket + signed-URL pattern
// (src/app/api/v1/expenses/[id]/receipt/route.ts) — the "receipts" bucket
// must be private, never served via getPublicUrl. The owning user is
// derived from the authenticated session (never trusted from the caller),
// and the expenses update is scoped to that user so a client can't attach a
// receipt to someone else's expense even if RLS were misconfigured.
export async function uploadReceipt(expenseId: string, localUri: string, mimeType: string) {
  const ext = EXT_BY_MIME[mimeType];
  if (!ext) {
    throw new Error("Only JPEG or PNG receipts are supported");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());
  if (arraybuffer.byteLength > MAX_SIZE) {
    throw new Error("File size exceeds 10MB limit");
  }

  const path = `${user.id}/${expenseId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, arraybuffer, { upsert: true, contentType: mimeType });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from("expenses")
    .update({ receipt_url: path, updated_at: new Date().toISOString() })
    .eq("id", expenseId)
    .eq("user_id", user.id);
  if (updateError) throw new Error(updateError.message);

  return path;
}

export async function getReceiptSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
