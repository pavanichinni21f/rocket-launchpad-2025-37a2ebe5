-- Migration: roles, hosting_accounts, orders, invoices
-- Run this in your Supabase/Postgres environment. Review before applying.

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Profiles enhancement: add role reference
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);

-- Hosting accounts
CREATE TABLE IF NOT EXISTS hosting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'provisioning',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  items jsonb DEFAULT '[]',
  provider text,
  provider_reference text,
  created_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'unpaid',
  pdf_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Example seed roles
INSERT INTO roles (name, description) VALUES ('admin', 'Platform administrator') ON CONFLICT DO NOTHING;
INSERT INTO roles (name, description) VALUES ('user', 'Regular authenticated user') ON CONFLICT DO NOTHING;

-- Note: Add RLS policies and stricter constraints in production.
