import { writeAsStringAsync, cacheDirectory } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { supabase } from "@/lib/supabase";

export type ExportType = "expenses" | "income";
export type ExportFormat = "csv" | "json" | "pdf";

interface ExpenseRow {
  date: string;
  description: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  tags: string[] | null;
  categories: { name: string } | null;
}
interface IncomeRow {
  date: string;
  description: string;
  amount: number;
  source: string;
  notes: string | null;
}

// Quote a CSV cell and neutralize formula injection + embedded quotes/commas.
function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function esc(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c,
  );
}

async function fetchRows(type: ExportType, from?: string, to?: string) {
  let query = supabase
    .from(type)
    .select(type === "income" ? "*" : "*, categories(name)")
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as (ExpenseRow | IncomeRow)[];
}

function buildCSV(type: ExportType, rows: (ExpenseRow | IncomeRow)[]): string {
  if (type === "income") {
    const headers = ["Date", "Description", "Amount", "Source", "Notes"];
    const lines = (rows as IncomeRow[]).map((r) =>
      [
        csvCell(r.date),
        csvCell(r.description),
        csvCell(r.amount),
        csvCell(r.source),
        csvCell(r.notes ?? ""),
      ].join(","),
    );
    return [headers.join(","), ...lines].join("\n");
  }
  const headers = ["Date", "Description", "Amount", "Category", "Payment Method", "Notes", "Tags"];
  const lines = (rows as ExpenseRow[]).map((r) =>
    [
      csvCell(r.date),
      csvCell(r.description),
      csvCell(r.amount),
      csvCell(r.categories?.name ?? ""),
      csvCell(r.payment_method),
      csvCell(r.notes ?? ""),
      csvCell((r.tags ?? []).join(", ")),
    ].join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

function buildHTML(
  type: ExportType,
  rows: (ExpenseRow | IncomeRow)[],
  currency: string,
  label: string,
): string {
  const isIncome = type === "income";
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const head = isIncome
    ? ["Date", "Description", "Source", "Amount"]
    : ["Date", "Description", "Category", "Payment", "Amount"];
  const bodyRows = rows
    .map((r) => {
      const cells = isIncome
        ? [
            (r as IncomeRow).date,
            (r as IncomeRow).description,
            (r as IncomeRow).source,
            `${currency} ${Number(r.amount).toFixed(2)}`,
          ]
        : [
            (r as ExpenseRow).date,
            (r as ExpenseRow).description,
            (r as ExpenseRow).categories?.name ?? "-",
            (r as ExpenseRow).payment_method,
            `${currency} ${Number(r.amount).toFixed(2)}`,
          ];
      return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
    })
    .join("");
  const title = isIncome ? "Income Report" : "Expense Report";
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:-apple-system,Roboto,Helvetica,sans-serif;color:#0f1115;padding:24px;}
    h1{color:#004161;margin:0 0 4px;}
    .meta{color:#6b7280;font-size:12px;margin-bottom:16px;}
    .total{font-size:18px;font-weight:700;margin:12px 0;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th{background:#004161;color:#fff;text-align:left;padding:8px;}
    td{padding:8px;border-bottom:1px solid #e5e7eb;}
    tr:nth-child(even) td{background:#f7f7f8;}
  </style></head><body>
  <h1>${title}</h1>
  <div class="meta">Period: ${esc(label)} &middot; ${rows.length} entries</div>
  <div class="total">Total ${isIncome ? "Income" : "Expenses"}: ${currency} ${total.toFixed(2)}</div>
  <table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${bodyRows}</tbody></table>
  </body></html>`;
}

export async function exportData(opts: {
  type: ExportType;
  format: ExportFormat;
  from?: string;
  to?: string;
  currency: string;
  label: string;
}): Promise<number> {
  const { type, format, from, to, currency, label } = opts;
  const rows = await fetchRows(type, from, to);
  if (rows.length === 0) {
    throw new Error("No data to export for this range.");
  }

  const stamp = `${from ?? "all"}_${to ?? "now"}`;
  let uri: string;
  let mimeType: string;

  if (format === "pdf") {
    const { uri: pdfUri } = await Print.printToFileAsync({
      html: buildHTML(type, rows, currency, label),
    });
    uri = pdfUri;
    mimeType = "application/pdf";
  } else {
    const content = format === "csv" ? buildCSV(type, rows) : JSON.stringify(rows, null, 2);
    mimeType = format === "csv" ? "text/csv" : "application/json";
    uri = `${cacheDirectory}${type}_${stamp}.${format}`;
    await writeAsStringAsync(uri, content);
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: `Export ${type}`,
    UTI: format === "pdf" ? "com.adobe.pdf" : undefined,
  });
  return rows.length;
}
