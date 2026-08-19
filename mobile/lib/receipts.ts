import { supabase } from "@/lib/supabase";

const SIGNED_URL_TTL_SECONDS = 120;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Mirrors the web app's private-bucket + signed-URL pattern
// (src/app/api/v1/expenses/[id]/receipt/route.ts) — the "receipts" bucket
// must be private, never served via getPublicUrl.
export async function uploadReceipt(
  userId: string,
  expenseId: string,
  localUri: string,
  mimeType: string,
) {
  const ext = EXT_BY_MIME[mimeType];
  if (!ext) {
    throw new Error("Only JPEG or PNG receipts are supported");
  }

  const path = `${userId}/${expenseId}.${ext}`;
  const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, arraybuffer, { upsert: true, contentType: mimeType });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from("expenses")
    .update({ receipt_url: path, updated_at: new Date().toISOString() })
    .eq("id", expenseId);
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
