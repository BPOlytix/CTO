# GAAP Mapping Rules for SMB Chart of Accounts

This document defines the mapping rules for categorizing Xero transactions into a GAAP-compliant Chart of Accounts (CoA). These rules are intended for automated categorization by the Accrue AI agent.

## 1. Asset Accounts

### 1.1 Cash and Cash Equivalents
*   **Rule**: Any transaction originating from a connected bank account or petty cash fund.
*   **GAAP Classification**: Current Asset.
*   **Xero Mapping**: Bank Accounts.

### 1.2 Accounts Receivable (A/R)
*   **Rule**: Sales on credit. Automated matching of bank deposits to open Invoices.
*   **GAAP Classification**: Current Asset.
*   **Allowance for Doubtful Accounts**: Periodic adjustment based on aging report (Manual/Semi-automated).

### 1.3 Inventory
*   **Rule**: Purchase of goods intended for resale.
*   **GAAP Classification**: Current Asset.
*   **Valuation**: FIFO or Weighted Average (as configured in Xero).

### 1.4 Prepaid Expenses
*   **Rule**: Payments for services covering future periods (e.g., Annual Insurance, Annual Software Subs).
*   **Threshold**: Payments > $1,200 covering > 3 months should be capitalized as Prepaid.
*   **Amortization**: Automated monthly journal entry to recognize expense.

## 2. Liability Accounts

### 2.1 Accounts Payable (A/P)
*   **Rule**: Purchases on credit. Automated matching of bank withdrawals to open Bills.
*   **GAAP Classification**: Current Liability.

### 2.2 Deferred Revenue (Unearned Revenue)
*   **Rule**: Payments received from customers before the service/good is delivered.
*   **Action**: Map to Deferred Revenue liability account until revenue recognition criteria are met.

### 2.3 Accrued Liabilities
*   **Rule**: Expenses incurred but not yet billed (e.g., end-of-month utilities, payroll taxes).
*   **Action**: Automated accrual entries at month-end based on historical averages or known contracts.

## 3. Revenue Accounts

### 3.1 Operating Revenue
*   **Rule**: Invoices marked as "Sales" or "Services".
*   **Recognition**: Recognize when earned (performance obligation met), regardless of cash receipt.

## 4. Expense Accounts

### 4.1 Cost of Goods Sold (COGS)
*   **Rule**: Direct costs associated with producing/purchasing goods sold.
*   **Mapping**: Inventory assets move to COGS upon sale.

### 4.2 Operating Expenses (OpEx)
*   **Payroll**: Salaries, wages, and employer taxes.
*   **Marketing**: Ads, agency fees, promotional materials.
*   **G&A**: Rent, utilities, office supplies, software subscriptions.
*   **Categorization Logic**: Use Xero's "Tracking Categories" for departmental reporting.

## 5. Equity Accounts

### 5.1 Retained Earnings
*   **Rule**: Cumulative net income minus dividends.
*   **Action**: Automated year-end close process.

## 6. Automated Categorization Logic (The "Engine")

The agent should use the following priority for categorization:
1.  **Direct Match**: Existing Xero Bank Rules.
2.  **AI Mapping**: If no bank rule, use the "Description" and "Payee" to match against the GAAP Mapping Rules above.
    *   *Example*: "AWS" or "Google Cloud" -> G&A: Software Subscriptions.
    *   *Example*: "Landlord Inc" -> G&A: Rent.
3.  **Threshold Check**: Large purchases (> $2,500) check for Fixed Asset capitalization rules vs immediate expense.
