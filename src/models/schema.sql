-- Accrue AI Database Schema

CREATE TABLE IF NOT EXISTS xero_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  org_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  xero_transaction_id TEXT UNIQUE NOT NULL,
  date DATETIME NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  account_code TEXT,
  mapping_status TEXT DEFAULT 'unmapped',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gaap_mapping_rules (
  id TEXT PRIMARY KEY,
  xero_account_code TEXT UNIQUE NOT NULL,
  gaap_category TEXT NOT NULL,
  description TEXT,
  rules TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
