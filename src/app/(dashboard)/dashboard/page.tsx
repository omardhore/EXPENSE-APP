"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Receipt,
  Wallet,
  Scale,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BRAND_CHART_COLORS } from "@/lib/constants/brand-colors";
import { BudgetWarnings } from "@/components/dashboard/budget-warnings";

interface Summary {
  period: string;
  currentTotal: number;
  previousTotal: number;
  changePercent: number;
  expenseCount: number;
  byCategory: {
    name: string;
    color: string | null;
    total: number;
    count: number;
  }[];
  incomeTotal: number;
  previousIncomeTotal: number;
  incomeChangePercent: number;
  incomeCount: number;
  netTotal: number;
  previousNetTotal: number;
  bySource: { name: string; total: number; count: number }[];
}

interface Trend {
  month: string;
  total: number;
  count: number;
  income: number;
  net: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(false);
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          fetch(`/api/v1/analytics/summary?period=${period}`),
          fetch("/api/v1/analytics/trends"),
        ]);
        const summaryJson = await summaryRes.json();
        const trendsJson = await trendsRes.json();

        if (!summaryRes.ok || !summaryJson.success) {
          throw new Error(summaryJson?.error?.message ?? "Request failed");
        }
        setSummary(summaryJson.data);
        if (trendsRes.ok && trendsJson.success) setTrends(trendsJson.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <BudgetWarnings />

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load dashboard data. Please try again.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Income
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${summary?.incomeTotal.toFixed(2) ?? "0.00"}
            </div>
            {summary && summary.incomeChangePercent !== 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {summary.incomeChangePercent > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-secondary" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                )}
                {Math.abs(summary.incomeChangePercent)}% from last period
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Spending
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.currentTotal.toFixed(2) ?? "0.00"}
            </div>
            {summary && summary.changePercent !== 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {summary.changePercent > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-destructive" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-secondary" />
                )}
                {Math.abs(summary.changePercent)}% from last period
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Cash Flow
            </CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (summary?.netTotal ?? 0) >= 0
                  ? "text-emerald-600"
                  : "text-destructive"
              }`}
            >
              {(summary?.netTotal ?? 0) < 0 ? "-" : ""}$
              {Math.abs(summary?.netTotal ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income minus spending
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.expenseCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.incomeCount ?? 0} income · this {period}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Income vs Spending</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="total"
                    name="Spending"
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>By Category</CardTitle>
            <CardDescription>Spending breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-75">
              {summary && summary.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.byCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {summary.byCategory.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color || BRAND_CHART_COLORS[index % BRAND_CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No expense data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent by category */}
      {summary && summary.byCategory.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.byCategory.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-4">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        cat.color || BRAND_CHART_COLORS[i % BRAND_CHART_COLORS.length],
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    ${cat.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
