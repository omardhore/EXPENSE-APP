-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY,  -- managed by Supabase Auth
  email           VARCHAR(255) NOT NULL UNIQUE,
  name            VARCHAR(100),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',  -- user's single currency
  theme           VARCHAR(10) NOT NULL DEFAULT 'light',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(50) NOT NULL,
  icon            VARCHAR(50),
  color           VARCHAR(7),      -- hex color
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount              DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  description         VARCHAR(255) NOT NULL,
  date                DATE NOT NULL,
  receipt_url         TEXT,
  payment_method      VARCHAR(10) NOT NULL DEFAULT 'other'
                        CHECK (payment_method IN ('cash','credit','debit','other')),
  tags                TEXT[] DEFAULT '{}',
  notes               TEXT,

  is_recurring        BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency VARCHAR(10) CHECK (recurring_frequency IN ('weekly','monthly','yearly')),
  recurring_group_id  UUID,
  next_due_date       DATE,

  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
  period          VARCHAR(10) NOT NULL CHECK (period IN ('monthly','quarterly','yearly')),
  limit_amount    DECIMAL(12,2) NOT NULL CHECK (limit_amount > 0),
  alert_threshold INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold BETWEEN 1 AND 100),
  start_date      DATE NOT NULL,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MONTHLY SUMMARIES
-- ============================================================
CREATE TABLE monthly_summaries (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month           DATE NOT NULL,
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense_count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month, category_id)
);

-- ============================================================
-- INDEXES & TRIGGERS
-- ============================================================
CREATE INDEX idx_expenses_user_date       ON expenses(user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_user_category   ON expenses(user_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_budgets_user_period      ON budgets(user_id, period);
CREATE INDEX idx_categories_user          ON categories(user_id);

-- Trigger to create a user profile when they sign up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS \supabase/migrations/20260302080808_initial_schema.sql
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
\supabase/migrations/20260302080808_initial_schema.sql LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can query their own users row." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own users row." ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own summaries" ON monthly_summaries FOR ALL USING (auth.uid() = user_id);
