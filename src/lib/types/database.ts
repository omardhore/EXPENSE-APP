export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PaymentMethod = "cash" | "credit" | "debit" | "other";
export type RecurringFrequency = "weekly" | "monthly" | "yearly";
export type BudgetPeriod = "monthly" | "quarterly" | "yearly";
export type Theme = "light" | "dark";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          currency: string;
          theme: Theme;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          currency?: string;
          theme?: Theme;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          currency?: string;
          theme?: Theme;
          notifications_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string | null;
          color?: string | null;
          is_default?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          category_id: string | null;
          description: string;
          date: string;
          receipt_url: string | null;
          payment_method: PaymentMethod;
          tags: string[];
          notes: string | null;
          is_recurring: boolean;
          recurring_frequency: RecurringFrequency | null;
          recurring_group_id: string | null;
          next_due_date: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          category_id?: string | null;
          description: string;
          date: string;
          receipt_url?: string | null;
          payment_method?: PaymentMethod;
          tags?: string[];
          notes?: string | null;
          is_recurring?: boolean;
          recurring_frequency?: RecurringFrequency | null;
          recurring_group_id?: string | null;
          next_due_date?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          description?: string;
          date?: string;
          receipt_url?: string | null;
          payment_method?: PaymentMethod;
          tags?: string[];
          notes?: string | null;
          is_recurring?: boolean;
          recurring_frequency?: RecurringFrequency | null;
          next_due_date?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          period: BudgetPeriod;
          limit_amount: number;
          alert_threshold: number;
          start_date: string;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          period: BudgetPeriod;
          limit_amount: number;
          alert_threshold?: number;
          start_date: string;
          end_date?: string | null;
          created_at?: string;
        };
        Update: {
          category_id?: string | null;
          period?: BudgetPeriod;
          limit_amount?: number;
          alert_threshold?: number;
          start_date?: string;
          end_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_summaries: {
        Row: {
          user_id: string;
          month: string;
          category_id: string;
          total_amount: number;
          expense_count: number;
        };
        Insert: {
          user_id: string;
          month: string;
          category_id: string;
          total_amount?: number;
          expense_count?: number;
        };
        Update: {
          total_amount?: number;
          expense_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_summaries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_summaries_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type MonthlySummary =
  Database["public"]["Tables"]["monthly_summaries"]["Row"];
