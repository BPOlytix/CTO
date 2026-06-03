# Automated Reconciliation Engine: Test Scenarios

This document specifies the test cases used to validate the accuracy and logic of the Automated Reconciliation Engine. Each scenario evaluates the system's ability to match bank statement lines with General Ledger (GL) entries while adhering to GAAP standards.

## 1. High Confidence Matches (Auto-Reconcile)

### Case 1.1: Exact Invoice Match
*   **Bank Transaction**: `2026-06-01`, `INV-1001 Payment`, `$1,200.00`
*   **Xero GL Match**: `Invoice INV-1001`, `$1,200.00`, Date `2026-05-25`
*   **GAAP Reasoning**: Direct matching of consideration received against an established receivable. Validates accuracy of A/R settlement.
*   **Expected Outcome**: **Auto-reconcile**.

### Case 1.2: Fuzzy Name & Close Date Match
*   **Bank Transaction**: `2026-06-03`, `Starbucks Coffee`, `$15.50`
*   **Xero GL Match**: `Spend Money: Starbucks`, `$15.50`, Date `2026-06-01`
*   **GAAP Reasoning**: Immateriality of date variance (within 3 business days) and strong payee correspondence (fuzzy match > 90%).
*   **Expected Outcome**: **Auto-reconcile**.

### Case 1.3: Merchant Fee Adjustment (e.g., Stripe)
*   **Bank Transaction**: `2026-06-07`, `Stripe Payout`, `$970.00`
*   **Xero GL Match**: `Invoice INV-1004`, `$1,000.00`
*   **GAAP Reasoning**: Revenue is recognized at gross ($1,000), and merchant fees ($30) are recognized as an expense. The difference is < 5% and matches a known merchant pattern.
*   **Expected Outcome**: **Auto-reconcile** (System creates a $30 bank fee adjustment to "Bank Fees" expense account).

---

## 2. Medium Confidence Matches (Draft for Review)

### Case 2.1: Multi-Transaction (One-to-Many)
*   **Bank Transaction**: `2026-06-05`, `Bulk Deposit`, `$3,000.00`
*   **Xero GL Match**: `Invoice INV-1002 ($1,000)` AND `Invoice INV-1003 ($2,000)`
*   **GAAP Reasoning**: Aggregation of individual receipts into a single bank deposit. Requires verification that the sum correctly represents the intended settlements.
*   **Expected Outcome**: **Draft for Review** (Suggest matching both invoices).

### Case 2.2: Partial Payment
*   **Bank Transaction**: `2026-06-18`, `Customer Green`, `$1,000.00`
*   **Xero GL Match**: `Invoice INV-1006`, `$2,000.00`
*   **GAAP Reasoning**: Accrual basis requires the remaining $1,000 to stay in A/R as an aged receivable.
*   **Expected Outcome**: **Draft for Review** (Apply as partial payment).

### Case 2.3: Customer Overpayment
*   **Bank Transaction**: `2026-06-15`, `Customer Blue`, `$2,500.00`
*   **Xero GL Match**: `Invoice INV-1005`, `$2,400.00`
*   **GAAP Reasoning**: The excess $100 must be recorded as a Liability (Unearned Revenue or Customer Credit) until applied or refunded.
*   **Expected Outcome**: **Draft for Review** (Apply $2,400 to invoice, $100 to Customer Credit).

---

## 3. Low Confidence / Edge Cases (Flag for Review)

### Case 3.1: Ambiguous Duplicate Amounts
*   **Bank Transaction**: `2026-06-12`, `Check 501`, `$5,000.00`
*   **Xero GL Match**: `Bill BILL-100 ($5,000)` AND `Bill BILL-200 ($5,000)`
*   **GAAP Reasoning**: High risk of misapplication. Without a unique reference, the agent cannot definitively assign the payment.
*   **Expected Outcome**: **Flag** (Review Needed - Ambiguous Match).

### Case 3.2: Material FX Variance
*   **Bank Transaction**: `2026-06-10`, `Vendor London`, `$1,350.00 (USD)`
*   **Xero GL Match**: `Bill BILL-500`, `£1,000.00 (GBP)` (Estimated conversion $1,310.00)
*   **GAAP Reasoning**: Material variance ($40 or ~3%) exceeds standard FX flux thresholds. May indicate unrecorded bank fees or incorrect FX rates.
*   **Expected Outcome**: **Flag** (FX/Fee Review Needed).

### Case 3.3: Missing Transaction (> 7 Days)
*   **Bank Transaction**: `2026-06-20`, `Office Depot`, `$450.00`
*   **Xero GL Match**: *No matching record found.*
*   **GAAP Reasoning**: Completeness principle. Every bank outflow must have a corresponding ledger entry and supporting document.
*   **Expected Outcome**: **Flag** (Bill/Expense Entry Needed).
