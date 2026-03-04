"use client";

import { useState } from "react";
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
import { Download, FileSpreadsheet, FileText, FileJson } from "lucide-react";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";

export default function ExportsPage() {
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingJSON, setExportingJSON] = useState(false);

  async function handleExportJSON() {
    setExportingJSON(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/v1/exports/json?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const json = await res.json();
      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_${startDate}_${endDate}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("JSON exported successfully");
    } catch {
      toast.error("Failed to export JSON");
    } finally {
      setExportingJSON(false);
    }
  }

  async function handleExportCSV() {
    setExportingCSV(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/v1/exports/csv?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExportingCSV(false);
    }
  }

  async function handleExportPDF() {
    setExportingPDF(true);
    try {
      // Fetch expense data from the API
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const res = await fetch(`/api/v1/exports/json?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch expenses");

      const expenses = json.data as Array<{
        date: string;
        description: string;
        amount: number;
        payment_method: string;
        categories: { name: string } | null;
      }>;

      // Dynamic import to keep bundle size down
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text("Expense Report", 14, 20);

      // Period subtitle
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 28);

      // Summary
      const total = expenses.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Expenses: $${total.toFixed(2)}`, 14, 38);
      doc.text(`Number of Transactions: ${expenses.length}`, 14, 46);

      // Table
      autoTable(doc, {
        startY: 54,
        head: [["Date", "Description", "Category", "Payment", "Amount"]],
        body: expenses.map((e) => [
          e.date,
          e.description,
          e.categories?.name ?? "-",
          e.payment_method,
          `$${Number(e.amount).toFixed(2)}`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 41, 41] },
        foot: [["", "", "", "Total", `$${total.toFixed(2)}`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Generated on ${format(new Date(), "MMM d, yyyy")} | Page ${i} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10,
        );
      }

      doc.save(`expenses_${startDate}_${endDate}.pdf`);
      toast.success("PDF report generated successfully");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setExportingPDF(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Exports</h1>
        <p className="text-muted-foreground">
          Download your expense data
        </p>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>
            Select the date range for your export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {/* CSV Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              CSV Export
            </CardTitle>
            <CardDescription>
              For spreadsheet apps like Excel or Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportCSV}
              disabled={exportingCSV}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportingCSV ? "Exporting..." : "Download CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* JSON Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              JSON Export
            </CardTitle>
            <CardDescription>
              Raw nested JSON data for backups and developers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportJSON}
              disabled={exportingJSON}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportingJSON ? "Exporting..." : "Download JSON"}
            </Button>
          </CardContent>
        </Card>

        {/* PDF Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Report
            </CardTitle>
            <CardDescription>
              Formatted report with summary and expense table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportingPDF ? "Generating..." : "Download PDF"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
