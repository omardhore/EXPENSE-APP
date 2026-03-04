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
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
}

interface Trend {
  month: string;
  total: number;
  count: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          fetch(`/api/v1/analytics/summary?period=${period}`),
          fetch("/api/v1/analytics/trends"),
        ]);
        const summaryJson = await summaryRes.json();
        const trendsJson = await trendsRes.json();

        if (summaryJson.success) setSummary(summaryJson.data);
        if (trendsJson.success) setTrends(trendsJson.data);
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
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
              Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.expenseCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              This {period}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Daily Average
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {summary && summary.expenseCount > 0
                ? (summary.currentTotal / Math.max(summary.expenseCount, 1)).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
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
                  <Bar
                    dataKey="total"
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
