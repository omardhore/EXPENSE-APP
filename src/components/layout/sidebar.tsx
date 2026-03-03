"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Target,
  Download,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/exports", label: "Exports", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-(--brand-primary) text-white">
      <div className="flex h-14 items-center border-b border-white/10 px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <Receipt className="h-5 w-5 text-(--brand-secondary)" />
          <span>ExpenseTracker</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-(--brand-secondary) text-(--brand-primary)"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
