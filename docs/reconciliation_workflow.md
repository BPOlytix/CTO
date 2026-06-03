# Automated Bank Reconciliation Logic

This document outlines the logic and workflow for the automated bank reconciliation process in the Accrue AI system, ensuring GAAP compliance and high accuracy.

## 1. Reconciliation Process Overview

The automated agent will compare bank statement lines (imported from Xero) against recorded transactions in the General Ledger (GL).

### 1.1 Match Hierarchy
The system follows a priority-based matching hierarchy:
1. **Rule 1: Exact Match** (Highest Confidence)
2. **Rule 2: Close Date Match**
3. **Rule 3: Multi-Transaction Match**
4. **Rule 4: GAAP Compliance Flags** (Capitalization, Prepaids, Related Parties)
5. **Rule 5: Suggested Match (Needs Review)**

## 2. Matching Rules

### 2.1 Rule 1: Exact Match
*   **Criteria**: 
    *   Amount matches exactly.
    *   Date matches exactly.
    *   Payee/Reference contains a strong match (e.g., Invoice Number, unique string).
*   **Action**: Automatically reconcile.

### 2.2 Rule 2: Close Date Match
*   **Criteria**:
    *   Amount matches exactly.
    *   Date is within +/- 3 business days.
    *   Payee/Reference is a fuzzy match (e.g., "Starbucks" vs "Starbucks Coffee").
*   **Action**: Automatically reconcile if confidence score > 90%.

### 2.3 Rule 3: Multi-Transaction Match (Grouping)
*   **One-to-Many**: One bank statement line matches multiple GL transactions (e.g., a bulk deposit for multiple invoices).
*   **Many-to-One**: Multiple bank statement lines match one GL transaction (rare, but happens with split payments).
*   **Action**: Sum GL transactions within a 5-day window. If the sum equals the bank statement line, suggest a match for review or auto-reconcile if references match.

## 3. Handling Specific Scenarios

### 3.1 Bank Fees and Merchant Charges
*   **Scenario**: Bank statement amount is slightly less than the GL transaction due to fees (e.g., Stripe/PayPal fees).
*   **Logic**:
    *   Calculate difference.
    *   If difference < 5% of total AND matches known fee patterns.
    *   **Action**: Auto-create a "Bank Fee" adjustment to the relevant expense account and reconcile.

### 3.2 Partial Payments
*   **Scenario**: Bank statement amount is less than the Invoice amount.
*   **Action**:
    *   Apply the payment as a partial payment to the invoice.
    *   Leave the invoice balance open.
    *   GAAP Note: Ensure the remaining balance is correctly aged in A/R.

### 3.3 Overpayments
*   **Scenario**: Bank statement amount is greater than the Invoice amount.
*   **Action**:
    *   Apply amount to invoice.
    *   Record the excess as a "Customer Credit" or "Unearned Revenue" depending on company policy.
    *   Flag for human review to confirm intent.

## 4. Discrepancy Handling

Any transaction that does not meet the "Auto-Reconcile" thresholds is flagged for "Review Needed".

### 4.1 GAAP Compliance Flags
*   **Rule 4.1: Fixed Asset Capitalization**: Any spend >= $2,500 is flagged for asset review.
*   **Rule 4.2: Prepaid Expenses**: Payments >= $1,200 for recurring services (Insurance, Subs) are flagged for amortization.
*   **Rule 4.4: Related Party Transactions**: Transactions with identified related parties are flagged for disclosure scrutiny.
*   **Rule 4.5: Deferred Revenue**: Large customer deposits (> $5,000) without invoices are flagged as liabilities.
*   **Rule 4.6: Accrued Liabilities**: Recurring utility/rent payments without bills are flagged for accrual entries.
*   **Rule 4.9: Intercompany Transfers**: Transfers between linked entities are flagged for "Due To/From" account mapping.

### 4.2 Discrepancy Handling
*   **Duplicate Detection**: If multiple GL transactions match one bank line, flag as potential duplicate.
*   **Missing Transactions**: Bank lines with no matching GL entry after 7 days are flagged for "Bill/Expense Entry Needed".

## 5. Audit Trail & GAAP Compliance

*   Every automated reconciliation must log:
    *   Timestamp of reconciliation.
    *   Rule ID applied.
    *   Confidence score.
    *   Link to supporting documents (invoices, receipts).
*   **Monthly Close**: The system generates a "Bank Reconciliation Report" at month-end showing adjusted bank balances vs GL balances, highlighting any outstanding items.
