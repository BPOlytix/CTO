# Day-to-Day Bookkeeping Workflows

This document defines the standard operating procedures (SOPs) for daily bookkeeping tasks managed by the Accrue AI agent.

## 1. Daily Bank Feed Review

The agent performs a daily sync with Xero bank feeds to ensure all transactions are captured and categorized promptly.

### 1.1 Automated Categorization
*   **Step 1**: Fetch new bank statement lines via Xero API.
*   **Step 2**: Apply existing Xero Bank Rules.
*   **Step 3**: If no bank rule applies, use the AI Mapping Engine (refer to `gaap_mapping_rules.md`).
*   **Step 4**: Match against open Bills (AP) or Invoices (AR) (refer to `reconciliation_workflow.md`).

### 1.2 Exception Handling
*   Transactions that cannot be categorized with >90% confidence are placed in the "Review Queue".
*   Agent sends a daily digest to the user for any items in the Review Queue.

## 2. Bill Processing (Accounts Payable)

### 2.1 Bill Intake
*   **Step 1**: Monitor designated email inbox or file upload directory for new bills (PDF/Image).
*   **Step 2**: Use OCR to extract: Vendor Name, Date, Amount, Tax, Due Date, and Line Items.
*   **Step 3**: Validate extraction against historical data for that vendor.

### 2.2 Bill Recording
*   **Step 1**: Map extraction to GAAP Ledger Accounts.
*   **Step 2**: Create a "Draft Bill" in Xero.
*   **Step 3**: Attach the source document to the Xero record.
*   **Step 4**: If the bill is a recurring utility or subscription, auto-authorize if the amount is within 5% of the average. Otherwise, mark for "Approval Needed".

## 3. Invoice Processing (Accounts Receivable)

### 3.1 Invoice Generation
*   **Step 1**: Trigger invoice creation based on external sales data or user prompt.
*   **Step 2**: Map items to Revenue accounts as per `gaap_mapping_rules.md`.
*   **Step 3**: Send invoice to customer via email.

### 3.2 Automated Matching
*   **Step 1**: On bank feed sync, identify deposits.
*   **Step 2**: Use `reconciliation_workflow.md` to match deposits to open invoices.
*   **Step 3**: Mark invoices as "Paid" and record any merchant fees (e.g., Stripe) as expenses.

## 4. Expense Reimbursements

### 4.1 Receipt Processing
*   **Step 1**: Process employee-submitted receipts via OCR.
*   **Step 2**: Categorize based on merchant and amount.
*   **Step 3**: Create "Draft Expense Claim" in Xero.

## 5. Daily/Weekly Quality Control

*   **Audit Check**: Daily check for duplicate bills or invoices.
*   **Aged Payables/Receivables**: Weekly review of overdue items. Agent flags any items >15 days overdue for user follow-up.
*   **Intercompany/Transfer Matching**: Auto-match transfers between connected bank accounts to avoid double-counting.
